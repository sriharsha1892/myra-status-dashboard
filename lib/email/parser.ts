// Email Header/Body Parser
// Parses raw email content (pasted or forwarded) into structured data

import type { EmailParseResult } from './types';

/**
 * Parse raw email content into structured data
 * Handles both full RFC 5322 format and simple pasted content
 */
export function parseEmailContent(rawContent: string): EmailParseResult {
  const lines = rawContent.split('\n');
  const result: EmailParseResult = {
    from_email: '',
    from_name: null,
    to_emails: [],
    cc_emails: [],
    subject: null,
    email_date: new Date(),
    body_text: '',
    message_id: null,
  };

  let isInHeaders = true;
  let currentHeader = '';
  let headerValue = '';
  const headers: Record<string, string> = {};
  const bodyLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isInHeaders) {
      // Empty line marks end of headers
      if (line.trim() === '') {
        if (currentHeader && headerValue) {
          headers[currentHeader.toLowerCase()] = headerValue.trim();
        }
        isInHeaders = false;
        continue;
      }

      // Check for header continuation (starts with whitespace)
      if (/^[ \t]/.test(line) && currentHeader) {
        headerValue += ' ' + line.trim();
        continue;
      }

      // Save previous header
      if (currentHeader && headerValue) {
        headers[currentHeader.toLowerCase()] = headerValue.trim();
      }

      // Parse new header
      const headerMatch = line.match(/^([^:]+):\s*(.*)$/);
      if (headerMatch) {
        currentHeader = headerMatch[1];
        headerValue = headerMatch[2];
      } else {
        // Line doesn't look like a header - treat as body start
        if (!line.startsWith('--')) {
          isInHeaders = false;
          bodyLines.push(line);
        }
      }
    } else {
      bodyLines.push(line);
    }
  }

  // If no headers found, try alternative parsing (forwarded format)
  if (Object.keys(headers).length === 0) {
    return parseForwardedEmail(rawContent);
  }

  // Extract From
  if (headers['from']) {
    const fromParsed = parseEmailAddress(headers['from']);
    result.from_email = fromParsed.email;
    result.from_name = fromParsed.name;
  }

  // Extract To
  if (headers['to']) {
    result.to_emails = parseEmailAddressList(headers['to']).map(a => a.email);
  }

  // Extract Cc
  if (headers['cc']) {
    result.cc_emails = parseEmailAddressList(headers['cc']).map(a => a.email);
  }

  // Extract Subject
  if (headers['subject']) {
    result.subject = decodeHeaderValue(headers['subject']);
  }

  // Extract Date
  if (headers['date']) {
    const parsedDate = new Date(headers['date']);
    if (!isNaN(parsedDate.getTime())) {
      result.email_date = parsedDate;
    }
  }

  // Extract Message-ID
  if (headers['message-id']) {
    result.message_id = headers['message-id'].replace(/[<>]/g, '');
  }

  // Clean body text
  result.body_text = cleanBodyText(bodyLines.join('\n'));

  return result;
}

/**
 * Parse forwarded email format (Gmail, Outlook, etc.)
 * These typically have lines like "From: John <john@example.com>"
 */
function parseForwardedEmail(rawContent: string): EmailParseResult {
  const result: EmailParseResult = {
    from_email: '',
    from_name: null,
    to_emails: [],
    cc_emails: [],
    subject: null,
    email_date: new Date(),
    body_text: '',
    message_id: null,
  };

  const lines = rawContent.split('\n');

  // Common forwarded email patterns
  const fromPatterns = [
    /^From:\s*(.+)$/i,
    /^De:\s*(.+)$/i,  // Spanish/French
    /^\*From:\*\s*(.+)$/i,  // Bold markdown
    /^>?\s*From:\s*(.+)$/i,  // Quoted
  ];

  const toPatterns = [
    /^To:\s*(.+)$/i,
    /^Para:\s*(.+)$/i,
    /^\*To:\*\s*(.+)$/i,
  ];

  const subjectPatterns = [
    /^Subject:\s*(.+)$/i,
    /^Asunto:\s*(.+)$/i,
    /^\*Subject:\*\s*(.+)$/i,
  ];

  const datePatterns = [
    /^Date:\s*(.+)$/i,
    /^Sent:\s*(.+)$/i,
    /^Fecha:\s*(.+)$/i,
    /^\*Date:\*\s*(.+)$/i,
  ];

  let foundHeaders = false;
  let headerEndIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    for (const pattern of fromPatterns) {
      const match = line.match(pattern);
      if (match) {
        const parsed = parseEmailAddress(match[1]);
        result.from_email = parsed.email;
        result.from_name = parsed.name;
        foundHeaders = true;
        headerEndIndex = i + 1;
        break;
      }
    }

    for (const pattern of toPatterns) {
      const match = line.match(pattern);
      if (match) {
        result.to_emails = parseEmailAddressList(match[1]).map(a => a.email);
        headerEndIndex = Math.max(headerEndIndex, i + 1);
        break;
      }
    }

    for (const pattern of subjectPatterns) {
      const match = line.match(pattern);
      if (match) {
        result.subject = match[1].trim();
        headerEndIndex = Math.max(headerEndIndex, i + 1);
        break;
      }
    }

    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        const parsedDate = new Date(match[1]);
        if (!isNaN(parsedDate.getTime())) {
          result.email_date = parsedDate;
        }
        headerEndIndex = Math.max(headerEndIndex, i + 1);
        break;
      }
    }

    // Stop looking after we've processed typical header area
    if (i > 20 && foundHeaders) break;
  }

  // If no structured headers found, treat entire content as body
  if (!foundHeaders) {
    result.body_text = cleanBodyText(rawContent);
    result.from_email = 'unknown@unknown.com';
  } else {
    // Skip blank lines after headers
    while (headerEndIndex < lines.length && lines[headerEndIndex].trim() === '') {
      headerEndIndex++;
    }
    result.body_text = cleanBodyText(lines.slice(headerEndIndex).join('\n'));
  }

  return result;
}

/**
 * Parse a single email address (with optional name)
 * Handles: "John Doe <john@example.com>", "john@example.com", "<john@example.com>"
 */
export function parseEmailAddress(input: string): { email: string; name: string | null } {
  const trimmed = input.trim();

  // Format: "Name <email>"
  const nameEmailMatch = trimmed.match(/^"?([^"<]+)"?\s*<([^>]+)>$/);
  if (nameEmailMatch) {
    return {
      name: nameEmailMatch[1].trim(),
      email: nameEmailMatch[2].trim().toLowerCase(),
    };
  }

  // Format: "<email>"
  const bracketMatch = trimmed.match(/^<([^>]+)>$/);
  if (bracketMatch) {
    return {
      name: null,
      email: bracketMatch[1].trim().toLowerCase(),
    };
  }

  // Format: just email
  const emailMatch = trimmed.match(/([^\s]+@[^\s]+)/);
  if (emailMatch) {
    return {
      name: null,
      email: emailMatch[1].trim().toLowerCase(),
    };
  }

  return { name: null, email: trimmed.toLowerCase() };
}

/**
 * Parse a comma-separated list of email addresses
 */
function parseEmailAddressList(input: string): Array<{ email: string; name: string | null }> {
  const results: Array<{ email: string; name: string | null }> = [];

  // Split by comma, but be careful with commas inside quotes
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;
  let inBrackets = false;

  for (const char of input) {
    if (char === '"' && !inBrackets) {
      inQuotes = !inQuotes;
    } else if (char === '<') {
      inBrackets = true;
    } else if (char === '>') {
      inBrackets = false;
    } else if (char === ',' && !inQuotes && !inBrackets) {
      if (current.trim()) {
        parts.push(current.trim());
      }
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) {
    parts.push(current.trim());
  }

  for (const part of parts) {
    const parsed = parseEmailAddress(part);
    if (parsed.email) {
      results.push(parsed);
    }
  }

  return results;
}

/**
 * Decode MIME-encoded header values (=?UTF-8?B?...?=)
 */
function decodeHeaderValue(value: string): string {
  // Handle Base64 encoded
  const b64Match = value.match(/=\?([^?]+)\?[Bb]\?([^?]+)\?=/);
  if (b64Match) {
    try {
      return Buffer.from(b64Match[2], 'base64').toString('utf-8');
    } catch {
      return value;
    }
  }

  // Handle Quoted-Printable encoded
  const qpMatch = value.match(/=\?([^?]+)\?[Qq]\?([^?]+)\?=/);
  if (qpMatch) {
    try {
      return qpMatch[2]
        .replace(/_/g, ' ')
        .replace(/=([0-9A-F]{2})/gi, (_, hex) =>
          String.fromCharCode(parseInt(hex, 16))
        );
    } catch {
      return value;
    }
  }

  return value;
}

/**
 * Clean up body text (remove quoted content, signatures, etc.)
 */
function cleanBodyText(body: string): string {
  let cleaned = body;

  // Remove quoted reply sections
  cleaned = cleaned.replace(/^>.*$/gm, '');

  // Remove common signature markers
  const signaturePatterns = [
    /^--\s*$/m,
    /^_{3,}$/m,
    /^Sent from my iPhone$/m,
    /^Sent from my Android$/m,
    /^Get Outlook for iOS$/m,
  ];

  for (const pattern of signaturePatterns) {
    const match = cleaned.match(pattern);
    if (match && match.index !== undefined) {
      cleaned = cleaned.substring(0, match.index);
    }
  }

  // Remove HTML tags if present
  cleaned = cleaned.replace(/<[^>]*>/g, '');

  // Normalize whitespace
  cleaned = cleaned
    .split('\n')
    .map(line => line.trim())
    .filter((line, i, arr) => {
      // Remove consecutive blank lines
      if (line === '' && arr[i - 1] === '') return false;
      return true;
    })
    .join('\n')
    .trim();

  return cleaned;
}

/**
 * Extract domain from email address
 */
export function extractDomain(email: string): string {
  const parts = email.split('@');
  return parts.length > 1 ? parts[1].toLowerCase() : '';
}
