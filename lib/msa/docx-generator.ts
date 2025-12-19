import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableCell,
  TableRow,
  WidthType,
  BorderStyle,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
} from 'docx';
import type { MSAFormData } from './types';
import type { Currency } from '../quote/types';
import {
  MORDOR_SIGNATORY,
  MSA_SECTIONS,
  MSA_FOOTER,
  getBillingText,
} from './constants';
import { COMPANY_SUFFIXES } from '../quote/constants';

// Currency formatting
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

// Generate MSA Word filename
export function generateMSAWordFilename(data: MSAFormData): string {
  const clientCode = generateClientCode(data.clientLegalName);
  const dateStr = formatDateForFilename(data.effectiveDate);
  return `myRA_MSA_${clientCode}_v${data.agreementVersion}_${dateStr}.docx`;
}

// Violet color for headers
const VIOLET_COLOR = '7C3AED';

// Create section header paragraph
function createSectionHeader(title: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 24, // 12pt
        color: '1E293B',
      }),
    ],
    heading: HeadingLevel.HEADING_2,
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

// Create body paragraph
function createBodyParagraph(text: string, indent: number = 0): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        size: 20, // 10pt
        color: '475569',
      }),
    ],
    spacing: { after: 120 },
    indent: { left: indent },
  });
}

// Create definition paragraph
function createDefinition(term: string, definition: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: term + ' ',
        bold: true,
        size: 18,
        color: '334155',
      }),
      new TextRun({
        text: definition,
        size: 18,
        color: '64748B',
      }),
    ],
    spacing: { after: 80 },
    indent: { left: 200 },
  });
}

// Create order form table
function createOrderFormTable(data: MSAFormData): Table {
  const showUsers = data.showUsersColumn !== false;
  const selectedIndices = data.selectedRowIndices && data.selectedRowIndices.length > 0
    ? data.selectedRowIndices
    : [];

  const rows = selectedIndices.length > 0
    ? selectedIndices.map(i => data.orderFormRows[i]).filter(Boolean)
    : data.orderFormRows;

  const validRows = rows.filter(row =>
    row && (row.term || row.users || row.consultingHours || row.offerPrice)
  );

  const headers = showUsers
    ? ['Term', 'Users', 'Consulting Hours', 'List Price', 'Investment']
    : ['Term', 'Consulting Hours', 'List Price', 'Investment'];

  const headerRow = new TableRow({
    children: headers.map(header =>
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: header, bold: true, size: 18, color: 'FFFFFF' })],
          alignment: AlignmentType.CENTER,
        })],
        shading: { fill: VIOLET_COLOR },
      })
    ),
    tableHeader: true,
  });

  const dataRows = validRows.map((row, idx) =>
    new TableRow({
      children: (showUsers
        ? [row.term, row.users, row.consultingHours, formatCurrency(row.listPrice, data.currency), formatCurrency(row.offerPrice, data.currency)]
        : [row.term, row.consultingHours, formatCurrency(row.listPrice, data.currency), formatCurrency(row.offerPrice, data.currency)]
      ).map((cell, cellIdx) =>
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({
              text: cell || '',
              size: 18,
              bold: cellIdx === (showUsers ? 4 : 3),
              color: '334155',
            })],
          })],
          shading: { fill: idx % 2 === 0 ? 'F8FAFC' : 'FFFFFF' },
        })
      ),
    })
  );

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

// Create ownership summary table
function createOwnershipSummaryTable(): Table {
  const rows = MSA_SECTIONS.ownershipSummary.rows;

  const headerRow = new TableRow({
    children: ['Asset Type', 'Ownership', 'License to Other Party'].map(header =>
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: header, bold: true, size: 18, color: 'FFFFFF' })],
          alignment: AlignmentType.CENTER,
        })],
        shading: { fill: VIOLET_COLOR },
      })
    ),
    tableHeader: true,
  });

  const dataRows = rows.map((row, idx) =>
    new TableRow({
      children: [row.assetType, row.ownership, row.license].map((cell, cellIdx) =>
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({
              text: cell,
              size: 18,
              bold: cellIdx === 0,
              color: '334155',
            })],
          })],
          shading: { fill: idx % 2 === 0 ? 'F8FAFC' : 'FFFFFF' },
        })
      ),
    })
  );

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

// Create SLA response time table
function createResponseTimeTable(): Table {
  const rows = MSA_SECTIONS.slaAnnexure.sections.responseTime.table;

  const headerRow = new TableRow({
    children: ['Severity Level', 'Description', 'Initial Response', 'Resolution Target'].map(header =>
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

  const dataRows = rows.map((row, idx) =>
    new TableRow({
      children: [row.severity, row.description, row.response, row.resolution].map((cell, cellIdx) =>
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({
              text: cell,
              size: 16,
              bold: cellIdx === 0,
              color: '334155',
            })],
          })],
          shading: { fill: idx % 2 === 0 ? 'F8FAFC' : 'FFFFFF' },
        })
      ),
    })
  );

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

// Main MSA Word generation function
export async function generateMSAWord(data: MSAFormData): Promise<Uint8Array> {
  const children: (Paragraph | Table)[] = [];

  // Header with logo
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'myRA AI',
          bold: true,
          size: 44,
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

  // Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: MSA_SECTIONS.title,
          bold: true,
          size: 24,
          color: VIOLET_COLOR,
        }),
      ],
      alignment: AlignmentType.RIGHT,
      spacing: { before: -300, after: 120 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: MSA_SECTIONS.subtitle,
          size: 16,
          color: '64748B',
        }),
      ],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 200 },
    })
  );

  // Preamble
  const preambleText = MSA_SECTIONS.preamble(
    formatDate(data.effectiveDate),
    data.clientLegalName,
    data.clientAddress,
    data.clientCountry
  );
  children.push(createBodyParagraph(preambleText));

  // Definitions
  children.push(createSectionHeader(MSA_SECTIONS.definitions.title));
  children.push(
    new Paragraph({
      children: [new TextRun({ text: MSA_SECTIONS.definitions.intro, size: 18, italics: true, color: '64748B' })],
      spacing: { after: 120 },
    })
  );
  for (const def of MSA_SECTIONS.definitions.terms) {
    children.push(createDefinition(def.term, def.definition));
  }

  // Section 1: Grant of License
  children.push(createSectionHeader(MSA_SECTIONS.grantOfLicense.title));
  children.push(createBodyParagraph(MSA_SECTIONS.grantOfLicense.content));

  // Section 2: Permitted Use
  children.push(createSectionHeader(MSA_SECTIONS.permittedUse.title));
  children.push(createBodyParagraph(MSA_SECTIONS.permittedUse.content));

  // Section 3: Nature of License
  children.push(createSectionHeader(MSA_SECTIONS.natureOfLicense.title));
  children.push(createBodyParagraph(MSA_SECTIONS.natureOfLicense.content));

  // Consulting Services (optional)
  if (data.includeConsultingServices) {
    children.push(createSectionHeader(MSA_SECTIONS.consultingServices.title));
    children.push(createBodyParagraph(MSA_SECTIONS.consultingServices.content));

    children.push(createSectionHeader(MSA_SECTIONS.analystHoursIndemnity.title));
    children.push(createBodyParagraph(MSA_SECTIONS.analystHoursIndemnity.content));

    children.push(createSectionHeader(MSA_SECTIONS.consultingTermination.title));
    children.push(createBodyParagraph(MSA_SECTIONS.consultingTermination.content));
  }

  // AI Outputs and IP sections
  children.push(createSectionHeader(MSA_SECTIONS.aiOutputsAndIP.title));
  children.push(createBodyParagraph(MSA_SECTIONS.aiOutputsAndIP.content));

  children.push(createSectionHeader(MSA_SECTIONS.intellectualPropertyReservation.title));
  children.push(createBodyParagraph(MSA_SECTIONS.intellectualPropertyReservation.content));

  children.push(createSectionHeader(MSA_SECTIONS.feedbackAndEnhancements.title));
  children.push(createBodyParagraph(MSA_SECTIONS.feedbackAndEnhancements.content));

  children.push(createSectionHeader(MSA_SECTIONS.retrainingRights.title));
  children.push(createBodyParagraph(MSA_SECTIONS.retrainingRights.content));

  children.push(createSectionHeader(MSA_SECTIONS.thirdPartyDataContent.title));
  children.push(createBodyParagraph(MSA_SECTIONS.thirdPartyDataContent.content));

  // Sections 4-8
  children.push(createSectionHeader(MSA_SECTIONS.sublicensing.title));
  children.push(createBodyParagraph(MSA_SECTIONS.sublicensing.content));

  children.push(createSectionHeader(MSA_SECTIONS.licenseTerm.title));
  children.push(createBodyParagraph(MSA_SECTIONS.licenseTerm.content));

  children.push(createSectionHeader(MSA_SECTIONS.licenseRevocation.title));
  children.push(createBodyParagraph(MSA_SECTIONS.licenseRevocation.content));

  children.push(createSectionHeader(MSA_SECTIONS.complianceAndAudit.title));
  children.push(createBodyParagraph(MSA_SECTIONS.complianceAndAudit.content));

  children.push(createSectionHeader(MSA_SECTIONS.feedback.title));
  children.push(createBodyParagraph(MSA_SECTIONS.feedback.content));

  // Section 9: Order Form and Fees
  children.push(createSectionHeader(MSA_SECTIONS.orderFormAndFees.title));
  children.push(createBodyParagraph(MSA_SECTIONS.orderFormAndFees.intro));
  children.push(createOrderFormTable(data));

  // Payment terms
  if (data.paymentTerms) {
    const billingText = data.customPaymentText?.trim() || getBillingText(data.paymentTerms);
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Billing: ', bold: true, size: 18, color: '334155' }),
          new TextRun({ text: billingText, size: 18, color: '334155' }),
        ],
        spacing: { before: 120, after: 120 },
      })
    );
  }

  children.push(createBodyParagraph(MSA_SECTIONS.orderFormAndFees.content));

  // Sections 10-26
  children.push(createSectionHeader(MSA_SECTIONS.termAndTermination.title));
  children.push(createBodyParagraph(MSA_SECTIONS.termAndTermination.content));

  children.push(createSectionHeader(MSA_SECTIONS.serviceLevels.title));
  children.push(createBodyParagraph(MSA_SECTIONS.serviceLevels.content));

  children.push(createSectionHeader(MSA_SECTIONS.performanceWarranties.title));
  children.push(createBodyParagraph(MSA_SECTIONS.performanceWarranties.content));

  children.push(createSectionHeader(MSA_SECTIONS.customerData.title));
  children.push(createBodyParagraph(MSA_SECTIONS.customerData.content));

  children.push(createSectionHeader(MSA_SECTIONS.confidentiality.title));
  children.push(createBodyParagraph(MSA_SECTIONS.confidentiality.content));

  children.push(createSectionHeader(MSA_SECTIONS.dataProtection.title));
  children.push(createBodyParagraph(MSA_SECTIONS.dataProtection.content));

  // Section 16: Ownership Summary Table
  children.push(createSectionHeader(MSA_SECTIONS.ownershipSummary.title));
  children.push(createOwnershipSummaryTable());

  children.push(createSectionHeader(MSA_SECTIONS.warrantiesRepresentations.title));
  children.push(createBodyParagraph(MSA_SECTIONS.warrantiesRepresentations.content));

  children.push(createSectionHeader(MSA_SECTIONS.indemnification.title));
  children.push(createBodyParagraph(MSA_SECTIONS.indemnification.content));

  children.push(createSectionHeader(MSA_SECTIONS.aiDisclaimers.title));
  children.push(createBodyParagraph(MSA_SECTIONS.aiDisclaimers.content));

  children.push(createSectionHeader(MSA_SECTIONS.limitationOfLiability.title));
  children.push(createBodyParagraph(MSA_SECTIONS.limitationOfLiability.content));

  children.push(createSectionHeader(MSA_SECTIONS.remediesAndCompliance.title));
  children.push(createBodyParagraph(MSA_SECTIONS.remediesAndCompliance.content));

  children.push(createSectionHeader(MSA_SECTIONS.complianceAndEthicalConduct.title));
  children.push(createBodyParagraph(MSA_SECTIONS.complianceAndEthicalConduct.content));

  children.push(createSectionHeader(MSA_SECTIONS.subcontractingAndAssignment.title));
  children.push(createBodyParagraph(MSA_SECTIONS.subcontractingAndAssignment.content));

  children.push(createSectionHeader(MSA_SECTIONS.disputeResolution.title));
  children.push(createBodyParagraph(MSA_SECTIONS.disputeResolution.content));

  // Governing Law and Jurisdiction (dynamic)
  children.push(createSectionHeader(MSA_SECTIONS.governingLaw.title));
  children.push(createBodyParagraph(MSA_SECTIONS.governingLaw.content(data.jurisdiction)));

  children.push(createSectionHeader(MSA_SECTIONS.jurisdiction.title));
  children.push(createBodyParagraph(MSA_SECTIONS.jurisdiction.content(data.jurisdiction)));

  children.push(createSectionHeader(MSA_SECTIONS.forceMajeure.title));
  children.push(createBodyParagraph(MSA_SECTIONS.forceMajeure.content));

  children.push(createSectionHeader(MSA_SECTIONS.notices.title));
  children.push(createBodyParagraph(MSA_SECTIONS.notices.content));

  children.push(createSectionHeader(MSA_SECTIONS.generalProvisions.title));
  children.push(createBodyParagraph(MSA_SECTIONS.generalProvisions.content));

  // Special Terms
  if (data.specialTerms && data.specialTerms.trim()) {
    children.push(createSectionHeader('27. Special Terms'));
    children.push(createBodyParagraph(data.specialTerms));
  }

  // SLA Annexure
  children.push(
    new Paragraph({
      children: [new TextRun({ text: MSA_SECTIONS.slaAnnexure.title, bold: true, size: 28, color: VIOLET_COLOR })],
      pageBreakBefore: true,
      spacing: { after: 80 },
    })
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: MSA_SECTIONS.slaAnnexure.subtitle, size: 20, color: '64748B' })],
      spacing: { after: 200 },
    })
  );

  const slaSections = MSA_SECTIONS.slaAnnexure.sections;

  children.push(createSectionHeader(slaSections.purpose.title));
  children.push(createBodyParagraph(slaSections.purpose.content));

  children.push(createSectionHeader(slaSections.definitions.title));
  children.push(createBodyParagraph(slaSections.definitions.content));

  children.push(createSectionHeader(slaSections.availability.title));
  children.push(createBodyParagraph(slaSections.availability.content));

  children.push(createSectionHeader(slaSections.maintenance.title));
  children.push(createBodyParagraph(slaSections.maintenance.content));

  children.push(createSectionHeader(slaSections.responseTime.title));
  children.push(createResponseTimeTable());

  children.push(createSectionHeader(slaSections.support.title));
  children.push(createBodyParagraph(slaSections.support.content));

  children.push(createSectionHeader(slaSections.backup.title));
  children.push(createBodyParagraph(slaSections.backup.content));

  children.push(createSectionHeader(slaSections.security.title));
  children.push(createBodyParagraph(slaSections.security.content));

  children.push(createSectionHeader(slaSections.limitations.title));
  children.push(createBodyParagraph(slaSections.limitations.content));

  children.push(createSectionHeader(slaSections.changeManagement.title));
  children.push(createBodyParagraph(slaSections.changeManagement.content));

  // Signature Block
  children.push(
    new Paragraph({
      children: [new TextRun({ text: MSA_SECTIONS.signatureBlock.title, bold: true, size: 24, color: '1E293B' })],
      spacing: { before: 400, after: 120 },
    })
  );
  children.push(createBodyParagraph(MSA_SECTIONS.signatureBlock.intro));

  // Mordor signatory
  children.push(
    new Paragraph({
      children: [new TextRun({ text: MSA_SECTIONS.signatureBlock.mordorHeader, bold: true, size: 20, color: '1E293B' })],
      spacing: { before: 200, after: 120 },
    })
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: '_'.repeat(50), color: '94A3B8' })],
      spacing: { after: 40 },
    })
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Signature', size: 14, color: '64748B' })],
      spacing: { after: 120 },
    })
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: MORDOR_SIGNATORY.name, bold: true, size: 18, color: '334155' })],
      spacing: { after: 40 },
    })
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: MORDOR_SIGNATORY.title, size: 16, color: '64748B' })],
      spacing: { after: 120 },
    })
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: '_'.repeat(50), color: '94A3B8' })],
      spacing: { after: 40 },
    })
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Date', size: 14, color: '64748B' })],
      spacing: { after: 200 },
    })
  );

  // Client signatory
  children.push(
    new Paragraph({
      children: [new TextRun({ text: MSA_SECTIONS.signatureBlock.clientHeader, bold: true, size: 20, color: '1E293B' })],
      spacing: { before: 200, after: 120 },
    })
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: '_'.repeat(50), color: '94A3B8' })],
      spacing: { after: 40 },
    })
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Signature', size: 14, color: '64748B' })],
      spacing: { after: 120 },
    })
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: data.clientContactName || '______________________', bold: true, size: 18, color: '334155' })],
      spacing: { after: 40 },
    })
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: data.clientContactTitle || 'Title: ______________________', size: 16, color: '64748B' })],
      spacing: { after: 120 },
    })
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: '_'.repeat(50), color: '94A3B8' })],
      spacing: { after: 40 },
    })
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Date', size: 14, color: '64748B' })],
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
                new TextRun({ text: MSA_FOOTER.trademark, size: 14, italics: true, color: '94A3B8' }),
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
                new TextRun({ text: MSA_FOOTER.certifications, size: 12, color: '64748B' }),
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
