/**
 * Email Sending Utilities
 * Handles outbound email sending for ticket replies and notifications
 *
 * Setup Requirements:
 * - Configure email service (SendGrid/Mailgun/Postmark/Nodemailer)
 * - Set environment variables:
 *   - EMAIL_SERVICE_PROVIDER ('sendgrid' | 'mailgun' | 'postmark' | 'smtp')
 *   - EMAIL_API_KEY (for SendGrid/Mailgun/Postmark)
 *   - EMAIL_FROM_ADDRESS (sender address)
 *   - EMAIL_REPLY_TO_ADDRESS (optional)
 *   - For SMTP: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
 *
 * Installation (choose one):
 * npm install @sendgrid/mail
 * npm install mailgun.js
 * npm install postmark
 * npm install nodemailer
 */

import { generateMessageId } from './parser';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  from?: string;
  replyTo?: string;
  inReplyTo?: string; // For threading
  references?: string[]; // For threading
  attachments?: EmailAttachment[];
  ticketId?: string;
  ticketNumber?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded
  contentType: string;
  size?: number;
}

export interface EmailResult {
  success: boolean;
  messageId: string;
  error?: string;
}

/**
 * Send email using configured provider
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  const provider = process.env.EMAIL_SERVICE_PROVIDER || 'sendgrid';

  try {
    // Add ticket reference to subject if provided
    const subject = options.ticketNumber
      ? `[TICKET-${options.ticketNumber}] ${options.subject}`
      : options.subject;

    const messageId = generateMessageId();

    switch (provider) {
      case 'sendgrid':
        return await sendWithSendGrid({ ...options, subject }, messageId);
      case 'mailgun':
        return await sendWithMailgun({ ...options, subject }, messageId);
      case 'postmark':
        return await sendWithPostmark({ ...options, subject }, messageId);
      case 'smtp':
        return await sendWithSMTP({ ...options, subject }, messageId);
      default:
        return await mockEmailSend({ ...options, subject }, messageId);
    }
  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      messageId: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send email via SendGrid
 * Requires: @sendgrid/mail
 */
async function sendWithSendGrid(options: SendEmailOptions, messageId: string): Promise<EmailResult> {
  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.EMAIL_API_KEY);

    const msg: any = {
      to: Array.isArray(options.to) ? options.to : [options.to],
      from: options.from || process.env.EMAIL_FROM_ADDRESS,
      replyTo: options.replyTo || process.env.EMAIL_REPLY_TO_ADDRESS,
      subject: options.subject,
      text: options.bodyText,
      html: options.bodyHtml,
      headers: {
        'Message-ID': `<${messageId}>`,
      },
    };

    // Add threading headers
    if (options.inReplyTo) {
      msg.headers['In-Reply-To'] = `<${options.inReplyTo}>`;
    }
    if (options.references && options.references.length > 0) {
      msg.headers['References'] = options.references.map(ref => `<${ref}>`).join(' ');
    }

    // Add attachments
    if (options.attachments && options.attachments.length > 0) {
      msg.attachments = options.attachments.map(att => ({
        content: att.content,
        filename: att.filename,
        type: att.contentType,
        disposition: 'attachment',
      }));
    }

    await sgMail.send(msg);

    return {
      success: true,
      messageId,
    };
  } catch (error: any) {
    console.error('SendGrid error:', error.response?.body || error);
    return {
      success: false,
      messageId,
      error: error.message || 'SendGrid send failed',
    };
  }
}

/**
 * Send email via Mailgun
 * Requires: mailgun.js and form-data
 */
async function sendWithMailgun(options: SendEmailOptions, messageId: string): Promise<EmailResult> {
  try {
    const formData = require('form-data');
    const Mailgun = require('mailgun.js');
    const mailgun = new Mailgun(formData);

    const mg = mailgun.client({
      username: 'api',
      key: process.env.EMAIL_API_KEY || '',
    });

    const domain = process.env.MAILGUN_DOMAIN || '';

    const data: any = {
      from: options.from || process.env.EMAIL_FROM_ADDRESS,
      to: Array.isArray(options.to) ? options.to.join(',') : options.to,
      subject: options.subject,
      text: options.bodyText,
      html: options.bodyHtml,
      'h:Message-ID': `<${messageId}>`,
    };

    // Add threading headers
    if (options.inReplyTo) {
      data['h:In-Reply-To'] = `<${options.inReplyTo}>`;
    }
    if (options.references && options.references.length > 0) {
      data['h:References'] = options.references.map(ref => `<${ref}>`).join(' ');
    }
    if (options.replyTo) {
      data['h:Reply-To'] = options.replyTo;
    }

    // Add attachments
    if (options.attachments && options.attachments.length > 0) {
      data.attachment = options.attachments.map(att => ({
        data: Buffer.from(att.content, 'base64'),
        filename: att.filename,
        contentType: att.contentType,
      }));
    }

    await mg.messages.create(domain, data);

    return {
      success: true,
      messageId,
    };
  } catch (error: any) {
    console.error('Mailgun error:', error);
    return {
      success: false,
      messageId,
      error: error.message || 'Mailgun send failed',
    };
  }
}

/**
 * Send email via Postmark
 * Requires: postmark
 */
async function sendWithPostmark(options: SendEmailOptions, messageId: string): Promise<EmailResult> {
  try {
    const postmark = require('postmark');
    const client = new postmark.ServerClient(process.env.EMAIL_API_KEY);

    const email: any = {
      From: options.from || process.env.EMAIL_FROM_ADDRESS,
      To: Array.isArray(options.to) ? options.to.join(',') : options.to,
      Subject: options.subject,
      TextBody: options.bodyText,
      HtmlBody: options.bodyHtml,
      MessageID: messageId,
      Headers: [
        {
          Name: 'Message-ID',
          Value: `<${messageId}>`,
        },
      ],
    };

    // Add threading headers
    if (options.inReplyTo) {
      email.Headers.push({
        Name: 'In-Reply-To',
        Value: `<${options.inReplyTo}>`,
      });
    }
    if (options.references && options.references.length > 0) {
      email.Headers.push({
        Name: 'References',
        Value: options.references.map(ref => `<${ref}>`).join(' '),
      });
    }
    if (options.replyTo) {
      email.ReplyTo = options.replyTo;
    }

    // Add attachments
    if (options.attachments && options.attachments.length > 0) {
      email.Attachments = options.attachments.map(att => ({
        Name: att.filename,
        Content: att.content,
        ContentType: att.contentType,
      }));
    }

    await client.sendEmail(email);

    return {
      success: true,
      messageId,
    };
  } catch (error: any) {
    console.error('Postmark error:', error);
    return {
      success: false,
      messageId,
      error: error.message || 'Postmark send failed',
    };
  }
}

/**
 * Send email via SMTP (using nodemailer)
 * Requires: nodemailer
 */
async function sendWithSMTP(options: SendEmailOptions, messageId: string): Promise<EmailResult> {
  try {
    const nodemailer = require('nodemailer');

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const mailOptions: any = {
      from: options.from || process.env.EMAIL_FROM_ADDRESS,
      to: Array.isArray(options.to) ? options.to.join(',') : options.to,
      subject: options.subject,
      text: options.bodyText,
      html: options.bodyHtml,
      messageId: `<${messageId}>`,
      headers: {
        'Message-ID': `<${messageId}>`,
      },
    };

    // Add threading headers
    if (options.inReplyTo) {
      mailOptions.headers['In-Reply-To'] = `<${options.inReplyTo}>`;
    }
    if (options.references && options.references.length > 0) {
      mailOptions.headers['References'] = options.references.map(ref => `<${ref}>`).join(' ');
    }
    if (options.replyTo) {
      mailOptions.replyTo = options.replyTo;
    }

    // Add attachments
    if (options.attachments && options.attachments.length > 0) {
      mailOptions.attachments = options.attachments.map(att => ({
        filename: att.filename,
        content: Buffer.from(att.content, 'base64'),
        contentType: att.contentType,
      }));
    }

    await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId,
    };
  } catch (error: any) {
    console.error('SMTP error:', error);
    return {
      success: false,
      messageId,
      error: error.message || 'SMTP send failed',
    };
  }
}

/**
 * Mock email send for testing (logs to console)
 */
async function mockEmailSend(options: SendEmailOptions, messageId: string): Promise<EmailResult> {
  console.log('=== MOCK EMAIL SEND ===');
  console.log('To:', options.to);
  console.log('Subject:', options.subject);
  console.log('Message-ID:', messageId);
  if (options.inReplyTo) console.log('In-Reply-To:', options.inReplyTo);
  console.log('Body:', options.bodyText.substring(0, 100) + '...');
  console.log('======================');

  return {
    success: true,
    messageId,
  };
}

/**
 * Send ticket reply email
 */
export async function sendTicketReply(
  ticketId: string,
  ticketNumber: string,
  toEmail: string,
  subject: string,
  message: string,
  inReplyToMessageId?: string
): Promise<EmailResult> {
  // Build references chain
  const references: string[] = [];
  if (inReplyToMessageId) {
    references.push(inReplyToMessageId);
  }

  const bodyHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
        <p style="margin: 0 0 15px 0;">${message.replace(/\n/g, '<br>')}</p>
      </div>
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 12px; color: #6c757d;">
        <p>This is an automated response from myRA Support System.</p>
        <p>Ticket Reference: ${ticketNumber}</p>
        <p>To reply, simply respond to this email.</p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: toEmail,
    subject,
    bodyText: message,
    bodyHtml,
    inReplyTo: inReplyToMessageId,
    references,
    ticketId,
    ticketNumber,
  });
}

/**
 * Send notification email for watchers
 */
export async function sendWatcherNotification(
  ticketNumber: string,
  watcherEmail: string,
  eventType: 'comment' | 'status_change' | 'assigned',
  details: string
): Promise<EmailResult> {
  const subject = `[TICKET-${ticketNumber}] ${eventType === 'comment' ? 'New Comment' : eventType === 'status_change' ? 'Status Updated' : 'Ticket Assigned'}`;

  const bodyText = `
There has been an update to ticket ${ticketNumber} that you are watching:

${details}

---
You are receiving this email because you are watching this ticket.
To unwatch, visit the ticket page and click the "Unwatch" button.
  `.trim();

  const bodyHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Ticket Update: ${ticketNumber}</h2>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;">${details}</p>
      </div>
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 12px; color: #6c757d;">
        <p>You are receiving this email because you are watching this ticket.</p>
        <p>To unwatch, visit the ticket page and click the "Unwatch" button.</p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: watcherEmail,
    subject,
    bodyText,
    bodyHtml,
    ticketNumber,
  });
}

/**
 * Send calendar event invitation email
 */
export async function sendCalendarInvite(
  attendeeEmail: string,
  eventTitle: string,
  eventDescription: string,
  startTime: Date,
  endTime: Date,
  ticketNumber?: string
): Promise<EmailResult> {
  const subject = ticketNumber
    ? `[TICKET-${ticketNumber}] Calendar Invitation: ${eventTitle}`
    : `Calendar Invitation: ${eventTitle}`;

  const formatDate = (date: Date) => {
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  const bodyText = `
You have been invited to a calendar event:

Title: ${eventTitle}
Start: ${formatDate(startTime)}
End: ${formatDate(endTime)}

${eventDescription ? `Description:\n${eventDescription}` : ''}

${ticketNumber ? `\nRelated Ticket: ${ticketNumber}` : ''}
  `.trim();

  const bodyHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Calendar Invitation</h2>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #495057;">${eventTitle}</h3>
        <p style="margin: 5px 0;"><strong>Start:</strong> ${formatDate(startTime)}</p>
        <p style="margin: 5px 0;"><strong>End:</strong> ${formatDate(endTime)}</p>
        ${eventDescription ? `<p style="margin: 15px 0 0 0;">${eventDescription}</p>` : ''}
      </div>
      ${ticketNumber ? `<p style="color: #6c757d; font-size: 14px;">Related to Ticket: ${ticketNumber}</p>` : ''}
    </div>
  `;

  return await sendEmail({
    to: attendeeEmail,
    subject,
    bodyText,
    bodyHtml,
    ticketNumber,
  });
}

/**
 * Build email references chain for threading
 */
export function buildReferencesChain(existingReferences: string[], newMessageId: string): string[] {
  const references = [...existingReferences];
  if (!references.includes(newMessageId)) {
    references.push(newMessageId);
  }
  return references;
}

/**
 * Format email body with signature
 */
export function formatEmailBody(message: string, senderName?: string): string {
  const signature = senderName
    ? `\n\n---\n${senderName}\nmyRA Support Team`
    : '\n\n---\nmyRA Support Team';

  return message + signature;
}

/**
 * Validate email configuration
 */
export function validateEmailConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const provider = process.env.EMAIL_SERVICE_PROVIDER;

  if (!process.env.EMAIL_FROM_ADDRESS) {
    errors.push('EMAIL_FROM_ADDRESS is not configured');
  }

  if (provider !== 'mock' && !process.env.EMAIL_API_KEY && !process.env.SMTP_HOST) {
    errors.push('EMAIL_API_KEY or SMTP credentials are not configured');
  }

  if (provider === 'mailgun' && !process.env.MAILGUN_DOMAIN) {
    errors.push('MAILGUN_DOMAIN is required for Mailgun provider');
  }

  if (provider === 'smtp') {
    if (!process.env.SMTP_HOST) errors.push('SMTP_HOST is required');
    if (!process.env.SMTP_USER) errors.push('SMTP_USER is required');
    if (!process.env.SMTP_PASSWORD) errors.push('SMTP_PASSWORD is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
