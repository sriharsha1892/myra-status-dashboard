import { PDFDocument, StandardFonts, PDFPage, PDFFont, rgb } from 'pdf-lib';
import type { MSAFormData } from './types';
import type { Currency } from '../quote/types';
import {
  PDF_COLORS,
  PAGE_WIDTH,
  PAGE_HEIGHT,
  MARGIN_LEFT,
  MARGIN_RIGHT,
  CONTENT_WIDTH,
} from '../quote/constants';
import {
  MORDOR_SIGNATORY,
  MSA_SECTIONS,
  MSA_FOOTER,
  getBillingText,
} from './constants';
import { COMPANY_SUFFIXES } from '../quote/constants';

// Currency formatting for PDF (ASCII-compatible)
function formatCurrency(value: string, currency: Currency): string {
  const num = parseFloat(value.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return value;

  const symbols: Record<Currency, string> = { USD: '$', EUR: 'EUR ', GBP: 'GBP ', INR: 'INR ' };

  if (currency === 'INR') {
    return symbols[currency] + num.toLocaleString('en-IN');
  }
  return symbols[currency] + num.toLocaleString('en-US');
}

// Generate client code from company name
function generateClientCode(companyName: string): string {
  const words = companyName
    .split(/[\s,.-]+/)
    .filter(word => !COMPANY_SUFFIXES.some(suffix =>
      word.toLowerCase() === suffix.toLowerCase()
    ))
    .filter(word => word.length > 0);

  if (words.length === 0) return 'MSA';

  if (words.length === 1) {
    return words[0].toUpperCase().slice(0, 4);
  }

  const code = words
    .map(word => word[0].toUpperCase())
    .join('')
    .slice(0, 4);

  return code || 'MSA';
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

// Generate MSA filename
export function generateMSAFilename(data: MSAFormData): string {
  const clientCode = generateClientCode(data.clientLegalName);
  const dateStr = formatDateForFilename(data.effectiveDate);
  return `myRA_MSA_${clientCode}_v${data.agreementVersion}_${dateStr}.pdf`;
}

// Page manager for multi-page documents
interface PageManager {
  pdfDoc: PDFDocument;
  currentPage: PDFPage;
  currentY: number;
  pageCount: number;
  fonts: {
    regular: PDFFont;
    bold: PDFFont;
    italic: PDFFont;
  };
  minY: number; // Minimum Y before needing new page (footer space)
}

function createPageManager(
  pdfDoc: PDFDocument,
  fonts: PageManager['fonts']
): PageManager {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  return {
    pdfDoc,
    currentPage: page,
    currentY: PAGE_HEIGHT - 60,
    pageCount: 1,
    fonts,
    minY: 80, // Leave space for footer
  };
}

function ensureSpace(pm: PageManager, needed: number): void {
  if (pm.currentY - needed < pm.minY) {
    pm.currentPage = pm.pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pm.pageCount++;
    pm.currentY = PAGE_HEIGHT - 60;
  }
}

// Draw wrapped text with page management
function drawWrappedTextPM(
  pm: PageManager,
  text: string,
  fontSize: number,
  color: ReturnType<typeof rgb>,
  font?: PDFFont,
  indent: number = 0,
  lineHeight: number = 2.0
): void {
  const useFont = font || pm.fonts.regular;
  const x = MARGIN_LEFT + indent;
  const maxWidth = CONTENT_WIDTH - indent;
  const lines = text.split('\n');

  for (const line of lines) {
    if (line.trim() === '') {
      pm.currentY -= fontSize * lineHeight;
      continue;
    }

    const words = line.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = useFont.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > maxWidth && currentLine) {
        ensureSpace(pm, fontSize * lineHeight);
        pm.currentPage.drawText(currentLine, {
          x,
          y: pm.currentY,
          size: fontSize,
          font: useFont,
          color,
        });
        currentLine = word;
        pm.currentY -= fontSize * lineHeight;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      ensureSpace(pm, fontSize * lineHeight);
      pm.currentPage.drawText(currentLine, {
        x,
        y: pm.currentY,
        size: fontSize,
        font: useFont,
        color,
      });
      pm.currentY -= fontSize * lineHeight;
    }
  }
}

// Draw section header with underline
function drawSectionHeader(pm: PageManager, title: string): void {
  ensureSpace(pm, 30);

  pm.currentPage.drawText(title, {
    x: MARGIN_LEFT,
    y: pm.currentY,
    size: 11,
    font: pm.fonts.bold,
    color: PDF_COLORS.slate900,
  });

  // Violet underline accent
  const textWidth = pm.fonts.bold.widthOfTextAtSize(title, 11);
  pm.currentPage.drawLine({
    start: { x: MARGIN_LEFT, y: pm.currentY - 4 },
    end: { x: MARGIN_LEFT + textWidth + 8, y: pm.currentY - 4 },
    thickness: 1.5,
    color: PDF_COLORS.violet,
  });

  pm.currentY -= 28;
}

// Draw definition term
function drawDefinition(pm: PageManager, term: string, definition: string): void {
  ensureSpace(pm, 30);

  // Term in bold
  pm.currentPage.drawText(term, {
    x: MARGIN_LEFT + 10,
    y: pm.currentY,
    size: 9,
    font: pm.fonts.bold,
    color: PDF_COLORS.slate700,
  });

  const termWidth = pm.fonts.bold.widthOfTextAtSize(term, 9);
  const defX = MARGIN_LEFT + 10 + termWidth + 4;
  const maxDefWidth = CONTENT_WIDTH - 10 - termWidth - 4;

  // Definition text - may wrap to next line
  if (maxDefWidth > 100) {
    // Fit on same line with wrapping
    let remainingDef = definition;
    let firstLine = true;

    while (remainingDef) {
      const words = remainingDef.split(' ');
      let currentLine = '';
      let usedWords = 0;

      const startX = firstLine ? defX : MARGIN_LEFT + 10;
      const lineMaxWidth = firstLine ? maxDefWidth : CONTENT_WIDTH - 10;

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = pm.fonts.regular.widthOfTextAtSize(testLine, 9);

        if (testWidth > lineMaxWidth && currentLine) {
          break;
        }
        currentLine = testLine;
        usedWords++;
      }

      if (currentLine) {
        ensureSpace(pm, 14);
        pm.currentPage.drawText(currentLine, {
          x: startX,
          y: pm.currentY,
          size: 9,
          font: pm.fonts.regular,
          color: PDF_COLORS.slate600,
        });
        pm.currentY -= 14;
      }

      remainingDef = words.slice(usedWords).join(' ');
      firstLine = false;

      if (!remainingDef) break;
    }
  } else {
    // Start definition on next line
    pm.currentY -= 14;
    drawWrappedTextPM(pm, definition, 9, PDF_COLORS.slate600, pm.fonts.regular, 10);
  }

  pm.currentY -= 4;
}

// Draw footer on all pages
function addFootersToAllPages(
  pdfDoc: PDFDocument,
  fonts: PageManager['fonts'],
  totalPages: number
): void {
  const pages = pdfDoc.getPages();

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const pageNum = i + 1;
    const footerY = 36;

    // Divider line
    page.drawLine({
      start: { x: MARGIN_LEFT, y: footerY + 24 },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: footerY + 24 },
      thickness: 0.5,
      color: PDF_COLORS.slate200,
    });

    // Certifications
    page.drawText(MSA_FOOTER.certifications, {
      x: MARGIN_LEFT,
      y: footerY + 10,
      size: 6,
      font: fonts.regular,
      color: PDF_COLORS.slate500,
    });

    // Trademark
    page.drawText(MSA_FOOTER.trademark, {
      x: MARGIN_LEFT,
      y: footerY - 2,
      size: 5,
      font: fonts.italic,
      color: PDF_COLORS.slate400,
    });

    // Page number
    const pageText = `Page ${pageNum} of ${totalPages}`;
    const pageTextWidth = fonts.regular.widthOfTextAtSize(pageText, 7);
    page.drawText(pageText, {
      x: PAGE_WIDTH - MARGIN_RIGHT - pageTextWidth,
      y: footerY + 10,
      size: 7,
      font: fonts.regular,
      color: PDF_COLORS.slate500,
    });

    // Website
    const website = 'product.ask-myra.ai';
    const websiteWidth = fonts.regular.widthOfTextAtSize(website, 7);
    page.drawText(website, {
      x: PAGE_WIDTH - MARGIN_RIGHT - websiteWidth,
      y: footerY - 2,
      size: 7,
      font: fonts.regular,
      color: PDF_COLORS.violet,
    });
  }
}

// Draw Order Form table
function drawOrderFormTable(pm: PageManager, data: MSAFormData): void {
  const showUsers = data.showUsersColumn !== false;
  // Support both selectedRowIndices (new) and selectedRowIndex (legacy)
  const selectedIndices = data.selectedRowIndices && data.selectedRowIndices.length > 0
    ? data.selectedRowIndices
    : [];

  const rows = selectedIndices.length > 0
    ? selectedIndices.map(i => data.orderFormRows[i]).filter(Boolean)
    : data.orderFormRows;

  const validRows = rows.filter(row =>
    row && (row.term || row.users || row.consultingHours || row.offerPrice)
  );

  if (validRows.length === 0) return;

  ensureSpace(pm, 30 + validRows.length * 24);

  const tableX = MARGIN_LEFT;
  const colWidths = showUsers
    ? [80, 60, 130, 110, 103] // Term, Users, Consulting Hours, List Price, Investment
    : [100, 160, 115, 108];   // Term, Consulting Hours, List Price, Investment
  const rowHeight = 24;

  // Header row
  pm.currentPage.drawRectangle({
    x: tableX,
    y: pm.currentY - rowHeight + 6,
    width: CONTENT_WIDTH,
    height: rowHeight,
    color: PDF_COLORS.violet,
  });

  const headers = showUsers
    ? ['Term', 'Users', 'Consulting Hours', 'List Price', 'Investment']
    : ['Term', 'Consulting Hours', 'List Price', 'Investment'];

  let colX = tableX + 6;
  for (let i = 0; i < headers.length; i++) {
    pm.currentPage.drawText(headers[i], {
      x: colX,
      y: pm.currentY - 10,
      size: 8,
      font: pm.fonts.bold,
      color: PDF_COLORS.white,
    });
    colX += colWidths[i];
  }

  pm.currentY -= rowHeight;

  // Data rows
  for (let rowIdx = 0; rowIdx < validRows.length; rowIdx++) {
    const row = validRows[rowIdx];
    const isEven = rowIdx % 2 === 0;

    pm.currentPage.drawRectangle({
      x: tableX,
      y: pm.currentY - rowHeight + 6,
      width: CONTENT_WIDTH,
      height: rowHeight,
      color: isEven ? PDF_COLORS.slate50 : PDF_COLORS.white,
    });

    colX = tableX + 6;
    const rowData = showUsers
      ? [
          row.term,
          row.users,
          row.consultingHours,
          formatCurrency(row.listPrice, data.currency),
          formatCurrency(row.offerPrice, data.currency),
        ]
      : [
          row.term,
          row.consultingHours,
          formatCurrency(row.listPrice, data.currency),
          formatCurrency(row.offerPrice, data.currency),
        ];

    const investmentIndex = showUsers ? 4 : 3;
    for (let i = 0; i < rowData.length; i++) {
      const isInvestment = i === investmentIndex;
      pm.currentPage.drawText(rowData[i] || '', {
        x: colX,
        y: pm.currentY - 10,
        size: 8,
        font: isInvestment ? pm.fonts.bold : pm.fonts.regular,
        color: PDF_COLORS.slate700,
      });
      colX += colWidths[i];
    }

    pm.currentY -= rowHeight;
  }

  pm.currentY -= 10;
}

// Draw Ownership Summary table (Section 16)
function drawOwnershipSummaryTable(pm: PageManager): void {
  const rows = MSA_SECTIONS.ownershipSummary.rows;

  ensureSpace(pm, 30 + (rows.length + 1) * 22);

  const tableX = MARGIN_LEFT;
  const colWidths = [150, 140, 193]; // Asset Type, Ownership, License
  const rowHeight = 22;

  // Header row
  pm.currentPage.drawRectangle({
    x: tableX,
    y: pm.currentY - rowHeight + 6,
    width: CONTENT_WIDTH,
    height: rowHeight,
    color: PDF_COLORS.violet,
  });

  const headers = ['Asset Type', 'Ownership', 'License to Other Party'];
  let colX = tableX + 6;
  for (let i = 0; i < headers.length; i++) {
    pm.currentPage.drawText(headers[i], {
      x: colX,
      y: pm.currentY - 9,
      size: 8,
      font: pm.fonts.bold,
      color: PDF_COLORS.white,
    });
    colX += colWidths[i];
  }

  pm.currentY -= rowHeight;

  // Data rows
  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const isEven = rowIdx % 2 === 0;

    pm.currentPage.drawRectangle({
      x: tableX,
      y: pm.currentY - rowHeight + 6,
      width: CONTENT_WIDTH,
      height: rowHeight,
      color: isEven ? PDF_COLORS.slate50 : PDF_COLORS.white,
    });

    colX = tableX + 6;
    const rowData = [row.assetType, row.ownership, row.license];

    for (let i = 0; i < rowData.length; i++) {
      pm.currentPage.drawText(rowData[i], {
        x: colX,
        y: pm.currentY - 9,
        size: 8,
        font: i === 0 ? pm.fonts.bold : pm.fonts.regular,
        color: PDF_COLORS.slate700,
      });
      colX += colWidths[i];
    }

    pm.currentY -= rowHeight;
  }

  pm.currentY -= 10;
}

// Draw SLA Response Time table
function drawResponseTimeTable(pm: PageManager): void {
  const rows = MSA_SECTIONS.slaAnnexure.sections.responseTime.table;

  ensureSpace(pm, 30 + (rows.length + 1) * 28);

  const tableX = MARGIN_LEFT;
  const colWidths = [80, 180, 110, 113]; // Severity, Description, Response, Resolution
  const rowHeight = 28;

  // Header row
  pm.currentPage.drawRectangle({
    x: tableX,
    y: pm.currentY - rowHeight + 6,
    width: CONTENT_WIDTH,
    height: rowHeight,
    color: PDF_COLORS.violet,
  });

  const headers = ['Severity Level', 'Description', 'Initial Response', 'Resolution Target'];
  let colX = tableX + 4;
  for (let i = 0; i < headers.length; i++) {
    pm.currentPage.drawText(headers[i], {
      x: colX,
      y: pm.currentY - 12,
      size: 7,
      font: pm.fonts.bold,
      color: PDF_COLORS.white,
    });
    colX += colWidths[i];
  }

  pm.currentY -= rowHeight;

  // Data rows
  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const isEven = rowIdx % 2 === 0;

    pm.currentPage.drawRectangle({
      x: tableX,
      y: pm.currentY - rowHeight + 6,
      width: CONTENT_WIDTH,
      height: rowHeight,
      color: isEven ? PDF_COLORS.slate50 : PDF_COLORS.white,
    });

    colX = tableX + 4;
    const rowData = [row.severity, row.description, row.response, row.resolution];

    for (let i = 0; i < rowData.length; i++) {
      // Truncate description if too long
      let text = rowData[i];
      const maxWidth = colWidths[i] - 8;
      while (pm.fonts.regular.widthOfTextAtSize(text, 7) > maxWidth && text.length > 3) {
        text = text.slice(0, -4) + '...';
      }

      pm.currentPage.drawText(text, {
        x: colX,
        y: pm.currentY - 12,
        size: 7,
        font: i === 0 ? pm.fonts.bold : pm.fonts.regular,
        color: PDF_COLORS.slate700,
      });
      colX += colWidths[i];
    }

    pm.currentY -= rowHeight;
  }

  pm.currentY -= 10;
}

// Draw signature block
function drawSignatureBlock(pm: PageManager, data: MSAFormData): void {
  ensureSpace(pm, 180);

  // Title
  pm.currentPage.drawText(MSA_SECTIONS.signatureBlock.title, {
    x: MARGIN_LEFT,
    y: pm.currentY,
    size: 10,
    font: pm.fonts.bold,
    color: PDF_COLORS.slate900,
  });
  pm.currentY -= 16;

  // Intro text
  drawWrappedTextPM(pm, MSA_SECTIONS.signatureBlock.intro, 9, PDF_COLORS.slate600);
  pm.currentY -= 24;

  // Two-column signature layout
  const col1X = MARGIN_LEFT;
  const col2X = MARGIN_LEFT + CONTENT_WIDTH / 2 + 20;
  const colWidth = CONTENT_WIDTH / 2 - 30;

  const startY = pm.currentY;

  // Column 1: Mordor Intelligence
  pm.currentPage.drawText(MSA_SECTIONS.signatureBlock.mordorHeader, {
    x: col1X,
    y: pm.currentY,
    size: 9,
    font: pm.fonts.bold,
    color: PDF_COLORS.slate900,
  });

  pm.currentY -= 40;
  pm.currentPage.drawLine({
    start: { x: col1X, y: pm.currentY },
    end: { x: col1X + colWidth, y: pm.currentY },
    thickness: 0.5,
    color: PDF_COLORS.slate400,
  });
  pm.currentY -= 12;
  pm.currentPage.drawText('Signature', {
    x: col1X,
    y: pm.currentY,
    size: 7,
    font: pm.fonts.regular,
    color: PDF_COLORS.slate500,
  });

  pm.currentY -= 24;
  pm.currentPage.drawText(MORDOR_SIGNATORY.name, {
    x: col1X,
    y: pm.currentY,
    size: 9,
    font: pm.fonts.bold,
    color: PDF_COLORS.slate700,
  });
  pm.currentY -= 12;
  pm.currentPage.drawText(MORDOR_SIGNATORY.title, {
    x: col1X,
    y: pm.currentY,
    size: 8,
    font: pm.fonts.regular,
    color: PDF_COLORS.slate600,
  });

  pm.currentY -= 24;
  pm.currentPage.drawLine({
    start: { x: col1X, y: pm.currentY },
    end: { x: col1X + colWidth, y: pm.currentY },
    thickness: 0.5,
    color: PDF_COLORS.slate400,
  });
  pm.currentY -= 12;
  pm.currentPage.drawText('Date', {
    x: col1X,
    y: pm.currentY,
    size: 7,
    font: pm.fonts.regular,
    color: PDF_COLORS.slate500,
  });

  // Column 2: Client
  let col2Y = startY;
  pm.currentPage.drawText(MSA_SECTIONS.signatureBlock.clientHeader, {
    x: col2X,
    y: col2Y,
    size: 9,
    font: pm.fonts.bold,
    color: PDF_COLORS.slate900,
  });

  col2Y -= 40;
  pm.currentPage.drawLine({
    start: { x: col2X, y: col2Y },
    end: { x: col2X + colWidth, y: col2Y },
    thickness: 0.5,
    color: PDF_COLORS.slate400,
  });
  col2Y -= 12;
  pm.currentPage.drawText('Signature', {
    x: col2X,
    y: col2Y,
    size: 7,
    font: pm.fonts.regular,
    color: PDF_COLORS.slate500,
  });

  col2Y -= 24;
  pm.currentPage.drawText(data.clientContactName || '______________________', {
    x: col2X,
    y: col2Y,
    size: 9,
    font: pm.fonts.bold,
    color: PDF_COLORS.slate700,
  });
  col2Y -= 12;
  pm.currentPage.drawText(data.clientContactTitle || 'Title: ______________________', {
    x: col2X,
    y: col2Y,
    size: 8,
    font: pm.fonts.regular,
    color: PDF_COLORS.slate600,
  });

  col2Y -= 24;
  pm.currentPage.drawLine({
    start: { x: col2X, y: col2Y },
    end: { x: col2X + colWidth, y: col2Y },
    thickness: 0.5,
    color: PDF_COLORS.slate400,
  });
  col2Y -= 12;
  pm.currentPage.drawText('Date', {
    x: col2X,
    y: col2Y,
    size: 7,
    font: pm.fonts.regular,
    color: PDF_COLORS.slate500,
  });

  pm.currentY = Math.min(pm.currentY, col2Y) - 20;
}

// Main MSA PDF generation function
export async function generateMSAPDF(data: MSAFormData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // Embed fonts
  const fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
  };

  const pm = createPageManager(pdfDoc, fonts);

  // ==================== HEADER ====================
  // myRA AI logo with trademark
  pm.currentPage.drawText('myRA AI', {
    x: MARGIN_LEFT,
    y: pm.currentY,
    size: 22,
    font: fonts.bold,
    color: PDF_COLORS.slate900,
  });
  pm.currentPage.drawText('TM', {
    x: MARGIN_LEFT + fonts.bold.widthOfTextAtSize('myRA AI', 22),
    y: pm.currentY + 10,
    size: 7,
    font: fonts.regular,
    color: PDF_COLORS.slate900,
  });

  // Document title on right
  const titleText = MSA_SECTIONS.title;
  const titleWidth = fonts.bold.widthOfTextAtSize(titleText, 10);
  pm.currentPage.drawText(titleText, {
    x: PAGE_WIDTH - MARGIN_RIGHT - titleWidth,
    y: pm.currentY,
    size: 10,
    font: fonts.bold,
    color: PDF_COLORS.violet,
  });

  // Subtitle
  const subtitleText = MSA_SECTIONS.subtitle;
  const subtitleWidth = fonts.regular.widthOfTextAtSize(subtitleText, 8);
  pm.currentPage.drawText(subtitleText, {
    x: PAGE_WIDTH - MARGIN_RIGHT - subtitleWidth,
    y: pm.currentY - 12,
    size: 8,
    font: fonts.regular,
    color: PDF_COLORS.slate500,
  });

  pm.currentY -= 28;

  // Divider
  pm.currentPage.drawLine({
    start: { x: MARGIN_LEFT, y: pm.currentY },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: pm.currentY },
    thickness: 0.5,
    color: PDF_COLORS.slate200,
  });

  pm.currentY -= 20;

  // ==================== PREAMBLE ====================
  const preambleText = MSA_SECTIONS.preamble(
    formatDate(data.effectiveDate),
    data.clientLegalName,
    data.clientAddress,
    data.clientCountry
  );
  drawWrappedTextPM(pm, preambleText, 9, PDF_COLORS.slate700);
  pm.currentY -= 16;

  // ==================== DEFINITIONS ====================
  drawSectionHeader(pm, MSA_SECTIONS.definitions.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.definitions.intro, 9, PDF_COLORS.slate600, fonts.italic);
  pm.currentY -= 8;
  for (const def of MSA_SECTIONS.definitions.terms) {
    drawDefinition(pm, def.term, def.definition);
  }
  pm.currentY -= 12;

  // ==================== SECTION 1: GRANT OF LICENSE ====================
  drawSectionHeader(pm, MSA_SECTIONS.grantOfLicense.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.grantOfLicense.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // ==================== SECTION 2: PERMITTED USE ====================
  drawSectionHeader(pm, MSA_SECTIONS.permittedUse.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.permittedUse.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // ==================== SECTION 3: NATURE OF LICENSE ====================
  drawSectionHeader(pm, MSA_SECTIONS.natureOfLicense.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.natureOfLicense.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // ==================== SECTION 3.3-3.5: CONSULTING SERVICES (OPTIONAL) ====================
  if (data.includeConsultingServices) {
    // 3.3 Consulting Services and Hours
    drawSectionHeader(pm, MSA_SECTIONS.consultingServices.title);
    drawWrappedTextPM(pm, MSA_SECTIONS.consultingServices.content, 9.5, PDF_COLORS.slate600);
    pm.currentY -= 12;

    // 3.4 Indemnity for Analyst Hours
    drawSectionHeader(pm, MSA_SECTIONS.analystHoursIndemnity.title);
    drawWrappedTextPM(pm, MSA_SECTIONS.analystHoursIndemnity.content, 9.5, PDF_COLORS.slate600);
    pm.currentY -= 12;

    // 3.5 Termination of Consulting Hours
    drawSectionHeader(pm, MSA_SECTIONS.consultingTermination.title);
    drawWrappedTextPM(pm, MSA_SECTIONS.consultingTermination.content, 9.5, PDF_COLORS.slate600);
    pm.currentY -= 18;
  }

  // ==================== SECTION 3.6: AI OUTPUTS ====================
  drawSectionHeader(pm, MSA_SECTIONS.aiOutputsAndIP.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.aiOutputsAndIP.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 12;

  // ==================== SECTION 3.7: INTELLECTUAL PROPERTY RESERVATION ====================
  drawSectionHeader(pm, MSA_SECTIONS.intellectualPropertyReservation.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.intellectualPropertyReservation.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 12;

  // ==================== SECTION 3.8: FEEDBACK AND ENHANCEMENTS ====================
  drawSectionHeader(pm, MSA_SECTIONS.feedbackAndEnhancements.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.feedbackAndEnhancements.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 12;

  // ==================== SECTION 3.9: RETRAINING AND LEARNING RIGHTS ====================
  drawSectionHeader(pm, MSA_SECTIONS.retrainingRights.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.retrainingRights.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 12;

  // ==================== SECTION 3.10: THIRD-PARTY DATA AND CONTENT ====================
  drawSectionHeader(pm, MSA_SECTIONS.thirdPartyDataContent.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.thirdPartyDataContent.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // ==================== SECTION 4: SUBLICENSING ====================
  drawSectionHeader(pm, MSA_SECTIONS.sublicensing.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.sublicensing.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // ==================== SECTION 5: LICENSE TERM & RENEWAL ====================
  drawSectionHeader(pm, MSA_SECTIONS.licenseTerm.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.licenseTerm.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // ==================== SECTION 6: LICENSE REVOCATION ====================
  drawSectionHeader(pm, MSA_SECTIONS.licenseRevocation.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.licenseRevocation.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // ==================== SECTION 7: COMPLIANCE AND AUDIT RIGHTS ====================
  drawSectionHeader(pm, MSA_SECTIONS.complianceAndAudit.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.complianceAndAudit.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // ==================== SECTION 8: FEEDBACK ====================
  drawSectionHeader(pm, MSA_SECTIONS.feedback.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.feedback.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // ==================== SECTION 9: ORDER FORM AND FEES ====================
  drawSectionHeader(pm, MSA_SECTIONS.orderFormAndFees.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.orderFormAndFees.intro, 9, PDF_COLORS.slate600);
  pm.currentY -= 12;

  // Order form table
  drawOrderFormTable(pm, data);

  // Additional hour rate note - collect per-row rates
  const currencySymbols: Record<Currency, string> = { USD: '$', EUR: 'EUR ', GBP: 'GBP ', INR: 'INR ' };
  const selectedIndices = data.selectedRowIndices && data.selectedRowIndices.length > 0
    ? data.selectedRowIndices
    : [];
  const rowsForRates = selectedIndices.length > 0
    ? selectedIndices.map(i => ({ row: data.orderFormRows[i], index: i })).filter(r => r.row)
    : data.orderFormRows.map((row, i) => ({ row, index: i }));

  // Collect unique rates from rows
  const ratesWithRows = rowsForRates
    .filter(r => r.row.additionalHourRate && r.row.additionalHourRate.trim())
    .map(r => ({
      term: r.row.term,
      rate: r.row.additionalHourRate!,
    }));

  if (ratesWithRows.length > 0) {
    // Check if all rates are the same
    const uniqueRates = [...new Set(ratesWithRows.map(r => r.rate))];
    let hourNote: string;

    if (uniqueRates.length === 1) {
      // All rows have the same rate
      hourNote = `Additional consulting hours beyond the included allocation may be purchased at ${currencySymbols[data.currency]}${uniqueRates[0]}/hour.`;
    } else {
      // Different rates per row
      const ratesList = ratesWithRows.map(r => `${r.term}: ${currencySymbols[data.currency]}${r.rate}/hour`).join(', ');
      hourNote = `Additional consulting hours beyond the included allocation may be purchased at the following rates: ${ratesList}.`;
    }
    drawWrappedTextPM(pm, hourNote, 8, PDF_COLORS.slate500, fonts.italic);
    pm.currentY -= 8;
  }

  // Payment terms from form data (aligned with quote system)
  if (data.paymentTerms) {
    const billingText = data.customPaymentText?.trim() || getBillingText(data.paymentTerms);
    drawWrappedTextPM(pm, `Billing: ${billingText}`, 9, PDF_COLORS.slate700, fonts.bold);
    pm.currentY -= 8;
  }

  // Payment terms content
  drawWrappedTextPM(pm, MSA_SECTIONS.orderFormAndFees.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // ==================== SECTION 10: TERM AND TERMINATION ====================
  drawSectionHeader(pm, MSA_SECTIONS.termAndTermination.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.termAndTermination.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // ==================== SECTION 11: SERVICE LEVELS AND SUPPORT ====================
  drawSectionHeader(pm, MSA_SECTIONS.serviceLevels.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.serviceLevels.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // ==================== SECTION 12: PERFORMANCE AND WARRANTIES ====================
  drawSectionHeader(pm, MSA_SECTIONS.performanceWarranties.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.performanceWarranties.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // ==================== SECTION 13: CUSTOMER DATA AND DATA OWNERSHIP ====================
  drawSectionHeader(pm, MSA_SECTIONS.customerData.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.customerData.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // ==================== SECTION 14: CONFIDENTIALITY ====================
  drawSectionHeader(pm, MSA_SECTIONS.confidentiality.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.confidentiality.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // ==================== SECTION 15: DATA PROTECTION AND PRIVACY ====================
  drawSectionHeader(pm, MSA_SECTIONS.dataProtection.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.dataProtection.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // ==================== SECTION 16: OWNERSHIP SUMMARY ====================
  drawSectionHeader(pm, MSA_SECTIONS.ownershipSummary.title);
  drawOwnershipSummaryTable(pm);
  pm.currentY -= 18;

  // ==================== SECTION 17: WARRANTIES AND REPRESENTATIONS ====================
  drawSectionHeader(pm, MSA_SECTIONS.warrantiesRepresentations.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.warrantiesRepresentations.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // ==================== SECTION 18: INDEMNIFICATION ====================
  drawSectionHeader(pm, MSA_SECTIONS.indemnification.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.indemnification.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // ==================== SECTION 19: DISCLAIMERS RELATED TO AI OUTPUTS ====================
  drawSectionHeader(pm, MSA_SECTIONS.aiDisclaimers.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.aiDisclaimers.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // ==================== SECTION 20: LIMITATION OF LIABILITY ====================
  drawSectionHeader(pm, MSA_SECTIONS.limitationOfLiability.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.limitationOfLiability.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // ==================== SECTION 21: REMEDIES AND EQUITABLE RELIEF ====================
  drawSectionHeader(pm, MSA_SECTIONS.remediesAndCompliance.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.remediesAndCompliance.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 12;

  // ==================== SECTION 21: COMPLIANCE AND ETHICAL CONDUCT ====================
  drawSectionHeader(pm, MSA_SECTIONS.complianceAndEthicalConduct.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.complianceAndEthicalConduct.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // ==================== SECTION 22: SUBCONTRACTING AND ASSIGNMENT ====================
  drawSectionHeader(pm, MSA_SECTIONS.subcontractingAndAssignment.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.subcontractingAndAssignment.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // ==================== SECTION 23: DISPUTE RESOLUTION ====================
  drawSectionHeader(pm, MSA_SECTIONS.disputeResolution.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.disputeResolution.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 12;

  // Section 23.4: Governing Law (dynamic based on jurisdiction)
  drawSectionHeader(pm, MSA_SECTIONS.governingLaw.title);
  const governingLawContent = MSA_SECTIONS.governingLaw.content(data.jurisdiction);
  drawWrappedTextPM(pm, governingLawContent, 9, PDF_COLORS.slate600);
  pm.currentY -= 12;

  // Section 23.5: Jurisdiction (dynamic based on jurisdiction)
  drawSectionHeader(pm, MSA_SECTIONS.jurisdiction.title);
  const jurisdictionContent = MSA_SECTIONS.jurisdiction.content(data.jurisdiction);
  drawWrappedTextPM(pm, jurisdictionContent, 9, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // ==================== SECTION 24: FORCE MAJEURE ====================
  drawSectionHeader(pm, MSA_SECTIONS.forceMajeure.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.forceMajeure.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // ==================== SECTION 25: NOTICES ====================
  drawSectionHeader(pm, MSA_SECTIONS.notices.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.notices.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // ==================== SECTION 26: GENERAL PROVISIONS ====================
  drawSectionHeader(pm, MSA_SECTIONS.generalProvisions.title);
  drawWrappedTextPM(pm, MSA_SECTIONS.generalProvisions.content, 9.5, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // ==================== SPECIAL TERMS (IF ANY) ====================
  if (data.specialTerms && data.specialTerms.trim()) {
    drawSectionHeader(pm, '27. Special Terms');
    drawWrappedTextPM(pm, data.specialTerms, 9, PDF_COLORS.slate600);
    pm.currentY -= 18;
  }

  // ==================== SLA ANNEXURE ====================
  // Force new page for SLA
  pm.currentPage = pm.pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  pm.pageCount++;
  pm.currentY = PAGE_HEIGHT - 60;

  // SLA Title
  pm.currentPage.drawText(MSA_SECTIONS.slaAnnexure.title, {
    x: MARGIN_LEFT,
    y: pm.currentY,
    size: 14,
    font: fonts.bold,
    color: PDF_COLORS.violet,
  });
  pm.currentY -= 16;
  pm.currentPage.drawText(MSA_SECTIONS.slaAnnexure.subtitle, {
    x: MARGIN_LEFT,
    y: pm.currentY,
    size: 10,
    font: fonts.regular,
    color: PDF_COLORS.slate500,
  });
  pm.currentY -= 24;

  // SLA Sections
  const slaSections = MSA_SECTIONS.slaAnnexure.sections;

  // Purpose and Scope
  drawSectionHeader(pm, slaSections.purpose.title);
  drawWrappedTextPM(pm, slaSections.purpose.content, 9, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // Definitions
  drawSectionHeader(pm, slaSections.definitions.title);
  drawWrappedTextPM(pm, slaSections.definitions.content, 9, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // Availability
  drawSectionHeader(pm, slaSections.availability.title);
  drawWrappedTextPM(pm, slaSections.availability.content, 9, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // Maintenance
  drawSectionHeader(pm, slaSections.maintenance.title);
  drawWrappedTextPM(pm, slaSections.maintenance.content, 9, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // Response Time Table
  drawSectionHeader(pm, slaSections.responseTime.title);
  drawResponseTimeTable(pm);
  pm.currentY -= 18;

  // Support Channels
  drawSectionHeader(pm, slaSections.support.title);
  drawWrappedTextPM(pm, slaSections.support.content, 9, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // Backup
  drawSectionHeader(pm, slaSections.backup.title);
  drawWrappedTextPM(pm, slaSections.backup.content, 9, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // Security
  drawSectionHeader(pm, slaSections.security.title);
  drawWrappedTextPM(pm, slaSections.security.content, 9, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // Limitations
  drawSectionHeader(pm, slaSections.limitations.title);
  drawWrappedTextPM(pm, slaSections.limitations.content, 9, PDF_COLORS.slate600);
  pm.currentY -= 18;

  // Change Management
  drawSectionHeader(pm, slaSections.changeManagement.title);
  drawWrappedTextPM(pm, slaSections.changeManagement.content, 9, PDF_COLORS.slate600);
  pm.currentY -= 24;

  // ==================== SIGNATURE BLOCK ====================
  drawSignatureBlock(pm, data);

  // Add footers to all pages
  addFootersToAllPages(pdfDoc, fonts, pm.pageCount);

  return pdfDoc.save();
}
