import { PDFDocument, StandardFonts, PDFPage, PDFFont, degrees, rgb } from 'pdf-lib';
import type { QuoteFormData, Currency } from './types';
import {
  PDF_COLORS,
  PAGE_WIDTH,
  PAGE_HEIGHT,
  MARGIN_LEFT,
  MARGIN_RIGHT,
  CONTENT_WIDTH,
  STATIC_CONTENT,
  COMPANY_SUFFIXES,
} from './constants';

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

// Calculate per-user-year value
function calculatePerUserYear(offerPrice: string, users: string, term: string): number {
  const price = parseFloat(offerPrice.replace(/[^0-9.]/g, ''));
  const userCount = parseInt(users.replace(/[^0-9]/g, ''), 10);

  if (isNaN(price) || isNaN(userCount) || userCount === 0) return 0;

  // Extract years from term (e.g., "1-Year" → 1, "2-Year" → 2)
  const yearMatch = term.match(/(\d+)/);
  const years = yearMatch ? parseInt(yearMatch[1], 10) : 1;

  return Math.round(price / userCount / years);
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
    { label: 'Prepared For', value: data.preparedFor },
    { label: 'Contact', value: data.contactTitle ? `${data.contactName}, ${data.contactTitle}` : data.contactName },
    { label: 'Email', value: data.contactEmail },
    { label: 'Date', value: formatDate(data.quoteDate) },
    ...(data.preparedBy ? [{ label: 'Prepared By', value: data.preparedBy }] : []),
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

  // Filter out empty rows
  const validRows = data.rows.filter(row =>
    row.term || row.users || row.consultingHours || row.offerPrice
  );

  // Table with value-based structure (no List Price, add Per User/Year)
  const tableX = MARGIN_LEFT;
  const colWidths = [70, 55, 95, 95, 100]; // Term, Users, Consulting, Per User/Yr, Investment
  const rowHeight = 24;

  // Header row
  page1.drawRectangle({
    x: tableX,
    y: y - rowHeight + 6,
    width: CONTENT_WIDTH,
    height: rowHeight,
    color: PDF_COLORS.violet,
  });

  const headers = ['Term', 'Users', 'Consulting Hours', 'Per User/Year', 'Investment'];
  let colX = tableX + 8;
  for (let i = 0; i < headers.length; i++) {
    page1.drawText(headers[i], {
      x: colX,
      y: y - 10,
      size: 8,
      font: fontBold,
      color: PDF_COLORS.white,
    });
    colX += colWidths[i];
  }

  y -= rowHeight;

  // Calculate total
  let totalInvestment = 0;

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

    // Calculate per-user-year
    const perUserYear = calculatePerUserYear(row.offerPrice, row.users, row.term);
    const offerPrice = parseFloat(row.offerPrice.replace(/[^0-9.]/g, ''));
    if (!isNaN(offerPrice)) {
      totalInvestment += offerPrice;
    }

    // Row data
    colX = tableX + 8;
    const rowData = [
      row.term,
      row.users,
      row.consultingHours,
      perUserYear > 0 ? formatCurrency(String(perUserYear), data.currency) : '-',
      formatCurrency(row.offerPrice, data.currency),
    ];

    for (let i = 0; i < rowData.length; i++) {
      const isInvestment = i === 4;
      page1.drawText(rowData[i] || '', {
        x: colX,
        y: y - 10,
        size: 8,
        font: isInvestment ? fontBold : font,
        color: PDF_COLORS.slate700,
      });
      colX += colWidths[i];
    }

    y -= rowHeight;
  }

  // Total row
  if (validRows.length > 0) {
    page1.drawRectangle({
      x: tableX,
      y: y - rowHeight + 6,
      width: CONTENT_WIDTH,
      height: rowHeight,
      color: PDF_COLORS.slate200,
    });

    page1.drawText('Total Investment', {
      x: tableX + 8,
      y: y - 10,
      size: 8,
      font: fontBold,
      color: PDF_COLORS.slate900,
    });

    const totalFormatted = formatCurrency(String(totalInvestment), data.currency);
    const totalWidth = fontBold.widthOfTextAtSize(totalFormatted, 9);
    page1.drawText(totalFormatted, {
      x: tableX + CONTENT_WIDTH - totalWidth - 10,
      y: y - 10,
      size: 9,
      font: fontBold,
      color: PDF_COLORS.slate900,
    });

    y -= rowHeight;
  }

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

  const terms = [
    { label: 'Billing', value: STATIC_CONTENT.commercialTerms.billing },
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

  // Expert Review & Consulting section
  y -= 28;
  y = drawSectionHeader(page2, 'Expert Review & Consulting', y, fontBold);
  y = drawWrappedText(page2, STATIC_CONTENT.expertReview, MARGIN_LEFT, y, CONTENT_WIDTH, font, 9, PDF_COLORS.slate600);

  // Next Steps section
  y -= 20;
  y = drawSectionHeader(page2, 'Next Steps', y, fontBold);
  y = drawWrappedText(page2, STATIC_CONTENT.nextSteps(data.preparedBy, data.preparedByEmail), MARGIN_LEFT, y, CONTENT_WIDTH, font, 9, PDF_COLORS.slate600);

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
    STATIC_CONTENT.importantNotice(data.preparedBy, data.preparedByEmail),
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
