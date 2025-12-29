/**
 * Locked-Template MSA Generator
 *
 * This module generates MSA documents by:
 * 1. Loading a pre-created master template (with placeholder tokens)
 * 2. Replacing tokens with provided values using docxtemplater
 * 3. Validating the output
 *
 * LEGAL IMMUTABILITY:
 * - NO legal text is stored in code
 * - ALL legal content comes from the master template
 * - Only placeholder tokens are replaced
 * - Document structure is NEVER modified
 */

import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import type { PlaceholderValues } from './placeholder-contract';
import { validateRequiredPlaceholders, MSAValidationError } from './validation';

// Path to the master template (relative to public folder)
const MASTER_TEMPLATE_PATH = '/templates/myRA_MSA_MASTER.docx';

/**
 * Load the master template from the public folder.
 */
async function loadMasterTemplate(): Promise<ArrayBuffer> {
  const response = await fetch(MASTER_TEMPLATE_PATH);

  if (!response.ok) {
    throw new MSAValidationError(
      `Failed to load master template from ${MASTER_TEMPLATE_PATH}: ${response.status} ${response.statusText}`,
      'TEMPLATE_ERROR'
    );
  }

  return response.arrayBuffer();
}

/**
 * Generate a locked-template MSA document using docxtemplater.
 *
 * @param values - The placeholder values to substitute
 * @returns The generated document as a Uint8Array
 * @throws MSAValidationError if validation fails
 */
export async function generateLockedMSA(
  values: PlaceholderValues
): Promise<Uint8Array> {
  // 1. Validate all required placeholders have values
  validateRequiredPlaceholders(values);

  // 2. Load the master template
  const templateBytes = await loadMasterTemplate();

  // 3. Create PizZip instance from template
  const zip = new PizZip(templateBytes);

  // 4. Create docxtemplater instance with custom delimiters (our template uses {{}})
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
  });

  // 5. Render the document with placeholder values
  // docxtemplater automatically handles split tokens across XML runs
  try {
    doc.render(values);
  } catch (error) {
    // Handle docxtemplater-specific errors
    if (error instanceof Error) {
      throw new MSAValidationError(
        `Template rendering failed: ${error.message}`,
        'TEMPLATE_ERROR'
      );
    }
    throw error;
  }

  // 6. Generate the output
  const outputBuffer = doc.getZip().generate({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  return outputBuffer;
}

/**
 * Generate filename for the locked-template MSA.
 *
 * @param values - The placeholder values (uses client name for code)
 * @returns Filename in format myRA_MSA_{CODE}_v1_{YYYYMMDD}.docx
 */
export function generateLockedMSAFilename(values: PlaceholderValues): string {
  const clientName = values.CLIENT_LEGAL_NAME || values.SOF_CLIENT_NAME || 'CLIENT';

  // Generate client code from name (first 4 letters, removing common suffixes)
  const suffixes = ['inc', 'llc', 'ltd', 'pvt', 'corp', 'limited', 'gmbh', 'ag', 'sa', 'bv'];
  const words = clientName
    .split(/[\s,.-]+/)
    .filter(word => !suffixes.includes(word.toLowerCase()))
    .filter(word => word.length > 0);

  let code: string;
  if (words.length === 0) {
    code = 'MSA';
  } else if (words.length === 1) {
    code = words[0].toUpperCase().slice(0, 4);
  } else {
    code = words
      .map(word => word[0].toUpperCase())
      .join('')
      .slice(0, 4);
  }

  // Format date as YYYYMMDD
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  return `myRA_MSA_${code}_v1_${dateStr}.docx`;
}

/**
 * Convert PlaceholderValues to a download-ready blob and trigger download.
 */
export async function downloadLockedMSA(values: PlaceholderValues): Promise<void> {
  const bytes = await generateLockedMSA(values);
  const filename = generateLockedMSAFilename(values);

  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Preview the locked MSA by generating it and returning the blob URL.
 */
export async function previewLockedMSA(
  values: PlaceholderValues
): Promise<{ url: string; filename: string }> {
  const bytes = await generateLockedMSA(values);
  const filename = generateLockedMSAFilename(values);

  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const url = URL.createObjectURL(blob);

  return { url, filename };
}

// Re-export types and utilities for convenience
export type { PlaceholderValues } from './placeholder-contract';
export { REQUIRED_PLACEHOLDERS, OPTIONAL_PLACEHOLDERS, ALL_PLACEHOLDERS } from './placeholder-contract';
export { MSAValidationError } from './validation';
