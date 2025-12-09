/**
 * Reviewable Importer
 *
 * Extension of BulkImporter that supports a review stage between
 * analysis and commit. Items are grouped by confidence tiers for
 * human review before final import.
 *
 * Flow: Parse → Validate → Transform → Analyze → REVIEW → Commit
 */

import { BulkImporter, BulkImportConfig, ParseResult, ImportProgress, ProgressCallback } from './BulkImportFramework';
import { ConfidenceTier, TierGroups, calculateTier, getTierSummary, TierConfig, DEFAULT_TIER_CONFIG } from './confidence';
import { Issue, IssueDetector, IssueSummary, getIssueSummary } from './issues';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Extended progress stages including review
 */
export type ReviewableImportStage =
  | 'parsing'
  | 'validating'
  | 'transforming'
  | 'analyzing'
  | 'reviewing'
  | 'committing'
  | 'complete';

/**
 * Extended progress callback
 */
export interface ReviewableImportProgress extends Omit<ImportProgress, 'stage'> {
  stage: ReviewableImportStage;
}

/**
 * An analyzed item ready for review
 */
export interface AnalyzedItem<TInput, TOutput, TIssueType extends string = string> {
  /** Original row/index from input */
  index: number;
  /** Original input data */
  input: TInput;
  /** Transformed output data */
  output: TOutput;
  /** Confidence score (0-100) */
  confidence: number;
  /** Confidence tier */
  tier: ConfidenceTier;
  /** Issues detected */
  issues: Issue<TIssueType>[];
  /** Whether item has been approved for import */
  approved: boolean;
  /** User overrides applied during review */
  overrides?: Partial<TOutput>;
}

/**
 * Result of the analysis stage
 */
export interface AnalysisResult<TInput, TOutput, TIssueType extends string = string> {
  /** All analyzed items */
  items: AnalyzedItem<TInput, TOutput, TIssueType>[];
  /** Items grouped by confidence tier */
  tiers: TierGroups<AnalyzedItem<TInput, TOutput, TIssueType>>;
  /** Summary statistics */
  summary: {
    total: number;
    autoApprove: number;
    needsReview: number;
    requiresFix: number;
    averageConfidence: number;
  };
  /** Issue summary across all items */
  issueSummary: IssueSummary;
  /** Parse errors encountered */
  parseErrors: Array<{ row?: number; message: string }>;
  /** Validation errors */
  validationErrors: Array<{ index: number; errors: string[] }>;
}

/**
 * Configuration for reviewable importer
 */
export interface ReviewableImportConfig<TInput, TOutput, TIssueType extends string = string>
  extends BulkImportConfig<TInput, TOutput> {
  /** Calculate confidence score for an item */
  confidenceCalculator: (input: TInput, output: TOutput) => number;
  /** Issue detector instance (optional) */
  issueDetector?: IssueDetector<{ input: TInput; output: TOutput }, TIssueType>;
  /** Tier configuration */
  tierConfig?: TierConfig;
  /** Auto-approve items in AUTO_APPROVE tier */
  autoApproveHighConfidence?: boolean;
}

/**
 * Commit request with approved items and overrides
 */
export interface CommitRequest<TOutput> {
  /** Indices of approved items */
  approvedIndices: number[];
  /** Overrides by item index */
  overrides?: Map<number, Partial<TOutput>>;
}

/**
 * Result of committing approved items
 */
export interface CommitResult<TOutput> {
  success: boolean;
  imported: TOutput[];
  failed: Array<{ index: number; item: TOutput; error: string }>;
  skipped: number;
  summary: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
  };
}

// ============================================================================
// REVIEWABLE IMPORTER CLASS
// ============================================================================

/**
 * Importer with review stage support
 *
 * @example
 * ```ts
 * const importer = new ReviewableImporter({
 *   ...baseConfig,
 *   confidenceCalculator: (input, output) => {
 *     // Calculate based on entity matching, AI confidence, etc.
 *     return 85;
 *   },
 *   issueDetector: myIssueDetector,
 * });
 *
 * // Step 1: Analyze (stop before importing)
 * const analysis = await importer.analyze(file);
 *
 * // Step 2: Display to user for review
 * // analysis.tiers.needsReview contains items needing attention
 *
 * // Step 3: Commit approved items
 * const result = await importer.commit({
 *   approvedIndices: [...approvedIds],
 *   overrides: userOverrides,
 * });
 * ```
 */
export class ReviewableImporter<
  TInput,
  TOutput,
  TIssueType extends string = string
> extends BulkImporter<TInput, TOutput> {
  private reviewConfig: ReviewableImportConfig<TInput, TOutput, TIssueType>;
  private analysisCache: AnalysisResult<TInput, TOutput, TIssueType> | null = null;

  constructor(config: ReviewableImportConfig<TInput, TOutput, TIssueType>) {
    super(config);
    this.reviewConfig = config;
  }

  /**
   * Analyze input data without importing
   * Returns items grouped by confidence tier for review
   */
  async analyze(
    input: File | string,
    onProgress?: (progress: ReviewableImportProgress) => void
  ): Promise<AnalysisResult<TInput, TOutput, TIssueType>> {
    const tierConfig = this.reviewConfig.tierConfig || DEFAULT_TIER_CONFIG;

    // Stage 1: Parse
    onProgress?.({
      stage: 'parsing',
      percentComplete: 0,
      message: 'Parsing input data...',
    });

    const parseResult = await this.parse(input);

    // Stage 2: Validate
    onProgress?.({
      stage: 'validating',
      percentComplete: 20,
      message: `Validating ${parseResult.items.length} items...`,
    });

    const validationResult = await this.validate(parseResult.items);

    // Stage 3: Transform valid items
    onProgress?.({
      stage: 'transforming',
      percentComplete: 40,
      message: `Transforming ${validationResult.validRecords.length} valid items...`,
    });

    const transformedItems = validationResult.validRecords.map((item, idx) => ({
      input: item,
      output: this.config.transformer(item),
      originalIndex: idx,
    }));

    // Stage 4: Analyze - calculate confidence and detect issues
    onProgress?.({
      stage: 'analyzing',
      percentComplete: 60,
      message: 'Analyzing confidence and detecting issues...',
    });

    const analyzedItems: AnalyzedItem<TInput, TOutput, TIssueType>[] = [];
    const allIssues: Issue<TIssueType>[] = [];

    for (let i = 0; i < transformedItems.length; i++) {
      const { input: inputItem, output, originalIndex } = transformedItems[i];

      // Calculate confidence
      const confidence = this.reviewConfig.confidenceCalculator(inputItem, output);

      // Detect issues
      const issues = this.reviewConfig.issueDetector
        ? this.reviewConfig.issueDetector.detect({ input: inputItem, output })
        : [];

      allIssues.push(...issues);

      // Determine tier (issues with errors force REQUIRES_FIX)
      const hasErrors = issues.some(i => i.severity === 'error');
      const tier = calculateTier(confidence, hasErrors, tierConfig);

      // Auto-approve high confidence items if configured
      const autoApprove = this.reviewConfig.autoApproveHighConfidence !== false
        && tier === ConfidenceTier.AUTO_APPROVE;

      analyzedItems.push({
        index: originalIndex,
        input: inputItem,
        output,
        confidence,
        tier,
        issues,
        approved: autoApprove,
      });

      // Progress update
      if (i % 10 === 0) {
        onProgress?.({
          stage: 'analyzing',
          currentItem: i,
          totalItems: transformedItems.length,
          percentComplete: 60 + (i / transformedItems.length) * 30,
          message: `Analyzing item ${i + 1} of ${transformedItems.length}...`,
        });
      }
    }

    // Group by tier
    const tiers: TierGroups<AnalyzedItem<TInput, TOutput, TIssueType>> = {
      autoApprove: analyzedItems.filter(i => i.tier === ConfidenceTier.AUTO_APPROVE),
      needsReview: analyzedItems.filter(i => i.tier === ConfidenceTier.NEEDS_REVIEW),
      requiresFix: analyzedItems.filter(i => i.tier === ConfidenceTier.REQUIRES_FIX),
    };

    // Calculate summary
    const totalConfidence = analyzedItems.reduce((sum, i) => sum + i.confidence, 0);
    const averageConfidence = analyzedItems.length > 0
      ? Math.round(totalConfidence / analyzedItems.length)
      : 0;

    const result: AnalysisResult<TInput, TOutput, TIssueType> = {
      items: analyzedItems,
      tiers,
      summary: {
        total: analyzedItems.length,
        autoApprove: tiers.autoApprove.length,
        needsReview: tiers.needsReview.length,
        requiresFix: tiers.requiresFix.length,
        averageConfidence,
      },
      issueSummary: getIssueSummary(allIssues),
      parseErrors: parseResult.errors,
      validationErrors: validationResult.invalidRecords.map(r => ({
        index: r.index,
        errors: r.errors,
      })),
    };

    // Cache for commit
    this.analysisCache = result;

    onProgress?.({
      stage: 'reviewing',
      percentComplete: 90,
      message: `Ready for review: ${tiers.autoApprove.length} auto-approve, ${tiers.needsReview.length} need review, ${tiers.requiresFix.length} require fix`,
    });

    return result;
  }

  /**
   * Commit approved items to the database
   */
  async commit(
    request: CommitRequest<TOutput>,
    onProgress?: (progress: ReviewableImportProgress) => void
  ): Promise<CommitResult<TOutput>> {
    if (!this.analysisCache) {
      throw new Error('Must call analyze() before commit()');
    }

    const { approvedIndices, overrides } = request;
    const approvedSet = new Set(approvedIndices);

    // Get approved items with overrides applied
    const itemsToImport: TOutput[] = [];
    const indexMap = new Map<number, number>(); // output index -> original index

    for (const item of this.analysisCache.items) {
      if (approvedSet.has(item.index)) {
        let output = item.output;

        // Apply overrides if any
        if (overrides?.has(item.index)) {
          output = { ...output, ...overrides.get(item.index) };
        }

        indexMap.set(itemsToImport.length, item.index);
        itemsToImport.push(output);
      }
    }

    const skipped = this.analysisCache.items.length - itemsToImport.length;

    onProgress?.({
      stage: 'committing',
      percentComplete: 10,
      message: `Importing ${itemsToImport.length} approved items...`,
    });

    // Use parent's import method or custom importer
    let imported: TOutput[] = [];
    const failed: Array<{ index: number; item: TOutput; error: string }> = [];

    try {
      if (this.config.customImporter) {
        const result = await this.config.customImporter(itemsToImport, (progress) => {
          onProgress?.({
            ...progress,
            stage: 'committing',
          } as ReviewableImportProgress);
        });

        imported = result.results || itemsToImport.slice(0, result.successful);
        result.errors.forEach((e, idx) => {
          failed.push({
            index: indexMap.get(idx) || idx,
            item: e.item,
            error: e.error,
          });
        });
      } else {
        const importResult = await this.importToDatabase(itemsToImport, (batchProgress) => {
          onProgress?.({
            stage: 'committing',
            currentItem: batchProgress.processedCount,
            totalItems: batchProgress.totalCount,
            percentComplete: 10 + (batchProgress.percentComplete / 100) * 85,
            message: batchProgress.status,
          });
        });

        imported = importResult.success;
        importResult.failed.forEach((f) => {
          failed.push({
            index: indexMap.get(f.batchIndex) || f.batchIndex,
            item: f.item,
            error: f.error.message,
          });
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      itemsToImport.forEach((item, idx) => {
        failed.push({
          index: indexMap.get(idx) || idx,
          item,
          error: errorMsg,
        });
      });
    }

    onProgress?.({
      stage: 'complete',
      percentComplete: 100,
      message: `Import complete: ${imported.length} successful, ${failed.length} failed, ${skipped} skipped`,
    });

    // Clear cache after commit
    this.analysisCache = null;

    return {
      success: failed.length === 0,
      imported,
      failed,
      skipped,
      summary: {
        total: this.analysisCache?.items.length || itemsToImport.length + skipped,
        successful: imported.length,
        failed: failed.length,
        skipped,
      },
    };
  }

  /**
   * Update approval status for items
   */
  updateApproval(indices: number[], approved: boolean): void {
    if (!this.analysisCache) return;

    const indexSet = new Set(indices);
    for (const item of this.analysisCache.items) {
      if (indexSet.has(item.index)) {
        item.approved = approved;
      }
    }
  }

  /**
   * Get current analysis result
   */
  getAnalysis(): AnalysisResult<TInput, TOutput, TIssueType> | null {
    return this.analysisCache;
  }

  /**
   * Clear cached analysis
   */
  clearAnalysis(): void {
    this.analysisCache = null;
  }

  /**
   * Get all approved item indices
   */
  getApprovedIndices(): number[] {
    if (!this.analysisCache) return [];
    return this.analysisCache.items
      .filter(i => i.approved)
      .map(i => i.index);
  }

  /**
   * Approve all items in a tier
   */
  approveByTier(tier: ConfidenceTier): void {
    if (!this.analysisCache) return;

    for (const item of this.analysisCache.items) {
      if (item.tier === tier) {
        item.approved = true;
      }
    }
  }

  /**
   * Commit all currently approved items
   */
  async commitApproved(
    onProgress?: (progress: ReviewableImportProgress) => void
  ): Promise<CommitResult<TOutput>> {
    return this.commit({
      approvedIndices: this.getApprovedIndices(),
    }, onProgress);
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a reviewable importer with simple confidence calculation
 */
export function createReviewableImporter<TInput, TOutput>(
  config: Omit<ReviewableImportConfig<TInput, TOutput>, 'confidenceCalculator'> & {
    /** Field containing confidence score, or function to calculate it */
    confidence: keyof TInput | ((input: TInput, output: TOutput) => number);
  }
): ReviewableImporter<TInput, TOutput> {
  const confidenceCalculator = typeof config.confidence === 'function'
    ? config.confidence
    : (input: TInput) => {
        const value = input[config.confidence as keyof TInput];
        return typeof value === 'number' ? value : 0;
      };

  return new ReviewableImporter({
    ...config,
    confidenceCalculator,
  });
}
