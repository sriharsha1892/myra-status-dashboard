/**
 * CLI tool to import myRA CSV data
 * Uses the myRA import framework to validate and import queries
 */

import { readFileSync } from 'fs';
import { parseCSVFile, analyzeCSVData, createImportSummary, commitImport } from '/Users/sriharsha/myra-status-dashboard/lib/myra-csv/importer';

// Polyfill File for Node.js environment
class NodeFile {
  name: string;
  lastModified: number;
  private content: string;

  constructor(content: string, filename: string) {
    this.content = content;
    this.name = filename;
    this.lastModified = Date.now();
  }

  async text(): Promise<string> {
    return this.content;
  }
}

async function runImport(csvPath: string, dryRun = false) {
  console.log('🚀 Starting myRA CSV Import\n');
  console.log(`   File: ${csvPath}`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN (no database writes)' : 'LIVE IMPORT'}\n`);
  console.log('='.repeat(80) + '\n');

  try {
    // Step 1: Parse CSV
    console.log('📊 Step 1: Parsing CSV...');
    const fileContent = readFileSync(csvPath, 'utf-8');
    const file = new NodeFile(fileContent, csvPath.split('/').pop() || 'import.csv') as unknown as File;

    const parsed = await parseCSVFile(file);

    console.log(`   ✅ Parsed ${parsed.totalRows} rows`);
    if (parsed.hasErrors) {
      console.log(`   ⚠️  Found ${parsed.errors.length} errors:`);
      parsed.errors.slice(0, 5).forEach(err => {
        console.log(`      Row ${err.row}: ${err.message}`);
      });
      if (parsed.errors.length > 5) {
        console.log(`      ... and ${parsed.errors.length - 5} more errors`);
      }
      process.exit(1);
    }
    console.log();

    // Step 2: Analyze queries (entity matching + AI categorization)
    console.log('🔍 Step 2: Analyzing queries (entity matching + AI)...');
    const analyzedQueries = await analyzeCSVData(parsed.rows);
    const summary = createImportSummary(analyzedQueries);

    console.log(`   ✅ Analyzed ${analyzedQueries.length} queries`);

    // Show confidence tier distribution
    const tierCounts = {
      'auto-approve': 0,
      'needs-review': 0,
      'requires-fix': 0,
    };

    analyzedQueries.forEach(q => {
      tierCounts[q.confidence_tier]++;
    });

    console.log(`   📈 Confidence Distribution:`);
    console.log(`      Auto-Approve: ${tierCounts['auto-approve']} (${((tierCounts['auto-approve']/analyzedQueries.length)*100).toFixed(1)}%)`);
    console.log(`      Needs Review: ${tierCounts['needs-review']} (${((tierCounts['needs-review']/analyzedQueries.length)*100).toFixed(1)}%)`);
    console.log(`      Requires Fix: ${tierCounts['requires-fix']} (${((tierCounts['requires-fix']/analyzedQueries.length)*100).toFixed(1)}%)`);
    console.log();

    // Show issues if any
    if (summary.total_issues > 0) {
      console.log(`   ⚠️  Issues found: ${summary.total_issues}`);
      console.log(`      New orgs: ${summary.new_orgs_count}`);
      console.log(`      New users: ${summary.new_users_count}`);
      console.log(`      Low confidence: ${summary.low_confidence_count}`);
      console.log();
    }

    // Step 3: Show sample of what will be imported
    console.log('📋 Step 3: Import Preview (first 5 queries):');
    console.log('-'.repeat(80));

    analyzedQueries.slice(0, 5).forEach((q, i) => {
      console.log(`\n${i + 1}. ${q.query_text.substring(0, 50)}...`);
      console.log(`   Org: ${q.matched_org_name || q.csv_org_name} ${q.org_match_confidence ? `(${(q.org_match_confidence * 100).toFixed(0)}% match)` : '(NEW)'}`);
      console.log(`   User: ${q.matched_user_name || q.csv_user_name} <${q.matched_user_email || q.csv_user_email}>`);
      console.log(`   Date: ${q.executed_at} | Cost: $${q.cost_usd}`);
      console.log(`   Confidence: ${q.confidence_tier.toUpperCase()}`);
      if (q.issues && q.issues.length > 0) {
        console.log(`   Issues: ${q.issues.map(iss => iss.message).join(', ')}`);
      }
    });

    if (analyzedQueries.length > 5) {
      console.log(`\n   ... and ${analyzedQueries.length - 5} more queries`);
    }
    console.log('\n' + '='.repeat(80) + '\n');

    // Step 4: Commit (if not dry run)
    if (dryRun) {
      console.log('✅ DRY RUN COMPLETE - No data written to database');
      console.log(`\n📊 Summary:`);
      console.log(`   Total queries: ${analyzedQueries.length}`);
      console.log(`   Auto-approve: ${tierCounts['auto-approve']}`);
      console.log(`   Needs review: ${tierCounts['needs-review']}`);
      console.log(`   Requires fix: ${tierCounts['requires-fix']}`);
      console.log(`   New organizations: ${summary.new_orgs_count}`);
      console.log(`   New users: ${summary.new_users_count}\n`);
    } else {
      console.log('💾 Step 4: Committing to database...');

      const commitRequest = {
        queries: analyzedQueries,
        force_commit_all: false, // Only commit auto-approve by default
      };

      const result = await commitImport(commitRequest);

      console.log(`   ✅ Import complete!`);
      console.log();
      console.log('📊 Final Results:');
      console.log(`   Queries imported: ${result.queries_imported}`);
      console.log(`   Organizations created: ${result.orgs_created}`);
      console.log(`   Users created: ${result.users_created}`);
      console.log(`   Queries skipped: ${result.queries_skipped}`);

      if (result.errors.length > 0) {
        console.log(`   ❌ Errors: ${result.errors.length}`);
        result.errors.slice(0, 3).forEach(err => {
          console.log(`      ${err}`);
        });
      }
      console.log();
    }

    console.log('✅ Import process completed successfully!\n');
  } catch (error: any) {
    console.error('\n❌ Import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// CLI
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: npx tsx run-myra-import.ts <csv-file> [--dry-run]');
  console.log('');
  console.log('Options:');
  console.log('  --dry-run    Preview import without writing to database');
  process.exit(1);
}

const csvPath = args[0];
const dryRun = args.includes('--dry-run');

runImport(csvPath, dryRun);
