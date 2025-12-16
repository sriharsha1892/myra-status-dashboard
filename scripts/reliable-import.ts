#!/usr/bin/env npx tsx
/**
 * Reliable Import CLI
 *
 * A fault-tolerant bulk import tool with checkpointing and resume capability.
 *
 * Usage:
 *   npx tsx scripts/reliable-import.ts prepare --file data.csv --type organization
 *   npx tsx scripts/reliable-import.ts validate --batch <batch-id>
 *   npx tsx scripts/reliable-import.ts import --batch <batch-id>
 *   npx tsx scripts/reliable-import.ts status --batch <batch-id>
 *   npx tsx scripts/reliable-import.ts retry --batch <batch-id>
 *   npx tsx scripts/reliable-import.ts export-failed --batch <batch-id>
 *   npx tsx scripts/reliable-import.ts list
 */

import * as fs from 'fs';
import * as path from 'path';
import * as Papa from 'papaparse';
import { StagingManager } from '../lib/reliableImport/StagingManager';
import { OrganizationHandler } from '../lib/reliableImport/handlers/OrganizationHandler';
import { StatusUpdateHandler } from '../lib/reliableImport/handlers/StatusUpdateHandler';
import { ActivityHandler } from '../lib/reliableImport/handlers/ActivityHandler';
import {
  EntityType,
  StagingRecord,
  BatchSummary,
  EntityHandler,
  DEFAULT_BATCH_CONFIG,
} from '../lib/reliableImport/types';

// ============================================================================
// CLI Parsing
// ============================================================================

interface CLIArgs {
  command: string;
  file?: string;
  text?: string;
  type?: EntityType;
  batch?: string;
  batchSize?: number;
  concurrency?: number;
  name?: string;
  format?: 'csv' | 'json';
  maxRetries?: number;
  watch?: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const result: CLIArgs = { command: args[0] || 'help' };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--file':
      case '-f':
        result.file = next;
        i++;
        break;
      case '--text':
      case '-t':
        result.text = next;
        i++;
        break;
      case '--type':
        result.type = next as EntityType;
        i++;
        break;
      case '--batch':
      case '-b':
        result.batch = next;
        i++;
        break;
      case '--batch-size':
        result.batchSize = parseInt(next, 10);
        i++;
        break;
      case '--concurrency':
        result.concurrency = parseInt(next, 10);
        i++;
        break;
      case '--name':
      case '-n':
        result.name = next;
        i++;
        break;
      case '--format':
        result.format = next as 'csv' | 'json';
        i++;
        break;
      case '--max-retries':
        result.maxRetries = parseInt(next, 10);
        i++;
        break;
      case '--watch':
      case '-w':
        result.watch = true;
        break;
    }
  }

  return result;
}

// ============================================================================
// Progress Display
// ============================================================================

function progressBar(percent: number, width = 30): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function printSummary(summary: BatchSummary): void {
  console.log('\n┌─────────────────────────────────────────────────────┐');
  console.log(`│ Batch: ${summary.batch_name.padEnd(43)} │`);
  console.log(`│ Type: ${summary.entity_type.padEnd(44)} │`);
  console.log(`│ Status: ${summary.status.padEnd(42)} │`);
  console.log('├─────────────────────────────────────────────────────┤');
  console.log(`│ Total:     ${String(summary.total).padStart(6)}                                  │`);
  console.log(`│ Pending:   ${String(summary.pending).padStart(6)}                                  │`);
  console.log(`│ Validated: ${String(summary.validated).padStart(6)}                                  │`);
  console.log(`│ Imported:  ${String(summary.imported).padStart(6)}  ✓                                │`);
  console.log(`│ Failed:    ${String(summary.failed).padStart(6)}  ✗                                │`);
  console.log(`│ Skipped:   ${String(summary.skipped).padStart(6)}  ○                                │`);
  console.log('├─────────────────────────────────────────────────────┤');
  console.log(`│ Progress: ${progressBar(summary.percent_complete)} ${String(summary.percent_complete).padStart(3)}%   │`);
  console.log('└─────────────────────────────────────────────────────┘\n');
}

// ============================================================================
// Handlers
// ============================================================================

function getHandler(entityType: EntityType): EntityHandler {
  switch (entityType) {
    case 'organization':
      return new OrganizationHandler();
    case 'status_update':
      return new StatusUpdateHandler();
    case 'activity':
      return new ActivityHandler();
    case 'user':
      // User imports go through OrganizationHandler (creates user with org)
      return new OrganizationHandler();
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

// ============================================================================
// Commands
// ============================================================================

async function prepareCommand(args: CLIArgs): Promise<void> {
  if (!args.type) {
    console.error('Error: --type is required (organization, status_update, activity)');
    process.exit(1);
  }

  if (!args.file && !args.text) {
    console.error('Error: Either --file or --text is required');
    process.exit(1);
  }

  const staging = new StagingManager();
  const entityType = args.type;

  // Read input data
  let rawRows: Record<string, unknown>[];

  if (args.file) {
    const filePath = path.resolve(args.file);
    if (!fs.existsSync(filePath)) {
      console.error(`Error: File not found: ${filePath}`);
      process.exit(1);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.json') {
      const parsed = JSON.parse(content);
      rawRows = Array.isArray(parsed) ? parsed : [parsed];
    } else {
      // Assume CSV - use PapaParse
      const result = Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h: string) => h.trim(),
        transform: (v: string) => v.trim(),
      });
      rawRows = result.data as Record<string, unknown>[];
    }

    console.log(`Parsed ${rawRows.length} rows from ${path.basename(filePath)}`);
  } else if (args.text) {
    // For text input, create a single row with the text
    // This will be parsed by AI in a future enhancement
    rawRows = [{ raw_text: args.text }];
    console.log('Staging text input for AI parsing...');
  } else {
    rawRows = [];
  }

  if (rawRows.length === 0) {
    console.error('Error: No data to import');
    process.exit(1);
  }

  // Create batch
  const batchName = args.name || `${entityType}-import-${new Date().toISOString().slice(0, 10)}`;
  const batchId = await staging.createBatch({
    name: batchName,
    entityType,
    sourceType: args.file ? (path.extname(args.file) === '.json' ? 'json' : 'csv') : 'text',
    sourceFilename: args.file ? path.basename(args.file) : undefined,
  });

  console.log(`Created batch: ${batchId}`);

  // Stage rows
  const rows = rawRows.map((raw) => ({ raw_data: raw, entity_type: entityType }));
  const count = await staging.stageRows(batchId, rows);

  console.log(`Staged ${count} rows for processing`);
  console.log('');
  console.log('Next steps:');
  console.log(`  1. Validate: npx tsx scripts/reliable-import.ts validate --batch ${batchId}`);
  console.log(`  2. Import:   npx tsx scripts/reliable-import.ts import --batch ${batchId}`);
}

async function validateCommand(args: CLIArgs): Promise<void> {
  if (!args.batch) {
    console.error('Error: --batch is required');
    process.exit(1);
  }

  const staging = new StagingManager();
  const batch = await staging.getBatch(args.batch);

  if (!batch) {
    console.error(`Error: Batch not found: ${args.batch}`);
    process.exit(1);
  }

  const handler = getHandler(batch.entity_type as EntityType);

  console.log(`Validating batch: ${batch.batch_name}`);
  console.log(`Entity type: ${batch.entity_type}`);

  await staging.updateBatchStatus(args.batch, 'validating');

  // Get pending rows
  const pendingRows = await staging.getRowsByStatus(args.batch, 'pending');
  console.log(`Found ${pendingRows.length} pending rows to validate`);

  let validated = 0;
  let failed = 0;

  for (const row of pendingRows) {
    // Parse
    const parseResult = await handler.parse(row.raw_data);

    if (!parseResult.data) {
      await staging.updateRowStatus(row.staging_id, 'parse_failed', {
        error_message: parseResult.error || 'Parse failed',
      });
      failed++;
      continue;
    }

    // Update parsed data
    await staging.updateRowStatus(row.staging_id, 'parsed', {
      parsed_data: parseResult.data as Record<string, unknown>,
    });

    // Validate
    const validationResult = await handler.validate(parseResult.data);

    if (!validationResult.valid) {
      await staging.updateRowStatus(row.staging_id, 'validation_failed', {
        error_message: validationResult.errors.join('; '),
      });
      failed++;
    } else {
      await staging.updateRowStatus(row.staging_id, 'validated');
      validated++;
    }

    // Progress output every 10 rows
    if ((validated + failed) % 10 === 0) {
      process.stdout.write(`\rProcessed ${validated + failed}/${pendingRows.length}...`);
    }
  }

  console.log(''); // New line after progress
  await staging.updateBatchStatus(args.batch, 'validated');
  await staging.updateBatchStats(args.batch);

  const summary = await staging.getBatchSummary(args.batch);
  if (summary) printSummary(summary);

  console.log(`Validation complete: ${validated} valid, ${failed} failed`);

  if (validated > 0) {
    console.log('');
    console.log('Ready to import:');
    console.log(`  npx tsx scripts/reliable-import.ts import --batch ${args.batch}`);
  }
}

async function importCommand(args: CLIArgs): Promise<void> {
  if (!args.batch) {
    console.error('Error: --batch is required');
    process.exit(1);
  }

  const staging = new StagingManager();
  const batch = await staging.getBatch(args.batch);

  if (!batch) {
    console.error(`Error: Batch not found: ${args.batch}`);
    process.exit(1);
  }

  const handler = getHandler(batch.entity_type as EntityType);
  const batchSize = args.batchSize || DEFAULT_BATCH_CONFIG.batchSize;

  console.log(`Importing batch: ${batch.batch_name}`);
  console.log(`Batch size: ${batchSize}`);

  // Reset any stuck rows from previous crash
  const resetCount = await staging.resetStuckRows(args.batch);
  if (resetCount > 0) {
    console.log(`Reset ${resetCount} stuck rows from previous run`);
  }

  await staging.updateBatchStatus(args.batch, 'importing');

  // Process in batches with cursor-based pagination
  let offset = 0;
  let imported = 0;
  let failed = 0;
  let skipped = 0;
  let hasMore = true;

  const startTime = Date.now();

  while (hasMore) {
    const rows = await staging.getRowsByStatus(args.batch, 'validated', {
      limit: batchSize,
      offset: 0, // Always 0 since we update status
    });

    if (rows.length === 0) {
      hasMore = false;
      break;
    }

    for (const row of rows) {
      // Mark as importing (for crash recovery)
      await staging.updateRowStatus(row.staging_id, 'importing');

      try {
        const data = row.parsed_data;
        if (!data) {
          await staging.updateRowStatus(row.staging_id, 'import_failed', {
            error_message: 'No parsed data',
          });
          failed++;
          continue;
        }

        // Check for duplicate
        const dupCheck = await handler.checkDuplicate(data);
        if (dupCheck.isDuplicate) {
          await staging.updateRowStatus(row.staging_id, 'skipped', {
            imported_id: dupCheck.existingId || undefined,
            error_message: dupCheck.reason || 'Duplicate detected',
          });
          skipped++;
          continue;
        }

        // Import
        const result = await handler.import(data);

        if (result.error) {
          await staging.updateRowStatus(row.staging_id, 'import_failed', {
            error_message: result.error,
          });
          failed++;
        } else {
          await staging.updateRowStatus(row.staging_id, 'imported', {
            imported_id: result.id || undefined,
            imported_id_secondary: result.secondaryId || undefined,
          });
          imported++;
        }
      } catch (error) {
        await staging.updateRowStatus(row.staging_id, 'import_failed', {
          error_message: (error as Error).message,
          error_details: { stack: (error as Error).stack },
        });
        failed++;
      }

      // Progress output
      const total = imported + failed + skipped;
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const rate = total / Math.max(elapsed, 1);
      const remaining = batch.total_rows - total;
      const eta = Math.ceil(remaining / Math.max(rate, 0.1));

      process.stdout.write(
        `\r${progressBar(Math.round((total / batch.total_rows) * 100))} ${total}/${batch.total_rows} | ` +
          `${imported} imported, ${failed} failed, ${skipped} skipped | ETA: ${formatDuration(eta)}    `
      );

      // Small delay between imports to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    offset += rows.length;
  }

  console.log(''); // New line after progress

  await staging.updateBatchStatus(args.batch, 'completed');
  await staging.updateBatchStats(args.batch);

  const summary = await staging.getBatchSummary(args.batch);
  if (summary) printSummary(summary);

  console.log(`Import complete in ${formatDuration(Math.floor((Date.now() - startTime) / 1000))}`);

  if (failed > 0) {
    console.log('');
    console.log('Some imports failed. To retry:');
    console.log(`  npx tsx scripts/reliable-import.ts retry --batch ${args.batch}`);
    console.log('');
    console.log('To export failed rows for manual review:');
    console.log(`  npx tsx scripts/reliable-import.ts export-failed --batch ${args.batch}`);
  }
}

async function statusCommand(args: CLIArgs): Promise<void> {
  const staging = new StagingManager();

  if (args.batch) {
    const summary = await staging.getBatchSummary(args.batch);
    if (!summary) {
      console.error(`Error: Batch not found: ${args.batch}`);
      process.exit(1);
    }
    printSummary(summary);

    // Show recent errors
    const errors = await staging.getRecentErrors(args.batch);
    if (errors.length > 0) {
      console.log('Recent errors:');
      for (const err of errors) {
        console.log(`  Row ${err.row_number}: ${err.error}`);
      }
    }
  } else {
    // List all batches
    const batches = await staging.listBatches({ limit: 10 });

    if (batches.length === 0) {
      console.log('No import batches found.');
      return;
    }

    console.log('\nRecent Import Batches:');
    console.log('─'.repeat(80));

    for (const batch of batches) {
      const status = batch.status.padEnd(12);
      const name = batch.batch_name.slice(0, 30).padEnd(30);
      const stats = `${batch.imported_count}/${batch.total_rows} imported`;
      console.log(`${batch.batch_id.slice(0, 8)}... | ${name} | ${status} | ${stats}`);
    }

    console.log('');
    console.log('For details: npx tsx scripts/reliable-import.ts status --batch <batch-id>');
  }
}

async function retryCommand(args: CLIArgs): Promise<void> {
  if (!args.batch) {
    console.error('Error: --batch is required');
    process.exit(1);
  }

  const staging = new StagingManager();
  const batch = await staging.getBatch(args.batch);

  if (!batch) {
    console.error(`Error: Batch not found: ${args.batch}`);
    process.exit(1);
  }

  const maxRetries = args.maxRetries || 3;

  // Get failed rows that haven't exceeded max retries
  const failedRows = await staging.getFailedRows(args.batch, maxRetries);

  if (failedRows.length === 0) {
    console.log('No failed rows to retry.');
    return;
  }

  console.log(`Found ${failedRows.length} failed rows to retry (max ${maxRetries} attempts)`);

  // Reset failed rows to validated for re-import
  await staging.batchUpdateStatus(
    failedRows.map((r) => r.staging_id),
    'validated'
  );

  console.log('Reset failed rows to validated status.');
  console.log('');
  console.log('Now run import again:');
  console.log(`  npx tsx scripts/reliable-import.ts import --batch ${args.batch}`);
}

async function exportFailedCommand(args: CLIArgs): Promise<void> {
  if (!args.batch) {
    console.error('Error: --batch is required');
    process.exit(1);
  }

  const staging = new StagingManager();
  const failedRows = await staging.getRowsByStatus(args.batch, [
    'parse_failed',
    'validation_failed',
    'import_failed',
  ]);

  if (failedRows.length === 0) {
    console.log('No failed rows to export.');
    return;
  }

  const format = args.format || 'json';

  if (format === 'json') {
    const output = failedRows.map((row) => ({
      row_number: row.row_number,
      status: row.status,
      error: row.error_message,
      raw_data: row.raw_data,
      parsed_data: row.parsed_data,
    }));
    console.log(JSON.stringify(output, null, 2));
  } else {
    // CSV output
    console.log('row_number,status,error,raw_data');
    for (const row of failedRows) {
      const rawDataStr = JSON.stringify(row.raw_data).replace(/"/g, '""');
      console.log(`${row.row_number},${row.status},"${row.error_message}","${rawDataStr}"`);
    }
  }
}

async function listCommand(): Promise<void> {
  const staging = new StagingManager();
  const batches = await staging.listBatches({ limit: 20 });

  if (batches.length === 0) {
    console.log('No import batches found.');
    console.log('');
    console.log('To start a new import:');
    console.log('  npx tsx scripts/reliable-import.ts prepare --file data.csv --type organization');
    return;
  }

  console.log('\nImport Batches:');
  console.log('═'.repeat(100));
  console.log(
    'ID'.padEnd(10) +
      'Name'.padEnd(35) +
      'Type'.padEnd(15) +
      'Status'.padEnd(12) +
      'Progress'.padEnd(28)
  );
  console.log('─'.repeat(100));

  for (const batch of batches) {
    const id = batch.batch_id.slice(0, 8);
    const name = batch.batch_name.slice(0, 33).padEnd(33);
    const type = batch.entity_type.padEnd(13);
    const status = batch.status.padEnd(10);
    const progress = `${batch.imported_count}/${batch.total_rows} (${batch.failed_count} failed)`;

    console.log(`${id}  ${name}  ${type}  ${status}  ${progress}`);
  }

  console.log('═'.repeat(100));
}

function helpCommand(): void {
  console.log(`
Reliable Import CLI - Fault-tolerant bulk import with checkpointing

USAGE:
  npx tsx scripts/reliable-import.ts <command> [options]

COMMANDS:
  prepare       Parse input file and stage rows for import
  validate      Validate all staged rows
  import        Import validated rows to database
  status        Show batch status and progress
  retry         Retry failed rows
  export-failed Export failed rows for manual review
  list          List all import batches
  help          Show this help message

OPTIONS:
  --file, -f      Input file path (CSV or JSON)
  --text, -t      Raw text input (for AI parsing)
  --type          Entity type: organization, status_update, activity
  --batch, -b     Batch ID for operations
  --batch-size    Records per batch (default: 50)
  --name, -n      Custom batch name
  --format        Export format: csv, json (default: json)
  --max-retries   Maximum retry attempts (default: 3)

EXAMPLES:
  # Import organizations from CSV
  npx tsx scripts/reliable-import.ts prepare --file orgs.csv --type organization
  npx tsx scripts/reliable-import.ts validate --batch <batch-id>
  npx tsx scripts/reliable-import.ts import --batch <batch-id>

  # Check status
  npx tsx scripts/reliable-import.ts status --batch <batch-id>

  # Retry failed rows
  npx tsx scripts/reliable-import.ts retry --batch <batch-id>

  # Export failed rows to fix manually
  npx tsx scripts/reliable-import.ts export-failed --batch <batch-id> > failed.json
`);
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const args = parseArgs();

  try {
    switch (args.command) {
      case 'prepare':
        await prepareCommand(args);
        break;
      case 'validate':
        await validateCommand(args);
        break;
      case 'import':
        await importCommand(args);
        break;
      case 'status':
        await statusCommand(args);
        break;
      case 'retry':
        await retryCommand(args);
        break;
      case 'export-failed':
        await exportFailedCommand(args);
        break;
      case 'list':
        await listCommand();
        break;
      case 'help':
      default:
        helpCommand();
        break;
    }
  } catch (error) {
    console.error('Error:', (error as Error).message);
    if (process.env.DEBUG) {
      console.error((error as Error).stack);
    }
    process.exit(1);
  }
}

main();
