/**
 * Office Script: Sync Demo Log to Portal
 *
 * This script reads data from the Excel sheet and opens the portal
 * with the data pre-loaded for review.
 *
 * Installation:
 * 1. Open your Excel file in Excel Online or Excel Desktop (Microsoft 365)
 * 2. Go to Automate tab → New Script
 * 3. Paste this entire script
 * 4. Save as "Sync to Portal"
 * 5. (Optional) Add to Quick Access Toolbar for one-click access
 *
 * Usage:
 * 1. Click the "Sync to Portal" button or run the script
 * 2. A dialog will appear with a link to open the portal
 * 3. Click the link to open the portal with your data
 * 4. Review the data in the portal and commit changes
 */

function main(workbook: ExcelScript.Workbook): string {
  // Get the active worksheet (demo log sheet)
  const sheet = workbook.getActiveWorksheet();

  // Get the used range (all data including headers)
  const range = sheet.getUsedRange();

  if (!range) {
    return "Error: No data found in the worksheet";
  }

  const values = range.getValues();

  if (values.length < 2) {
    return "Error: No data rows found (need at least headers + 1 data row)";
  }

  // First row is headers
  const headers = values[0] as (string | number | boolean)[];
  const dataRows = values.slice(1);

  // Convert to JSON objects
  const rows: Record<string, unknown>[] = [];

  for (const row of dataRows) {
    const rowData: Record<string, unknown> = {};
    let hasData = false;

    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i]).trim();
      const value = row[i];

      if (header) {
        rowData[header] = value;
        if (value !== null && value !== undefined && value !== '') {
          hasData = true;
        }
      }
    }

    // Only include rows with actual data
    if (hasData) {
      rows.push(rowData);
    }
  }

  if (rows.length === 0) {
    return "Error: No valid data rows found";
  }

  // Encode data as base64
  const jsonString = JSON.stringify(rows);
  const base64Data = encodeToBase64(jsonString);

  // Build the URL
  const portalUrl = `https://myra-status-dashboard.vercel.app/quote/admin?tab=reporting&sync=excel&data=${base64Data}`;

  // Return summary and URL
  // Note: Office Scripts cannot directly open browser windows,
  // so we return the URL for the user to click
  return `
=== Demo Log Sync ===

Found ${rows.length} data rows with ${headers.length} columns.

Headers detected:
${headers.slice(0, 5).join(', ')}${headers.length > 5 ? ', ...' : ''}

Copy and paste this URL in your browser to review and import:

${portalUrl}

Or use the button below if running via Power Automate.
`;
}

/**
 * Base64 encoding function (Office Script compatible)
 */
function encodeToBase64(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;

  // Encode string to UTF-8 byte array first
  const bytes: number[] = [];
  for (let j = 0; j < str.length; j++) {
    const code = str.charCodeAt(j);
    if (code < 128) {
      bytes.push(code);
    } else if (code < 2048) {
      bytes.push(192 | (code >> 6));
      bytes.push(128 | (code & 63));
    } else if (code < 65536) {
      bytes.push(224 | (code >> 12));
      bytes.push(128 | ((code >> 6) & 63));
      bytes.push(128 | (code & 63));
    }
  }

  // Base64 encode
  while (i < bytes.length) {
    const a = bytes[i++] || 0;
    const b = bytes[i++] || 0;
    const c = bytes[i++] || 0;

    const bitmap = (a << 16) | (b << 8) | c;

    result += chars.charAt((bitmap >> 18) & 63);
    result += chars.charAt((bitmap >> 12) & 63);
    result += i > bytes.length + 1 ? '=' : chars.charAt((bitmap >> 6) & 63);
    result += i > bytes.length ? '=' : chars.charAt(bitmap & 63);
  }

  return encodeURIComponent(result);
}
