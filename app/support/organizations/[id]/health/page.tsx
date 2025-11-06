'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import CustomerHealthCard from '@/components/support/CustomerHealthCard';
import { analyzeOrganizationHealth, type HealthAnalysis } from '@/lib/health-scoring';
import toast from 'react-hot-toast';

interface Organization {
  id: string;
  name: string;
  status: 'trial' | 'paid' | 'cancelled';
  trial_end_date?: string | null;
  created_at: string;
  last_activity?: string | null;
  account_manager?: string | null;
}

interface Ticket {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
}

interface ActivityLog {
  date: string;
  login_count: number;
  actions_count: number;
}

export default function OrganizationHealthPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [healthAnalysis, setHealthAnalysis] = useState<HealthAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [orgId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

      if (orgError) throw orgError;
      setOrganization(orgData);

      // Fetch tickets
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('id, title, priority, status, created_at, updated_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (ticketsError) throw ticketsError;
      setTickets(ticketsData || []);

      // Generate mock activity logs (in production, fetch from database)
      const mockActivityLogs = generateMockActivityLogs();
      setActivityLogs(mockActivityLogs);

      // Mock features used (in production, track actual feature usage)
      const mockFeaturesUsed = ['dashboard', 'tickets', 'reports'];

      // Analyze health
      const analysis = analyzeOrganizationHealth(
        orgData,
        ticketsData || [],
        mockActivityLogs,
        mockFeaturesUsed,
        orgData.last_outreach,
        orgData.last_response
      );

      setHealthAnalysis(analysis);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load organization health data');
    } finally {
      setLoading(false);
    }
  };

  const generateMockActivityLogs = (): ActivityLog[] => {
    const logs: ActivityLog[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // Simulate declining activity (for demo)
      let login_count = 0;
      if (i > 3) {
        login_count = Math.floor(Math.random() * 8) + 2; // 2-10 logins
      } else if (i > 1) {
        login_count = Math.floor(Math.random() * 3); // 0-3 logins
      }
      // Last 2 days: 0 logins (at-risk pattern)

      logs.push({
        date: date.toISOString().split('T')[0],
        login_count,
        actions_count: login_count * 3,
      });
    }

    return logs;
  };

  const handleCallCustomer = () => {
    // In production, integrate with phone system or open dialer
    window.open(`tel:+1234567890`, '_blank');
    toast.success('Opening dialer...');
  };

  const handleSendEmail = () => {
    // In production, open email composer with template
    router.push(`/support/organizations/${orgId}/email`);
  };

  const handleExtendTrial = async () => {
    if (!organization) return;

    try {
      const currentEndDate = new Date(organization.trial_end_date || new Date());
      currentEndDate.setDate(currentEndDate.getDate() + 7);

      const { error } = await supabase
        .from('organizations')
        .update({ trial_end_date: currentEndDate.toISOString() })
        .eq('id', orgId);

      if (error) throw error;

      toast.success('Trial extended by 7 days');
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error extending trial:', error);
      toast.error('Failed to extend trial');
    }
  };

  const handleScheduleMeeting = () => {
    // In production, integrate with calendar system
    router.push(`/support/organizations/${orgId}/schedule`);
  };

  const handleAssignTicket = (ticketId: string) => {
    router.push(`/support/tickets/${ticketId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!organization || !healthAnalysis) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Organization not found</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-4 text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
        >
          ← Back to organizations
        </button>

        {/* Health Card */}
        <CustomerHealthCard
          orgId={organization.id}
          orgName={organization.name}
          orgStatus={organization.status}
          accountManager={organization.account_manager}
          healthAnalysis={healthAnalysis}
          recentTickets={tickets}
          activityLogs={activityLogs}
          lastOutreach={organization.last_outreach}
          lastResponse={organization.last_response}
          onCallCustomer={handleCallCustomer}
          onSendEmail={handleSendEmail}
          onExtendTrial={organization.status === 'trial' ? handleExtendTrial : undefined}
          onScheduleMeeting={handleScheduleMeeting}
          onAssignTicket={handleAssignTicket}
        />

        {/* Additional Context (Optional) */}
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">About This Health Score</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              <strong>Engagement (35%):</strong> Based on login frequency and feature usage
              compared to expected patterns for {organization.status} organizations.
            </p>
            <p>
              <strong>Support (30%):</strong> Calculated from open ticket count, priority levels,
              and response times. Critical tickets heavily impact this score.
            </p>
            <p>
              <strong>Feature Usage (20%):</strong> Measures adoption of available features. Low
              usage may indicate unclear value or onboarding gaps.
            </p>
            <p>
              <strong>Responsiveness (15%):</strong> Tracks customer response to outreach attempts.
              Non-responsive customers are at higher churn risk.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
