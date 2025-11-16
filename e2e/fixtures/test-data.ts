/**
 * Test Data Fixtures
 *
 * Reusable test data for forms and notes E2E testing
 */

// ============================================================================
// TRIAL ORGANIZATION TEST DATA
// ============================================================================

export const testTrialOrg = {
  name: 'E2E Test Organization - Forms & Notes',
  domain: 'TMT',
  org_url: 'https://e2e-test-org.example.com',
  logo_url: 'https://logo.clearbit.com/e2e-test-org.example.com',
  trial_start_date: new Date(Date.now()).toISOString().split('T')[0],
  trial_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  sales_poc: 'Test Sales POC',
  description: 'Automated E2E test organization for forms and notes testing',
  org_lifecycle_stage: 'trial_active'
};

// ============================================================================
// USER TEST DATA
// ============================================================================

export const testUsers = [
  {
    name: 'John Champion',
    email: 'john.champion@e2e-test.com',
    role: 'Product Manager',
    current_stage: 'active',
    freshsales_url: 'https://freshsales.example.com/contacts/john-champion'
  },
  {
    name: 'Sarah Decision Maker',
    email: 'sarah.dm@e2e-test.com',
    role: 'VP Engineering',
    current_stage: 'power_user',
    freshsales_url: 'https://freshsales.example.com/contacts/sarah-dm'
  },
  {
    name: 'Mike Low Activity',
    email: 'mike.low@e2e-test.com',
    role: 'Analyst',
    current_stage: 'low_activity',
    freshsales_url: ''
  },
  {
    name: 'Emma Invited',
    email: 'emma.invited@e2e-test.com',
    role: 'Data Scientist',
    current_stage: 'invited',
    freshsales_url: ''
  }
];

// ============================================================================
// ACTIVITY TEST DATA
// ============================================================================

export const activityTestData = {
  logActivityModal: [
    {
      activity_type: 'user_logged_in',
      description: 'John Champion logged in and explored the dashboard for 15 minutes',
      observations: 'User seemed engaged, clicked through multiple sections'
    },
    {
      activity_type: 'feedback_received',
      description: 'Sarah provided positive feedback on the AI features',
      observations: 'She mentioned this is exactly what her team needs for market research'
    },
    {
      activity_type: 'trial_access_provided',
      description: 'Granted trial access to Emma Invited',
      observations: 'Sent onboarding email with getting started guide'
    },
    {
      activity_type: 'follow_up_note',
      description: 'Scheduled follow-up call for next week to discuss conversion',
      observations: 'Decision maker is interested, need to prepare pricing proposal'
    }
  ],

  userActivities: [
    {
      user: 'john.champion@e2e-test.com',
      activity_type: 'report_generated',
      title: 'Generated competitive intelligence report for automotive sector',
      description: 'John created a comprehensive 25-page report analyzing market trends'
    },
    {
      user: 'sarah.dm@e2e-test.com',
      activity_type: 'ppt_created',
      title: 'Created presentation for board meeting',
      description: 'Sarah exported data to PowerPoint for executive presentation'
    },
    {
      user: 'mike.low@e2e-test.com',
      activity_type: 'question_asked',
      title: 'Asked about data sources and methodology',
      description: 'Mike wants to understand how the AI analysis works under the hood'
    },
    {
      user: 'emma.invited@e2e-test.com',
      activity_type: 'initial_contact',
      title: 'Emma received trial invitation',
      description: 'Sent welcome email with login credentials and onboarding materials'
    }
  ],

  aiParserInput: `
User Activity Log - Nov 15, 2025

John Champion (john.champion@e2e-test.com)
- Generated market sizing report for EV batteries
- Exported data to Excel
- Spent 45 minutes exploring competitor analysis features
- Activity Type: report_generated

Very engaged user, asked great questions about data accuracy.
`.trim()
};

// ============================================================================
// SUPPORT QUERY TEST DATA
// ============================================================================

export const supportQueryTestData = [
  {
    query_type: 'security_related',
    title: 'Questions about data encryption and compliance',
    description: 'Client wants to know if we are SOC 2 compliant and how we handle sensitive data',
    query_level: 'organization' as const
  },
  {
    query_type: 'functionality_related',
    title: 'How to export custom reports with specific filters',
    description: 'Sarah needs help creating filtered exports for her weekly board updates',
    query_level: 'user' as const,
    user_email: 'sarah.dm@e2e-test.com'
  },
  {
    query_type: 'onboard_more_users',
    title: 'Bulk user onboarding for 15 team members',
    description: 'Client wants to add their entire research team. Need CSV import template.',
    query_level: 'organization' as const
  },
  {
    query_type: 'technical_guidance',
    title: 'API integration with existing CRM system',
    description: 'John asking about REST API documentation and authentication methods',
    query_level: 'user' as const,
    user_email: 'john.champion@e2e-test.com'
  }
];

// ============================================================================
// TIMELINE EVENT TEST DATA
// ============================================================================

export const timelineEventTestData = {
  quickEntryEvents: [
    {
      event_type: 'demo_call',
      title: 'Product demo with decision makers',
      description: 'Showcased AI market research features, competitive analysis, and reporting capabilities. Very positive reception.',
      sentiment: 'positive' as const,
      follow_up_required: true,
      follow_up_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    {
      event_type: 'email_sent',
      title: 'Sent pricing proposal to Sarah',
      description: 'Detailed pricing breakdown for 25-user enterprise plan with quarterly billing',
      sentiment: 'neutral' as const,
      follow_up_required: false
    },
    {
      event_type: 'feature_request',
      title: 'Request for custom industry taxonomy',
      description: 'Client wants to add custom categories specific to automotive aftermarket sector',
      sentiment: 'neutral' as const,
      follow_up_required: true,
      follow_up_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    {
      event_type: 'trial_milestone',
      title: 'Trial halfway point reached',
      description: 'Client is 7 days into their 14-day trial. Strong engagement metrics.',
      sentiment: 'positive' as const,
      follow_up_required: false
    },
    {
      event_type: 'support_ticket',
      title: 'Login issues reported by Emma',
      description: 'Password reset needed. Resolved within 10 minutes.',
      sentiment: 'negative' as const,
      follow_up_required: false
    }
  ],

  templateNames: [
    'Demo Call',
    'Support Email',
    'Feature Request',
    'Bug Report',
    'Follow-up',
    'General Note'
  ],

  bulkImportText: `
Subject: RE: Trial feedback and next steps
From: john.champion@e2e-test.com
Date: November 15, 2025

Hi Team,

Quick update from today's session:

1. Demo Call (Nov 15, 9:00 AM)
Showed the product to our executive team. Everyone was impressed, especially with the AI-powered competitive analysis. Sarah from VP Engineering wants to move forward quickly.

2. Feature Discussion
They asked about custom integrations with our existing data warehouse. Said they'd need Snowflake connector before going live. High priority for them.

3. Security Questions
CISO asked about SOC 2 compliance. Sent them our security whitepaper. Waiting for their review.

4. Pricing Proposal
Discussed enterprise pricing for 25 users. They have budget approved for Q1. Looking at quarterly billing.

5. Next Steps
- Follow-up call scheduled for Nov 20
- Will send contract draft after security review
- Training session planned for their research team

This is looking very positive!

Best,
John
`.trim()
};

// ============================================================================
// NOTES TEST DATA
// ============================================================================

export const notesTestData = {
  rootNotes: [
    {
      content: 'Initial trial kickoff was very successful. All stakeholders are engaged and excited about the platform capabilities.',
      note_type: 'trial_org_note',
      visibility: 'team' as const
    },
    {
      content: 'Internal note: This client has high conversion potential. VP Engineering is champion. Focus on enterprise features in follow-ups.',
      note_type: 'general_note',
      visibility: 'internal' as const
    },
    {
      content: 'Private reminder: Need to check with product team about Snowflake connector timeline before next call.',
      note_type: 'follow_up_note',
      visibility: 'private' as const
    },
    {
      content: 'Feature proposal from client: They want industry-specific templates for automotive sector analysis. Could be valuable for other clients too.',
      note_type: 'feature_proposal',
      visibility: 'team' as const
    }
  ],

  replies: [
    {
      parent: 'Initial trial kickoff was very successful',
      content: 'Great to hear! What specific features did they find most valuable?'
    },
    {
      parent: 'Internal note: This client has high conversion potential',
      content: 'Agreed. I will prepare custom enterprise pricing proposal for 25-50 users.'
    },
    {
      parent: 'Feature proposal from client',
      content: 'This is interesting. Let me loop in @ProductTeam to evaluate feasibility and timeline.'
    }
  ],

  mentions: [
    {
      content: 'Hey @admin can you review the security documentation before I send it to the client?',
      mentionUser: 'admin'
    },
    {
      content: '@Satish this trial looks very promising. Client is asking about case studies in automotive sector.',
      mentionUser: 'Satish'
    }
  ],

  editScenarios: [
    {
      original: 'Initial trial kickoff was very successful',
      updated: 'Initial trial kickoff was extremely successful. All stakeholders are engaged and excited about the platform capabilities. UPDATE: Received confirmation they want to move forward with enterprise plan.'
    }
  ]
};

// ============================================================================
// CROSS-TAB TEST SCENARIOS
// ============================================================================

export const crossTabTestData = {
  completeWorkflow: {
    // Step 1: Add user in People tab
    newUser: {
      name: 'Tom Cross-Tab',
      email: 'tom.crosstab@e2e-test.com',
      role: 'Research Director',
      current_stage: 'active'
    },

    // Step 2: Log activity for that user (Overview tab)
    activity: {
      activity_type: 'user_logged_in',
      description: 'Tom Cross-Tab accessed the platform for the first time and completed onboarding',
      observations: 'User explored all major features, very tech-savvy'
    },

    // Step 3: Add timeline event mentioning the user (Timeline tab)
    timelineEvent: {
      event_type: 'onboarding_complete',
      title: 'Tom completed full platform onboarding',
      description: 'Tom Cross-Tab finished the guided onboarding tour and generated his first report',
      sentiment: 'positive' as const
    },

    // Step 4: Add support query for the user (Support tab)
    supportQuery: {
      query_type: 'technical_guidance',
      title: 'Tom needs help with advanced filters',
      description: 'Tom asking about combining multiple filter criteria for complex queries',
      query_level: 'user' as const
    },

    // Step 5: Add note linking everything (All tabs)
    note: {
      content: 'Excellent new user Tom Cross-Tab. Very engaged from day 1. Already generated 3 reports and asking advanced questions. High potential for expansion.',
      note_type: 'trial_org_note',
      visibility: 'team' as const
    }
  }
};

// ============================================================================
// VALIDATION TEST DATA
// ============================================================================

export const validationTestData = {
  invalidInputs: {
    email: [
      'invalid-email',
      'missing@domain',
      '@nodomain.com',
      'spaces in email@test.com'
    ],
    url: [
      'not-a-url',
      'htp://wrong-protocol.com',
      'missing-protocol.com'
    ],
    dateRange: {
      trial_start_date: '2025-11-20',
      trial_end_date: '2025-11-15' // End before start
    }
  },

  requiredFields: {
    logActivity: ['activity_type', 'description'],
    userActivity: ['user_id', 'activity_type', 'title'],
    supportQuery: ['query_type', 'title'],
    timelineEvent: ['event_type', 'title', 'sentiment'],
    note: ['content']
  },

  characterLimits: {
    title: 'A'.repeat(300), // Very long title
    description: 'B'.repeat(5000) // Very long description
  }
};

// ============================================================================
// PERMISSION TEST DATA
// ============================================================================

export const permissionTestData = {
  accountManager: {
    email: 'am@myra.ai',
    password: 'am123',
    assignedOrgs: ['E2E Test Organization - Forms & Notes']
  },

  admin: {
    email: 'admin@myra.ai',
    password: 'admin123',
    canAccessAll: true
  },

  restrictedActions: [
    'Edit other AM activity',
    'View private notes from others',
    'Access unassigned organizations',
    'Delete other users\' timeline events'
  ]
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function generateTestEmail(prefix: string): string {
  const timestamp = Date.now();
  return `${prefix}-${timestamp}@e2e-test.com`;
}

export function generateTestOrgName(suffix: string = ''): string {
  const timestamp = Date.now();
  return `E2E Test Org ${suffix} ${timestamp}`.trim();
}

export function getFutureDate(daysAhead: number): string {
  const future = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  return future.toISOString().split('T')[0];
}

export function getPastDate(daysAgo: number): string {
  const past = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return past.toISOString().split('T')[0];
}

export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}
