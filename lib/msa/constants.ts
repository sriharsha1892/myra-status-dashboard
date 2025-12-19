import type { MSAFormData } from './types';

// Reuse brand colors from quote
export { PDF_COLORS, PAGE_WIDTH, PAGE_HEIGHT, MARGIN_LEFT, MARGIN_RIGHT, CONTENT_WIDTH } from '../quote/constants';

// Import payment options from quote for consistency across Quote and MSA
export {
  PAYMENT_FREQUENCY_OPTIONS,
  PAYMENT_BASIS_OPTIONS,
  NET_TERMS_OPTIONS,
  DEFAULT_PAYMENT_TERMS,
  getBillingText,
} from '../quote/constants';

// Mordor Intelligence signatory (fixed)
export const MORDOR_SIGNATORY = {
  name: 'Bharadwaj Obula Reddy',
  title: 'CEO',
  entity: 'Mordor Intelligence Pvt. Ltd.',
  address: '11th Floor, Rajapushpa Summit, Nanakramguda Rd, Financial District, Gachibowli, Hyderabad, Telangana – 500032, India',
};

// Jurisdiction auto-suggestion based on client country
export const JURISDICTION_BY_COUNTRY: Record<string, string> = {
  'United States': 'State of Delaware, United States',
  'USA': 'State of Delaware, United States',
  'United Kingdom': 'England and Wales',
  'UK': 'England and Wales',
  'India': 'Courts of Hyderabad, Telangana, India',
  'Germany': 'Courts of Frankfurt, Germany',
  'France': 'Courts of Paris, France',
  'Singapore': 'Courts of Singapore',
  'Australia': 'Courts of New South Wales, Australia',
  'Canada': 'Province of Ontario, Canada',
  'Japan': 'Courts of Tokyo, Japan',
  'Netherlands': 'Courts of Amsterdam, Netherlands',
  'Switzerland': 'Courts of Zurich, Switzerland',
  'UAE': 'Courts of Dubai, UAE',
  'United Arab Emirates': 'Courts of Dubai, UAE',
  'Saudi Arabia': 'Courts of Riyadh, Saudi Arabia',
  'South Korea': 'Courts of Seoul, South Korea',
  'Brazil': 'Courts of Sao Paulo, Brazil',
  'Mexico': 'Courts of Mexico City, Mexico',
  'China': 'Courts of Shanghai, China',
  'Hong Kong': 'Courts of Hong Kong SAR',
  'Italy': 'Courts of Milan, Italy',
  'Spain': 'Courts of Madrid, Spain',
  'Default': 'Courts of Hyderabad, Telangana, India',
};

// Country list for dropdown
export const COUNTRIES = [
  'United States',
  'United Kingdom',
  'India',
  'Germany',
  'France',
  'Singapore',
  'Australia',
  'Canada',
  'Japan',
  'Netherlands',
  'Switzerland',
  'UAE',
  'Saudi Arabia',
  'South Korea',
  'Brazil',
  'Mexico',
  'China',
  'Hong Kong',
  'Italy',
  'Spain',
  'Other',
];

// MSA section content - Full 26 sections from template
export const MSA_SECTIONS = {
  // Document title
  title: 'MASTER SAAS SUBSCRIPTION AGREEMENT',
  subtitle: '("Agreement")',

  // Preamble template
  preamble: (effectiveDate: string, clientName: string, clientAddress: string, clientCountry: string) =>
    `This Master SaaS Subscription Agreement ("Agreement") is entered into as of the Effective Date mentioned in the Order Form ("Effective Date") by and between:\n\n` +
    `${MORDOR_SIGNATORY.entity}, a company incorporated under the laws of India, having its registered office at ${MORDOR_SIGNATORY.address} ("Mordor" or "Licensor"), and\n\n` +
    `${clientName}, a company incorporated under the laws of ${clientCountry}, having its registered office at ${clientAddress} ("Customer" or "Licensee").\n\n` +
    `Mordor and Customer are hereinafter collectively referred to as the "Parties" and individually as a "Party".`,

  // Definitions
  definitions: {
    title: 'Definitions',
    intro: 'For purposes of this Agreement, the following capitalized terms shall have the meanings set forth below:',
    terms: [
      { term: '"Affiliate"', definition: 'means any entity that directly or indirectly controls, is controlled by, or is under common control with a Party.' },
      { term: '"AI Outputs"', definition: 'means insights, analytics, reports, forecasts, or any other content generated through the use of the myRA AI™ Platform.' },
      { term: '"Authorized Users"', definition: 'means employees, agents, or contractors of Customer authorized to access and use the Services pursuant to this Agreement.' },
      { term: '"Confidential Information"', definition: 'shall have the meaning set forth in Section 10 of this Agreement.' },
      { term: '"Customer Data"', definition: 'means all electronic data, content, or information submitted, uploaded, or transmitted by Customer or its Authorized Users through the myRA AI™ Platform.' },
      { term: '"Documentation"', definition: 'means the manuals, user guides, and technical specifications provided by Mordor relating to the Services.' },
      { term: '"Intellectual Property Rights"', definition: 'means all rights in patents, copyrights, trade secrets, trademarks, moral rights, designs, know-how, and other proprietary rights.' },
      { term: '"Order Form"', definition: 'means the executed order or subscription form specifying details such as Services, Subscription Term, Fees, and Effective Date.' },
      { term: '"Platform" or "myRA AI™"', definition: 'means Mordor\'s proprietary AI-driven SaaS platform that delivers research analytics, forecasting, and data-driven insights.' },
      { term: '"Services"', definition: 'means the provision of access to the Platform, including hosting, maintenance, support, and AI-driven analytics.' },
      { term: '"Subscription Term"', definition: 'means the duration for which Customer is entitled to use the Services, as specified in the applicable Order Form.' },
      { term: '"Third-Party Data"', definition: 'means any data, content, or information that is (a) sourced, licensed, or procured by Mordor from third-party providers and integrated within the Platform through MCP tools, APIs, or other mechanisms under express authorization; and (b) data or content referenced, derived, or utilized by Mordor\'s AI systems from publicly available sources on the internet to generate outputs, insights, or analyses, provided that such use does not involve any unauthorized extraction, reproduction, or redistribution of third-party proprietary content.' },
    ],
  },

  // Section 1: Grant of License
  grantOfLicense: {
    title: '1. Grant of License',
    content: `1.1 License Type: Subject to the terms of this Agreement, Mordor Intelligence Pvt. Ltd. ("Licensor") hereby grants to the Client ("Licensee") a full use, non-exclusive, non-transferable, non-sublicensable, revocable license to access and use the myRA AI™ Software-as-a-Service platform ("Platform") solely for Licensee's internal business purposes during the Term of this Agreement.

1.2 Authorized Users: Access shall be limited to the number of authorized users ("Authorized Users") specified in the Order Form (Attached as Annexure B). Each Authorized User shall be an employee, consultant, or contractor of the Licensee who has been assigned unique login credentials. Licensee shall ensure that all Authorized Users comply with this Agreement, and any breach by an Authorized User shall be deemed a breach by Licensee.

1.3 Access Rights: The License entitles the Licensee to use:
The myRA AI™ interface and dashboards;
Reports, analytics, summaries, and AI-generated outputs produced by the Platform;
Associated databases, documentation, and APIs (if applicable);
Updates and new features released by Licensor during the Term.

1.4 Territory: The License shall be valid worldwide unless expressly restricted in the Order Form.

1.5 Access Activation: Access to the Platform shall be activated only after (a) execution of this Agreement and (b) receipt of all applicable fees payable in advance.`,
  },

  // Section 2: Permitted Use
  permittedUse: {
    title: '2. Permitted Use',
    content: `2.1 Licensee may:
Access, view, and download data, analytics, and reports for internal research and business planning.
Generate outputs using the AI features of myRA AI™, including summaries, insights, visualizations, or recommendations ("AI Outputs").
Use AI Outputs for internal decision-making, strategy, presentations, and reports circulated within Licensee's organization.
Users may use the Platform and AI Outputs for internal business purposes, including analysis, benchmarking, and training of internal systems.

2.2 Licensee may not:
Resell, rent, lease, sublicense, copy, or redistribute the Platform or any data therein.
Recreate, mirror, or compete with the Platform or its features.
Remove, obscure, or alter any copyright, trademark, or proprietary notices.
Use the Platform for illegal, defamatory, or misleading purposes.`,
  },

  // Section 3: Nature of License (3.1-3.2)
  natureOfLicense: {
    title: '3. Nature of License',
    content: `3.1 SaaS Access Model: The License grants a right to access and use the Platform remotely via subscription. The Licensee acknowledges that it obtains no title or ownership rights in the Platform or any component thereof.

3.2 Third-Party Data: Some data, reports, or analytics accessible through the Platform may originate from third-party licensors. Such materials are licensed to Licensee subject to the additional terms of such third-party providers, which shall be made available upon request. Licensee acknowledges that continued access may depend on ongoing third-party data agreements.`,
  },

  // Section 3.3-3.5: Consulting Services (optional)
  consultingServices: {
    title: '3.3 Consulting Services and Hours',
    content: `Scope – In addition to the subscription-based access to the myRA AI Platform ("Platform"), the Customer may avail Consulting Services ("Consulting Hours") for implementation, customization, or analysis-related advisory support.

Hourly Allocation and Rates – Clients may purchase a predefined bucket of Consulting Hours as specified in the applicable Order Form, along with access to the Platform. Usage of such Consulting Hours shall be deducted on a per-transaction basis as services are rendered. Any work performed beyond the purchased hours shall be billed at standard hourly rates then in effect, unless otherwise agreed in writing.

Scheduling and Usage – Consulting Hours must be utilized within the period specified in the applicable Order Form. Unused hours shall expire at the end of such period and shall not roll over or be refunded unless otherwise mutually agreed.

Deliverables – Deliverables created under Consulting Hours shall be limited to calls, advisory outputs, configurations, or reports.

Acceptance – Consulting deliverables shall be deemed accepted upon delivery unless the Customer notifies Mordor through the platform or account manager in writing within five (5) business days of delivery of any material non-conformity.

Rescheduling and Cancellation – Any rescheduling or cancellation of booked Consulting Hours by the Customer within less than 48 hours of the scheduled time may result in full charge for such hours.

Restriction on Solicitation-During the Term of this Agreement and for a period of twelve (12) months following its termination or expiry, the Customer shall not, directly or indirectly, solicit for employment, hire, engage, or otherwise contract with any employee, consultant, or contractor of Mordor (including, without limitation, its data analysts, developers, or technical staff) who has been involved in the performance of the Services or Consulting Hours under this Agreement.

Third-Party Interference-The Customer shall not induce, or attempt to induce, any such personnel to leave the employment or engagement of Mordor, nor assist any third party in doing so.

Acknowledgement and Remedy-The Customer acknowledges that any breach of this clause would cause irreparable harm to Mordor for which monetary damages would be an inadequate remedy. In such an event, Mordor shall be entitled to seek injunctive relief, in addition to any other remedies available at law or in equity.

Ownership of Client-Specific Deliverables: All deliverables, reports, insights, data analyses, recommendations, or other outputs ("Consulting Deliverables") created by the platform and/or Mordor's analysts during the Consulting Hours that are specifically commissioned, customized, and paid for by the Client shall be deemed the intellectual property of the Client upon full payment of the applicable fees. The Client shall have the exclusive right to use such Consulting Deliverables for its internal business purposes only.

Retention of Underlying IP: Notwithstanding the foregoing, Mordor shall retain all rights, title, and interest in and to (a) its pre-existing methodologies, processes, templates, know-how, software, models, algorithms, tools, and frameworks ("Underlying IP"), and (b) any enhancements, modifications, or derivative works thereof developed in the course of providing the Consulting Hours. No ownership rights in such Underlying IP are transferred to the Client.`,
  },

  // Section 3.4: Indemnity for Analyst Hours
  analystHoursIndemnity: {
    title: '3.4. Indemnity for Analyst Hours',
    content: `The Customer acknowledges that Consulting Hours, including those rendered by Mordor's data analysts or consultants ("Analyst Hours"), may involve the interpretation or transformation of data and the provision of advisory outputs.

Mordor shall not be liable for any business or operational decisions made by the Customer based on such outputs, and the Customer shall indemnify, defend, and hold harmless Mordor, its affiliates, officers, employees, and agents from and against any losses, claims, liabilities, damages, costs, or expenses (including reasonable attorney's fees) arising out of or related to:
(a) the use or reliance on analysis, recommendations, or outputs generated during Analyst Hours;
(b) the Customer's internal or third-party dissemination of such deliverables; or
(c) any modification or misuse of the Consulting Deliverables by the Customer.`,
  },

  // Section 3.5: Termination of Consulting Hours
  consultingTermination: {
    title: '3.5 Termination of Consulting Hours',
    content: `Automatic Lapse upon Agreement Termination: All Consulting Hours purchased by the Customer shall automatically terminate upon the expiration or termination of this Agreement, irrespective of whether such hours have been fully utilized as of such date.

Effect of Termination on Prepaid Hours:
(a) All unused or unutilized prepaid Consulting Hours as of the date of termination shall immediately expire and lapse without any obligation on Mordor to refund or credit any portion of the corresponding fees to the Customer.
(b) For Consulting Hours billed on a postpaid basis, the Customer shall remain liable for all hours rendered up to the effective date of termination, including any committed or scheduled hours that cannot reasonably be cancelled.

Termination for Convenience by Customer: If the Customer elects to terminate this Agreement or any Order Form for convenience, any prepaid fees for Consulting Hours shall be deemed fully earned upon receipt and shall not be refundable. Any scheduled or ongoing consulting engagements may, at discretion, be immediately discontinued upon receipt of termination notice.

Effect of Termination on Deliverables: Upon termination of Consulting Hours for any reason:
(a) Mordor shall deliver to the Customer any completed Consulting Deliverables that have been fully paid for as of the effective termination date;
(b) all partially completed deliverables may, at discretion, be delivered "as-is" without any obligation of completion or warranty; and
(c) all rights and licenses granted to the Customer with respect to completed deliverables shall survive termination subject to full payment of the applicable fees.

No Waiver of Other Rights: Termination or expiry of Consulting Hours shall not affect either Party's rights or obligations that have accrued prior to termination, including any confidentiality, intellectual property, indemnity, or limitation of liability obligations that, by their nature, are intended to survive.

Survival: For clarity, Clauses relating to intellectual property, confidentiality, limitation of liability, indemnity, governing law, and dispute resolution shall survive termination of Consulting Hours.`,
  },

  // Section 3.6-3.10: AI Outputs and IP
  aiOutputsAndIP: {
    title: '3.6 AI Outputs',
    content: `(a) Ownership: To the extent AI-generated outputs are derived from Licensee's queries, input data, or prompts ("Licensee Inputs"), Licensee shall own the copyright in such specific AI Outputs, subject to Licensor's and its licensors' pre-existing intellectual property and data rights.
(b) Restrictions: AI Outputs shall not be used in any manner that implies or represents that Mordor guarantees their accuracy, completeness, or fitness for any particular purpose.`,
  },

  // Section 3.7: Intellectual Property Reservation
  intellectualPropertyReservation: {
    title: '3.7 Intellectual Property Reservation',
    content: `All intellectual property rights in and to the Platform, including the source code, algorithms, models, databases, analytics engines, architecture, user interface design, trademarks, and trade secrets, shall remain the exclusive property of Licensor and its licensors. Except for the limited license granted herein, no other rights are conferred to Licensee by implication, estoppel, or otherwise.

Customer shall not:
(a) copy, modify, translate, or create derivative works of the Platform;
(b) reverse-engineer, decompile, or attempt to derive the source code;
(c) remove or obscure proprietary notices; or
(d) permit any third party to access the Services in a manner inconsistent with this Agreement.

Reservation of Rights: All rights not expressly granted to Customer are reserved by Mordor. No implied licenses are granted.

Third-Party Components: The Services may contain open-source software components. Such components are licensed under their respective open-source licenses; however, no open-source license shall restrict Mordor's proprietary rights in the Platform.`,
  },

  // Section 3.8: Feedback and Enhancements
  feedbackAndEnhancements: {
    title: '3.8 Feedback and Enhancements',
    content: `Any feedback, suggestions, or feature requests submitted by Customer may be freely used by Mordor for product improvement without obligation to Customer. All resulting enhancements, improvements, or derivative works shall be the exclusive property of Mordor.`,
  },

  // Section 3.9: Retraining and Learning Rights
  retrainingRights: {
    title: '3.9 Retraining and Learning Rights',
    content: `Mordor may use de-identified Customer Data and AI Outputs to train, validate, and enhance its models, provided that such use complies with applicable data-protection laws and does not disclose identifiable Customer information.`,
  },

  // Section 3.10: Third-Party Data and Content
  thirdPartyDataContent: {
    title: '3.10 Third-Party Data and Content',
    content: `AI Outputs may incorporate or be influenced by third-party data licensed by Mordor. Customer acknowledges that such content may be subject to separate third-party license terms, which Mordor shall make available on request.`,
  },

  // Section 4: Sublicensing
  sublicensing: {
    title: '4. Sublicensing',
    content: `The Licensee shall not sublicense, assign, or otherwise transfer this License or permit third-party access to the Platform without the prior written consent of Licensor.`,
  },

  // Section 5: License Term & Renewal
  licenseTerm: {
    title: '5. License Term & Renewal',
    content: `5.1 The License shall commence on the Effective Date and shall continue for a term mentioned in Subscription Order Form, unless terminated earlier in accordance with this Agreement.

5.2 Upon expiry of the term mentioned in Subscription Order Form, If both Parties wish to continue the License, they may do so only through a separate written agreement mutually signed by both Parties.`,
  },

  // Section 6: License Revocation
  licenseRevocation: {
    title: '6. License Revocation',
    content: `6.1 Licensor reserves the right to suspend or revoke the License immediately if:
Licensee breaches material terms of this Agreement;
Unauthorized use, access, or distribution is detected;
Required payments remain overdue beyond 15 days after written notice.

6.2 Upon termination or expiration, Licensee shall cease all use of the Platform.`,
  },

  // Section 7: Compliance and Audit Rights
  complianceAndAudit: {
    title: '7. Compliance and Audit Rights',
    content: `7.1 Licensee agrees to maintain records sufficient to demonstrate compliance with this Agreement and, upon ten (10) days' prior written notice, to permit Licensor or its representatives to audit Licensee's use of the Platform solely for compliance verification purposes.

7.2 Any audit shall be conducted during normal business hours and shall not unreasonably disrupt Licensee's operations. If material non-compliance is found, Licensee shall promptly remedy the same and reimburse Licensor for the cost of the audit.`,
  },

  // Section 8: Feedback
  feedback: {
    title: '8. Feedback',
    content: `8.1 Licensee may provide suggestions, feedback, or improvement ideas regarding the Platform. All such feedback shall be deemed assigned to and owned by Licensor, and Licensor may freely use, modify, and commercialize the same without restriction or obligation to Licensee.`,
  },

  // Section 9: Order Form and Fees
  orderFormAndFees: {
    title: '9. Order Form And Fees',
    intro: 'The following Order Form is incorporated into this Agreement:',
    content: `9.1 Order Form Execution
Each Service engagement shall be governed by an executed Order Form referencing this Agreement.

9.2 Fees and Payment Terms
Customer shall pay the Fees as set forth in the applicable Subscription Order Form (SOF). Fees are non-cancellable and non-refundable, except as expressly provided herein.

9.3 Taxes
All Fees are exclusive of applicable taxes, which shall be borne by the Customer.

9.4 Fee Adjustments
Mordor may revise fees upon renewal or after prior written notice of at least thirty (30) days.

9.5 Late Payment
Overdue amounts shall accrue interest at the rate of 1.5% per month or the maximum rate permitted by law, whichever is lower.`,
  },

  // Section 10: Term and Termination
  termAndTermination: {
    title: '10. Term And Termination',
    content: `10.1 Term of Agreement
This Agreement shall commence on the Effective Date and continue until terminated as provided herein.

10.2 Subscription Term
The Subscription Term shall be as specified in the Subscription Order Form.

10.3 Termination for Cause
Either Party may terminate this Agreement with immediate effect if the other Party:
(a) materially breaches any provision and fails to cure such breach within thirty (30) days of notice; or
(b) becomes insolvent, subject to winding-up proceedings, or ceases to do business.

10.5 Effect of Termination
Upon termination:
(a) all rights granted to Customer shall cease;
(b) Customer shall cease using the Services and delete all Confidential Information; and
(c) Sections relating to confidentiality, data ownership, IP, limitation of liability, and indemnity shall survive termination.`,
  },

  // Section 11: Service Levels and Support
  serviceLevels: {
    title: '11. Service Levels and Support',
    content: `11.1 Service Availability: Mordor shall use commercially reasonable efforts to ensure Platform availability of 99.5% uptime (excluding scheduled maintenance and Force Majeure events).

11.2 Scheduled Maintenance: Mordor may perform scheduled maintenance upon providing at least forty-eight (48) hours' notice to Customer.

11.3 Support Services: Mordor shall provide Customer with technical and customer support via email and ticketing channels during normal business hours (9 AM – 6 PM IST, Monday to Friday).

11.4 Escalation: Unresolved issues shall be escalated in accordance with Mordor's internal support escalation matrix outlined in the Support Schedule.`,
  },

  // Section 12: Performance and Warranties
  performanceWarranties: {
    title: '12. Performance and Warranties',
    content: `12.1 Service Warranty: Mordor warrants that the Services will perform substantially in accordance with the Documentation under normal use.

12.2 Disclaimer: Except as expressly stated, the Services are provided "as-is" and Mordor disclaims all warranties, express or implied, including merchantability, fitness for a particular purpose, or non-infringement.

12.3 AI Limitations: Customer acknowledges that AI-generated insights are probabilistic and based on data modelling; Mordor makes no warranty that AI Outputs will be error-free, complete, or suitable for any specific decision-making purpose.`,
  },

  // Section 13: Customer Data and Data Ownership
  customerData: {
    title: '13. Customer Data and Data Ownership',
    content: `13.1 Ownership of Customer Data: All Customer Data uploaded, submitted, or transmitted through the Platform shall remain the exclusive property of Customer. Nothing in this Agreement shall transfer ownership of Customer Data to Mordor.

13.2 Use of Aggregated and Anonymized Data: Mordor may collect and use aggregated or anonymized information derived from Customer Data solely for internal research, analytics, product improvement, and statistical purposes. Such information shall not include any confidential or proprietary business data, personal data, or content that could reasonably identify the Customer, its Authorized Users, or its clients.

13.3 Accuracy and Legality of Customer Data: Customer represents that it has obtained all rights, permissions, and lawful bases necessary to upload and process Customer Data and that such processing will not violate any applicable law, including data-protection and intellectual-property laws.

13.4 Data Hosting and Location: Mordor may host or process Customer Data in any data centre operated by Mordor or its subcontractors located within or outside India, subject to compliance with applicable cross-border transfer requirements.`,
  },

  // Section 14: Confidentiality
  confidentiality: {
    title: '14. Confidentiality',
    content: `14.1 Definition: "Confidential Information" means all non-public, confidential or proprietary information disclosed by one Party to the other, including, but not limited to, specifications, samples, patterns, designs, plans, drawings, documents, data, business operations, processes, trade secrets, know-how, customer lists, pricing, discounts, or rebates, whether oral, written, or electronic, that is designated as confidential or would reasonably be understood as confidential.

14.2 Exclusions: Confidential Information does not include information that (a) is or becomes public through no fault of the recipient; (b) was known to the recipient without obligation of confidentiality; (c) is independently developed; or (d) is required to be disclosed by law. The Parties agree that detailed information is not excluded from the obligations of this Section 14.2 merely because that detailed information is embraced by more general information excluded under this Section 14.2 (a), (b), (c) or (d); and (ii) information concerning combinations of facts or data shall not be excluded unless the combination itself and its principles of operation fall within this Section 14.2 (a), (b), (c), or (d).

14.3 Obligations: Each Party shall (a) protect the other Party's Confidential Information using the same degree of care it uses for its own confidential information (but not less than reasonable care); (b) use such information solely to perform its obligations under this Agreement; (c) not disclose it to any third party except as expressly permitted; (d) not to use any or all of the Confidential Information, or permit it to is be accessed or used, except solely to perform its obligations; (e) shall take at least commercially reasonable measures, at its own expense, to restrain its current and former representatives from unauthorized use or disclosure of any of the Confidential Information.

14.4 Permitted Disclosures: Mordor may disclose Customer Data or Confidential Information to its Affiliates, employees, or subcontractors solely to perform the Services, provided that such recipients are bound by confidentiality obligations no less protective than those herein.

14.5 Return or Destruction: Upon termination, each Party shall promptly return or securely destroy all Confidential Information of the other Party, except as required for compliance purposes or archival retention. The receiving Party shall continue to be bound by the terms and conditions of this Agreement with respect to such retained Confidential Information.

14.6 Required Disclosure: Neither Party shall reveal the Confidential Information to any third party, in whole or in part, except as may otherwise be required by law, rule, regulation or legal or judicial process ("Legal Order"), or as may be previously authorized in writing by the disclosing Party. In the event the receiving Party, or any person to whom Confidential Information is disclosed or transmitted pursuant to this Agreement by the receiving Party, is required by Legal Order to disclose any Confidential Information, the receiving Party shall provide prompt notice to the disclosing Party so that the disclosing Party, at the disclosing Party's sole expense, may seek a protective order or other appropriate remedy and/or waive compliance with the provisions of this Agreement. Failing the entry of a protective order or other appropriate remedy, or receipt of a waiver hereunder from the disclosing Party, if the receiving Party remains subject to a Legal Order to disclose the Confidential Information, the receiving Party shall disclose only that portion of the disclosing Party's Confidential Information that it is advised, in the opinion of its legal counsel, is legally required to be furnished, and the receiving Party shall exercise reasonable efforts to obtain reliable assurance that confidential treatment shall be accorded such Confidential Information when it is so disclosed.`,
  },

  // Section 15: Data Protection and Privacy Compliance
  dataProtection: {
    title: '15. Data Protection and Privacy Compliance',
    content: `15.1 Compliance with Applicable Laws: Each Party shall comply with all applicable data-protection laws, including the Digital Personal Data Protection Act 2023 (India) ("DPDPA"), the General Data Protection Regulation (EU) 2016/679 ("GDPR"), and other laws applicable to its processing activities.

15.2 Roles of the Parties: For purposes of data protection laws, Customer is the "data fiduciary" or "controller" with respect to Customer Data, and Mordor acts as the "data processor" or "data processor/processor."

15.3 Processing of Customer Data: Mordor shall process Customer Data only on documented instructions from Customer, as necessary to perform the Services.

15.4 Cross-Border Transfers: Where Customer Data is transferred outside India or the EU, Mordor shall ensure compliance with applicable transfer mechanisms, including Standard Contractual Clauses or other approved safeguards.

15.5 Data Breach Notification: Mordor shall notify Customer without undue delay upon becoming aware of a confirmed data breach affecting Customer Data, providing details of the nature, scope, and mitigation actions.

15.6 Sub-Processors: Mordor may engage sub-processors to process Customer Data, subject to ensuring that such sub-processors are bound by written agreements offering protections substantially similar to those in this Agreement.`,
  },

  // Section 16: Ownership Summary (table data)
  ownershipSummary: {
    title: '16. Ownership Summary',
    rows: [
      { assetType: 'Customer Data', ownership: 'Customer', license: 'Limited license to Mordor for service delivery' },
      { assetType: 'AI Outputs', ownership: 'Customer (usage rights)', license: 'Mordor retains model and training IP' },
      { assetType: 'Platform / myRA AI', ownership: 'Mordor', license: 'Limited use license to Customer' },
      { assetType: 'Feedback & Enhancements', ownership: 'Mordor', license: 'None' },
      { assetType: 'Aggregated / Anonymized Data', ownership: 'Mordor', license: 'Not applicable' },
    ],
  },

  // Section 17: Warranties and Representations
  warrantiesRepresentations: {
    title: '17. Warranties And Representations',
    content: `17.1 Mutual Warranties
Each Party represents and warrants that:
(a) it has full power and authority to enter into and perform its obligations under this Agreement;
(b) this Agreement constitutes a legal, valid, and binding obligation enforceable against it; and
(c) its execution and performance of this Agreement do not and will not violate any applicable law, regulation, or third-party rights.

17.2 Mordor Warranties
Mordor warrants that:
(a) the Services shall substantially conform to the Documentation during the Subscription Term;
(b) it will perform its obligations in a timely manner with reasonable skill, care, and diligence consistent with industry standards;
(c) it will not materially reduce the overall functionality of the Services during the Subscription Term;
(d) it will comply with applicable data-protection and cybersecurity laws when processing Customer Data;
(e) Services will not infringe the patents, copyrights, or other intellectual property rights of any third party; and
(f) that no viruses, malware, spyware or similar items shall be coded or introduced to Customer's systems, or Customer's technology environment by Mordor or as a result of a breach by Mordor of its obligations under this Agreement. Mordor warrants that it shall use industry best practices to detect and eliminate any malicious code.

17.3 Customer Warranties: Customer warrants that:
(a) it has obtained all consents and lawful bases necessary for Mordor to process Customer Data;
(b) it shall use the Services only in accordance with this Agreement and applicable law;
(c) it shall not upload, process, or transmit any unlawful, infringing, or malicious data; and
(d) it shall not use the Services to develop or train a competing AI or data analytics platform.

17.4 Disclaimer of Warranties: Except as expressly provided, the Services and AI Outputs are provided "as is" and "as available." Mordor makes no other warranties, express or implied, including warranties of merchantability, fitness for a particular purpose, title, or non-infringement. Mordor does not warrant that (a) the Services will be uninterrupted, error-free, or secure; (b) AI Outputs will be accurate, complete, or free from bias; or (c) any data or insights generated will guarantee business outcomes.

17.5 Beta Features and Trial Use: Beta features, previews, or evaluation access are provided solely for experimental use and without warranty of any kind. Mordor may modify or discontinue such features at any time without liability.`,
  },

  // Section 18: Indemnification
  indemnification: {
    title: '18. Indemnification',
    content: `The Customer shall defend, indemnify, and hold harmless Mordor Intelligence Private Limited, its affiliates, officers, directors, employees, agents, contractors, successors, and assigns from and against any and all third-party claims, demands, actions, proceedings, losses, liabilities, damages, costs, penalties, fines, judgments, settlements, and expenses (including reasonable attorneys' fees and disbursements) arising out of or relating to:

a. the Customer's or its Authorized Users' access to or use of the Services, Platform, or documentation in a manner not expressly authorized under this Agreement;
b. any violation of applicable law, rule, or regulation by the Customer or its Authorized Users, including but not limited to data protection, intellectual property, or export control laws;
c. any disputes between the Customer and its own clients, end users, employees, contractors, or data subjects relating to the Customer's use of the Services or outputs generated by the myRA AI™ platform;
d. any security incident, breach, or loss of Customer Data resulting from the Customer's systems, configurations, integrations, or acts or omissions that is the sole adjudicated fault of Customer.

Indemnification Procedure: a. Mordor shall promptly notify the Customer of any claim for which it seeks indemnification (a "Claim"), provided that failure to give prompt notice shall not relieve the Customer of its obligations under this Clause, except to the extent the Customer is materially prejudiced thereby.

The Customer shall have sole control of the defense and settlement of any Claim, provided that the Customer shall not settle or compromise any Claim in a manner that (i) imposes any liability, obligation, or admission of fault on Mordor, or (ii) requires Mordor to take or refrain from any action, without Mordor's prior written consent. Mordor may participate in the defense of any Claim with counsel of its own choosing at its own expense.

Mordor shall defend, indemnify, and hold harmless Customer and its officers, directors, and employees against any third-party claim alleging that the use of the Services in accordance with this Agreement infringes a valid intellectual property right, provided that Customer:
(a) promptly notifies Mordor in writing of the claim;
(b) permits Mordor to control the defense and settlement; and
(c) cooperates as reasonably required.

18.1 Exclusions to Mordor's IP Indemnity: Mordor shall have no obligation where the claim arises from:
(a) Customer's modification of the Services or AI Outputs;
(b) combination with software, data, or processes not provided by Mordor;
(c) Customer's continued use of the Services after being notified of alleged infringement; or
(d) use of Beta features or custom integrations developed at Customer's request.

18.2 Remedies for Infringement: If any part of the Services is found or likely to be infringing, Mordor may, at its option and expense:
(a) procure the right for Customer to continue use;
(b) modify the Services to be non-infringing without materially reducing functionality.

18.3 Data Breach Indemnity
(a) In the event of a confirmed breach attributable to Mordor's negligence or wilful misconduct, Mordor shall indemnify Customer for direct costs reasonably incurred in responding to the breach, including notification and regulatory reporting, up to the liability cap defined in Section 16.
(b) In all other circumstances, Mordor's assistance obligations shall be limited to providing necessary information and remediation cooperation.`,
  },

  // Section 19: Disclaimers Related To AI Outputs
  aiDisclaimers: {
    title: '19. Disclaimers Related To AI Outputs',
    content: `19.1 No Professional Advice: AI Outputs generated by myRA AI™ are for informational purposes only and shall not constitute investment, legal, medical, or professional advice. Customer remains solely responsible for decisions made using such Outputs.

19.2 Bias, Accuracy, and Reliability: AI models may rely on external data sources that could contain errors or biases. Mordor disclaims any liability for inaccuracies or incompleteness in AI Outputs.

19.3 Third-Party Data Disclaimer: Certain Outputs may be derived from third-party datasets licensed to Mordor. Mordor makes no representations regarding the completeness, reliability, or commercial accuracy of such datasets.

19.4 Independent Validation: Customer agrees to independently verify AI Outputs before relying on them for business-critical decisions.`,
  },

  // Section 20: Limitation of Liability
  limitationOfLiability: {
    title: '20. Limitation Of Liability',
    content: `20.1 Limitation of Direct Damages
Except for (i) Customer's payment obligations; (ii) either Party's breach of confidentiality; (iii) liability arising from gross negligence, fraud, or willful misconduct, (iii) damages, costs, and expenses payable under the Parties' respective indemnification obligations, (iv) either Party's breach of data security obligations, or (v) claims for which Mordor is insured, each Party's total cumulative liability arising out of or related to this Agreement shall not exceed the total Fees paid or payable by Customer for the Services in the twelve (12) months preceding the claim.

20.2 Higher Cap for Data Breaches
For claims arising from Mordor's proven data breach due to gross negligence, Mordor's aggregate liability shall not exceed Five (5) times the Fees paid in the preceding twelve (12) months.

20.3 Exclusion of Consequential Damages
Neither Party shall be liable for any indirect, consequential, punitive, exemplary, special, or incidental damages, including loss of profits, revenue, data, goodwill, or anticipated savings, even if advised of the possibility thereof. The limitation and exclusions set forth in this Section 20.3 shall not apply to damages or liabilities arising from: (i) breach of confidentiality under Section 14; (ii) breach of any data protection or privacy laws or obligations; or (iii) the grossly negligent acts or omissions or willful misconduct of a Party in performing its obligations under this Agreement. For the purposes of this Agreement, "willful misconduct" shall mean conducts that is fraudulent, malicious, or based in a sinister intention to harm or act in bad faith.

20.4 Allocation of Risk
The Parties acknowledge that the fees reflect the allocation of risk and limitations of liability agreed upon and form the essential basis of the bargain.`,
  },

  // Section 21: Remedies And Equitable Relief + Compliance And Ethical Conduct
  remediesAndCompliance: {
    title: '21. Remedies And Equitable Relief',
    content: `21.1 Cumulative Remedies: Except as expressly limited herein, all rights and remedies are cumulative and may be exercised concurrently.

21.2 Injunctive Relief: A breach of Sections 9 (IP Rights), 10 (Confidentiality), or 11 (Data Protection) may cause irreparable harm. Each Party shall be entitled to seek injunctive or equitable relief without posting bond, in addition to any other remedies available at law or in equity.`,
  },

  // Section 21 (duplicate numbering in original): Compliance And Ethical Conduct
  complianceAndEthicalConduct: {
    title: '21. Compliance And Ethical Conduct',
    content: `Each Party shall comply with all applicable laws, including anti-bribery, anti-corruption, export control, data protection, labour, and tax laws.`,
  },

  // Section 22: Subcontracting And Assignment
  subcontractingAndAssignment: {
    title: '22. Subcontracting And Assignment',
    content: `22.1 Subcontracting: Mordor may engage subcontractors to perform certain services, provided that:
(a) Mordor remains fully responsible for all subcontracted obligations; and
(b) such subcontractors are bound by confidentiality and data protection terms no less protective than those in this Agreement.

22.2 Assignment: Neither Party may assign or transfer this Agreement, in whole or in part, without the prior written consent of the other Party, except that Mordor may assign this Agreement to an Affiliate or in connection with a merger, acquisition, or sale of substantially all its assets.`,
  },

  // Section 23: Dispute Resolution (includes Governing Law and Jurisdiction)
  disputeResolution: {
    title: '23. Dispute Resolution',
    content: `23.1 Amicable Resolution: In case of any dispute, the Parties shall first attempt to resolve the matter amicably through good-faith negotiations within thirty (30) days.

23.2 Arbitration: If unresolved, the dispute shall be referred to binding arbitration under the Arbitration and Conciliation Act, 1996.
Seat: Hyderabad, Telangana, India
Language: English
Arbitrators: One arbitrator jointly appointed by the Parties.
The award rendered shall be final and binding on both Parties.

23.3 Interim Relief: Nothing prevents either Party from seeking interim or injunctive relief before a court of competent jurisdiction.`,
  },

  // Section 23.4-23.5: Governing Law and Jurisdiction (dynamic based on client)
  governingLaw: {
    title: '23.4 Governing Law',
    content: (jurisdiction: string) => `This Agreement shall be governed by the laws of ${jurisdiction}, and any dispute arising hereunder shall be resolved in accordance with the laws of ${jurisdiction} without regard to its conflict of law provisions. Service of process, summons, notice, or other document served to the address set forth in Section 16 herein shall be effective service of process for any suit, action, or other proceeding brought in any such court.`,
  },

  jurisdiction: {
    title: '23.5 Jurisdiction',
    content: (jurisdiction: string) => `Each Party irrevocably submits to the exclusive jurisdiction of ${jurisdiction} federal and state courts in any such suit, action, or proceeding and waives any objection based on improper venue or forum non conveniens.`,
  },

  // Section 24: Force Majeure
  forceMajeure: {
    title: '24. Force Majeure',
    content: `24.1 Definition: Neither Party shall be liable for delay or failure to perform caused by events beyond its reasonable control, including acts of God, natural disasters, pandemics, war, terrorism, labor disputes, internet failures, or governmental actions.

24.2 Notification and Mitigation: The affected Party shall promptly notify the other and use reasonable efforts to mitigate the impact. If performance is delayed for more than sixty (60) days, either Party may terminate the Agreement upon written notice.`,
  },

  // Section 25: Notices
  notices: {
    title: '25. Notices',
    content: `25.1 Method of Notice: All notices shall be in writing and delivered by hand, courier, or email (with acknowledgment of receipt) to the contact addresses specified in the Order Form.

25.2 Deemed Receipt: Notices shall be deemed received: (a) on delivery, if by hand or courier; (b) on the next business day, if by email with acknowledgment.`,
  },

  // Section 26: General Provisions
  generalProvisions: {
    title: '26. General Provisions',
    content: `26.1 Entire Agreement: This Agreement, including its annexures and Order Forms, constitutes the entire understanding between the Parties and supersedes all prior discussions or agreements.

26.2 Amendments: Any amendment or modification must be in writing and executed by authorized representatives of both Parties.

26.3 Waiver: Failure to enforce any provision shall not constitute a waiver of that provision or any other.

26.4 Severability: If any provision is held invalid, the remaining provisions shall remain in full force and effect.

26.5 Independent Contractors: The Parties are independent contractors. Nothing herein creates a partnership, joint venture, or employment relationship.

26.6 Interpretation: Headings are for convenience only and do not affect interpretation. "Including" means "including without limitation."

26.7 Counterparts: This Agreement may be executed electronically or in counterparts, each constituting an original.`,
  },

  // SLA Annexure
  slaAnnexure: {
    title: 'SERVICE LEVEL AGREEMENT (SLA)',
    subtitle: '(Annexure A)',
    sections: {
      purpose: {
        title: '1. Purpose and Scope',
        content: `1.1 This Service Level Agreement ("SLA") defines the service standards, uptime commitments, and support response levels applicable to the myRA AI ("Service") provided by Mordor Intelligence Pvt. Ltd. ("Mordor") to the Client ("Licensee") under the SaaS Agreement.

1.2 This SLA applies only during the active Subscription Term and subject to the Licensee's full compliance with all payment, use, and technical cooperation requirements.`,
      },
      definitions: {
        title: '2. Definitions',
        content: `"Availability" means the period during which the Service is operational and accessible to the Licensee, excluding Permitted Downtime.

"Permitted Downtime" includes: (a) scheduled maintenance; (b) emergency maintenance; (c) force majeure events; (d) downtime due to third-party integrations, public internet, or Licensee's systems.

"Incident" means an unplanned interruption or degradation of the Service.

"Response Time" means the time taken by Mordor to acknowledge receipt of a support request.`,
      },
      availability: {
        title: '3. Service Availability',
        content: `Service Commitment: Mordor shall use commercially reasonable efforts to ensure that the myRA AI Platform (the "Service") is available to the Customer at least 99.5% of the time, measured on a monthly basis ("Service Availability Target"). This target represents an aspirational service level objective and does not constitute a warranty or guarantee of uninterrupted or error-free performance.

Downtime Exclusions: The calculation of Service Availability shall exclude unavailability caused by any of the following:
Scheduled Maintenance: planned downtime for system upgrades, maintenance, or testing, provided that Mordor shall use reasonable efforts to provide advance notice and conduct such maintenance during off-peak hours;
Force Majeure Events: any event beyond Mordor's reasonable control, including but not limited to acts of God, natural disasters, government actions, pandemics, strikes, riots, or acts of war;
Third-Party Failures: downtime or degraded performance resulting from failures or outages of third-party hosting or cloud service providers (including AWS, Azure, or similar), internet service providers, telecommunications networks, or other third-party dependencies;
Customer Acts or Omissions: unavailability caused by the Customer's misuse of the Service, failure to use the Service in accordance with the Agreement or Documentation, or changes made by the Customer to its systems, configurations, or integrations; and
Security or Emergency Measures: temporary suspension or throttling of the Service deemed necessary by Mordor to address actual or suspected security threats, vulnerabilities, or data integrity issues.

Service Credits and Remedies: The Service Availability Target is intended as a performance benchmark. Mordor shall have no obligation to provide service credits, refunds, or other compensation for failure to meet the Service Availability Target.

Monitoring and Reporting: Mordor shall monitor the Service's uptime using commercially standard tools and may, upon written request, provide the Customer with uptime reports for any given month.

Unavailability; Termination: If the Service is unavailable, excluding Downtime Exclusions, more than a combined forty-eight (48) hours in a calendar month, Customer shall have the option to terminate Service's without penalty.

Disaster Recovery: Mordor shall maintain a commercially reasonable business continuity and disaster recovery plan, consistent with industry standards for SaaS platforms of similar scope, and shall implement such plan in the event of any unplanned interruption of the Services.`,
      },
      maintenance: {
        title: '4. Maintenance Windows',
        content: `4.1 Scheduled Maintenance: Mordor may conduct periodic maintenance during non-peak hours (IST 12:00 AM–4:00 AM). Such maintenance will not exceed 8 hours per calendar month and will be communicated in advance.

4.2 Emergency Maintenance: In critical circumstances, Mordor may perform emergency maintenance without prior notice to protect system integrity or data security.`,
      },
      responseTime: {
        title: '4.3 Response Time Commitments',
        table: [
          { severity: 'Critical (P1)', description: 'Production system down or severe degradation impacting all users', response: 'Within 24 hours', resolution: 'Continuous effort until resolved' },
          { severity: 'High (P2)', description: 'Major functionality impaired but system remains operational', response: 'Within 48 hours', resolution: 'Resolution within 5 business days' },
          { severity: 'Medium (P3)', description: 'Non-critical issue or partial feature impairment', response: 'Within 72 hours', resolution: 'Resolution within next scheduled release' },
          { severity: 'Low (P4)', description: 'Minor issue, cosmetic defect, or general inquiry', response: 'Within 5 business days', resolution: 'As reasonably practicable' },
        ],
      },
      support: {
        title: '4.4-4.5 Support Channels and Escalation',
        content: `Support shall be available via:
- In-platform support
- Email: support@mordorintelligence.com
- Account Manager

Escalation Matrix:
Level 1: Account Manager / Customer Support Executive - Initial point of contact
Level 2: Head of Sales and/or Head of Research - Escalation if Level 1 response is unsatisfactory
Level 3: Chief Executive Officer (CEO) - Final escalation level for unresolved or critical issues`,
      },
      backup: {
        title: '5. Data Backup & Recovery',
        content: `5.1 Mordor shall perform full backups of all platform data on a daily basis and retain such backups for a minimum of 30 days.

5.2 Licensee acknowledges that AI-generated outputs may not be restorable in identical form and that Mordor's liability for data loss shall not exceed re-performance of the affected service.`,
      },
      security: {
        title: '6. Security Measures',
        content: `6.1 Mordor shall implement appropriate technical and organizational measures including:
- Role-based access control (RBAC);
- Regular third-party vulnerability assessments;
- Multi-factor authentication for administrative accounts;
- Annual penetration testing and ISO 27001-aligned data management practices.

6.2 Licensee is responsible for maintaining secure access credentials and immediately notifying Mordor of unauthorized access.`,
      },
      limitations: {
        title: '7. Limitation and Exclusions',
        content: `7.1 This SLA does not apply to:
- Non-production or beta environments;
- Failures due to improper configurations, third-party actions, or APIs;
- Downtime caused by Client's hardware, software, or connectivity.

7.2 Mordor's total aggregate liability under this SLA shall not exceed one month's subscription fee.`,
      },
      changeManagement: {
        title: '8. Change Management',
        content: `Mordor reserves the right to modify the SLA from time to time to reflect service improvements, provided that the minimum uptime commitment shall not be reduced without thirty (30) days prior notice to the Licensee.`,
      },
    },
  },

  // Order Form Annexure (Annexure B)
  orderFormAnnexure: {
    title: 'SUBSCRIPTION ORDER FORM (SOF)',
    subtitle: 'Annexure B',
    // Flexible order form structure (supports any number of pricing rows)
    packageHeader: 'Package:',
    paymentLabel: 'Payment:',
    supportLabel: 'Support:',
    notesLabel: 'Notes:',
    defaultNotes: [
      'Unused hours expire at end of term',
      'Additional hours can be purchased anytime',
    ],
    signaturesLabel: 'Signatures:',
  },

  // Signature block template
  signatureBlock: {
    title: 'IN WITNESS WHEREOF',
    intro: 'the Parties have executed this Agreement as of the Effective Date first written above.',
    mordorHeader: 'For Mordor Intelligence Pvt. Ltd.',
    clientHeader: 'For Client',
  },
};

// Default MSA form values
export const DEFAULT_MSA_FORM: Omit<MSAFormData, 'effectiveDate'> = {
  clientLegalName: '',
  clientAddress: '',
  clientCountry: '',
  clientContactName: '',
  clientContactTitle: '',
  clientContactEmail: '',
  clientContactPhone: '',
  agreementVersion: 1,
  jurisdiction: '',
  currency: 'USD',
  orderFormRows: [
    {
      term: '1-Year',
      users: '',
      consultingHours: '',
      listPrice: '',
      offerPrice: '',
      additionalHourRate: '',
    },
  ],
  selectedRowIndices: [], // empty means include all rows
  showUsersColumn: true,
  consultingHoursIncluded: '',
  // Note: additionalHourRate is now per-row in OrderFormRow

  // Payment terms aligned with quote system for full flexibility
  paymentTerms: {
    frequency: 'annual',
    basis: 'immediate',
  },
  customPaymentText: '', // Optional override for payment terms display

  // Optional sections
  includeConsultingServices: true,
  specialTerms: '',
  preparedBy: '',
  preparedByEmail: '',
};

// Footer content
export const MSA_FOOTER = {
  certifications: 'ISO 9001:2015 Certified | ESOMAR Corporate Member | MRSI Certified | Great Place to Work Certified',
  trademark: 'myRA AI™ is a registered trademark of Mordor Intelligence Pvt. Ltd.',
};
