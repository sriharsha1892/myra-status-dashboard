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
} from 'docx';
import type { QuoteFormData, Currency } from './types';
import {
  STATIC_CONTENT,
  COMPANY_SUFFIXES,
  getBillingText,
  DEFAULT_PAYMENT_TERMS,
} from './constants';

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

// Violet color
const VIOLET_COLOR = '7C3AED';

// Create section header
function createSectionHeader(title: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 24,
        color: '1E293B',
      }),
    ],
    spacing: { before: 300, after: 120 },
    border: {
      bottom: {
        color: VIOLET_COLOR,
        size: 12,
        style: BorderStyle.SINGLE,
        space: 4,
      },
    },
  });
}

// Create bullet point paragraph
function createBullet(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: '• ',
        size: 18,
        color: VIOLET_COLOR,
      }),
      new TextRun({
        text,
        size: 18,
        color: '64748B',
      }),
    ],
    spacing: { after: 60 },
    indent: { left: 200 },
  });
}

// Create body paragraph
function createBodyParagraph(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        size: 18,
        color: '475569',
      }),
    ],
    spacing: { after: 120 },
  });
}

// Create investment table
function createInvestmentTable(data: QuoteFormData): Table {
  const showUsers = data.showUsersColumn !== false;

  const validRows = data.rows.filter(row =>
    row.term || row.users || row.consultingHours || row.offerPrice
  );

  const headers = showUsers
    ? ['Term', 'Users', 'Consulting Hours', 'List Price', 'Promotional Price/Year']
    : ['Term', 'Consulting Hours', 'List Price', 'Promotional Price/Year'];

  const headerRow = new TableRow({
    children: headers.map(header =>
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: header, bold: true, size: 16, color: 'FFFFFF' })],
          alignment: AlignmentType.CENTER,
        })],
        shading: { fill: VIOLET_COLOR },
      })
    ),
    tableHeader: true,
  });

  // Calculate totals
  let totalListPrice = 0;
  let totalOfferPrice = 0;
  const uniqueTerms = new Set(validRows.map(r => r.term.toLowerCase().trim()));
  const showTotalRow = uniqueTerms.size === 1 && validRows.length > 1;

  const dataRows = validRows.map((row, idx) => {
    const listPrice = parseFloat(row.listPrice.replace(/[^0-9.]/g, ''));
    const offerPrice = parseFloat(row.offerPrice.replace(/[^0-9.]/g, ''));
    if (!isNaN(listPrice)) totalListPrice += listPrice;
    if (!isNaN(offerPrice)) totalOfferPrice += offerPrice;

    return new TableRow({
      children: (showUsers
        ? [row.term, row.users, row.consultingHours, formatCurrency(row.listPrice, data.currency), formatCurrency(row.offerPrice, data.currency)]
        : [row.term, row.consultingHours, formatCurrency(row.listPrice, data.currency), formatCurrency(row.offerPrice, data.currency)]
      ).map((cell, cellIdx) =>
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({
              text: cell || '',
              size: 16,
              bold: cellIdx === (showUsers ? 4 : 3),
              color: '334155',
            })],
          })],
          shading: { fill: idx % 2 === 0 ? 'F8FAFC' : 'FFFFFF' },
        })
      ),
    });
  });

  // Total row if applicable
  if (showTotalRow) {
    const totalCells = showUsers
      ? ['Total', '', '', formatCurrency(String(totalListPrice), data.currency), formatCurrency(String(totalOfferPrice), data.currency)]
      : ['Total', '', formatCurrency(String(totalListPrice), data.currency), formatCurrency(String(totalOfferPrice), data.currency)];

    dataRows.push(new TableRow({
      children: totalCells.map((cell, idx) =>
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({
              text: cell,
              size: 16,
              bold: true,
              color: '1E293B',
            })],
          })],
          shading: { fill: 'E2E8F0' },
        })
      ),
    }));
  }

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

// Main Quote Word generation function
export async function generateQuoteWord(data: QuoteFormData): Promise<Uint8Array> {
  const quoteRef = generateQuoteRef(data.quoteDate);
  const children: (Paragraph | Table)[] = [];

  // Header with logo
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'myRA AI',
          bold: true,
          size: 48,
          color: '1E293B',
        }),
        new TextRun({
          text: '®',
          size: 20,
          color: '1E293B',
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
          size: 14,
          color: '64748B',
        }),
      ],
      spacing: { after: 200 },
    })
  );

  // Corporate Quotation header
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Corporate Quotation',
          size: 24,
          color: VIOLET_COLOR,
        }),
        new TextRun({
          text: '   ' + quoteRef,
          size: 16,
          color: '64748B',
        }),
      ],
      alignment: AlignmentType.RIGHT,
      spacing: { before: -300, after: 200 },
    })
  );

  // Client details
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
          new TextRun({ text: detail.label + ': ', size: 18, color: '64748B' }),
          new TextRun({ text: detail.value, size: 18, bold: true, color: '1E293B' }),
        ],
        spacing: { after: 60 },
      })
    );
  }

  // The Proposal section
  children.push(createSectionHeader('The Proposal'));
  children.push(createBodyParagraph(STATIC_CONTENT.theProposal));

  // Investment section
  children.push(createSectionHeader('Investment'));
  children.push(createInvestmentTable(data));

  // What's Included section
  children.push(createSectionHeader("What's Included"));
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Platform Access', size: 18, bold: true, color: '334155' })],
      spacing: { after: 80 },
    })
  );
  for (const bullet of STATIC_CONTENT.platformAccessBullets) {
    children.push(createBullet(bullet));
  }

  // How We Work section
  children.push(createSectionHeader('How We Work'));
  for (const bullet of STATIC_CONTENT.howWeWorkBullets) {
    children.push(createBullet(bullet));
  }

  // Access & Setup section
  children.push(createSectionHeader('Access & Setup'));
  children.push(createBodyParagraph(STATIC_CONTENT.accessAndSetup));

  // Security & Data Governance section
  children.push(createSectionHeader('Security & Data Governance'));
  for (const bullet of STATIC_CONTENT.securityBullets) {
    children.push(createBullet(bullet));
  }

  // Commercial Terms section
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
          new TextRun({ text: term.label + ': ', size: 18, color: '64748B' }),
          new TextRun({ text: term.value, size: 18, color: '334155' }),
        ],
        spacing: { after: 60 },
      })
    );
  }

  // Payment note
  children.push(
    new Paragraph({
      children: [new TextRun({ text: STATIC_CONTENT.paymentNote, size: 16, italics: true, color: '64748B' })],
      spacing: { before: 120, after: 60 },
    })
  );

  // Additional hour rate
  if (data.additionalHourRate && data.additionalHourRate.trim()) {
    const currencySymbols: Record<Currency, string> = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
    const hourRateNote = STATIC_CONTENT.additionalHoursNote(data.additionalHourRate, currencySymbols[data.currency]);
    children.push(
      new Paragraph({
        children: [new TextRun({ text: hourRateNote, size: 16, italics: true, color: '64748B' })],
        spacing: { after: 120 },
      })
    );
  }

  // Expert Review & Consulting section
  children.push(createSectionHeader('Expert Review & Consulting'));
  children.push(createBodyParagraph(STATIC_CONTENT.expertReview));

  // Next Steps section
  children.push(createSectionHeader('Next Steps'));
  children.push(createBodyParagraph(STATIC_CONTENT.nextSteps(data.preparedBy, data.preparedByEmail)));

  // Important Notice box
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: STATIC_CONTENT.importantNotice(data.preparedBy, data.preparedByEmail),
          size: 14,
          italics: true,
          color: '64748B',
        }),
      ],
      spacing: { before: 200 },
      border: {
        top: { color: 'E2E8F0', size: 6, style: BorderStyle.SINGLE },
        bottom: { color: 'E2E8F0', size: 6, style: BorderStyle.SINGLE },
        left: { color: 'E2E8F0', size: 6, style: BorderStyle.SINGLE },
        right: { color: 'E2E8F0', size: 6, style: BorderStyle.SINGLE },
      },
      shading: { fill: 'F8FAFC' },
    })
  );

  // Create document
  const doc = new Document({
    sections: [{
      properties: {},
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: STATIC_CONTENT.footerLine2, size: 12, italics: true, color: '94A3B8' }),
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
                new TextRun({ text: STATIC_CONTENT.footerLine1, size: 12, color: '64748B' }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Page ', size: 14, color: '64748B' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 14, color: '64748B' }),
                new TextRun({ text: ' | product.ask-myra.ai', size: 14, color: VIOLET_COLOR }),
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
