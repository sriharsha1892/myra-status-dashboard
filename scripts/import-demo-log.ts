/**
 * Script to import Demo Log Excel file into trial management system
 * Run with: npx tsx scripts/import-demo-log.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase credentials not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const EXCEL_FILE = '/Users/sriharsha/Desktop/myRA AI Demo Log.xlsx';
const SHEET_NAME = 'Request for trial licenses';

interface RowData {
  [key: string]: string | number | null | undefined;
}

class DemoLogImporter {
  private importLog: string[] = [];
  private errors: string[] = [];

  private log(message: string) {
    console.log(message);
    this.importLog.push(message);
  }

  private error(message: string) {
    console.error(`ERROR: ${message}`);
    this.errors.push(message);
  }

  private parseDate(dateStr: string | number | null | undefined): string | null {
    if (!dateStr || String(dateStr).toLowerCase() === 'none') {
      return null;
    }

    try {
      const dateString = String(dateStr).trim();

      // Try to parse various date formats
      // Handle ordinal dates like "4th October", "6th October"
      const ordinalMatch = dateString.match(/(\d+)(st|nd|rd|th)?\s+(\w+)\s*(\d{4})?/i);
      if (ordinalMatch) {
        const day = ordinalMatch[1];
        const month = ordinalMatch[3];
        const year = ordinalMatch[4] || new Date().getFullYear();

        const dateObj = new Date(`${month} ${day}, ${year}`);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toISOString();
        }
      }

      // Try parsing as standard date
      const dateObj = new Date(dateString);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString();
      }

      this.log(`  ⚠️  Could not parse date format: '${dateStr}'. Using None.`);
      return null;
    } catch (e) {
      this.log(`  ⚠️  Date parsing error for '${dateStr}'`);
      return null;
    }
  }

  private validateEmail(email: string): boolean {
    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return pattern.test(email);
  }

  private async readExcelData(): Promise<RowData[]> {
    this.log(`\n📖 Reading Excel file: ${EXCEL_FILE}`);

    if (!fs.existsSync(EXCEL_FILE)) {
      throw new Error(`Excel file not found: ${EXCEL_FILE}`);
    }

    // Use Python to read Excel file
    const { execSync } = require('child_process');

    const pythonScript = `
import openpyxl
import json
import sys
from datetime import datetime

try:
    wb = openpyxl.load_workbook('${EXCEL_FILE}')
    ws = wb['${SHEET_NAME}']

    # Parse headers
    headers = []
    for cell in ws[1]:
        headers.append(cell.value)

    # Parse data rows
    data = []
    for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=False), start=2):
        row_data = {}
        for col_num, cell in enumerate(row):
            header = headers[col_num] if col_num < len(headers) else f'Column_{col_num}'
            value = cell.value
            # Convert datetime objects to ISO strings
            if isinstance(value, datetime):
                value = value.isoformat()
            row_data[header] = value

        # Skip empty rows
        if any(v is not None for v in row_data.values()):
            data.append(row_data)

    print(json.dumps(data))
except Exception as e:
    print(json.dumps({'error': str(e)}), file=sys.stderr)
    sys.exit(1)
`;

    try {
      const result = execSync(`python3 << 'PYEOF'\n${pythonScript}\nPYEOF`, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024
      });

      const data = JSON.parse(result);
      if (data.error) {
        throw new Error(data.error);
      }

      this.log(`✅ Found sheet: '${SHEET_NAME}'`);
      this.log(`✅ Read ${data.length} data rows`);

      return data;
    } catch (e: any) {
      throw new Error(`Failed to read Excel file: ${e.message}`);
    }
  }

  private async deleteExistingOrgs(): Promise<void> {
    this.log('\n🗑️  Deleting existing trial organizations...');

    try {
      const result = await supabase
        .from('trial_organizations')
        .select('*', { count: 'exact' });

      const count = result.count || 0;

      if (count > 0) {
        this.log(`   Found ${count} existing organizations`);

        // Delete all organizations (CASCADE will handle related records)
        await supabase
          .from('trial_organizations')
          .delete()
          .neq('org_id', 'null');

        this.log(`✅ Deleted ${count} organizations and all related records`);
      } else {
        this.log('   No existing organizations found');
      }
    } catch (e: any) {
      throw new Error(`Failed to delete existing organizations: ${e.message}`);
    }
  }

  private async createOrganization(companyData: RowData): Promise<any> {
    try {
      const orgName = String(companyData['Company Name'] || '').trim();
      const domain = String(companyData['Domain'] || '').trim();
      const accountManager = String(companyData['Sales POC'] || '').trim();
      const comments = companyData['Comments'] || null;

      if (!orgName) {
        throw new Error('Company Name is required');
      }

      const orgData = {
        org_name: orgName,
        org_domain: domain && domain.toLowerCase() !== 'none' ? domain : null,
        account_manager: accountManager && accountManager.toLowerCase() !== 'none' ? accountManager : null,
        org_lifecycle_stage: 'trial_active',
        comments: comments,
      };

      const { data, error } = await supabase
        .from('trial_organizations')
        .insert([orgData])
        .select();

      if (error || !data || data.length === 0) {
        throw new Error(error?.message || 'Failed to create organization');
      }

      const org = data[0];
      this.log(`  ✅ Created organization: ${orgName} (ID: ${org.org_id})`);
      return org;
    } catch (e: any) {
      throw new Error(`Failed to create organization: ${e.message}`);
    }
  }

  private async createTrialUser(orgId: string, userData: RowData): Promise<any> {
    try {
      const email = String(userData['Email (Primary Contact)'] || '').trim();
      const designation = String(userData['Title/Role (Primary Contact)'] || '').trim();
      const licenseDate = userData['License given on (Date)'];

      if (!email) {
        throw new Error('Email is required');
      }

      if (!this.validateEmail(email)) {
        throw new Error(`Invalid email format: ${email}`);
      }

      // Determine user status based on license date
      const parsedDate = licenseDate ? this.parseDate(licenseDate) : null;
      const userStatus = parsedDate ? 'active' : 'invited';

      // Insert with actual schema fields
      const { data, error } = await supabase
        .from('trial_users')
        .insert([{
          org_id: orgId,
          email: email,
          full_name: email.split('@')[0],
          title_role: designation || null,
        }])
        .select();

      if (error) {
        throw new Error(error.message);
      }
      if (!data || data.length === 0) {
        throw new Error('No data returned from insert');
      }

      const user = data[0];
      this.log(`  ✅ Created trial user: ${email} (Status: ${userStatus})`);
      return user;
    } catch (e: any) {
      throw new Error(`${e.message}`);
    }
  }

  async import(): Promise<boolean> {
    try {
      this.log('\n' + '='.repeat(60));
      this.log('MyRA Demo Log Import - Trial Management System');
      this.log('='.repeat(60));

      // Step 1: Read Excel data
      const excelData = await this.readExcelData();

      // Step 2: Delete existing organizations
      await this.deleteExistingOrgs();

      // Step 3: Import data
      this.log('\n📝 Importing data...');

      for (let idx = 0; idx < excelData.length; idx++) {
        const rowData = excelData[idx];
        this.log(`\n--- Processing Row ${idx + 1} ---`);

        try {
          const companyName = String(rowData['Company Name'] || '').trim();
          const email = String(rowData['Email (Primary Contact)'] || '').trim();

          this.log(`   Company: ${companyName}`);
          this.log(`   Email: ${email}`);

          // Create organization
          const org = await this.createOrganization(rowData);

          // Create trial user
          if (email) {
            const user = await this.createTrialUser(org.org_id, rowData);
          } else {
            this.log(`  ⚠️  No email provided, skipping trial user creation`);
          }
        } catch (e: any) {
          this.error(`Row ${idx + 1}: ${e.message}`);
        }
      }

      // Step 4: Summary
      await this.printSummary();

      return this.errors.length === 0;
    } catch (e: any) {
      this.error(`Import failed: ${e.message}`);
      return false;
    }
  }

  private async printSummary(): Promise<void> {
    this.log('\n' + '='.repeat(60));
    this.log('IMPORT SUMMARY');
    this.log('='.repeat(60));

    try {
      const orgsResult = await supabase.from('trial_organizations').select('*', { count: 'exact' });
      const usersResult = await supabase.from('trial_users').select('*', { count: 'exact' });

      const orgCount = orgsResult.count || 0;
      const userCount = usersResult.count || 0;

      this.log(`\n✅ Import completed successfully!`);
      this.log(`   Organizations created: ${orgCount}`);
      this.log(`   Trial users created: ${userCount}`);

      if (this.errors.length > 0) {
        this.log(`\n⚠️  Errors encountered: ${this.errors.length}`);
        this.errors.forEach(error => {
          this.log(`   - ${error}`);
        });
      } else {
        this.log('\n✅ No errors encountered');
      }
    } catch (e: any) {
      this.log(`Error getting summary: ${e.message}`);
    }

    this.log('\n' + '='.repeat(60));
  }
}

async function main() {
  try {
    const importer = new DemoLogImporter();
    const success = await importer.import();

    if (!success) {
      process.exit(1);
    }
  } catch (e: any) {
    console.error(`FATAL ERROR: ${e.message}`);
    process.exit(1);
  }
}

main();
