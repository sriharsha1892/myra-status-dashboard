# Account Manager Onboarding Tracker

Use this checklist to track who has been onboarded to myRA AI.

## Account Managers to Onboard

| Name | Email | Password Sent | Logged In | Trained | Notes |
|------|-------|---------------|-----------|---------|-------|
| Satish Boini | satish.boini@mordorintelligence.com | [ ] | [ ] | [ ] | Manages 9 orgs |
| Kartheek | kartheek@mordorintelligence.com | [ ] | [ ] | [ ] | Manages 8 orgs |
| Sudeshana | sudeshana@mordorintelligence.com | [ ] | [ ] | [ ] | Manages 4 orgs |
| Satyanath | satyanath@mordorintelligence.com | [ ] | [ ] | [ ] | Manages 4 orgs |
| Krati | krati@mordorintelligence.com | [ ] | [ ] | [ ] | Manages 3 orgs |
| Kirandeep Kaur | kirandeep.kaur@mordorintelligence.com | [ ] | [ ] | [ ] | Manages 2 orgs |
| Nikita | nikita@mordorintelligence.com | [ ] | [ ] | [ ] | Manages 2 orgs |
| Rupak Dalapathi | rupak.dalapathi@mordorintelligence.com | [ ] | [ ] | [ ] | Manages 2 orgs |

## Onboarding Steps per User

For each account manager:

1. **Send Main Onboarding Email** (ONBOARDING_EMAIL.md)
   - Use the fun, self-deprecating version
   - Mention their assigned org count
   - Set expectations

2. **Generate Password**
   - Use strong password generator: `openssl rand -base64 12`
   - Don't reuse passwords across users
   - Store securely (password manager)

3. **Send Credentials Email**
   - Send separately from main email (security)
   - Use template from ONBOARDING_EMAIL.md
   - Remind them to change password on first login

4. **Share Quick Reference**
   - Attach QUICK_REFERENCE.md
   - Or share as link/PDF

5. **Follow Up**
   - Check if they logged in (after 24-48 hours)
   - Answer any questions
   - Collect feedback

6. **Verify Access**
   - Confirm they can see their assigned orgs
   - Verify they can add notes/activities

## Quick Email Templates

### Main Onboarding Email
```
Subject: 🎉 Welcome to myRA AI - Your New Trial Management Dashboard (I Built It, So Lower Your Expectations)

[Use content from ONBOARDING_EMAIL.md]
```

### Credentials Email
```
Subject: 🔐 Your myRA AI Login Credentials

Hey [NAME]! 👋

Login URL: https://myra-status-dashboard.vercel.app/support/login

Email: [their-email]@mordorintelligence.com
Password: [GENERATED_PASSWORD]

Important: Change your password on first login!
```

## Password Generation

**Via Admin UI (Recommended):**
1. Go to `/support/admin/users`
2. Click "Add New User"
3. Enter user details
4. Click "Generate Password" button
5. Password format: `FirstName@myRA2025!ABC`
6. Automatically includes "myRA" for brand consistency!

**Manual Generation (if needed):**
```bash
# Generate secure password (Mac/Linux)
openssl rand -base64 12

# Or use: https://passwordsgenerator.net/
# Settings: 16 chars, mixed case, numbers, symbols
# TIP: Add "myRA" to the password for posterity
```

**Note:** Including "myRA" in passwords is recommended for brand consistency (the login page will playfully suggest it!).

## Common Questions

**Q: "I can't see any trial orgs!"**
A: Refresh page, verify role assignment, check org assignments

**Q: "Why can't I assign orgs?"**
A: Only admins can assign. Account managers (viewers) can only manage assigned orgs.

**Q: "Where do I change my password?"**
A: Bottom left → Profile → Change Password

## Timeline

- **Week 1:** Send emails, monitor logins
- **Week 2:** Follow up, answer questions
- **Week 3:** Address issues, update docs
- **Week 4:** Full adoption

---

_Track progress by checking boxes in the table above as each step is completed._
