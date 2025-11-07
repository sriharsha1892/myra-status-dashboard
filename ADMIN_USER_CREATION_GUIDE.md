# 👨‍💼 Admin Guide: Creating Users

**For Platform Admins Only**

---

## Quick Create User Process (30 seconds)

### Step 1: Go to Users Page

1. Login as admin
2. Navigate to: `/support/admin/users`
3. Click **"Add User"** button

---

### Step 2: Fill Out Form

**Required Fields:**
- **Email**: User's work email (e.g., `john.doe@mordorintelligence.com`)
- **Name**: Full name (e.g., `John Doe`)
- **Temporary Password**: Something simple they can remember (e.g., `Welcome123!`)
  - ⚠️ They'll change this after first login
  - Minimum 6 characters
- **Role**: Select from dropdown
  - `Admin` - Full access
  - `Account Manager` - See only their assigned orgs
  - `Team` - Basic access

---

### Step 3: Create User

1. Click **"Create User"**
2. ✅ Success! User created instantly

---

### Step 4: Share Credentials

**Send the user** (via Slack, email, Teams, etc.):

```
Hi [Name],

Your myRA Support Portal account is ready!

Login here: https://myra-status-dashboard.vercel.app/support/login

Email: [their email]
Temporary Password: [the password you set]

Please change your password after logging in.

Questions? Let me know!
```

---

## Key Points

✅ **Instant Access**: User can login immediately (no waiting)
✅ **No Emails**: System doesn't send confirmation emails
✅ **Simple**: Share credentials directly (Slack/email/Teams)
✅ **Secure**: Passwords are encrypted, never stored in plain text
✅ **Fast**: Takes 30 seconds to create a user

---

## Password Reset (If Needed)

If a user forgets their password:

1. Go to `/support/admin/users`
2. Find the user
3. Click "Edit"
4. Set new temporary password
5. Share with user

---

## Roles Explained

### Admin
- Full platform access
- See all trial organizations
- Manage users
- Access all reports and analytics
- Bulk import features

### Account Manager
- See ONLY organizations assigned to them
- Add notes, track demos, manage tickets
- Cannot see other managers' orgs
- Cannot create users

### Team
- Basic read-only access
- View shared resources
- Limited features

---

## Troubleshooting

### User says "Invalid credentials"
1. Verify email is spelled correctly (case-sensitive)
2. Check password (no extra spaces, case-sensitive)
3. If still failing, create new temporary password

### User can't see their organizations
- Make sure they're assigned as Account Manager in the org details
- Check their role is correct

---

## Current User List

Check `/support/admin/users` to see:
- ✅ **Active** - User has logged in
- 🟡 **Pending** - User hasn't logged in yet (you should delete old pending users from broken token system)

---

## Security Notes

- **Passwords are encrypted** - Even admins can't see them
- **Service role key required** - Make sure `.env.local` has `SUPABASE_SERVICE_ROLE_KEY`
- **No email service needed** - Direct creation bypasses email confirmation
- **Perfect for small teams** - Up to 25-30 users (current system)

---

**Questions?** Contact: sriharsha@mordorintelligence.com
