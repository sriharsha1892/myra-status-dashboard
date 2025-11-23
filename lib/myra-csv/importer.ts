// Main Import Orchestrator
// Coordinates CSV parsing, AI analysis, entity matching, and database imports

import { createServiceClient } from '@/lib/supabase/service';
import { normalizeDomain } from '@/lib/organizations/sharedHelpers';
import Papa from 'papaparse';
import {
  CSVRow,
  ParsedCSVData,
  AnalyzedQuery,
  ImportSummary,
  ImportCommitRequest,
  ImportCommitResult,
  QueryIssue,
  ConfidenceTier,
} from './types';
import {
  validateCSV,
  standardizeCSV,
  deduplicateRows,
  validateColumns,
  parseExecutedAt,
} from './validator';
import { batchMatchEntities } from './entityMatcher';
import { batchAnalyzeQueries } from './aiProcessor';

// ============================================================================
// CSV PARSING
// ============================================================================

/**
 * Parse CSV file into structured data
 */
export async function parseCSVFile(file: File): Promise<ParsedCSVData> {
  // Read file as text first (works in both browser and Node.js)
  const fileText = await file.text();

  return new Promise((resolve, reject) => {
    Papa.parse(fileText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        try {
          // Validate column headers
          const columnValidation = validateColumns(results.meta.fields || []);

          if (!columnValidation.valid) {
            resolve({
              rows: [],
              totalRows: 0,
              errors: [
                {
                  row: 0,
                  message: `Missing required columns: ${columnValidation.missing.join(', ')}`,
                },
              ],
              hasErrors: true,
            });
            return;
          }

          // Map columns to standard field names
          const mappedRows = results.data.map((row: any) => {
            const mapped: any = {};
            for (const [originalHeader, standardField] of columnValidation.mapping) {
              mapped[standardField] = row[originalHeader];
            }
            return mapped as CSVRow;
          });

          // Standardize data
          const standardized = standardizeCSV(mappedRows);

          // Validate rows
          const validation = validateCSV(standardized);

          // Remove duplicates
          const { unique, duplicates } = deduplicateRows(standardized);

          const duplicateErrors = duplicates.map((dup) => ({
            row: dup.row,
            message: `Duplicate of row ${dup.duplicate_of}`,
          }));

          resolve({
            rows: unique,
            totalRows: unique.length,
            errors: [...validation.errors, ...duplicateErrors],
            hasErrors: validation.errors.length > 0,
          });
        } catch (error: any) {
          reject(new Error(`CSV parsing error: ${error.message}`));
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      },
    });
  });
}

// ============================================================================
// FULL ANALYSIS PIPELINE
// ============================================================================

/**
 * Analyze CSV data: entity matching + AI categorization
 */
export async function analyzeCSVData(rows: CSVRow[]): Promise<AnalyzedQuery[]> {
  // Step 1: Entity matching (orgs and users)
  const entityMatches = await batchMatchEntities(rows);

  // Step 2: AI analysis (categorization and topic extraction)
  const aiAnalysis = await batchAnalyzeQueries(
    rows.map((row) => ({
      query_text: row.query_text,
      existing_category: row.category,
      existing_topic: row.query_topic,
    }))
  );

  // Step 3: Combine results
  const analyzedQueries: AnalyzedQuery[] = rows.map((row, index) => {
    const entityMatch = entityMatches[index];
    const aiResult = aiAnalysis.results[index];

    // Detect issues
    const issues = detectIssues(row, entityMatch, aiResult);

    // Calculate overall confidence and tier
    const confidences = [
      entityMatch.overallConfidence,
      aiResult.categoryConfidence,
    ];
    const overallConfidence = Math.round(
      confidences.reduce((sum, c) => sum + c, 0) / confidences.length
    );

    const tier = determineTier(overallConfidence, issues);

    // Parse executed_at
    const executedAt = parseExecutedAt(row.executed_at);
    if (!executedAt) {
      issues.push({
        type: 'validation_error',
        severity: 'error',
        message: 'Invalid date format',
        field: 'executed_at',
      });
    }

    return {
      rowNumber: index + 1,
      originalData: row,
      entityMatch,
      aiAnalysis: aiResult,
      finalQuery: {
        org_id: entityMatch.orgMatch.orgId,
        org_name: entityMatch.orgMatch.orgName,
        user_id: entityMatch.userMatch.userId,
        user_email: entityMatch.userMatch.userEmail,
        user_name: entityMatch.userMatch.userName,
        query_text: row.query_text,
        query_topic: aiResult.query_topic,
        insight_title: aiResult.insight_title || row.insight_title || aiResult.query_topic,
        category: aiResult.category,
        status: row.status || 'completed',
        executed_at: executedAt || new Date(),
        cost_usd: typeof row.cost_usd === 'number' ? row.cost_usd : 0,
      },
      overallConfidence,
      tier,
      issues,
    };
  });

  return analyzedQueries;
}

/**
 * Detect issues that need review
 */
function detectIssues(row: CSVRow, entityMatch: any, aiResult: any): QueryIssue[] {
  const issues: QueryIssue[] = [];

  // Org fuzzy match
  if (
    entityMatch.orgMatch.strategy === 'fuzzy_name' &&
    entityMatch.orgMatch.confidence < 90
  ) {
    issues.push({
      type: 'org_fuzzy_match',
      severity: 'warning',
      message: `Organization "${row.org_name}" matched to "${entityMatch.orgMatch.matchedName}" with ${entityMatch.orgMatch.confidence}% confidence`,
      field: 'org_name',
      suggestedFix: entityMatch.orgMatch.matchedName,
    });
  }

  // User fuzzy match
  if (
    entityMatch.userMatch.strategy === 'fuzzy_name' &&
    entityMatch.userMatch.confidence < 90
  ) {
    issues.push({
      type: 'user_fuzzy_match',
      severity: 'warning',
      message: `User "${row.user_name}" matched to "${entityMatch.userMatch.matchedName}" with ${entityMatch.userMatch.confidence}% confidence`,
      field: 'user_name',
      suggestedFix: entityMatch.userMatch.matchedName,
    });
  }

  // New org
  if (entityMatch.orgMatch.isNewOrg) {
    issues.push({
      type: 'missing_org',
      severity: 'warning',
      message: `New organization "${row.org_name}" will be created`,
      field: 'org_name',
    });
  }

  // New user
  if (entityMatch.userMatch.isNewUser) {
    issues.push({
      type: 'missing_user',
      severity: 'warning',
      message: `New user "${row.user_name}" will be created`,
      field: 'user_name',
    });
  }

  // Low category confidence
  if (aiResult.categoryConfidence < 80) {
    issues.push({
      type: 'low_category_confidence',
      severity: 'warning',
      message: `Category "${aiResult.category}" assigned with ${aiResult.categoryConfidence}% confidence`,
      field: 'category',
      suggestedFix: aiResult.category,
    });
  }

  return issues;
}

/**
 * Determine overall tier based on confidence and issues
 */
function determineTier(
  overallConfidence: number,
  issues: QueryIssue[]
): ConfidenceTier {
  // If any error severity issues, requires fix
  if (issues.some((i) => i.severity === 'error')) {
    return ConfidenceTier.REQUIRES_FIX;
  }

  // Based on confidence
  if (overallConfidence >= 90) {
    return ConfidenceTier.AUTO_APPROVE;
  } else if (overallConfidence >= 70) {
    return ConfidenceTier.NEEDS_REVIEW;
  } else {
    return ConfidenceTier.REQUIRES_FIX;
  }
}

/**
 * Group analyzed queries into import summary with three tiers
 */
export function createImportSummary(queries: AnalyzedQuery[]): ImportSummary {
  const autoApprove = queries.filter(
    (q) => q.tier === ConfidenceTier.AUTO_APPROVE
  );
  const needsReview = queries.filter(
    (q) => q.tier === ConfidenceTier.NEEDS_REVIEW
  );
  const requiresFix = queries.filter(
    (q) => q.tier === ConfidenceTier.REQUIRES_FIX
  );

  // Group by issue type for batch review
  const orgFuzzyMatches = queries.filter((q) =>
    q.issues.some((i) => i.type === 'org_fuzzy_match')
  );
  const userFuzzyMatches = queries.filter((q) =>
    q.issues.some((i) => i.type === 'user_fuzzy_match')
  );
  const missingOrgs = queries.filter((q) =>
    q.issues.some((i) => i.type === 'missing_org')
  );
  const missingUsers = queries.filter((q) =>
    q.issues.some((i) => i.type === 'missing_user')
  );
  const lowCategoryConfidence = queries.filter((q) =>
    q.issues.some((i) => i.type === 'low_category_confidence')
  );
  const validationErrors = queries.filter((q) =>
    q.issues.some((i) => i.type === 'validation_error')
  );

  // Calculate stats
  const newOrgsCount = new Set(
    queries
      .filter((q) => q.entityMatch.orgMatch.isNewOrg)
      .map((q) => q.finalQuery.org_name)
  ).size;

  const newUsersCount = new Set(
    queries
      .filter((q) => q.entityMatch.userMatch.isNewUser)
      .map((q) => q.finalQuery.user_email)
  ).size;

  const estimatedCost = queries.reduce(
    (sum, q) => sum + q.finalQuery.cost_usd,
    0
  );

  return {
    autoApprove,
    needsReview,
    requiresFix,
    stats: {
      total: queries.length,
      autoApproveCount: autoApprove.length,
      needsReviewCount: needsReview.length,
      requiresFixCount: requiresFix.length,
      newOrgsCount,
      newUsersCount,
      estimatedCost,
    },
    groupedIssues: {
      orgFuzzyMatches,
      userFuzzyMatches,
      missingOrgs,
      missingUsers,
      lowCategoryConfidence,
      validationErrors,
    },
  };
}

// ============================================================================
// DATABASE IMPORT
// ============================================================================

/**
 * Get default account manager ID (first admin user)
 */
async function getDefaultAccountManagerId(supabase: any): Promise<string> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'Admin')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error('No admin user found to use as default account manager');
  }

  return data.id;
}

/**
 * Commit approved queries to database
 */
export async function commitImport(
  request: ImportCommitRequest
): Promise<ImportCommitResult> {
  const supabase = createServiceClient();
  const startTime = Date.now();
  const errors: Array<{ rowNumber: number; error: string }> = [];

  let queriesImported = 0;
  let orgsCreated = 0;
  let usersCreated = 0;

  const createdOrgs: Array<{ orgId: string; orgName: string }> = [];
  const createdUsers: Array<{
    userId: string;
    userName: string;
    userEmail: string;
  }> = [];

  try {
    // Get default account manager for new orgs
    console.log('🔍 Fetching default account manager...');
    const defaultAccountManagerId = await getDefaultAccountManagerId(supabase);
    console.log(`   ✅ Using account manager ID: ${defaultAccountManagerId}`);

    // Group queries by org to batch create
    const orgMap = new Map<string, AnalyzedQuery[]>();
    request.approvedQueries.forEach((q) => {
      const orgName = q.finalQuery.org_name;
      if (!orgMap.has(orgName)) {
        orgMap.set(orgName, []);
      }
      orgMap.get(orgName)!.push(q);
    });

    console.log(`📦 Grouped into ${orgMap.size} organizations`);

    // Process each org
    for (const [orgName, orgQueries] of orgMap) {
      console.log(`\n🏢 Processing org: "${orgName}" (${orgQueries.length} queries)`);
      try {
        let orgId = orgQueries[0].finalQuery.org_id;

        // Create org if needed
        if (!orgId) {
          const orgData = {
            org_name: orgName,
            domain: normalizeDomain(null), // Default to 'TMT'
            account_manager_id: defaultAccountManagerId,
            org_lifecycle_stage: 'trial_active',
            engagement_score: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          console.log('   📝 Creating new org with data:', JSON.stringify(orgData, null, 2));

          const { data: newOrg, error: orgError } = await supabase
            .from('trial_organizations')
            .insert(orgData)
            .select('org_id')
            .single();

          if (orgError) {
            console.error('   ❌ Org creation failed:', orgError);
            throw orgError;
          }

          orgId = newOrg.org_id;
          orgsCreated++;
          createdOrgs.push({ orgId, orgName });
          console.log(`   ✅ Org created: ${orgId}`);
        } else {
          console.log(`   ℹ️  Using existing org: ${orgId}`);
        }

        // Group queries by user within this org
        const userMap = new Map<string, AnalyzedQuery[]>();
        orgQueries.forEach((q) => {
          const userEmail = q.finalQuery.user_email;
          if (!userMap.has(userEmail)) {
            userMap.set(userEmail, []);
          }
          userMap.get(userEmail)!.push(q);
        });

        // Process each user
        for (const [userEmail, userQueries] of userMap) {
          console.log(`\n   👤 Processing user: ${userEmail} (${userQueries.length} queries)`);
          try {
            let userId = userQueries[0].finalQuery.user_id;

            // Create user if needed
            if (!userId) {
              const userData = {
                org_id: orgId,
                email: userEmail,
                name: userQueries[0].finalQuery.user_name,
                account_manager: defaultAccountManagerId,
                current_stage: 'active',
                login_count: 0,
                queries_executed: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              console.log('      📝 Creating new user with data:', JSON.stringify(userData, null, 2));

              const { data: newUser, error: userError } = await supabase
                .from('trial_users')
                .insert(userData)
                .select('user_id')
                .single();

              if (userError) {
                console.error('      ❌ User creation failed:', userError);
                throw userError;
              }

              userId = newUser.user_id;
              usersCreated++;
              createdUsers.push({
                userId,
                userName: userQueries[0].finalQuery.user_name,
                userEmail,
              });
              console.log(`      ✅ User created: ${userId}`);
            } else {
              console.log(`      ℹ️  Using existing user: ${userId}`);
            }

            // Insert queries for this user
            const queriesData = userQueries.map((q) => {
              // Map status values to database-accepted values
              let status = q.finalQuery.status || 'success';
              if (status === 'completed' || status === 'resolved' || status === 'done') {
                status = 'success';
              } else if (status === 'open' || status === 'pending' || status === 'in_progress') {
                status = 'pending';
              } else if (status === 'failed' || status === 'error') {
                status = 'failed';
              }
              // Default to 'success' if not recognized
              if (!['success', 'pending', 'failed'].includes(status)) {
                status = 'success';
              }

              return {
                org_id: orgId,
                user_id: userId,
                query_text: q.finalQuery.query_text,
                query_topic: q.finalQuery.query_topic,
                insight_title: q.finalQuery.insight_title,
                query_category: q.finalQuery.category,
                status,
                confidence_score: q.confidence,
                executed_at: q.finalQuery.executed_at
                  ? (typeof q.finalQuery.executed_at === 'string'
                      ? q.finalQuery.executed_at
                      : q.finalQuery.executed_at.toISOString())
                  : new Date().toISOString(),
                cost_usd: q.finalQuery.cost_usd || null,
              };
            });

            console.log(`      📊 Inserting ${queriesData.length} queries`);
            console.log(`      First query data:`, JSON.stringify(queriesData[0], null, 2));

            const { error: queryError } = await supabase
              .from('platform_queries')
              .insert(queriesData);

            if (queryError) {
              console.error('      ❌ Query insertion failed:', queryError);
              throw queryError;
            }

            queriesImported += queriesData.length;
            console.log(`      ✅ ${queriesData.length} queries inserted`);
          } catch (userError: any) {
            console.error(`      ❌❌❌ USER ERROR for ${userEmail} ❌❌❌`);
            console.error('      Error message:', userError.message);
            console.error('      Error details:', JSON.stringify(userError, Object.getOwnPropertyNames(userError), 2));
            userQueries.forEach((q) => {
              errors.push({
                rowNumber: q.rowNumber,
                error: `User error: ${userError.message}`,
              });
            });
          }
        }
      } catch (orgError: any) {
        console.error(`   ❌❌❌ ORG ERROR for "${orgName}" ❌❌❌`);
        console.error('   Error message:', orgError.message);
        console.error('   Error details:', JSON.stringify(orgError, Object.getOwnPropertyNames(orgError), 2));
        orgQueries.forEach((q) => {
          errors.push({
            rowNumber: q.rowNumber,
            error: `Org error: ${orgError.message}`,
          });
        });
      }
    }

    const duration = Date.now() - startTime;
    const totalCost = request.approvedQueries.reduce(
      (sum, q) => sum + q.finalQuery.cost_usd,
      0
    );

    return {
      success: errors.length === 0,
      summary: {
        queriesImported,
        orgsCreated,
        usersCreated,
        totalCost,
        duration,
      },
      errors,
      createdOrgs,
      createdUsers,
    };
  } catch (error: any) {
    return {
      success: false,
      summary: {
        queriesImported,
        orgsCreated,
        usersCreated,
        totalCost: 0,
        duration: Date.now() - startTime,
      },
      errors: [{ rowNumber: 0, error: error.message }],
      createdOrgs,
      createdUsers,
    };
  }
}
