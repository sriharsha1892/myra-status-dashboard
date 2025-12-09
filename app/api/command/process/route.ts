/**
 * Command Process API - Parse and execute natural language commands
 * POST /api/command/process
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseCommand, parseCommands } from '@/lib/command/parser';
import { isSlashCommand, parseSlashCommand } from '@/lib/command/slashParser';
import {
  resolveOrganization,
  resolveUser,
  getKnownOrganizations,
  getKnownUsers,
  saveEntityAlias,
} from '@/lib/command/entityResolver';
import { executeCommand } from '@/lib/command/actionExecutor';
import {
  type ResolvedCommand,
  type BatchCommandResponse,
  type ConfidenceBreakdown,
  type ParseDiagnostics,
  type ExtractionSpan,
  type ParsedCommandWithSpans,
  getConfidenceTier,
  CONFIDENCE_THRESHOLDS,
} from '@/lib/command/types';
import {
  resolveContextualReferences,
  buildContextPrompt,
  recordOrgUsage,
  recordUserUsage,
  recordAction,
  getSessionSummary,
} from '@/lib/command/sessionContext';
import {
  getCachedUserThreshold,
  recordExecution,
  getUserPreferences,
  getFrequentOrgBoost,
} from '@/lib/command/preferenceService';
import {
  extractMultipleActions,
  type ExtractedAction,
  type MultiActionResult,
} from '@/lib/command/multiActionExtractor';

// Extended resolved command with confidence breakdown
interface ResolvedCommandWithBreakdown extends ResolvedCommand {
  confidenceBreakdown?: ConfidenceBreakdown;
  extractedSpans?: ExtractionSpan[];
  diagnostics?: ParseDiagnostics;
  // Multi-action extraction results
  extractedActions?: ExtractedAction[];
  multiActionEntities?: MultiActionResult['entities'];
}

// Generate unique ID
function generateId(): string {
  return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's parent company for filtering
    const { data: userData } = await supabase
      .from('users')
      .select('parent_company')
      .eq('id', user.id)
      .single();

    const parentCompany = userData?.parent_company;

    // Parse request body
    const body = await request.json();
    const { commands, auto_execute_high_confidence = true } = body;

    if (!commands || !Array.isArray(commands) || commands.length === 0) {
      return NextResponse.json(
        { error: 'No commands provided' },
        { status: 400 }
      );
    }

    // Get known entities, user preferences, and adaptive threshold
    const [knownOrgs, knownUsers, userThreshold, userPreferences] = await Promise.all([
      getKnownOrganizations(parentCompany),
      getKnownUsers(parentCompany),
      getCachedUserThreshold(supabase, user.id),
      getUserPreferences(supabase, user.id),
    ]);

    // Build session context for the current user
    const sessionContext = buildContextPrompt(user.id);
    const sessionSummary = getSessionSummary(user.id);

    const context = { knownOrgs, knownUsers, sessionContext };

    // Parse all commands - try slash commands first, fall back to natural language
    const parseResults: Array<{
      command: string;
      success: boolean;
      parsed?: ParsedCommandWithSpans;
      error?: string;
      diagnostics?: ParseDiagnostics;
      contextResolution?: {
        resolvedOrg: { orgId: string; orgName: string } | null;
        resolvedUser: { userId: string; userName: string } | null;
        resolutionNote: string | null;
        confidenceAdjustment: number;
      };
    }> = [];

    for (const command of commands) {
      // Resolve contextual references (e.g., "same org", "them again")
      const contextResolution = resolveContextualReferences(user.id, command);
      const commandToProcess = contextResolution.cleanedText;

      // Try slash command first
      if (isSlashCommand(commandToProcess)) {
        const slashParsed = parseSlashCommand(commandToProcess);
        if (slashParsed) {
          // Apply context resolution to slash command
          if (contextResolution.resolvedOrg && !slashParsed.org_name) {
            slashParsed.org_name = contextResolution.resolvedOrg.orgName;
          }
          if (contextResolution.resolvedUser && !slashParsed.user_name) {
            slashParsed.user_name = contextResolution.resolvedUser.userName;
          }
          // Apply confidence adjustment
          slashParsed.confidence = Math.min(1.0, slashParsed.confidence + contextResolution.confidenceAdjustment);

          parseResults.push({
            command,
            success: true,
            parsed: slashParsed,
            contextResolution: {
              resolvedOrg: contextResolution.resolvedOrg,
              resolvedUser: contextResolution.resolvedUser,
              resolutionNote: contextResolution.resolutionNote,
              confidenceAdjustment: contextResolution.confidenceAdjustment,
            },
          });
          continue;
        }
      }

      // Fall back to natural language parsing
      const nlResult = await parseCommands([commandToProcess], context);
      const result = nlResult[0];

      // Apply context resolution to parsed result
      if (result.success && result.parsed) {
        if (contextResolution.resolvedOrg && !result.parsed.org_name) {
          result.parsed.org_name = contextResolution.resolvedOrg.orgName;
        }
        if (contextResolution.resolvedUser && !result.parsed.user_name) {
          result.parsed.user_name = contextResolution.resolvedUser.userName;
        }
        // Apply confidence adjustment
        result.parsed.confidence = Math.min(1.0, result.parsed.confidence + contextResolution.confidenceAdjustment);
      }

      parseResults.push({
        ...result,
        command, // Use original command for display
        contextResolution: {
          resolvedOrg: contextResolution.resolvedOrg,
          resolvedUser: contextResolution.resolvedUser,
          resolutionNote: contextResolution.resolutionNote,
          confidenceAdjustment: contextResolution.confidenceAdjustment,
        },
      });
    }

    // Resolve entities and build results
    const results: ResolvedCommandWithBreakdown[] = [];
    let autoExecuted = 0;
    let needsConfirmation = 0;
    let needsDisambiguation = 0;
    let failed = 0;

    for (const parseResult of parseResults) {
      const commandId = generateId();

      if (!parseResult.success || !parseResult.parsed) {
        results.push({
          id: commandId,
          originalText: parseResult.command,
          parsed: {
            action: 'ADD_NOTE',
            confidence: 0,
            org_name: null,
            user_name: null,
            fields: {},
          },
          entities: { org: null, user: null },
          confidenceTier: 'low',
          status: 'failed',
          error: parseResult.error || 'Failed to parse command',
          diagnostics: parseResult.diagnostics,
        });
        failed++;
        continue;
      }

      const { parsed, diagnostics } = parseResult;

      // Resolve organization
      const orgMatch = await resolveOrganization(parsed.org_name, parentCompany);

      // Resolve user (within org if we have one)
      const userMatch = await resolveUser(
        parsed.user_name,
        orgMatch?.id || null
      );

      // Calculate combined confidence with breakdown
      const parseConfidence = parsed.confidence;
      const orgConfidence = orgMatch?.confidence || 0;
      const userConfidence = parsed.user_name ? (userMatch?.confidence || 0) : 1;

      // Weight: 40% parse, 40% org, 20% user
      const weights = { parse: 0.4, org: 0.4, user: 0.2 };
      let combinedConfidence =
        parseConfidence * weights.parse +
        orgConfidence * weights.org +
        userConfidence * weights.user;

      // Apply frequent org boost (up to +0.05 for power users' frequent orgs)
      const frequentOrgBoost = orgMatch?.id
        ? getFrequentOrgBoost(userPreferences, orgMatch.id)
        : 0;
      combinedConfidence = Math.min(1.0, combinedConfidence + frequentOrgBoost);

      // Build confidence breakdown for transparency
      const confidenceBreakdown: ConfidenceBreakdown = {
        parse: parseConfidence,
        org: orgConfidence,
        user: userConfidence,
        weights,
        combined: combinedConfidence,
      };

      const confidenceTier = getConfidenceTier(combinedConfidence);

      // Determine status based on confidence and entity matches
      // Use adaptive threshold (default 0.90, can be 0.85 for power users)
      let status: ResolvedCommand['status'] = 'pending';

      if (!orgMatch?.id) {
        status = 'needs_disambiguation';
        needsDisambiguation++;
      } else if (confidenceTier === 'low' || (orgMatch.alternatives && orgMatch.alternatives.length > 1)) {
        status = 'needs_disambiguation';
        needsDisambiguation++;
      } else if (combinedConfidence < userThreshold) {
        // Use adaptive threshold instead of static tier check
        status = 'needs_confirmation';
        needsConfirmation++;
      } else if (auto_execute_high_confidence) {
        // Confidence meets or exceeds user's adaptive threshold
        status = 'executing';
      }

      // Extract additional actions from the command text
      const multiActionResult = extractMultipleActions(parseResult.command, {
        orgId: orgMatch?.id,
        orgName: orgMatch?.name,
        userId: userMatch?.id,
        userName: userMatch?.name,
      });

      const resolvedCommand: ResolvedCommandWithBreakdown = {
        id: commandId,
        originalText: parseResult.command,
        parsed: {
          ...parsed,
          confidence: combinedConfidence,
        },
        entities: {
          org: orgMatch,
          user: userMatch,
        },
        confidenceTier,
        status,
        // Add transparency fields
        confidenceBreakdown,
        extractedSpans: parsed.extractedSpans,
        diagnostics,
        // Multi-action extraction results
        extractedActions: multiActionResult.extractedActions,
        multiActionEntities: multiActionResult.entities,
      };

      // Auto-execute high confidence commands
      if (status === 'executing' && auto_execute_high_confidence) {
        const startTime = Date.now();
        const execResult = await executeCommand(resolvedCommand, user.id);
        const executionTime = Date.now() - startTime;

        if (execResult.success) {
          resolvedCommand.status = 'success';
          autoExecuted++;

          // Record org/user usage in session context for future "same org" references
          if (orgMatch?.id && orgMatch?.name) {
            recordOrgUsage(user.id, orgMatch.id, orgMatch.name);
          }
          if (userMatch?.id && userMatch?.name && orgMatch?.id && orgMatch?.name) {
            recordUserUsage(user.id, userMatch.id, userMatch.name, orgMatch.id, orgMatch.name);
          }
          recordAction(
            user.id,
            parsed.action,
            orgMatch?.id || null,
            orgMatch?.name || null,
            userMatch?.id || null
          );
        } else {
          resolvedCommand.status = 'failed';
          resolvedCommand.error = execResult.error;
          failed++;
        }

        // Record execution for preference learning (non-blocking)
        recordExecution(supabase, {
          userId: user.id,
          orgId: orgMatch?.id,
          orgName: orgMatch?.name,
          action: parsed.action,
          commandText: parseResult.command,
          confidence: combinedConfidence,
          confidenceTier,
          autoExecuted: true,
          success: execResult.success,
          executionTimeMs: executionTime,
          errorMessage: execResult.error?.message,
        }).catch(err => console.warn('Failed to record execution:', err));

        // Attach execution result
        (resolvedCommand as any).executionResult = execResult;
      }

      results.push(resolvedCommand);
    }

    // Count total extracted actions across all commands
    const totalExtractedActions = results.reduce(
      (sum, r) => sum + (r.extractedActions?.length || 0),
      0
    );

    const response: BatchCommandResponse & {
      sessionContext?: ReturnType<typeof getSessionSummary>;
      userPreferences?: { threshold: number; thresholdAdjusted: boolean; totalCommands: number };
      multiActionSummary?: { total: number; byType: Record<string, number> };
    } = {
      success: true,
      results,
      summary: {
        total: commands.length,
        auto_executed: autoExecuted,
        needs_confirmation: needsConfirmation,
        needs_disambiguation: needsDisambiguation,
        failed,
      },
      // Include session context for UI display
      sessionContext: getSessionSummary(user.id),
      // Include user preferences for UI (threshold indicator)
      userPreferences: userPreferences ? {
        threshold: userPreferences.autoExecuteThreshold,
        thresholdAdjusted: userPreferences.thresholdAdjusted,
        totalCommands: userPreferences.totalCommands,
      } : { threshold: userThreshold, thresholdAdjusted: false, totalCommands: 0 },
      // Multi-action summary
      multiActionSummary: totalExtractedActions > 0 ? {
        total: totalExtractedActions,
        byType: results.reduce((acc, r) => {
          for (const action of r.extractedActions || []) {
            acc[action.action] = (acc[action.action] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>),
      } : undefined,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Command process error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Execute a single confirmed command
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { command, overrides } = body;

    if (!command) {
      return NextResponse.json(
        { error: 'No command provided' },
        { status: 400 }
      );
    }

    // Apply overrides if provided
    const resolvedCommand: ResolvedCommand = {
      ...command,
      entities: {
        org: overrides?.org_id
          ? { ...command.entities.org, id: overrides.org_id }
          : command.entities.org,
        user: overrides?.user_id
          ? { ...command.entities.user, id: overrides.user_id }
          : command.entities.user,
      },
      parsed: {
        ...command.parsed,
        fields: {
          ...command.parsed.fields,
          ...overrides?.fields,
        },
      },
    };

    // If user selected from alternatives, save as alias for future matching
    if (overrides?.org_id && command.parsed.org_name && overrides.org_id !== command.entities.org?.id) {
      // Find the selected org name from alternatives
      const selectedOrg = command.entities.org?.alternatives?.find(
        (alt: any) => alt.id === overrides.org_id
      );
      if (selectedOrg) {
        await saveEntityAlias('org', command.parsed.org_name, overrides.org_id, selectedOrg.name, user.id);
      }
    }

    if (overrides?.user_id && command.parsed.user_name && overrides.user_id !== command.entities.user?.id) {
      const selectedUser = command.entities.user?.alternatives?.find(
        (alt: any) => alt.id === overrides.user_id
      );
      if (selectedUser) {
        await saveEntityAlias('user', command.parsed.user_name, overrides.user_id, selectedUser.name, user.id);
      }
    }

    // Execute the command
    const startTime = Date.now();
    const result = await executeCommand(resolvedCommand, user.id);
    const executionTime = Date.now() - startTime;

    const orgId = resolvedCommand.entities.org?.id;
    const orgName = resolvedCommand.entities.org?.name;
    const targetUserId = resolvedCommand.entities.user?.id;
    const targetUserName = resolvedCommand.entities.user?.name;

    // Record org/user usage in session context for confirmed commands
    if (result.success) {
      if (orgId && orgName) {
        recordOrgUsage(user.id, orgId, orgName);
      }
      if (targetUserId && targetUserName && orgId && orgName) {
        recordUserUsage(user.id, targetUserId, targetUserName, orgId, orgName);
      }
      recordAction(
        user.id,
        resolvedCommand.parsed.action,
        orgId || null,
        orgName || null,
        targetUserId || null
      );
    }

    // Record execution for preference learning (non-blocking)
    recordExecution(supabase, {
      userId: user.id,
      orgId,
      orgName,
      action: resolvedCommand.parsed.action,
      commandText: command.originalText || '',
      confidence: resolvedCommand.parsed.confidence || 0,
      confidenceTier: resolvedCommand.confidenceTier || 'medium',
      autoExecuted: false, // This was a confirmed execution
      success: result.success,
      executionTimeMs: executionTime,
      errorMessage: result.error?.message,
    }).catch(err => console.warn('Failed to record execution:', err));

    return NextResponse.json({
      ...result,
      sessionContext: getSessionSummary(user.id),
    });
  } catch (error: any) {
    console.error('Command execute error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
