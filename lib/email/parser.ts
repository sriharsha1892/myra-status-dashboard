/**
 * Email Parsing Utilities
 * Handles parsing of inbound emails, extracting headers, and threading logic
 *
 * Setup Requirements:
 * - Configure email service webhook (SendGrid/Mailgun/Postmark)
 * - Set EMAIL_WEBHOOK_SECRET environment variable for security
 * - Configure inbound email routing to /api/email/inbound
 */

import { createClient } from '@/lib/supabase/server';

export interface ParsedEmail {
  messageId: string;
  inReplyTo?: string;
  references?: string[];
  from: string;
  to: string;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  attachments?: EmailAttachment[];
  receivedAt: Date;
  headers: Record<string, string>;
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  url?: string;
  content?: string; // Base64 encoded
}

export interface EmailThreadContext {
  ticketId?: string;
  ticketNumber?: string;
  isNewTicket: boolean;
  relatedEmails: string[];
}

/**
 * Parse raw email data from webhook payload
 * Supports SendGrid, Mailgun, and Postmark formats
 */
export function parseEmail(payload: any, provider: 'sendgrid' | 'mailgun' | 'postmark' = 'sendgrid'): ParsedEmail {
  switch (provider) {
    case 'sendgrid':
      return parseSendGridEmail(payload);
    case 'mailgun':
      return parseMailgunEmail(payload);
    case 'postmark':
      return parsePostmarkEmail(payload);
    default:
      throw new Error(`Unsupported email provider: ${provider}`);
  }
}

/**
 * Parse SendGrid inbound email webhook payload
 * https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook
 */
function parseSendGridEmail(payload: any): ParsedEmail {
  const headers = parseHeaders(payload.headers);

  return {
    messageId: extractMessageId(payload.headers),
    inReplyTo: extractInReplyTo(payload.headers),
    references: extractReferences(payload.headers),
    from: payload.from,
    to: payload.to,
    subject: payload.subject || '',
    bodyText: payload.text,
    bodyHtml: payload.html,
    attachments: parseAttachments(payload),
    receivedAt: new Date(),
    headers,
  };
}

/**
 * Parse Mailgun inbound email webhook payload
 * https://documentation.mailgun.com/en/latest/user_manual.html#parsed-messages-parameters
 */
function parseMailgunEmail(payload: any): ParsedEmail {
  return {
    messageId: payload['Message-Id'] || generateMessageId(),
    inReplyTo: payload['In-Reply-To'],
    references: payload.References?.split(/\s+/).filter(Boolean),
    from: payload.From || payload.from,
    to: payload.To || payload.to,
    subject: payload.Subject || payload.subject || '',
    bodyText: payload['body-plain'] || payload.text,
    bodyHtml: payload['body-html'] || payload.html,
    attachments: parseMailgunAttachments(payload),
    receivedAt: new Date(payload.timestamp ? payload.timestamp * 1000 : Date.now()),
    headers: parseHeaders(payload),
  };
}

/**
 * Parse Postmark inbound email webhook payload
 * https://postmarkapp.com/developer/webhooks/inbound-webhook
 */
function parsePostmarkEmail(payload: any): ParsedEmail {
  return {
    messageId: payload.MessageID || generateMessageId(),
    inReplyTo: payload.Headers?.find((h: any) => h.Name === 'In-Reply-To')?.Value,
    references: payload.Headers?.find((h: any) => h.Name === 'References')?.Value?.split(/\s+/).filter(Boolean),
    from: payload.From || payload.FromFull?.Email,
    to: payload.To || payload.ToFull?.[0]?.Email,
    subject: payload.Subject || '',
    bodyText: payload.TextBody,
    bodyHtml: payload.HtmlBody,
    attachments: payload.Attachments?.map((att: any) => ({
      filename: att.Name,
      contentType: att.ContentType,
      size: att.ContentLength,
      content: att.Content,
    })),
    receivedAt: new Date(payload.Date || Date.now()),
    headers: parsePostmarkHeaders(payload.Headers),
  };
}

/**
 * Extract Message-ID header from email
 */
export function extractMessageId(headers: any): string {
  if (typeof headers === 'string') {
    const match = headers.match(/Message-ID:\s*<([^>]+)>/i);
    return match ? match[1] : generateMessageId();
  }

  if (typeof headers === 'object') {
    return headers['message-id'] || headers['Message-ID'] || generateMessageId();
  }

  return generateMessageId();
}

/**
 * Extract In-Reply-To header to identify parent message
 */
export function extractInReplyTo(headers: any): string | undefined {
  if (typeof headers === 'string') {
    const match = headers.match(/In-Reply-To:\s*<([^>]+)>/i);
    return match ? match[1] : undefined;
  }

  if (typeof headers === 'object') {
    return headers['in-reply-to'] || headers['In-Reply-To'];
  }

  return undefined;
}

/**
 * Extract References header for full email thread
 */
export function extractReferences(headers: any): string[] {
  if (typeof headers === 'string') {
    const match = headers.match(/References:\s*(.+)/i);
    if (match) {
      return match[1].match(/<([^>]+)>/g)?.map(ref => ref.slice(1, -1)) || [];
    }
  }

  if (typeof headers === 'object') {
    const refs = headers['references'] || headers['References'];
    if (refs) {
      return refs.match(/<([^>]+)>/g)?.map((ref: string) => ref.slice(1, -1)) || [];
    }
  }

  return [];
}

/**
 * Generate a unique Message-ID
 */
export function generateMessageId(domain: string = 'myra-support.local'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}.${random}@${domain}`;
}

/**
 * Parse email headers into object
 */
function parseHeaders(headers: any): Record<string, string> {
  if (typeof headers === 'object' && !Array.isArray(headers)) {
    return headers;
  }

  if (typeof headers === 'string') {
    const result: Record<string, string> = {};
    const lines = headers.split('\n');

    for (const line of lines) {
      const match = line.match(/^([^:]+):\s*(.+)$/);
      if (match) {
        result[match[1].toLowerCase()] = match[2].trim();
      }
    }

    return result;
  }

  return {};
}

/**
 * Parse Postmark headers array format
 */
function parsePostmarkHeaders(headers: any[]): Record<string, string> {
  if (!Array.isArray(headers)) return {};

  return headers.reduce((acc, header) => {
    acc[header.Name.toLowerCase()] = header.Value;
    return acc;
  }, {} as Record<string, string>);
}

/**
 * Parse email attachments from SendGrid format
 */
function parseAttachments(payload: any): EmailAttachment[] {
  const attachments: EmailAttachment[] = [];

  // SendGrid sends attachments as individual fields
  if (payload.attachments) {
    try {
      const attachmentInfo = typeof payload.attachments === 'string'
        ? JSON.parse(payload.attachments)
        : payload.attachments;

      for (const [filename, info] of Object.entries(attachmentInfo)) {
        attachments.push({
          filename,
          contentType: (info as any).type || 'application/octet-stream',
          size: (info as any).length || 0,
          content: payload[`attachment${Object.keys(attachmentInfo).indexOf(filename) + 1}`],
        });
      }
    } catch (e) {
      console.error('Failed to parse attachments:', e);
    }
  }

  return attachments;
}

/**
 * Parse Mailgun attachments
 */
function parseMailgunAttachments(payload: any): EmailAttachment[] {
  if (!payload.attachments) return [];

  const attachments = typeof payload.attachments === 'string'
    ? JSON.parse(payload.attachments)
    : payload.attachments;

  return Array.isArray(attachments) ? attachments.map((att: any) => ({
    filename: att.filename || att.name,
    contentType: att['content-type'] || att.contentType || 'application/octet-stream',
    size: att.size || 0,
    url: att.url,
  })) : [];
}

/**
 * Strip quoted text from email body (common reply patterns)
 */
export function stripQuotedText(text: string): string {
  if (!text) return '';

  // Split by common quote patterns
  const patterns = [
    /\n\s*On .+ wrote:\s*\n/i,
    /\n\s*[-_]{3,}\s*\n/,
    /\n\s*From:.+\n/i,
    /\n\s*Sent:.+\n/i,
    /\n\s*>+.*/gm,
    /\n\s*\|.*/gm,
  ];

  let cleanedText = text;

  for (const pattern of patterns) {
    const match = cleanedText.match(pattern);
    if (match && match.index !== undefined) {
      cleanedText = cleanedText.substring(0, match.index);
      break;
    }
  }

  return cleanedText.trim();
}

/**
 * Extract ticket number from email subject or body
 * Looks for patterns like [TICKET-123] or #123
 */
export function extractTicketNumber(subject: string, body?: string): string | null {
  const text = `${subject} ${body || ''}`;

  // Pattern: [TICKET-123] or [#123] in subject
  const bracketMatch = text.match(/\[(?:TICKET-)?#?(\d+)\]/i);
  if (bracketMatch) return bracketMatch[1];

  // Pattern: TICKET-123 or #123 anywhere
  const ticketMatch = text.match(/(?:TICKET-|#)(\d+)/i);
  if (ticketMatch) return ticketMatch[1];

  return null;
}

/**
 * Find existing ticket or create new one based on email
 */
export async function findOrCreateTicket(
  email: ParsedEmail,
  supabase: ReturnType<typeof createClient>
): Promise<EmailThreadContext> {
  try {
    // 1. Check if this is a reply to an existing thread
    if (email.inReplyTo) {
      const { data: parentEmail } = await supabase
        .from('email_threads')
        .select('ticket_id, tickets(ticket_number)')
        .eq('message_id', email.inReplyTo)
        .single();

      if (parentEmail?.ticket_id) {
        return {
          ticketId: parentEmail.ticket_id,
          ticketNumber: (parentEmail as any).tickets?.ticket_number,
          isNewTicket: false,
          relatedEmails: [email.inReplyTo],
        };
      }
    }

    // 2. Check for ticket number in subject
    const ticketNumber = extractTicketNumber(email.subject, email.bodyText);
    if (ticketNumber) {
      const { data: ticket } = await supabase
        .from('tickets')
        .select('id, ticket_number')
        .eq('ticket_number', ticketNumber)
        .single();

      if (ticket) {
        return {
          ticketId: ticket.id,
          ticketNumber: ticket.ticket_number,
          isNewTicket: false,
          relatedEmails: [],
        };
      }
    }

    // 3. Check for existing thread from same email address
    const { data: existingThreads } = await supabase
      .from('email_threads')
      .select('ticket_id, tickets(ticket_number, status)')
      .eq('from_address', email.from)
      .order('received_at', { ascending: false })
      .limit(5);

    // Find an open ticket from this sender
    const openThread = existingThreads?.find((thread: any) =>
      thread.tickets?.status !== 'resolved' && thread.tickets?.status !== 'closed'
    );

    if (openThread?.ticket_id) {
      return {
        ticketId: openThread.ticket_id,
        ticketNumber: (openThread as any).tickets?.ticket_number,
        isNewTicket: false,
        relatedEmails: [],
      };
    }

    // 4. Create new ticket
    const category = categorizeEmail(email);
    const { data: newTicket, error } = await supabase
      .from('tickets')
      .insert({
        organization: extractOrganization(email.from),
        user_name: extractName(email.from),
        user_email: email.from,
        category,
        priority: 'medium',
        status: 'open',
        description: stripQuotedText(email.bodyText || email.bodyHtml || email.subject),
      })
      .select('id, ticket_number')
      .single();

    if (error || !newTicket) {
      throw new Error(`Failed to create ticket: ${error?.message}`);
    }

    return {
      ticketId: newTicket.id,
      ticketNumber: newTicket.ticket_number,
      isNewTicket: true,
      relatedEmails: [],
    };
  } catch (error) {
    console.error('Error in findOrCreateTicket:', error);
    throw error;
  }
}

/**
 * Extract organization name from email address
 */
function extractOrganization(email: string): string {
  const domain = email.split('@')[1];
  if (!domain) return 'Unknown';

  // Remove common TLDs and get company name
  const company = domain.split('.')[0];
  return company.charAt(0).toUpperCase() + company.slice(1);
}

/**
 * Extract name from email address or From header
 */
function extractName(from: string): string {
  // Format: "John Doe <john@example.com>" or just "john@example.com"
  const match = from.match(/^"?([^"<]+)"?\s*<?/);
  if (match && match[1] && !match[1].includes('@')) {
    return match[1].trim();
  }

  // Fallback to email username
  const username = from.split('@')[0].split('+')[0];
  return username.split(/[._-]/).map(part =>
    part.charAt(0).toUpperCase() + part.slice(1)
  ).join(' ');
}

/**
 * Categorize email into ticket category based on content
 */
function categorizeEmail(email: ParsedEmail): string {
  const content = `${email.subject} ${email.bodyText || ''}`.toLowerCase();

  // Simple keyword-based categorization
  if (content.match(/password|login|access|authentication|sign in/)) {
    return 'Authentication';
  }
  if (content.match(/payment|billing|invoice|charge|subscription|credit card/)) {
    return 'Billing';
  }
  if (content.match(/bug|error|crash|broken|not working|issue/)) {
    return 'Bug Report';
  }
  if (content.match(/feature|request|suggest|enhancement|improvement/)) {
    return 'Feature Request';
  }
  if (content.match(/how to|help|question|guide|tutorial/)) {
    return 'How-To';
  }
  if (content.match(/integration|api|connect|sync/)) {
    return 'Integration';
  }
  if (content.match(/performance|slow|timeout|latency/)) {
    return 'Performance';
  }

  return 'General Inquiry';
}

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // Basic sanitization - in production, use a library like DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Store email in database and link to ticket
 */
export async function storeEmailThread(
  email: ParsedEmail,
  ticketId: string,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  await supabase.from('email_threads').insert({
    ticket_id: ticketId,
    message_id: email.messageId,
    in_reply_to: email.inReplyTo,
    from_address: email.from,
    to_address: email.to,
    subject: email.subject,
    body_text: stripQuotedText(email.bodyText || ''),
    body_html: email.bodyHtml ? sanitizeHtml(email.bodyHtml) : null,
    attachments: email.attachments || [],
    received_at: email.receivedAt.toISOString(),
  });
}

/**
 * Extract user info (name and email) from a From address string
 * Handles formats like: "John Doe <john@example.com>" or just "john@example.com"
 */
export function extractUserInfo(from: string): { name: string; email: string } {
  const emailMatch = from.match(/<([^>]+)>|([^\s@]+@[^\s@]+)/);
  const email = emailMatch ? (emailMatch[1] || emailMatch[2]) : from;

  // Extract name from "Name <email>" format
  const nameMatch = from.match(/^"?([^"<]+)"?\s*</);
  let name = nameMatch ? nameMatch[1].trim() : extractName(from);

  return { name, email };
}

/**
 * Check if an email is a reply to another email
 * Checks for In-Reply-To, References, or Re: in subject
 */
export function isReply(email: ParsedEmail): boolean {
  // Check for In-Reply-To header
  if (email.inReplyTo) {
    return true;
  }

  // Check for References header
  if (email.references && email.references.length > 0) {
    return true;
  }

  // Check for "Re:" in subject
  if (email.subject?.toLowerCase().startsWith('re:')) {
    return true;
  }

  // Check for "Fwd:" which indicates forwarded email
  if (email.subject?.toLowerCase().startsWith('fwd:')) {
    return false; // Forward is not a reply
  }

  return false;
}

/**
 * Process inbound email from webhook payload
 * Automatically detects email provider based on payload structure
 */
export function processInboundEmail(payload: any): ParsedEmail {
  // Auto-detect email provider
  let provider: 'sendgrid' | 'mailgun' | 'postmark' = 'sendgrid';

  if (payload['Message-Id'] || payload['message-id']) {
    provider = 'mailgun';
  } else if (payload.MessageID) {
    provider = 'postmark';
  }

  return parseEmail(payload, provider);
}
