// Email Service - CRUD operations for parsed emails

import { createClient } from '@/lib/supabase/server';
import { parseEmailContent } from './parser';
import { extractEmailInsights, matchOrganizations } from './aiParser';
import type {
  ParsedEmail,
  EmailActionItem,
  EmailContact,
  ParseEmailInput,
  ParsedEmailWithRelations,
  IngestionMethod,
} from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

// ============================================
// Parse and Create Email
// ============================================

export async function parseAndCreateEmail(
  input: ParseEmailInput,
  userId: string
): Promise<ParsedEmailWithRelations> {
  const supabase = await createClient() as AnySupabaseClient;

  // Step 1: Parse the raw email content
  const parsed = parseEmailContent(input.raw_content);

  // Step 2: Create the email record with pending status
  const { data: emailRecord, error: createError } = await supabase
    .from('parsed_emails')
    .insert({
      raw_content: input.raw_content,
      message_id: parsed.message_id,
      from_email: parsed.from_email,
      from_name: parsed.from_name,
      to_emails: parsed.to_emails,
      cc_emails: parsed.cc_emails,
      subject: parsed.subject,
      email_date: parsed.email_date.toISOString(),
      body_text: parsed.body_text,
      org_id: input.org_id || null,
      ingestion_method: input.ingestion_method,
      processing_status: 'processing',
      created_by: userId,
    })
    .select()
    .single();

  if (createError) {
    console.error('Error creating email record:', createError);
    throw new Error('Failed to create email record');
  }

  const email = emailRecord as ParsedEmail;

  try {
    // Step 3: Extract AI insights
    const insights = await extractEmailInsights(
      parsed.subject,
      parsed.body_text,
      parsed.from_email,
      parsed.from_name
    );

    // Step 4: Match organizations
    if (insights.entities.organizations) {
      insights.entities.organizations = await matchOrganizations(
        insights.entities.organizations,
        supabase
      );

      // If no org_id was provided and we found a match, suggest it
      if (!input.org_id && insights.entities.organizations.length > 0) {
        const bestMatch = insights.entities.organizations.find(o => o.matched_org_id);
        if (bestMatch) {
          insights.suggested_org_id = bestMatch.matched_org_id;
        }
      }
    }

    // Step 5: Update email with AI insights
    const { data: updatedEmail, error: updateError } = await supabase
      .from('parsed_emails')
      .update({
        extracted_entities: insights.entities,
        extracted_actions: insights.actions,
        sentiment: insights.sentiment,
        urgency_level: insights.urgency,
        summary: insights.summary,
        key_topics: insights.key_topics,
        org_id: input.org_id || insights.suggested_org_id || null,
        processing_status: 'completed',
      })
      .eq('id', email.id)
      .select()
      .single();

    if (updateError) {
      throw new Error('Failed to update email with insights');
    }

    // Step 6: Create action items
    const actionItems: EmailActionItem[] = [];
    for (const action of insights.actions) {
      const { data: actionItem, error: actionError } = await supabase
        .from('email_action_items')
        .insert({
          parsed_email_id: email.id,
          action_text: action.text,
          action_type: action.type,
          assignee: action.assignee,
          due_date: action.due_date,
          status: 'pending',
        })
        .select()
        .single();

      if (!actionError && actionItem) {
        actionItems.push(actionItem as EmailActionItem);
      }
    }

    // Step 7: Create contacts
    const contacts: EmailContact[] = [];

    // Add sender as contact
    const { data: senderContact } = await supabase
      .from('email_contacts')
      .insert({
        parsed_email_id: email.id,
        name: parsed.from_name || parsed.from_email.split('@')[0],
        email: parsed.from_email,
        contact_type: 'sender',
      })
      .select()
      .single();

    if (senderContact) {
      contacts.push(senderContact as EmailContact);
    }

    // Add extracted people as contacts
    if (insights.entities.people) {
      for (const person of insights.entities.people) {
        const { data: personContact } = await supabase
          .from('email_contacts')
          .insert({
            parsed_email_id: email.id,
            name: person.name,
            email: person.email,
            role: person.role,
            company: person.company,
            contact_type: 'mentioned',
          })
          .select()
          .single();

        if (personContact) {
          contacts.push(personContact as EmailContact);
        }
      }
    }

    return {
      ...(updatedEmail as ParsedEmail),
      action_items: actionItems,
      contacts,
    };
  } catch (error) {
    // Update status to failed
    await supabase
      .from('parsed_emails')
      .update({
        processing_status: 'failed',
        processing_error: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', email.id);

    throw error;
  }
}

// ============================================
// Get Emails
// ============================================

export async function getEmails(
  options: {
    org_id?: string;
    created_by?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<ParsedEmail[]> {
  const supabase = await createClient() as AnySupabaseClient;

  let query = supabase
    .from('parsed_emails')
    .select('*')
    .order('email_date', { ascending: false });

  if (options.org_id) {
    query = query.eq('org_id', options.org_id);
  }

  if (options.created_by) {
    query = query.eq('created_by', options.created_by);
  }

  if (options.status) {
    query = query.eq('processing_status', options.status);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching emails:', error);
    throw new Error('Failed to fetch emails');
  }

  return (data || []) as ParsedEmail[];
}

export async function getEmail(id: string): Promise<ParsedEmailWithRelations | null> {
  const supabase = await createClient() as AnySupabaseClient;

  const { data: email, error: emailError } = await supabase
    .from('parsed_emails')
    .select('*')
    .eq('id', id)
    .single();

  if (emailError) {
    if (emailError.code === 'PGRST116') return null;
    console.error('Error fetching email:', emailError);
    throw new Error('Failed to fetch email');
  }

  const { data: actionItems } = await supabase
    .from('email_action_items')
    .select('*')
    .eq('parsed_email_id', id)
    .order('created_at');

  const { data: contacts } = await supabase
    .from('email_contacts')
    .select('*')
    .eq('parsed_email_id', id)
    .order('created_at');

  return {
    ...(email as ParsedEmail),
    action_items: (actionItems || []) as EmailActionItem[],
    contacts: (contacts || []) as EmailContact[],
  };
}

// ============================================
// Update Operations
// ============================================

export async function linkEmailToOrg(emailId: string, orgId: string): Promise<void> {
  const supabase = await createClient() as AnySupabaseClient;

  const { error } = await supabase
    .from('parsed_emails')
    .update({ org_id: orgId })
    .eq('id', emailId);

  if (error) {
    console.error('Error linking email to org:', error);
    throw new Error('Failed to link email to organization');
  }
}

export async function updateActionItemStatus(
  itemId: string,
  status: string
): Promise<EmailActionItem> {
  const supabase = await createClient() as AnySupabaseClient;

  const { data, error } = await supabase
    .from('email_action_items')
    .update({ status })
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    console.error('Error updating action item:', error);
    throw new Error('Failed to update action item');
  }

  return data as EmailActionItem;
}

export async function convertActionToFollowup(
  itemId: string,
  followupId: string
): Promise<void> {
  const supabase = await createClient() as AnySupabaseClient;

  const { error } = await supabase
    .from('email_action_items')
    .update({
      converted_to_followup_id: followupId,
      status: 'completed',
    })
    .eq('id', itemId);

  if (error) {
    console.error('Error converting action to followup:', error);
    throw new Error('Failed to convert action item');
  }
}

// ============================================
// Delete Operations
// ============================================

export async function deleteEmail(id: string): Promise<void> {
  const supabase = await createClient() as AnySupabaseClient;

  const { error } = await supabase
    .from('parsed_emails')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting email:', error);
    throw new Error('Failed to delete email');
  }
}

// ============================================
// Statistics
// ============================================

export async function getEmailStats(userId?: string): Promise<{
  total: number;
  this_week: number;
  by_sentiment: Record<string, number>;
  by_urgency: Record<string, number>;
  action_items_pending: number;
}> {
  const supabase = await createClient() as AnySupabaseClient;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  let query = supabase.from('parsed_emails').select('id, sentiment, urgency_level, created_at');

  if (userId) {
    query = query.eq('created_by', userId);
  }

  const { data: emails } = await query;
  const emailList = (emails || []) as Array<{
    id: string;
    sentiment: string | null;
    urgency_level: string | null;
    created_at: string;
  }>;

  const thisWeekEmails = emailList.filter(
    e => new Date(e.created_at) >= oneWeekAgo
  );

  const bySentiment: Record<string, number> = {};
  const byUrgency: Record<string, number> = {};

  for (const email of emailList) {
    if (email.sentiment) {
      bySentiment[email.sentiment] = (bySentiment[email.sentiment] || 0) + 1;
    }
    if (email.urgency_level) {
      byUrgency[email.urgency_level] = (byUrgency[email.urgency_level] || 0) + 1;
    }
  }

  // Get pending action items count
  const emailIds = emailList.map(e => e.id);
  let pendingCount = 0;

  if (emailIds.length > 0) {
    const { count } = await supabase
      .from('email_action_items')
      .select('*', { count: 'exact', head: true })
      .in('parsed_email_id', emailIds)
      .eq('status', 'pending');

    pendingCount = count || 0;
  }

  return {
    total: emailList.length,
    this_week: thisWeekEmails.length,
    by_sentiment: bySentiment,
    by_urgency: byUrgency,
    action_items_pending: pendingCount,
  };
}
