# User Roles & Password Management System

## Overview

This system provides role-based access control and secure password management for organizational users. Passwords are encrypted using bcrypt and are **never exposed** to admins in the backend.

## 🔐 Security Features

### Password Encryption
- **Algorithm:** bcrypt with 12 rounds
- **Strength:** 12 rounds makes it computationally expensive to crack
- **Storage:** Only bcrypt hash is stored (never plaintext)
- **Visibility:** Admins cannot view or retrieve user passwords, even from database
- **Reset:** Temporary passwords can be generated but shown only once

### Password Requirements
Passwords must contain:
- ✅ At least 8 characters
- ✅ At least 1 uppercase letter (A-Z)
- ✅ At least 1 lowercase letter (a-z)
- ✅ At least 1 number (0-9)
- ✅ At least 1 special character (!@#$%^&* etc)

Example valid passwords:
- `Secure@Pass123`
- `MyP@ssw0rd!`
- `Test#2024Pwd`

## 👥 User Roles

### 1. **Admin** (Full Access)
- **Permissions:**
  - Create, edit, delete users
  - Manage all organizations
  - Set user passwords
  - Change user roles
  - View all data and reports
  - Access settings and configuration
- **Use Case:** System administrators, super users
- **Color:** Red badge

### 2. **Manager** (Edit & Manage)
- **Permissions:**
  - Create and edit users within their organization
  - Manage user roles (cannot create admins)
  - View all platform user data
  - Edit organization details
  - Set user passwords
- **Use Case:** Team leads, organization managers
- **Color:** Blue badge

### 3. **Analyst** (View & Report)
- **Permissions:**
  - View all reports and data
  - Export data
  - View user activities and metrics
  - Cannot edit or delete data
- **Use Case:** Data analysts, report viewers
- **Color:** Green badge

### 4. **Viewer** (Read-Only)
- **Permissions:**
  - View organization overview
  - View user list (no sensitive data)
  - Cannot edit, delete, or export
- **Use Case:** Stakeholders, observers
- **Color:** Gray badge

## 🔑 Password Management

### Setting a Password

#### Option 1: Manual Password Entry
1. Go to organization detail page → Users tab
2. Click "🔑 Password" button next to user
3. Select "Set Password" mode
4. Enter password meeting all requirements
5. Confirm password matches
6. Click "Set Password"

Password requirements shown in real-time:
- ✓ Turns green when requirement is met
- ✗ Turns red until requirement is met

#### Option 2: Auto-Generated Password
1. Click "🔑 Password" button next to user
2. Select "Auto Generate" mode
3. Click "Generate Password"
4. System creates random secure password
5. **Copy password** (you won't see it again!)
6. Click "Confirm & Set Password"
7. Share password with user securely

Generated password format: 12 random characters including uppercase, lowercase, numbers, and special characters.

### Password Reset Flow

**Important:** Admins cannot view or reset passwords for users. Options:
1. **User-initiated reset:** User uses forgotten password flow
2. **Admin-set new password:** Generate new temporary password
3. **Password expiration:** Implement in future version

## 📊 User Management UI

### Organization Users Tab

Located at: Organization Detail → Users Tab

#### Features
- **User Table** showing:
  - Name (with PRIMARY/CHAMPION badges)
  - Email
  - Job Title
  - Role (clickable dropdown)
  - Status (invited, access_enabled, active, inactive)
  - Last Login date
  - Password action button

- **Real-time Role Updates**
  - Dropdown to change role immediately
  - Automatic save
  - Toast notification on success

- **Role Descriptions**
  - Quick reference cards for all 4 roles
  - Shows permissions at a glance

## 🛡️ Database Schema

### New Fields in `trial_users` Table

```sql
-- Role-based access control
role TEXT DEFAULT 'viewer'
  CHECK (role IN ('admin', 'manager', 'analyst', 'viewer'))

-- Password management
password_hash TEXT                    -- bcrypt hash, never expose
last_password_changed_at TIMESTAMP    -- Track password age
password_reset_token TEXT             -- Temporary reset token
password_reset_expires_at TIMESTAMP   -- Token expiration (24h)

-- Indices for performance
INDEX idx_trial_users_email                  -- For login lookups
INDEX idx_trial_users_password_reset_token   -- For reset flow
```

### Never Expose

- `password_hash` - NEVER include in API responses
- `password_reset_token` - NEVER log or display
- Always use RLS policies to restrict access

## 🔄 API Integration

### Setting Password (Server-Side)

```typescript
// Use this in API routes, NEVER expose password_hash in response
import { hashPassword } from '@/lib/auth/password';

// Hash password before storing
const hash = await hashPassword(userPassword);

// Update database
await supabase
  .from('trial_users')
  .update({
    password_hash: hash,
    last_password_changed_at: new Date().toISOString(),
  })
  .eq('user_id', userId);

// NEVER return: password_hash, password_reset_token
```

### Verifying Password (Login)

```typescript
import { verifyPassword } from '@/lib/auth/password';

// Get user and their password_hash
const { data: user } = await supabase
  .from('trial_users')
  .select('user_id, password_hash, role')
  .eq('email', email)
  .single();

// Verify password
const isValid = await verifyPassword(password, user.password_hash);

if (isValid) {
  // Create session, JWT token, etc.
  // NEVER return password_hash to client
}
```

### Generating Reset Token

```typescript
import { generatePasswordResetToken } from '@/lib/auth/password';

// Generate token
const token = generatePasswordResetToken();
const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

// Store token in database
await supabase
  .from('trial_users')
  .update({
    password_reset_token: token,
    password_reset_expires_at: expiresAt,
  })
  .eq('user_id', userId);

// Send to user (via email, SMS, etc.)
// Token is shown only once - never again
```

## 📋 Audit & Compliance

### Tracked Events
- ✅ Password changed (timestamp, by whom)
- ✅ Role changes (old role → new role, timestamp)
- ✅ User created/deleted
- ✅ Last login timestamp

### NOT Tracked (For Security)
- ❌ Failed login attempts (implement separately with rate limiting)
- ❌ Password values (even hashes are sensitive)
- ❌ Password reset tokens

## 🚀 Implementation Checklist

- [x] Database schema with role and password fields
- [x] Password hashing utility (bcryptjs)
- [x] Password validation utility
- [x] Temporary password generator
- [x] SetUserPasswordModal component
- [x] OrgUsersTab component with role management
- [ ] **TODO:** Integrate OrgUsersTab into organization detail page
- [ ] **TODO:** Create login/authentication flow
- [ ] **TODO:** Add password reset endpoint
- [ ] **TODO:** Implement RLS policies on trial_users table
- [ ] **TODO:** Add password change on first login
- [ ] **TODO:** Email notifications for password resets
- [ ] **TODO:** Audit logging for compliance

## 🔍 Testing

### Manual Testing
1. Create new user
2. Set password (both manual and generated)
3. Verify password meets requirements
4. Change user role
5. Try to view password in database (should see only hash)
6. Verify password hash cannot be retrieved via API

### Security Checklist
- [ ] Passwords are bcrypt hashed (12 rounds minimum)
- [ ] Password_hash is never returned in API responses
- [ ] Role changes are logged with timestamp
- [ ] Generated passwords are shown once only
- [ ] Admin cannot view existing passwords
- [ ] Password validation enforces strong passwords
- [ ] RLS policies restrict password_hash access

## 📚 Files Reference

### New Files Created
- `/lib/auth/password.ts` - Password utilities
- `/supabase/migrations/20250103_add_user_roles_passwords.sql` - Schema migration
- `/components/SetUserPasswordModal.tsx` - Password management UI
- `/components/OrgUsersTab.tsx` - User management table
- `/USER_ROLES_AND_PASSWORDS.md` - This documentation

### Integration Required
- Integrate `OrgUsersTab` into `/app/trials/[id]/page.tsx`
- Add authentication flow using password verification
- Set up RLS policies in Supabase

## ⚠️ Important Notes

1. **Passwords are one-way encrypted** - Even system admins cannot decrypt passwords
2. **Temporary passwords are shown once** - Users must copy/save immediately
3. **No password history** - Previous passwords are overwritten
4. **Bcrypt is slow by design** - Makes brute force attacks impractical
5. **12 rounds is secure for 2024+** - Takes ~250ms to hash (intentionally slow)

## 🆘 Common Issues

### "Passwords are never visible to admins"
✅ Correct - This is by design for security

### "User forgot password"
→ Generate new temporary password and share securely

### "How to enforce password changes?"
→ Check `last_password_changed_at` timestamp on login

### "What if password reset token expires?"
→ User can't use token, must request new one

---

**Version:** 1.0
**Last Updated:** 2025-01-03
**Status:** Ready for Integration
