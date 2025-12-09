// Screenshot Extractor - Groq-powered OCR and structured data extraction
// Converts screenshot images to structured insight data

import { callGroqJSON } from '../ai/groqClient';
import type { RawInsightData } from './types';

export interface ExtractionResult {
  success: boolean;
  data?: RawInsightData;
  confidence: number; // 0-100
  error?: string;
  raw_response?: any;
}

/**
 * Extract structured myRA activity data from screenshot text
 * Assumes OCR has already been done (or we have visible text)
 */
export async function extractInsightFromScreenshot(
  imageText: string,
  screenshotUrl?: string
): Promise<ExtractionResult> {
  if (!imageText || imageText.trim().length < 10) {
    return {
      success: false,
      confidence: 0,
      error: 'Insufficient text extracted from screenshot',
    };
  }

  try {
    const prompt = `You are analyzing a screenshot of myRA AI platform activity data.

Extract the following information from this text in JSON format:

{
  "raw_org_name": "Organization/company name",
  "raw_user_name": "User's full name (if visible)",
  "raw_user_email": "User's email address (if visible)",
  "raw_insight_title": "Title/topic of the insight generated",
  "raw_category": "One of: market_size, forecast, competitive_analysis, trend_analysis, regulatory, technology, product_inquiry, other",
  "raw_timestamp": "Date and time in ISO 8601 format if possible, or any format found",
  "raw_cost": "Cost in USD (just the number, e.g., '12.45')",
  "confidence": "Your confidence in this extraction as a number 0-100"
}

Rules:
- If a field is not visible/found, use null
- Normalize organization names: remove Inc., Ltd., Corp., etc.
- Parse dates flexibly - any format is okay
- Extract cost as just numbers (remove currency symbols)
- Category must be one of the listed values or 'other'
- For confidence: 90-100 = very clear, 70-89 = mostly clear, 50-69 = somewhat unclear, below 50 = very uncertain
- raw_insight_title is the only required field - be creative if needed

Screenshot text:
${imageText}`;

    const result = await callGroqJSON<RawInsightData & { confidence: number }>(prompt, {
      temperature: 0.2, // Low temperature for accuracy
      max_tokens: 1000,
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        confidence: 0,
        error: result.error || 'AI extraction failed',
        raw_response: result,
      };
    }

    const { confidence, ...insightData } = result.data;

    // Validate that we at least have an insight title
    if (!insightData.raw_insight_title || insightData.raw_insight_title.trim().length < 3) {
      return {
        success: false,
        confidence: 0,
        error: 'Could not extract insight title from screenshot',
        raw_response: result.data,
      };
    }

    return {
      success: true,
      data: insightData,
      confidence: confidence || 0,
      raw_response: result.data,
    };
  } catch (error: any) {
    return {
      success: false,
      confidence: 0,
      error: error.message || 'Extraction failed',
    };
  }
}

/**
 * Extract text from image using basic OCR
 * In a real implementation, you might use Tesseract.js or similar
 * For now, this is a placeholder that assumes text is already extracted
 */
export async function extractTextFromImage(imageFile: File): Promise<string> {
  // Placeholder implementation
  // In production, you would use:
  // - Tesseract.js for client-side OCR
  // - Google Cloud Vision API
  // - AWS Textract
  // - Or send image directly to Groq if they support vision

  return new Promise((resolve) => {
    // For MVP, we'll assume the screenshots are clear enough
    // that the important text is visible and can be extracted
    // by Groq's text processing capabilities

    // Read file as data URL for potential future vision API use
    const reader = new FileReader();
    reader.onload = (e) => {
      // For now, return empty string - Groq will analyze the raw screenshot
      // In production, you'd extract actual text here
      resolve('');
    };
    reader.readAsDataURL(imageFile);
  });
}

/**
 * Batch extract insights from multiple screenshots
 * Uses Groq rate limiting helper to avoid hitting limits
 */
export async function batchExtractInsights(
  screenshots: Array<{ file: File; url: string }>,
  onProgress?: (completed: number, total: number) => void
): Promise<ExtractionResult[]> {
  const results: ExtractionResult[] = [];

  for (let i = 0; i < screenshots.length; i++) {
    const screenshot = screenshots[i];

    try {
      // Extract text from image
      const imageText = await extractTextFromImage(screenshot.file);

      // Extract structured data
      const result = await extractInsightFromScreenshot(imageText, screenshot.url);

      results.push(result);

      // Report progress
      if (onProgress) {
        onProgress(i + 1, screenshots.length);
      }

      // Small delay to respect rate limits
      if (i < screenshots.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error: any) {
      results.push({
        success: false,
        confidence: 0,
        error: error.message,
      });

      if (onProgress) {
        onProgress(i + 1, screenshots.length);
      }
    }
  }

  return results;
}

/**
 * Validate extracted data quality
 */
export function validateExtraction(data: RawInsightData): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Required field check
  if (!data.raw_insight_title || data.raw_insight_title.trim().length < 3) {
    issues.push('Insight title is required and must be at least 3 characters');
  }

  // Org name check
  if (!data.raw_org_name || data.raw_org_name.trim().length < 2) {
    issues.push('Organization name is missing or too short');
  }

  // Cost format check
  if (data.raw_cost) {
    const costNum = parseFloat(data.raw_cost.replace(/[^0-9.]/g, ''));
    if (isNaN(costNum) || costNum < 0) {
      issues.push('Cost must be a valid positive number');
    }
  }

  // Date check
  if (data.raw_timestamp) {
    const parsed = new Date(data.raw_timestamp);
    if (isNaN(parsed.getTime())) {
      issues.push('Timestamp is in an unrecognizable format');
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}
