export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tickets: {
        Row: {
          id: string
          ticket_number: string
          organization: string
          user_name: string
          user_email: string
          category: string
          priority: string
          status: string
          description: string
          assigned_to: string | null
          trial_org_id: string | null
          created_at: string
          updated_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          ticket_number?: string
          organization: string
          user_name: string
          user_email: string
          category: string
          priority?: string
          status?: string
          description: string
          assigned_to?: string | null
          trial_org_id?: string | null
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          ticket_number?: string
          organization?: string
          user_name?: string
          user_email?: string
          category?: string
          priority?: string
          status?: string
          description?: string
          assigned_to?: string | null
          trial_org_id?: string | null
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
        }
      }
      ticket_comments: {
        Row: {
          id: string
          ticket_id: string
          user_id: string
          comment: string
          is_internal: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          user_id: string
          comment: string
          is_internal?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          user_id?: string
          comment?: string
          is_internal?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          ticket_id: string | null
          type: 'assigned' | 'comment' | 'mention' | 'status_change'
          message: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ticket_id?: string | null
          type: 'assigned' | 'comment' | 'mention' | 'status_change'
          message: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ticket_id?: string | null
          type?: 'assigned' | 'comment' | 'mention' | 'status_change'
          message?: string
          is_read?: boolean
          created_at?: string
        }
      }
      ticket_links: {
        Row: {
          id: string
          ticket_id: string
          related_ticket_id: string
          link_type: 'blocks' | 'blocked_by' | 'related' | 'duplicate'
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          related_ticket_id: string
          link_type: 'blocks' | 'blocked_by' | 'related' | 'duplicate'
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          related_ticket_id?: string
          link_type?: 'blocks' | 'blocked_by' | 'related' | 'duplicate'
          created_by?: string
          created_at?: string
        }
      }
      organizations: {
        Row: {
          id: string
          name: string
          trial_start_date: string
          trial_end_date: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          trial_start_date: string
          trial_end_date: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          trial_start_date?: string
          trial_end_date?: string
          status?: string
          created_at?: string
        }
      }
      ticket_watchers: {
        Row: {
          id: string
          ticket_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          user_id?: string
          created_at?: string
        }
      }
      ticket_activities: {
        Row: {
          id: string
          ticket_id: string
          user_id: string | null
          activity_type: 'created' | 'status_changed' | 'assigned' | 'commented' | 'linked' | 'watched'
          old_value: string | null
          new_value: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          user_id?: string | null
          activity_type: 'created' | 'status_changed' | 'assigned' | 'commented' | 'linked' | 'watched'
          old_value?: string | null
          new_value?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          user_id?: string | null
          activity_type?: 'created' | 'status_changed' | 'assigned' | 'commented' | 'linked' | 'watched'
          old_value?: string | null
          new_value?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      user_profiles: {
        Row: {
          user_id: string
          display_name: string | null
          avatar_url: string | null
          role: string
          last_active: string
          created_at: string
        }
        Insert: {
          user_id: string
          display_name?: string | null
          avatar_url?: string | null
          role?: string
          last_active?: string
          created_at?: string
        }
        Update: {
          user_id?: string
          display_name?: string | null
          avatar_url?: string | null
          role?: string
          last_active?: string
          created_at?: string
        }
      }
      trial_organizations: {
        Row: {
          org_id: string
          org_name: string
          org_domain: string | null
          account_manager: string | null
          org_lifecycle_stage: 'prospect' | 'trial_pending' | 'trial_active' | 'trial_expired' | 'customer' | 'lost'
          trial_status: 'requested' | 'approved' | 'active' | 'extended' | 'completed' | 'cancelled' | null
          trial_start_date: string | null
          trial_end_date: string | null
          engagement_score: number
          last_activity_date: string | null
          comments: string | null
          created_at: string
          updated_at: string
          // Engagement tracking columns
          first_login_date: string | null
          first_query_date: string | null
          activation_date: string | null
          total_logins: number
          total_queries: number
          unique_active_users: number
          last_query_date: string | null
          engagement_tier: 'hot' | 'warm' | 'cold' | 'dormant' | null
          engagement_score_breakdown: Json | null
          customer_health_status: 'onboarding' | 'healthy' | 'warning' | 'at_risk' | 'churning' | null
          // Prospect lifecycle columns
          is_prospect: boolean
          prospect_stage: 'cold_lead' | 'contacted' | 'responded' | 'screening' | 'demo_scheduled' | 'demo_done' | 'disqualified' | null
          prospect_source: 'cold_outreach' | 'inbound' | 'referral' | 'event' | 'linkedin' | 'other' | null
          icp_fit_score: number | null
          // Deal stage columns
          deal_stage: 'evaluation' | 'trial_expired' | 'negotiation' | 'closed' | null
          deal_outcome: 'won' | 'lost' | 'deferred' | null
          deal_outcome_reason: string | null
          deal_deferred_until: string | null
        }
        Insert: {
          org_id?: string
          org_name: string
          org_domain?: string | null
          account_manager?: string | null
          org_lifecycle_stage?: 'prospect' | 'trial_pending' | 'trial_active' | 'trial_expired' | 'customer' | 'lost'
          trial_status?: 'requested' | 'approved' | 'active' | 'extended' | 'completed' | 'cancelled' | null
          trial_start_date?: string | null
          trial_end_date?: string | null
          engagement_score?: number
          last_activity_date?: string | null
          comments?: string | null
          created_at?: string
          updated_at?: string
          first_login_date?: string | null
          first_query_date?: string | null
          activation_date?: string | null
          total_logins?: number
          total_queries?: number
          unique_active_users?: number
          last_query_date?: string | null
          engagement_tier?: 'hot' | 'warm' | 'cold' | 'dormant' | null
          engagement_score_breakdown?: Json | null
          customer_health_status?: 'onboarding' | 'healthy' | 'warning' | 'at_risk' | 'churning' | null
          // Prospect lifecycle columns
          is_prospect?: boolean
          prospect_stage?: 'cold_lead' | 'contacted' | 'responded' | 'screening' | 'demo_scheduled' | 'demo_done' | 'disqualified' | null
          prospect_source?: 'cold_outreach' | 'inbound' | 'referral' | 'event' | 'linkedin' | 'other' | null
          icp_fit_score?: number | null
          // Deal stage columns
          deal_stage?: 'evaluation' | 'trial_expired' | 'negotiation' | 'closed' | null
          deal_outcome?: 'won' | 'lost' | 'deferred' | null
          deal_outcome_reason?: string | null
          deal_deferred_until?: string | null
        }
        Update: {
          org_id?: string
          org_name?: string
          org_domain?: string | null
          account_manager?: string | null
          org_lifecycle_stage?: 'prospect' | 'trial_pending' | 'trial_active' | 'trial_expired' | 'customer' | 'lost'
          trial_status?: 'requested' | 'approved' | 'active' | 'extended' | 'completed' | 'cancelled' | null
          trial_start_date?: string | null
          trial_end_date?: string | null
          engagement_score?: number
          last_activity_date?: string | null
          comments?: string | null
          created_at?: string
          updated_at?: string
          first_login_date?: string | null
          first_query_date?: string | null
          activation_date?: string | null
          total_logins?: number
          total_queries?: number
          unique_active_users?: number
          last_query_date?: string | null
          engagement_tier?: 'hot' | 'warm' | 'cold' | 'dormant' | null
          engagement_score_breakdown?: Json | null
          customer_health_status?: 'onboarding' | 'healthy' | 'warning' | 'at_risk' | 'churning' | null
          // Prospect lifecycle columns
          is_prospect?: boolean
          prospect_stage?: 'cold_lead' | 'contacted' | 'responded' | 'screening' | 'demo_scheduled' | 'demo_done' | 'disqualified' | null
          prospect_source?: 'cold_outreach' | 'inbound' | 'referral' | 'event' | 'linkedin' | 'other' | null
          icp_fit_score?: number | null
          // Deal stage columns
          deal_stage?: 'evaluation' | 'trial_expired' | 'negotiation' | 'closed' | null
          deal_outcome?: 'won' | 'lost' | 'deferred' | null
          deal_outcome_reason?: string | null
          deal_deferred_until?: string | null
        }
      }
      prospects: {
        Row: {
          id: string
          org_id: string
          name: string
          email: string | null
          title: string | null
          phone: string | null
          linkedin_url: string | null
          is_primary_contact: boolean
          source: 'cold_outreach' | 'linkedin' | 'referral' | 'inbound' | 'event' | 'other' | null
          status: 'active' | 'converted' | 'unresponsive' | 'opted_out'
          assigned_to: string | null
          notes: string | null
          created_at: string
          updated_at: string
          converted_user_id: string | null
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          email?: string | null
          title?: string | null
          phone?: string | null
          linkedin_url?: string | null
          is_primary_contact?: boolean
          source?: 'cold_outreach' | 'linkedin' | 'referral' | 'inbound' | 'event' | 'other' | null
          status?: 'active' | 'converted' | 'unresponsive' | 'opted_out'
          assigned_to?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          converted_user_id?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          email?: string | null
          title?: string | null
          phone?: string | null
          linkedin_url?: string | null
          is_primary_contact?: boolean
          source?: 'cold_outreach' | 'linkedin' | 'referral' | 'inbound' | 'event' | 'other' | null
          status?: 'active' | 'converted' | 'unresponsive' | 'opted_out'
          assigned_to?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          converted_user_id?: string | null
        }
      }
      prospect_activities: {
        Row: {
          id: string
          prospect_id: string | null
          org_id: string | null
          activity_type: 'email_sent' | 'email_received' | 'call' | 'linkedin' | 'meeting' | 'note' | 'screening' | 'demo'
          direction: 'outbound' | 'inbound' | null
          subject: string | null
          content: string | null
          response_status: 'no_response' | 'positive' | 'negative' | 'neutral' | 'pending' | null
          logged_by: string | null
          activity_date: string
          created_at: string
        }
        Insert: {
          id?: string
          prospect_id?: string | null
          org_id?: string | null
          activity_type: 'email_sent' | 'email_received' | 'call' | 'linkedin' | 'meeting' | 'note' | 'screening' | 'demo'
          direction?: 'outbound' | 'inbound' | null
          subject?: string | null
          content?: string | null
          response_status?: 'no_response' | 'positive' | 'negative' | 'neutral' | 'pending' | null
          logged_by?: string | null
          activity_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          prospect_id?: string | null
          org_id?: string | null
          activity_type?: 'email_sent' | 'email_received' | 'call' | 'linkedin' | 'meeting' | 'note' | 'screening' | 'demo'
          direction?: 'outbound' | 'inbound' | null
          subject?: string | null
          content?: string | null
          response_status?: 'no_response' | 'positive' | 'negative' | 'neutral' | 'pending' | null
          logged_by?: string | null
          activity_date?: string
          created_at?: string
        }
      }
      trial_users: {
        Row: {
          user_id: string
          org_id: string
          name: string
          email: string
          role: string | null
          salesforce_id: string | null
          account_manager: string
          phone: string | null
          current_stage: 'invited' | 'access_enabled' | 'active' | 'inactive'
          first_login_date: string | null
          last_login_date: string | null
          login_count: number
          queries_executed: number
          is_champion: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id?: string
          org_id: string
          name: string
          email: string
          role?: string | null
          salesforce_id?: string | null
          account_manager: string
          phone?: string | null
          current_stage?: 'invited' | 'access_enabled' | 'active' | 'inactive'
          first_login_date?: string | null
          last_login_date?: string | null
          login_count?: number
          queries_executed?: number
          is_champion?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          org_id?: string
          name?: string
          email?: string
          role?: string | null
          salesforce_id?: string | null
          account_manager?: string
          phone?: string | null
          current_stage?: 'invited' | 'access_enabled' | 'active' | 'inactive'
          first_login_date?: string | null
          last_login_date?: string | null
          login_count?: number
          queries_executed?: number
          is_champion?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_activity_log: {
        Row: {
          activity_id: string
          user_id: string
          org_id: string
          activity_type: 'login' | 'query_executed' | 'report_generated' | 'feature_used'
          activity_timestamp: string
          session_id: string | null
          metadata: Json | null
        }
        Insert: {
          activity_id?: string
          user_id: string
          org_id: string
          activity_type: 'login' | 'query_executed' | 'report_generated' | 'feature_used'
          activity_timestamp?: string
          session_id?: string | null
          metadata?: Json | null
        }
        Update: {
          activity_id?: string
          user_id?: string
          org_id?: string
          activity_type?: 'login' | 'query_executed' | 'report_generated' | 'feature_used'
          activity_timestamp?: string
          session_id?: string | null
          metadata?: Json | null
        }
      }
      import_batches: {
        Row: {
          import_id: string
          imported_by: string
          import_timestamp: string
          file_name: string
          total_rows: number
          successful_rows: number
          skipped_rows: number
          import_status: 'pending' | 'processing' | 'completed' | 'failed'
          error_details: Json | null
        }
        Insert: {
          import_id?: string
          imported_by: string
          import_timestamp?: string
          file_name: string
          total_rows: number
          successful_rows?: number
          skipped_rows?: number
          import_status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_details?: Json | null
        }
        Update: {
          import_id?: string
          imported_by?: string
          import_timestamp?: string
          file_name?: string
          total_rows?: number
          successful_rows?: number
          skipped_rows?: number
          import_status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_details?: Json | null
        }
      }
      demo_events: {
        Row: {
          demo_id: string
          org_id: string
          demo_date: string
          demo_time: string | null
          sales_poc: string
          demo_status: 'scheduled' | 'completed' | 'cancelled'
          attendee_names: string[] | null
          demo_observations: string | null
          pain_points: string | null
          next_steps: string | null
          demo_rating: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          demo_id?: string
          org_id: string
          demo_date: string
          demo_time?: string | null
          sales_poc: string
          demo_status?: 'scheduled' | 'completed' | 'cancelled'
          attendee_names?: string[] | null
          demo_observations?: string | null
          pain_points?: string | null
          next_steps?: string | null
          demo_rating?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          demo_id?: string
          org_id?: string
          demo_date?: string
          demo_time?: string | null
          sales_poc?: string
          demo_status?: 'scheduled' | 'completed' | 'cancelled'
          attendee_names?: string[] | null
          demo_observations?: string | null
          pain_points?: string | null
          next_steps?: string | null
          demo_rating?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      meeting_notes: {
        Row: {
          meeting_id: string
          org_id: string
          meeting_type: string
          meeting_date: string
          duration_minutes: number | null
          conducted_by: string
          attendees: string[] | null
          meeting_summary: string | null
          pain_points_discussed: string | null
          objections_raised: string | null
          positive_signals: string | null
          action_items: Json
          next_meeting_date: string | null
          created_at: string
        }
        Insert: {
          meeting_id?: string
          org_id: string
          meeting_type: string
          meeting_date: string
          duration_minutes?: number | null
          conducted_by: string
          attendees?: string[] | null
          meeting_summary?: string | null
          pain_points_discussed?: string | null
          objections_raised?: string | null
          positive_signals?: string | null
          action_items?: Json
          next_meeting_date?: string | null
          created_at?: string
        }
        Update: {
          meeting_id?: string
          org_id?: string
          meeting_type?: string
          meeting_date?: string
          duration_minutes?: number | null
          conducted_by?: string
          attendees?: string[] | null
          meeting_summary?: string | null
          pain_points_discussed?: string | null
          objections_raised?: string | null
          positive_signals?: string | null
          action_items?: Json
          next_meeting_date?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
