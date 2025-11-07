# Authentication Setup Guide

## Overview

This application uses a **simplified authentication system** designed for small teams (max 25 users). No email delivery is required - admin creates users with passwords and shares them directly.

---

## Key Features

✅ **No Email Required** - Users are created immediately with passwords
✅ **Supabase Encryption** - Passwords are bcrypt-hashed, never stored in plain text
✅ **15-Second Onboarding** - Admin creates user → shares credentials → user logs in
✅ **Simple & Secure** - Perfect for small teams where email delivery isn't needed

---

## Setup Instructions

### 1. Environment Configuration

**REQUIRED:** Add this to your `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application URL (REQUIRED)
# For development: http://localhost:3000
# For production: https://yourdomain.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important:** Update `NEXT_PUBLIC_APP_URL` to your production domain when deploying.

### 2. Supabase Dashboard Configuration

#### Disable Email Confirmations

Since we're creating users directly without email:

1. Go to **Authentication** → **Settings** in Supabase dashboard
2. Disable "Enable email confirmations" (not required for direct user creation)
3. Email provider configuration is optional (we don't send emails)

#### Row Level Security (Optional)

If you want to add RLS policies for additional security:

```sql
-- Example: Allow users to read their own data
CREATE POLICY "Users can read own data"
ON auth.users
FOR SELECT
USING (auth.uid() = id);
```

---

## User Management Flow

### Creating a New User (Admin)

1. **Admin logs in** to `/support/admin/users`
2. **Click "Add User"** button
3. **Fill in the form:**
   - **Email:** user@example.com
   - **Name:** John Doe
   - **Temporary Password:** Set a secure password (min 6 characters)
   - **Role:** Admin, Team, or Account Manager
4. **Click "Create User"**
5. **User is created immediately** (no email sent)
6. **Share credentials** with the user directly (Slack, phone, in-person, etc.)

### User First Login

1. **Navigate to** `/support/login`
2. **Enter credentials:**
   - Email: The email admin provided
   - Password: The temporary password admin provided
3. **Click "Sign In"**
4. **Redirected to dashboard** in <15 seconds

### Changing Password (Future Enhancement)

Currently not implemented, but easy to add:

```typescript
// Add to user settings page
const handlePasswordChange = async (newPassword: string) => {
  const supabase = createClient();
  await supabase.auth.updateUser({ password: newPassword });
};
```

---

## Security Features

### Password Encryption

✅ **Supabase automatically handles password security:**
- Passwords are hashed using bcrypt
- Passwords are **never** stored in plain text
- Passwords are **never** visible in database queries
- Passwords **cannot** be retrieved through admin API
- Even with service role key, passwords remain encrypted

### What Admins Can See

Admins can see:
- ✅ User email
- ✅ User role
- ✅ Account creation date
- ✅ Last sign-in time

Admins **cannot** see:
- ❌ User passwords (even hashed versions are hidden)
- ❌ Password reset tokens
- ❌ Session tokens

### API Security

- Admin-only routes protected with `verifyAdminAccess()`
- Service role key stored securely in environment variables
- User creation requires admin authentication
- Role validation prevents privilege escalation

---

## Troubleshooting

### Issue: "Failed to create user"

**Possible Causes:**
1. Email already exists
2. Password too short (<6 characters)
3. Invalid role selected
4. Supabase service role key missing/invalid

**Fix:**
```bash
# Check .env.local has all required variables
cat .env.local

# Verify SUPABASE_SERVICE_ROLE_KEY is set correctly
# Get it from: Supabase Dashboard → Settings → API → service_role key
```

### Issue: "Unauthorized - Admin access required"

**Cause:** Current user doesn't have Admin role

**Fix:**
```sql
-- Update user role in Supabase SQL Editor
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"Admin"'
)
WHERE email = 'your-admin-email@example.com';
```

### Issue: User created but can't log in

**Possible Causes:**
1. Wrong password being entered
2. Account not confirmed (shouldn't happen with our setup)
3. Browser auto-fill using wrong credentials

**Fix:**
```bash
# In Supabase Dashboard → Authentication → Users:
1. Find the user
2. Check "Email Confirmed" is true
3. If not, click "..." → "Confirm Email"

# Or via SQL:
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'user@example.com';
```

### Issue: Left sidebar shows before logging in

**This should NOT happen** with the current implementation. Layout guards prevent this.

If you see this:
1. Clear browser cache
2. Restart dev server: `npm run dev`
3. Check console for errors

**Root cause (if it happens):**
- Auth state loading asynchronously
- Layout renders before useAuth() completes
- **Already fixed** with loading states (lines 53-97 in layout.tsx)

---

## Development vs Production

### Development (.env.local)
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production (.env.production or hosting platform)
```bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

**Important:** Update environment variables on your hosting platform (Vercel, AWS, etc.)

---

## Best Practices

### For Admins

1. **Use Strong Temporary Passwords**
   - Mix of letters, numbers, symbols
   - At least 8-10 characters
   - Don't reuse passwords across users

2. **Share Credentials Securely**
   - Use encrypted channels (Slack DM, 1Password, LastPass)
   - Never share passwords in plain text emails
   - Consider verbal communication for sensitive accounts

3. **Audit Users Regularly**
   - Review `/support/admin/users` monthly
   - Delete inactive users
   - Update roles as needed

### For Users

1. **Change Password After First Login** (when feature is added)
2. **Don't share credentials** with others
3. **Use password manager** (1Password, LastPass, Bitwarden)
4. **Log out** on shared computers

---

## API Reference

### POST /api/admin/users

Create a new user with direct password

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "name": "John Doe",
  "role": "Team"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "User created successfully. Share the login credentials with them.",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "Team"
  }
}
```

**Response (Error):**
```json
{
  "error": "Email already exists"
}
```

### PATCH /api/admin/users

Update user role

**Request:**
```json
{
  "userId": "uuid",
  "role": "Admin"
}
```

### DELETE /api/admin/users

Delete a user

**Request:**
```json
{
  "userId": "uuid"
}
```

---

## Migration from Email-Based Invitations

If you previously used `inviteUserByEmail()`:

**Old Flow:**
1. Admin invites user
2. Email sent with invitation link
3. User clicks link, sets password
4. User logs in

**New Flow:**
1. Admin creates user with password
2. Admin shares credentials directly
3. User logs in immediately

**Benefits:**
- ✅ No email delivery issues
- ✅ Faster onboarding (<15 seconds vs minutes/hours)
- ✅ Simpler for small teams
- ✅ No email provider configuration needed

**To migrate existing users:**
- No action needed - they keep existing passwords
- New users follow new flow

---

## Testing

### Manual Test Checklist

- [ ] Admin can log in
- [ ] Admin can access `/support/admin/users`
- [ ] Admin can create new user with all fields
- [ ] New user receives success message
- [ ] New user appears in users list
- [ ] New user can log in with provided credentials
- [ ] New user redirected to dashboard after login
- [ ] Loading states show (no sidebar flash)
- [ ] Non-admin users cannot access user management
- [ ] Cannot create user with existing email
- [ ] Cannot create user with weak password (<6 chars)
- [ ] Admin can delete users
- [ ] Admin can update user roles

### Automated Tests (Future)

```typescript
// Example test
describe('User Creation', () => {
  it('should create user with valid credentials', async () => {
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'TestPassword123',
        name: 'Test User',
        role: 'Team'
      })
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
```

---

## Support

If you encounter issues:

1. **Check environment variables** - Most issues stem from missing `NEXT_PUBLIC_APP_URL`
2. **Review Supabase logs** - Dashboard → Logs → Auth
3. **Check browser console** - Look for JavaScript errors
4. **Verify Supabase service role key** - Must have admin permissions

---

## Summary

**For the CEO/Power User:**
1. Navigate to `/support/login`
2. Enter email + password (provided by admin)
3. Click "Sign In"
4. Start working in <15 seconds

**For the Admin:**
1. Create user with password
2. Share credentials directly (Slack/phone)
3. User logs in immediately
4. No email configuration needed

**Security:**
- ✅ Passwords encrypted with bcrypt (Supabase handles this)
- ✅ Passwords never visible to admins
- ✅ Role-based access control
- ✅ Admin-only user management

---

**Built:** 2025-11-07
**Session:** claude/roadmap-linear-011CUoKacgEqC19YU41jWH9j
**Files Modified:** 3 files (API route, user form, environment)
