import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableCell,
  TableRow,
  WidthType,
  BorderStyle,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
  VerticalAlign,
  convertInchesToTwip,
  LevelFormat,
  HeadingLevel,
} from 'docx';
import type { QuoteFormData, Currency } from './types';
import {
  STATIC_CONTENT,
  COMPANY_SUFFIXES,
  getBillingText,
  DEFAULT_PAYMENT_TERMS,
} from './constants';

// ============================================================================
// STYLE CONSTANTS
// ============================================================================

// Colors (hex for docx)
const DOCX_COLORS = {
  violet: '7C3AED',
  slate900: '0F172A',
  slate800: '1E293B',
  slate700: '334155',
  slate600: '475569',
  slate500: '64748B',
  slate400: '94A3B8',
  slate200: 'E2E8F0',
  slate100: 'F1F5F9',
  slate50: 'F8FAFC',
  white: 'FFFFFF',
};

// Font sizes (half-points for docx, so 24 = 12pt)
const FONT_SIZES = {
  title: 48,        // 24pt
  subtitle: 24,     // 12pt
  heading: 24,      // 12pt
  subheading: 20,   // 10pt
  body: 20,         // 10pt
  small: 18,        // 9pt
  tableHeader: 18,  // 9pt
  tableBody: 18,    // 9pt
  tiny: 16,         // 8pt
  micro: 14,        // 7pt
  nano: 12,         // 6pt
};

// Spacing (twips - 1/20 of a point, 1440 twips = 1 inch)
const SPACING = {
  sectionBefore: 360,    // ~18pt before sections
  sectionAfter: 180,     // ~9pt after section header
  paragraphAfter: 180,   // ~9pt after paragraphs
  lineAfter: 100,        // ~5pt after bullet items
  smallGap: 80,          // ~4pt small gap
};

// Default font
const DEFAULT_FONT = 'Arial';

// Cell margins for tables (in twips)
const TABLE_CELL_MARGINS = {
  top: 60,
  bottom: 60,
  left: 100,
  right: 100,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Currency formatting with symbols
function formatCurrency(value: string, currency: Currency): string {
  const num = parseFloat(value.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return value;

  const symbols: Record<Currency, string> = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };

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
function generateQuoteRef(quoteDate: string): string {
  const date = new Date(quoteDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
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

// Generate Word filename
export function generateQuoteWordFilename(data: QuoteFormData): string {
  const clientCode = generateClientCode(data.preparedFor);
  const dateStr = formatDateForFilename(data.quoteDate);
  return `myRA_Quote_${clientCode}_${dateStr}.docx`;
}

// ============================================================================
// DOCUMENT ELEMENT CREATORS
// ============================================================================

// Create section header with violet underline
function createSectionHeader(title: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: FONT_SIZES.heading,
        color: DOCX_COLORS.slate800,
        font: DEFAULT_FONT,
      }),
    ],
    spacing: { before: SPACING.sectionBefore, after: SPACING.sectionAfter },
    border: {
      bottom: {
        color: DOCX_COLORS.violet,
        size: 12,
        style: BorderStyle.SINGLE,
        space: 1,
      },
    },
  });
}

// Create subsection header
function createSubsectionHeader(title: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: FONT_SIZES.subheading,
        color: DOCX_COLORS.slate700,
        font: DEFAULT_FONT,
      }),
    ],
    spacing: { before: SPACING.smallGap, after: SPACING.smallGap },
  });
}

// Create bullet point paragraph
function createBullet(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: '•  ',
        size: FONT_SIZES.body,
        color: DOCX_COLORS.violet,
        font: DEFAULT_FONT,
      }),
      new TextRun({
        text,
        size: FONT_SIZES.body,
        color: DOCX_COLORS.slate600,
        font: DEFAULT_FONT,
      }),
    ],
    spacing: { after: SPACING.lineAfter },
    indent: { left: 200 },
  });
}

// Create body paragraph
function createBodyParagraph(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        size: FONT_SIZES.body,
        color: DOCX_COLORS.slate600,
        font: DEFAULT_FONT,
      }),
    ],
    spacing: { after: SPACING.paragraphAfter, line: 276 },
  });
}

// Create divider line
function createDivider(): Paragraph {
  return new Paragraph({
    children: [],
    border: {
      bottom: {
        color: DOCX_COLORS.slate200,
        size: 4,
        style: BorderStyle.SINGLE,
      },
    },
    spacing: { before: 160, after: 200 },
  });
}

// Create investment table with proper formatting
function createInvestmentTable(data: QuoteFormData): Table {
  const showUsers = data.showUsersColumn !== false;
  const showPromotionalPrice = data.showPromotionalPrice !== false;

  const validRows = data.rows.filter(row =>
    row.term || row.users || row.consultingHours || row.offerPrice
  );

  // Build headers and column widths based on which columns are shown
  let headers: string[];
  let columnWidths: number[];

  if (showUsers && showPromotionalPrice) {
    headers = ['Term', 'Users', 'Consulting Hours', 'List Price', 'Promotional Price/Year'];
    columnWidths = [14, 10, 26, 24, 26];
  } else if (showUsers && !showPromotionalPrice) {
    headers = ['Term', 'Users', 'Consulting Hours', 'List Price'];
    columnWidths = [18, 14, 34, 34];
  } else if (!showUsers && showPromotionalPrice) {
    headers = ['Term', 'Consulting Hours', 'List Price', 'Promotional Price/Year'];
    columnWidths = [16, 34, 24, 26];
  } else {
    headers = ['Term', 'Consulting Hours', 'List Price'];
    columnWidths = [20, 45, 35];
  }

  // Create header row with styling
  const headerRow = new TableRow({
    children: headers.map((header, idx) =>
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({
            text: header,
            bold: true,
            size: FONT_SIZES.tableHeader,
            color: DOCX_COLORS.white,
            font: DEFAULT_FONT,
          })],
          alignment: AlignmentType.CENTER,
        })],
        shading: { fill: DOCX_COLORS.violet },
        verticalAlign: VerticalAlign.CENTER,
        width: { size: columnWidths[idx], type: WidthType.PERCENTAGE },
        margins: TABLE_CELL_MARGINS,
      })
    ),
    tableHeader: true,
  });

  // Calculate totals
  let totalListPrice = 0;
  let totalOfferPrice = 0;
  const uniqueTerms = new Set(validRows.map(r => r.term.toLowerCase().trim()));
  const showTotalRow = uniqueTerms.size === 1 && validRows.length > 1;

  // Determine promotional price column index for bold styling
  const promotionalPriceIndex = showPromotionalPrice
    ? (showUsers ? 4 : 3)
    : -1;

  // Create data rows
  const dataRows = validRows.map((row, idx) => {
    const listPrice = parseFloat(row.listPrice.replace(/[^0-9.]/g, ''));
    const offerPrice = parseFloat(row.offerPrice.replace(/[^0-9.]/g, ''));
    if (!isNaN(listPrice)) totalListPrice += listPrice;
    if (!isNaN(offerPrice)) totalOfferPrice += offerPrice;

    // Build row data based on which columns are shown
    let rowCells: string[];
    if (showUsers && showPromotionalPrice) {
      rowCells = [row.term, row.users, row.consultingHours, formatCurrency(row.listPrice, data.currency), formatCurrency(row.offerPrice, data.currency)];
    } else if (showUsers && !showPromotionalPrice) {
      rowCells = [row.term, row.users, row.consultingHours, formatCurrency(row.listPrice, data.currency)];
    } else if (!showUsers && showPromotionalPrice) {
      rowCells = [row.term, row.consultingHours, formatCurrency(row.listPrice, data.currency), formatCurrency(row.offerPrice, data.currency)];
    } else {
      rowCells = [row.term, row.consultingHours, formatCurrency(row.listPrice, data.currency)];
    }

    return new TableRow({
      children: rowCells.map((cell, cellIdx) =>
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({
              text: cell || '',
              size: FONT_SIZES.tableBody,
              bold: cellIdx === promotionalPriceIndex,
              color: DOCX_COLORS.slate700,
              font: DEFAULT_FONT,
            })],
          })],
          shading: { fill: idx % 2 === 0 ? DOCX_COLORS.slate50 : DOCX_COLORS.white },
          verticalAlign: VerticalAlign.CENTER,
          width: { size: columnWidths[cellIdx], type: WidthType.PERCENTAGE },
          margins: TABLE_CELL_MARGINS,
        })
      ),
    });
  });

  // Total row if applicable
  if (showTotalRow) {
    let totalCells: string[];
    if (showUsers && showPromotionalPrice) {
      totalCells = ['Total', '', '', formatCurrency(String(totalListPrice), data.currency), formatCurrency(String(totalOfferPrice), data.currency)];
    } else if (showUsers && !showPromotionalPrice) {
      totalCells = ['Total', '', '', formatCurrency(String(totalListPrice), data.currency)];
    } else if (!showUsers && showPromotionalPrice) {
      totalCells = ['Total', '', formatCurrency(String(totalListPrice), data.currency), formatCurrency(String(totalOfferPrice), data.currency)];
    } else {
      totalCells = ['Total', '', formatCurrency(String(totalListPrice), data.currency)];
    }

    dataRows.push(new TableRow({
      children: totalCells.map((cell, cellIdx) =>
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({
              text: cell,
              size: FONT_SIZES.tableBody,
              bold: true,
              color: DOCX_COLORS.slate800,
              font: DEFAULT_FONT,
            })],
          })],
          shading: { fill: DOCX_COLORS.slate200 },
          verticalAlign: VerticalAlign.CENTER,
          width: { size: columnWidths[cellIdx], type: WidthType.PERCENTAGE },
          margins: TABLE_CELL_MARGINS,
        })
      ),
    }));
  }

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: DOCX_COLORS.slate200 },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: DOCX_COLORS.slate200 },
      left: { style: BorderStyle.SINGLE, size: 4, color: DOCX_COLORS.slate200 },
      right: { style: BorderStyle.SINGLE, size: 4, color: DOCX_COLORS.slate200 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: DOCX_COLORS.slate200 },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: DOCX_COLORS.slate200 },
    },
  });
}

// ============================================================================
// MAIN DOCUMENT GENERATOR
// ============================================================================

export async function generateQuoteWord(data: QuoteFormData): Promise<Uint8Array> {
  const quoteRef = generateQuoteRef(data.quoteDate);
  const children: (Paragraph | Table)[] = [];

  // ---- HEADER SECTION ----

  // myRA AI Logo/Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'myRA AI',
          bold: true,
          size: FONT_SIZES.title,
          color: DOCX_COLORS.slate800,
          font: DEFAULT_FONT,
        }),
        new TextRun({
          text: '®',
          size: 20,
          color: DOCX_COLORS.slate800,
          font: DEFAULT_FONT,
          superScript: true,
        }),
      ],
    })
  );

  // Tagline
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'DECISION-GRADE INTELLIGENCE',
          size: FONT_SIZES.micro,
          color: DOCX_COLORS.slate500,
          font: DEFAULT_FONT,
          characterSpacing: 20,
        }),
      ],
      spacing: { after: 120 },
    })
  );

  // Corporate Quotation + Quote Ref (right aligned)
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Corporate Quotation',
          size: FONT_SIZES.subtitle,
          color: DOCX_COLORS.violet,
          font: DEFAULT_FONT,
        }),
        new TextRun({
          text: '    ' + quoteRef,
          size: FONT_SIZES.tiny,
          color: DOCX_COLORS.slate500,
          font: DEFAULT_FONT,
        }),
      ],
      alignment: AlignmentType.RIGHT,
      spacing: { before: -280, after: 120 },
    })
  );

  // Divider after header
  children.push(createDivider());

  // ---- CLIENT DETAILS ----

  const clientDetails = [
    { label: 'Prepared For', value: data.preparedFor },
    { label: 'Contact', value: data.contactTitle ? `${data.contactName}, ${data.contactTitle}` : data.contactName },
    { label: 'Email', value: data.contactEmail },
    { label: 'Date', value: formatDate(data.quoteDate) },
    ...(data.preparedBy ? [{ label: 'Prepared By', value: data.preparedBy }] : []),
  ];

  for (const detail of clientDetails) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: detail.label + ':  ',
            size: FONT_SIZES.body,
            color: DOCX_COLORS.slate500,
            font: DEFAULT_FONT,
          }),
          new TextRun({
            text: detail.value,
            size: FONT_SIZES.body,
            bold: true,
            color: DOCX_COLORS.slate800,
            font: DEFAULT_FONT,
          }),
        ],
        spacing: { after: SPACING.smallGap },
      })
    );
  }

  // ---- MAIN CONTENT SECTIONS ----

  // The Proposal
  children.push(createSectionHeader('The Proposal'));
  children.push(createBodyParagraph(STATIC_CONTENT.theProposal));

  // Investment
  children.push(createSectionHeader('Investment'));
  children.push(createInvestmentTable(data));

  // Add spacing after table
  children.push(new Paragraph({ children: [], spacing: { after: 100 } }));

  // What's Included
  children.push(createSectionHeader("What's Included"));
  children.push(createSubsectionHeader('Platform Access'));
  for (const bullet of STATIC_CONTENT.platformAccessBullets) {
    children.push(createBullet(bullet));
  }

  // How We Work
  children.push(createSectionHeader('How We Work'));
  for (const bullet of STATIC_CONTENT.howWeWorkBullets) {
    children.push(createBullet(bullet));
  }

  // Access & Setup
  children.push(createSectionHeader('Access & Setup'));
  children.push(createBodyParagraph(STATIC_CONTENT.accessAndSetup));

  // Security & Data Governance
  children.push(createSectionHeader('Security & Data Governance'));
  for (const bullet of STATIC_CONTENT.securityBullets) {
    children.push(createBullet(bullet));
  }

  // Commercial Terms
  children.push(createSectionHeader('Commercial Terms'));

  const billingText = getBillingText(data.paymentTerms || DEFAULT_PAYMENT_TERMS);
  const terms = [
    { label: 'Billing', value: billingText },
    { label: 'Licensing', value: STATIC_CONTENT.commercialTerms.licensing },
    { label: 'Provisioning', value: STATIC_CONTENT.commercialTerms.provisioning },
    { label: 'Valid Until', value: formatDate(data.validUntil) },
  ];

  for (const term of terms) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: term.label + ':  ',
            size: FONT_SIZES.body,
            color: DOCX_COLORS.slate500,
            font: DEFAULT_FONT,
          }),
          new TextRun({
            text: term.value,
            size: FONT_SIZES.body,
            color: DOCX_COLORS.slate700,
            font: DEFAULT_FONT,
          }),
        ],
        spacing: { after: SPACING.smallGap },
      })
    );
  }

  // Payment note
  children.push(
    new Paragraph({
      children: [new TextRun({
        text: STATIC_CONTENT.paymentNote,
        size: FONT_SIZES.small,
        italics: true,
        color: DOCX_COLORS.slate500,
        font: DEFAULT_FONT,
      })],
      spacing: { before: 120, after: SPACING.smallGap },
    })
  );

  // Additional hour rate (if provided)
  if (data.additionalHourRate && data.additionalHourRate.trim()) {
    const currencySymbols: Record<Currency, string> = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
    const hourRateNote = STATIC_CONTENT.additionalHoursNote(data.additionalHourRate, currencySymbols[data.currency]);
    children.push(
      new Paragraph({
        children: [new TextRun({
          text: hourRateNote,
          size: FONT_SIZES.small,
          italics: true,
          color: DOCX_COLORS.slate500,
          font: DEFAULT_FONT,
        })],
        spacing: { after: 120 },
      })
    );
  }

  // Expert Review & Consulting
  children.push(createSectionHeader('Expert Review & Consulting'));
  children.push(createBodyParagraph(STATIC_CONTENT.expertReview));

  // Next Steps
  children.push(createSectionHeader('Next Steps'));
  children.push(createBodyParagraph(STATIC_CONTENT.nextSteps(data.preparedBy, data.preparedByEmail)));

  // Important Notice box
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: STATIC_CONTENT.importantNotice(data.preparedBy, data.preparedByEmail),
          size: FONT_SIZES.micro,
          italics: true,
          color: DOCX_COLORS.slate500,
          font: DEFAULT_FONT,
        }),
      ],
      spacing: { before: 280 },
      border: {
        top: { color: DOCX_COLORS.slate200, size: 8, style: BorderStyle.SINGLE },
        bottom: { color: DOCX_COLORS.slate200, size: 8, style: BorderStyle.SINGLE },
        left: { color: DOCX_COLORS.slate200, size: 8, style: BorderStyle.SINGLE },
        right: { color: DOCX_COLORS.slate200, size: 8, style: BorderStyle.SINGLE },
      },
      shading: { fill: DOCX_COLORS.slate50 },
      indent: { left: 120, right: 120 },
    })
  );

  // ---- CREATE DOCUMENT ----

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(0.6),
            right: convertInchesToTwip(0.75),
            bottom: convertInchesToTwip(0.6),
            left: convertInchesToTwip(0.75),
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: STATIC_CONTENT.footerLine2,
                  size: FONT_SIZES.nano,
                  italics: true,
                  color: DOCX_COLORS.slate400,
                  font: DEFAULT_FONT,
                }),
              ],
              alignment: AlignmentType.RIGHT,
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: STATIC_CONTENT.footerLine1,
                  size: FONT_SIZES.nano,
                  color: DOCX_COLORS.slate500,
                  font: DEFAULT_FONT,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Page ',
                  size: FONT_SIZES.micro,
                  color: DOCX_COLORS.slate500,
                  font: DEFAULT_FONT,
                }),
                new TextRun({
                  children: [PageNumber.CURRENT],
                  size: FONT_SIZES.micro,
                  color: DOCX_COLORS.slate500,
                  font: DEFAULT_FONT,
                }),
                new TextRun({
                  text: '  |  product.ask-myra.ai',
                  size: FONT_SIZES.micro,
                  color: DOCX_COLORS.violet,
                  font: DEFAULT_FONT,
                }),
              ],
              alignment: AlignmentType.RIGHT,
            }),
          ],
        }),
      },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}
