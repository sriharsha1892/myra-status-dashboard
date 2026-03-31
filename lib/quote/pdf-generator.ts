import { PDFDocument, StandardFonts, PDFPage, PDFFont, degrees, rgb } from 'pdf-lib';
import type { QuoteFormData, PPUQuoteRow, PricingOptionGroup, Currency } from './types';
import {
  PDF_COLORS,
  PAGE_WIDTH,
  PAGE_HEIGHT,
  MARGIN_LEFT,
  MARGIN_RIGHT,
  CONTENT_WIDTH,
  STATIC_CONTENT,
  COMPANY_SUFFIXES,
  getBillingText,
  DEFAULT_PAYMENT_TERMS,
} from './constants';

// Sanitize text for PDF standard fonts (WinAnsi encoding)
// Replaces special Unicode characters with ASCII equivalents
function sanitizeForPdf(text: string): string {
  if (!text) return '';

  // Common character replacements for WinAnsi compatibility (using Unicode escapes)
  const replacements: Record<string, string> = {
    // Turkish characters
    '\u015F': 's', '\u015E': 'S', '\u011F': 'g', '\u011E': 'G', '\u0131': 'i', '\u0130': 'I',
    // Polish characters
    '\u0105': 'a', '\u0107': 'c', '\u0119': 'e', '\u0142': 'l', '\u0144': 'n', '\u00F3': 'o', '\u015B': 's', '\u017A': 'z', '\u017C': 'z',
    '\u0104': 'A', '\u0106': 'C', '\u0118': 'E', '\u0141': 'L', '\u0143': 'N', '\u00D3': 'O', '\u015A': 'S', '\u0179': 'Z', '\u017B': 'Z',
    // Czech/Slovak characters
    '\u0159': 'r', '\u0158': 'R', '\u016F': 'u', '\u016E': 'U', '\u011B': 'e', '\u011A': 'E', '\u0161': 's', '\u0160': 'S', '\u010D': 'c', '\u010C': 'C', '\u017E': 'z', '\u017D': 'Z', '\u010F': 'd', '\u010E': 'D', '\u0165': 't', '\u0164': 'T', '\u0148': 'n', '\u0147': 'N',
    // Romanian characters
    '\u0103': 'a', '\u0102': 'A', '\u021B': 't', '\u021A': 'T', '\u00E2': 'a', '\u00C2': 'A', '\u00EE': 'i', '\u00CE': 'I',
    // Vietnamese common (simplified)
    '\u0111': 'd', '\u0110': 'D',
    // Smart quotes and special punctuation
    '\u2018': "'", '\u2019': "'", '\u201C': '"', '\u201D': '"', '\u2013': '-', '\u2014': '-', '\u2026': '...',
    // Other common Unicode
    '\u2022': '*', '\u00D7': 'x', '\u00F7': '/', '\u2248': '~', '\u2260': '!=', '\u2264': '<=', '\u2265': '>=',
  };

  let result = text;
  for (const [char, replacement] of Object.entries(replacements)) {
    result = result.split(char).join(replacement);
  }

  // Remove any remaining non-WinAnsi characters (codes > 255 that aren't replaced)
  // Keep standard ASCII and extended Latin-1 (which WinAnsi supports)
  result = result.replace(/[^\x00-\xFF]/g, '');

  return result;
}

// Currency formatting
// Note: Using "INR " instead of "₹" because standard PDF fonts don't support the rupee symbol
export function formatCurrency(value: string, currency: Currency): string {
  const num = parseFloat(value.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return value;

  // Using ASCII-compatible symbols for PDF standard fonts
  const symbols: Record<Currency, string> = { USD: '$', EUR: 'EUR ', GBP: 'GBP ', INR: 'INR ' };

  if (currency === 'INR') {
    return symbols[currency] + num.toLocaleString('en-IN');
  }
  return symbols[currency] + num.toLocaleString('en-US');
}

// Currency formatting for display (UI) - uses actual symbols
export function formatCurrencyDisplay(value: string, currency: Currency): string {
  const num = parseFloat(value.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return value;

  const symbols: Record<Currency, string> = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };

  if (currency === 'INR') {
    return symbols[currency] + num.toLocaleString('en-IN');
  }
  return symbols[currency] + num.toLocaleString('en-US');
}

// Generate client code from company name
export function generateClientCode(companyName: string): string {
  const words = companyName
    .split(/[\s,.-]+/)
    .filter(word => !COMPANY_SUFFIXES.some(suffix =>
      word.toLowerCase() === suffix.toLowerCase()
    ))
    .filter(word => word.length > 0);

  if (words.length === 0) return 'QUOTE';

  if (words.length === 1) {
    return words[0].toUpperCase().slice(0, 4);
  }

  const code = words
    .map(word => word[0].toUpperCase())
    .join('')
    .slice(0, 4);

  return code || 'QUOTE';
}

// Generate quote reference number
export function generateQuoteRef(quoteDate: string): string {
  const date = new Date(quoteDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000); // 4-digit random
  return `MQ-${year}${month}${day}-${random}`;
}

// Format date as DD MMM YYYY
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Format date for filename YYYYMMDD
function formatDateForFilename(isoDate: string): string {
  const date = new Date(isoDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// Generate filename
export function generateFilename(data: QuoteFormData): string {
  const clientCode = generateClientCode(data.preparedFor);
  const dateStr = formatDateForFilename(data.quoteDate);
  return `myRA_Quote_${clientCode}_${dateStr}.pdf`;
}

// Helper to draw text with word wrap
function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: PDFFont,
  fontSize: number,
  color: ReturnType<typeof rgb>,
  lineHeight: number = 1.4
): number {
  const words = text.split(' ');
  let currentLine = '';
  let currentY = y;

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > maxWidth && currentLine) {
      page.drawText(currentLine, { x, y: currentY, size: fontSize, font, color });
      currentLine = word;
      currentY -= fontSize * lineHeight;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    page.drawText(currentLine, { x, y: currentY, size: fontSize, font, color });
    currentY -= fontSize * lineHeight;
  }

  return currentY;
}

// Draw section header with underline accent (no vertical bar)
function drawSectionHeader(
  page: PDFPage,
  title: string,
  y: number,
  fontBold: PDFFont
): number {
  // Title text (12pt, slightly larger for better hierarchy)
  page.drawText(title, {
    x: MARGIN_LEFT,
    y: y,
    size: 12,
    font: fontBold,
    color: PDF_COLORS.slate900,
  });

  // Violet underline accent
  const textWidth = fontBold.widthOfTextAtSize(title, 12);
  page.drawLine({
    start: { x: MARGIN_LEFT, y: y - 4 },
    end: { x: MARGIN_LEFT + textWidth + 8, y: y - 4 },
    thickness: 1.5,
    color: PDF_COLORS.violet,
  });

  return y - 24;
}

// Draw bullet point
function drawBullet(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  fontSize: number = 9
): number {
  // Violet bullet circle
  page.drawCircle({
    x: x + 3,
    y: y + 3,
    size: 2,
    color: PDF_COLORS.violet,
  });

  const bulletX = x + 12;
  const maxWidth = CONTENT_WIDTH - 12;
  return drawWrappedText(page, text, bulletX, y, maxWidth, font, fontSize, PDF_COLORS.slate600);
}

// Draw footer with Page X of Y
function drawFooter(page: PDFPage, pageNum: number, totalPages: number, font: PDFFont, fontItalic: PDFFont): void {
  const footerY = 36;

  // Divider line
  page.drawLine({
    start: { x: MARGIN_LEFT, y: footerY + 24 },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: footerY + 24 },
    thickness: 0.5,
    color: PDF_COLORS.slate200,
  });

  // Footer line 1 - Certifications
  page.drawText(STATIC_CONTENT.footerLine1, {
    x: MARGIN_LEFT,
    y: footerY + 10,
    size: 6,
    font: font,
    color: PDF_COLORS.slate500,
  });

  // Footer line 2 - Trademark notice (at the very end)
  page.drawText(STATIC_CONTENT.footerLine2, {
    x: MARGIN_LEFT,
    y: footerY - 2,
    size: 5,
    font: fontItalic,
    color: PDF_COLORS.slate400,
  });

  // Page number (Page X of Y)
  const pageText = `Page ${pageNum} of ${totalPages}`;
  const pageTextWidth = font.widthOfTextAtSize(pageText, 7);
  page.drawText(pageText, {
    x: PAGE_WIDTH - MARGIN_RIGHT - pageTextWidth,
    y: footerY + 10,
    size: 7,
    font: font,
    color: PDF_COLORS.slate500,
  });

  // Website
  const website = 'product.ask-myra.ai';
  const websiteWidth = font.widthOfTextAtSize(website, 7);
  page.drawText(website, {
    x: PAGE_WIDTH - MARGIN_RIGHT - websiteWidth,
    y: footerY - 2,
    size: 7,
    font: font,
    color: PDF_COLORS.violet,
  });
}

// Draw confidential watermark
function drawConfidentialWatermark(page: PDFPage, font: PDFFont): void {
  const text = 'CONFIDENTIAL';
  const fontSize = 60;

  // Calculate center position
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const centerX = PAGE_WIDTH / 2;
  const centerY = PAGE_HEIGHT / 2;

  page.drawText(text, {
    x: centerX - textWidth / 2 + 50, // Slight offset for rotation
    y: centerY - 20,
    size: fontSize,
    font: font,
    color: PDF_COLORS.slate200,
    opacity: 0.15,
    rotate: degrees(45),
  });
}

// Draw a PPU investment table on a page at the given y position
function drawPPUTable(
  page: PDFPage,
  ppuRows: PPUQuoteRow[],
  showPromotionalPrice: boolean,
  showOverageRate: boolean,
  currency: Currency,
  y: number,
  font: PDFFont,
  fontBold: PDFFont
): number {
  const tableX = MARGIN_LEFT;
  const rowHeight = 24;
  const validRows = ppuRows.filter(r => r.term || r.projectsIncluded || r.offerPrice);

  // Column setup
  const headers: string[] = ['Term', 'Users', 'Projects', 'Consult Hrs'];
  let colWidths: number[];
  if (showPromotionalPrice) {
    headers.push('List Price', 'Annual Price');
    colWidths = [65, 70, 65, 75, 85, 85];
  } else {
    headers.push('Annual Price');
    colWidths = [80, 80, 75, 90, 120];
  }
  if (showOverageRate) {
    headers.push('Overage');
    colWidths.push(65);
  }

  // Header row
  page.drawRectangle({ x: tableX, y: y - rowHeight + 6, width: CONTENT_WIDTH, height: rowHeight, color: rgb(0.02, 0.588, 0.412) }); // emerald-600
  let colX = tableX + 6;
  for (let i = 0; i < headers.length; i++) {
    page.drawText(headers[i], { x: colX, y: y - 10, size: 7.5, font: fontBold, color: PDF_COLORS.white });
    colX += colWidths[i];
  }
  y -= rowHeight;

  // Data rows
  for (let idx = 0; idx < validRows.length; idx++) {
    const row = validRows[idx];
    page.drawRectangle({ x: tableX, y: y - rowHeight + 6, width: CONTENT_WIDTH, height: rowHeight, color: idx % 2 === 0 ? PDF_COLORS.slate50 : PDF_COLORS.white });

    const cells: string[] = [
      sanitizeForPdf(row.term),
      sanitizeForPdf(row.namedUsers || 'Unlimited'),
      sanitizeForPdf(row.projectsIncluded),
      sanitizeForPdf(row.consultingHours),
    ];
    if (showPromotionalPrice) {
      cells.push(formatCurrency(row.listPrice, currency), formatCurrency(row.offerPrice, currency));
    } else {
      cells.push(formatCurrency(row.listPrice, currency));
    }
    if (showOverageRate) {
      cells.push(row.overageRate ? formatCurrency(row.overageRate, currency) : '');
    }

    colX = tableX + 6;
    for (let i = 0; i < cells.length; i++) {
      page.drawText(cells[i] || '', { x: colX, y: y - 10, size: 7.5, font: font, color: PDF_COLORS.slate700 });
      colX += colWidths[i];
    }
    y -= rowHeight;
  }

  return y;
}

// Main PDF generation function
export async function generateQuotePDF(data: QuoteFormData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const totalPages = 2;

  // Embed fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Generate quote reference
  const quoteRef = generateQuoteRef(data.quoteDate);

  // ==================== PAGE 1 ====================
  const page1 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - 50;

  // Confidential watermark (if enabled)
  if (data.showConfidential) {
    drawConfidentialWatermark(page1, fontBold);
  }

  // Header: myRA AI® left, Corporate Quotation right
  page1.drawText('myRA AI', {
    x: MARGIN_LEFT,
    y,
    size: 24,
    font: fontBold,
    color: PDF_COLORS.slate900,
  });
  page1.drawText('®', {
    x: MARGIN_LEFT + fontBold.widthOfTextAtSize('myRA AI', 24),
    y: y + 8,
    size: 10,
    font: font,
    color: PDF_COLORS.slate900,
  });

  // Corporate Quotation and Quote Ref on the right
  const quotationText = 'Corporate Quotation';
  const quotationWidth = font.widthOfTextAtSize(quotationText, 12);
  page1.drawText(quotationText, {
    x: PAGE_WIDTH - MARGIN_RIGHT - quotationWidth,
    y,
    size: 12,
    font: font,
    color: PDF_COLORS.violet,
  });

  // Quote reference number below
  const refWidth = font.widthOfTextAtSize(quoteRef, 8);
  page1.drawText(quoteRef, {
    x: PAGE_WIDTH - MARGIN_RIGHT - refWidth,
    y: y - 14,
    size: 8,
    font: font,
    color: PDF_COLORS.slate500,
  });

  // Tagline with letter-spacing effect (add spaces between chars for premium feel)
  y -= 16;
  page1.drawText('DECISION-GRADE INTELLIGENCE', {
    x: MARGIN_LEFT,
    y,
    size: 7,
    font: font,
    color: PDF_COLORS.slate500,
  });

  // Divider line
  y -= 12;
  page1.drawLine({
    start: { x: MARGIN_LEFT, y },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
    thickness: 0.5,
    color: PDF_COLORS.slate200,
  });

  // Client details block
  y -= 28;
  const labelX = MARGIN_LEFT;
  const valueX = MARGIN_LEFT + 80;

  const clientDetails = [
    { label: 'Prepared For', value: sanitizeForPdf(data.preparedFor) },
    { label: 'Contact', value: sanitizeForPdf(data.contactTitle ? `${data.contactName}, ${data.contactTitle}` : data.contactName) },
    { label: 'Email', value: sanitizeForPdf(data.contactEmail) },
    { label: 'Date', value: formatDate(data.quoteDate) },
    ...(data.preparedBy ? [{ label: 'Prepared By', value: sanitizeForPdf(data.preparedBy) }] : []),
  ];

  for (const detail of clientDetails) {
    page1.drawText(detail.label, {
      x: labelX,
      y,
      size: 9,
      font: font,
      color: PDF_COLORS.slate500,
    });
    page1.drawText(detail.value, {
      x: valueX,
      y,
      size: 9,
      font: fontBold,
      color: PDF_COLORS.slate900,
    });
    y -= 16;
  }

  // The Proposal section
  y -= 12;
  y = drawSectionHeader(page1, 'The Proposal', y, fontBold);
  y = drawWrappedText(page1, STATIC_CONTENT.theProposal, MARGIN_LEFT, y, CONTENT_WIDTH, font, 9, PDF_COLORS.slate600);

  // Investment section
  y -= 20;
  y = drawSectionHeader(page1, 'Investment', y, fontBold);

  if (data.pricingOptions && data.pricingOptions.length > 0) {
    // Multi-option mode
    for (const group of data.pricingOptions) {
      // Option group label
      y -= 8;
      page1.drawText(sanitizeForPdf(group.label), { x: MARGIN_LEFT, y, size: 9.5, font: fontBold, color: PDF_COLORS.slate800 });
      y -= 16;

      if (group.pricingModel === 'per-project') {
        y = drawPPUTable(page1, group.ppuRows, group.showPromotionalPrice, group.showOverageRate, data.currency, y, font, fontBold);

        // Scope definition
        if (group.scopeDefinition) {
          y -= 8;
          page1.drawText('What counts as a Research Project?', { x: MARGIN_LEFT, y, size: 7.5, font: fontBold, color: PDF_COLORS.slate700 });
          y -= 12;
          y = drawWrappedText(page1, sanitizeForPdf(group.scopeDefinition), MARGIN_LEFT, y, CONTENT_WIDTH, font, 7.5, PDF_COLORS.slate600);
        }
      } else {
        // Per-seat: draw inline table for this group
        const gRows = group.rows.filter(r => r.term || r.users || r.consultingHours || r.offerPrice);
        const gShowUsers = group.showUsersColumn;
        const gShowPromo = group.showPromotionalPrice;
        let gColWidths: number[];
        let gHeaders: string[];
        if (gShowUsers && gShowPromo) {
          gHeaders = ['Term', 'Users', 'Consulting Hours', 'List Price', 'Promotional Price/Year'];
          gColWidths = [70, 55, 120, 95, 95];
        } else if (gShowUsers) {
          gHeaders = ['Term', 'Users', 'Consulting Hours', 'List Price'];
          gColWidths = [85, 70, 150, 130];
        } else if (gShowPromo) {
          gHeaders = ['Term', 'Consulting Hours', 'List Price', 'Promotional Price/Year'];
          gColWidths = [85, 150, 110, 110];
        } else {
          gHeaders = ['Term', 'Consulting Hours', 'List Price'];
          gColWidths = [100, 200, 145];
        }

        const rowHeight = 24;
        page1.drawRectangle({ x: MARGIN_LEFT, y: y - rowHeight + 6, width: CONTENT_WIDTH, height: rowHeight, color: PDF_COLORS.violet });
        let colX = MARGIN_LEFT + 6;
        for (let i = 0; i < gHeaders.length; i++) {
          page1.drawText(gHeaders[i], { x: colX, y: y - 10, size: 7.5, font: fontBold, color: PDF_COLORS.white });
          colX += gColWidths[i];
        }
        y -= rowHeight;

        for (let ri = 0; ri < gRows.length; ri++) {
          const row = gRows[ri];
          page1.drawRectangle({ x: MARGIN_LEFT, y: y - rowHeight + 6, width: CONTENT_WIDTH, height: rowHeight, color: ri % 2 === 0 ? PDF_COLORS.slate50 : PDF_COLORS.white });
          let rd: string[];
          if (gShowUsers && gShowPromo) {
            rd = [sanitizeForPdf(row.term), sanitizeForPdf(row.users), sanitizeForPdf(row.consultingHours), formatCurrency(row.listPrice, data.currency), formatCurrency(row.offerPrice, data.currency)];
          } else if (gShowUsers) {
            rd = [sanitizeForPdf(row.term), sanitizeForPdf(row.users), sanitizeForPdf(row.consultingHours), formatCurrency(row.listPrice, data.currency)];
          } else if (gShowPromo) {
            rd = [sanitizeForPdf(row.term), sanitizeForPdf(row.consultingHours), formatCurrency(row.listPrice, data.currency), formatCurrency(row.offerPrice, data.currency)];
          } else {
            rd = [sanitizeForPdf(row.term), sanitizeForPdf(row.consultingHours), formatCurrency(row.listPrice, data.currency)];
          }
          colX = MARGIN_LEFT + 6;
          for (let i = 0; i < rd.length; i++) {
            page1.drawText(rd[i] || '', { x: colX, y: y - 10, size: 7.5, font: font, color: PDF_COLORS.slate700 });
            colX += gColWidths[i];
          }
          y -= rowHeight;
        }
      }
      y -= 8;
    }
  } else {
  // Single-option mode (existing code)

  // Filter out empty rows
  const validRows = data.rows.filter(row =>
    row.term || row.users || row.consultingHours || row.offerPrice
  );

  // Check if Users column should be shown (default to true for backward compatibility)
  const showUsers = data.showUsersColumn !== false;
  // Check if Promotional Price column should be shown (default to true for backward compatibility)
  const showPromotionalPrice = data.showPromotionalPrice !== false;

  // Table with List Price and optional Promotional Price columns
  const tableX = MARGIN_LEFT;
  // Adjust column widths based on which columns are shown
  let colWidths: number[];
  if (showUsers && showPromotionalPrice) {
    colWidths = [70, 55, 120, 95, 95]; // Term, Users, Consulting Hours, List Price, Promotional Price
  } else if (showUsers && !showPromotionalPrice) {
    colWidths = [85, 70, 150, 130]; // Term, Users, Consulting Hours, List Price
  } else if (!showUsers && showPromotionalPrice) {
    colWidths = [85, 150, 110, 110]; // Term, Consulting Hours, List Price, Promotional Price
  } else {
    colWidths = [100, 200, 145]; // Term, Consulting Hours, List Price
  }
  const rowHeight = 24;

  // Header row
  page1.drawRectangle({
    x: tableX,
    y: y - rowHeight + 6,
    width: CONTENT_WIDTH,
    height: rowHeight,
    color: PDF_COLORS.violet,
  });

  // Build headers based on which columns are shown
  let headers: string[];
  if (showUsers && showPromotionalPrice) {
    headers = ['Term', 'Users', 'Consulting Hours', 'List Price', 'Promotional Price/Year'];
  } else if (showUsers && !showPromotionalPrice) {
    headers = ['Term', 'Users', 'Consulting Hours', 'List Price'];
  } else if (!showUsers && showPromotionalPrice) {
    headers = ['Term', 'Consulting Hours', 'List Price', 'Promotional Price/Year'];
  } else {
    headers = ['Term', 'Consulting Hours', 'List Price'];
  }
  let colX = tableX + 6;
  for (let i = 0; i < headers.length; i++) {
    page1.drawText(headers[i], {
      x: colX,
      y: y - 10,
      size: 7.5,
      font: fontBold,
      color: PDF_COLORS.white,
    });
    colX += colWidths[i];
  }

  y -= rowHeight;

  // Data rows
  for (let rowIdx = 0; rowIdx < validRows.length; rowIdx++) {
    const row = validRows[rowIdx];
    const isEven = rowIdx % 2 === 0;

    // Row background
    page1.drawRectangle({
      x: tableX,
      y: y - rowHeight + 6,
      width: CONTENT_WIDTH,
      height: rowHeight,
      color: isEven ? PDF_COLORS.slate50 : PDF_COLORS.white,
    });

    // Row data - conditionally include Users and Promotional Price columns
    colX = tableX + 6;
    let rowData: string[];
    if (showUsers && showPromotionalPrice) {
      rowData = [
        sanitizeForPdf(row.term),
        sanitizeForPdf(row.users),
        sanitizeForPdf(row.consultingHours),
        formatCurrency(row.listPrice, data.currency),
        formatCurrency(row.offerPrice, data.currency),
      ];
    } else if (showUsers && !showPromotionalPrice) {
      rowData = [
        sanitizeForPdf(row.term),
        sanitizeForPdf(row.users),
        sanitizeForPdf(row.consultingHours),
        formatCurrency(row.listPrice, data.currency),
      ];
    } else if (!showUsers && showPromotionalPrice) {
      rowData = [
        sanitizeForPdf(row.term),
        sanitizeForPdf(row.consultingHours),
        formatCurrency(row.listPrice, data.currency),
        formatCurrency(row.offerPrice, data.currency),
      ];
    } else {
      rowData = [
        sanitizeForPdf(row.term),
        sanitizeForPdf(row.consultingHours),
        formatCurrency(row.listPrice, data.currency),
      ];
    }

    // Determine which column index is the promotional price (for bold styling)
    // Only relevant when showPromotionalPrice is true
    const promotionalPriceIndex = showPromotionalPrice
      ? (showUsers ? 4 : 3)
      : -1; // -1 means no promotional price column
    for (let i = 0; i < rowData.length; i++) {
      const isPromotionalPrice = i === promotionalPriceIndex;
      page1.drawText(rowData[i] || '', {
        x: colX,
        y: y - 10,
        size: 7.5,
        font: isPromotionalPrice ? fontBold : font,
        color: PDF_COLORS.slate700,
      });
      colX += colWidths[i];
    }

    y -= rowHeight;
  }

  } // end single-option else block

  // What's Included section
  y -= 20;
  y = drawSectionHeader(page1, "What's Included", y, fontBold);

  // Subheader
  page1.drawText('Platform Access', {
    x: MARGIN_LEFT,
    y,
    size: 9,
    font: fontBold,
    color: PDF_COLORS.slate700,
  });
  y -= 16;

  // Bullets
  for (const bullet of STATIC_CONTENT.platformAccessBullets) {
    y = drawBullet(page1, bullet, MARGIN_LEFT, y, font);
    y -= 4;
  }

  // How We Work section
  y -= 16;
  y = drawSectionHeader(page1, 'How We Work', y, fontBold);

  for (const bullet of STATIC_CONTENT.howWeWorkBullets) {
    y = drawBullet(page1, bullet, MARGIN_LEFT, y, font);
    y -= 4;
  }

  // Footer
  drawFooter(page1, 1, totalPages, font, fontItalic);

  // ==================== PAGE 2 ====================
  const page2 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  y = PAGE_HEIGHT - 50;

  // Confidential watermark (if enabled)
  if (data.showConfidential) {
    drawConfidentialWatermark(page2, fontBold);
  }

  // Access & Setup section
  y = drawSectionHeader(page2, 'Access & Setup', y, fontBold);
  y = drawWrappedText(page2, STATIC_CONTENT.accessAndSetup, MARGIN_LEFT, y, CONTENT_WIDTH, font, 9, PDF_COLORS.slate600);

  // Security & Data Governance section
  y -= 20;
  y = drawSectionHeader(page2, 'Security & Data Governance', y, fontBold);

  for (const bullet of STATIC_CONTENT.securityBullets) {
    y = drawBullet(page2, bullet, MARGIN_LEFT, y, font);
    y -= 4;
  }

  // Commercial Terms section
  y -= 16;
  y = drawSectionHeader(page2, 'Commercial Terms', y, fontBold);

  // Use dynamic billing text from payment terms, or fall back to default
  const billingText = getBillingText(data.paymentTerms || DEFAULT_PAYMENT_TERMS);

  const terms = [
    { label: 'Billing', value: billingText },
    { label: 'Licensing', value: STATIC_CONTENT.commercialTerms.licensing },
    { label: 'Provisioning', value: STATIC_CONTENT.commercialTerms.provisioning },
    { label: 'Valid Until', value: formatDate(data.validUntil) },
  ];

  for (const term of terms) {
    page2.drawText(term.label + ':', {
      x: MARGIN_LEFT,
      y,
      size: 9,
      font: font,
      color: PDF_COLORS.slate500,
    });
    page2.drawText(term.value, {
      x: MARGIN_LEFT + 90,
      y,
      size: 9,
      font: font,
      color: PDF_COLORS.slate700,
    });
    y -= 14;
  }

  // Payment note (italic)
  y -= 8;
  page2.drawText(STATIC_CONTENT.paymentNote, {
    x: MARGIN_LEFT,
    y,
    size: 8,
    font: fontItalic,
    color: PDF_COLORS.slate500,
  });

  // Additional hour rate note (if provided)
  if (data.additionalHourRate && data.additionalHourRate.trim()) {
    const currencySymbols: Record<Currency, string> = { USD: '$', EUR: 'EUR ', GBP: 'GBP ', INR: 'INR ' };
    const hourRateNote = STATIC_CONTENT.additionalHoursNote(data.additionalHourRate, currencySymbols[data.currency]);
    y -= 14;
    page2.drawText(hourRateNote, {
      x: MARGIN_LEFT,
      y,
      size: 8,
      font: fontItalic,
      color: PDF_COLORS.slate500,
    });
  }

  // Expert Review & Consulting section
  y -= 28;
  y = drawSectionHeader(page2, 'Expert Review & Consulting', y, fontBold);
  y = drawWrappedText(page2, STATIC_CONTENT.expertReview, MARGIN_LEFT, y, CONTENT_WIDTH, font, 9, PDF_COLORS.slate600);

  // Next Steps section
  y -= 20;
  y = drawSectionHeader(page2, 'Next Steps', y, fontBold);
  const sanitizedPreparedBy = sanitizeForPdf(data.preparedBy);
  const sanitizedPreparedByEmail = sanitizeForPdf(data.preparedByEmail);
  y = drawWrappedText(page2, STATIC_CONTENT.nextSteps(sanitizedPreparedBy, sanitizedPreparedByEmail), MARGIN_LEFT, y, CONTENT_WIDTH, font, 9, PDF_COLORS.slate600);

  // Important Notice box
  y -= 24;
  const noticeHeight = 60;
  page2.drawRectangle({
    x: MARGIN_LEFT,
    y: y - noticeHeight + 10,
    width: CONTENT_WIDTH,
    height: noticeHeight,
    color: PDF_COLORS.slate50,
    borderColor: PDF_COLORS.slate200,
    borderWidth: 0.5,
  });

  drawWrappedText(
    page2,
    STATIC_CONTENT.importantNotice(sanitizedPreparedBy, sanitizedPreparedByEmail),
    MARGIN_LEFT + 10,
    y,
    CONTENT_WIDTH - 20,
    fontItalic,
    7,
    PDF_COLORS.slate500,
    1.5
  );

  // Footer
  drawFooter(page2, 2, totalPages, font, fontItalic);

  return pdfDoc.save();
}
