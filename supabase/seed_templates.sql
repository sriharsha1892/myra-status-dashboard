-- Seed default ticket templates
-- Run this in Supabase SQL Editor after migration 004 is complete

INSERT INTO ticket_templates (name, category, priority, description_template, custom_fields, usage_count)
VALUES 
  (
    'Can''t download PPT',
    'Tool Functioning',
    'High',
    'User from {{organization}} is unable to download PowerPoint presentations.

User Details:
- Name: {{user_name}}
- Email: {{user_email}}

Issue: The download button for PowerPoint exports is not working or the downloaded file is corrupted.

Steps tried:
1. Refreshed the page
2. Tried different browsers
3. Cleared cache and cookies

Expected behavior: User should be able to download presentations as .pptx files without issues.',
    '{"affected_feature": "PowerPoint Export", "browser": "Chrome", "error_type": "Download Failure"}',
    0
  ),
  (
    'API timeout',
    'Performance',
    'Critical',
    'API timeout issue reported by {{organization}}.

Reporter: {{user_name}} ({{user_email}})

Issue Description:
The API is timing out when making requests to the myRA AI service. This is affecting multiple users and blocking critical workflows.

Impact:
- Users cannot access key features
- Workflows are interrupted
- Data sync is failing

Timeline:
- Issue started: [To be filled]
- Frequency: [To be filled]

Environment:
- Endpoint: [To be filled]
- Request type: [To be filled]',
    '{"severity": "System-wide", "endpoint": "/api/v1/", "response_time": "30s+", "impact_level": "High"}',
    0
  ),
  (
    'Account access issue',
    'Security',
    'High',
    'Account access issue for {{organization}}.

Affected User:
- Name: {{user_name}}
- Email: {{user_email}}

Issue Type:
[ ] Cannot log in
[ ] Password reset not working
[ ] Account locked
[ ] Permission issues
[ ] SSO/Authentication error

Description:
User is unable to access their account. Please investigate and restore access as soon as possible.

Additional context: [To be filled]

Security verification completed: [Yes/No]',
    '{"account_type": "Standard", "authentication_method": "Email/Password", "last_successful_login": null}',
    0
  ),
  (
    'Feature request',
    'Feature Request',
    'Medium',
    'Feature request from {{organization}}.

Requested by: {{user_name}} ({{user_email}})

Feature Description:
[Provide detailed description of the requested feature]

Use Case:
[Explain how this feature would be used and what problem it solves]

Expected Benefit:
[Describe the value this feature would bring to users]

Priority Justification:
[Explain why this feature is important]

Additional Notes:
[Any other relevant information]',
    '{"request_type": "Enhancement", "estimated_users_affected": "Multiple", "has_workaround": "No"}',
    0
  )
ON CONFLICT DO NOTHING;

-- Verify templates were inserted
SELECT name, category, priority FROM ticket_templates ORDER BY category, name;
