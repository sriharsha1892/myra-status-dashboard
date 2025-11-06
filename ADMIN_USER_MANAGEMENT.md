# Admin User Management Dashboard

## Overview
A complete admin dashboard for managing users without needing to access the Supabase dashboard.

## Features
- ✅ View all users with email, role, created date, and last sign-in
- ✅ Add new users with email, password, and role
- ✅ Edit user roles
- ✅ Delete users (with self-deletion protection)
- ✅ Admin-only access (requires Admin role to access)

## Access
**URL:** http://localhost:3000/support/admin/users

**Requirements:**
- Must be logged in as a user with Admin role
- Non-admin users will be redirected to the dashboard

## Available Roles
- **Admin** - Full access to all features including user management
- **Team** - Support team members who handle tickets
- **AM** - Account Managers who can submit tickets

## Usage

### Accessing the Dashboard
1. Login to the support system at http://localhost:3000/support/login
2. Navigate to http://localhost:3000/support/admin/users
3. If you're not an Admin, you'll be redirected back to the dashboard

### Adding a New User
1. Click the "Add User" button in the header
2. Fill in the form:
   - **Email:** User's email address
   - **Password:** Minimum 6 characters
   - **Role:** Select Admin, Team, or AM
3. Click "Create User"
4. The user can now login immediately with the provided credentials

### Editing a User's Role
1. Find the user in the table
2. Click "Edit Role"
3. Select the new role from the dropdown
4. Click "Update Role"

### Deleting a User
1. Find the user in the table
2. Click "Delete"
3. Confirm the deletion
4. Note: You cannot delete your own account

## Technical Details

### Files Created
- **Page Component:** `app/support/admin/users/page.tsx`
- **API Route:** `app/api/admin/users/route.ts`

### API Endpoints
- **GET /api/admin/users** - List all users
- **POST /api/admin/users** - Create new user
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "role": "Team"
  }
  ```
- **PATCH /api/admin/users** - Update user role
  ```json
  {
    "userId": "uuid",
    "role": "Admin"
  }
  ```
- **DELETE /api/admin/users** - Delete user
  ```json
  {
    "userId": "uuid"
  }
  ```

### Authentication
The API uses Supabase Admin API (service role key) to manage users. The service role key is configured in `.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Security Features
1. **Admin-only access:** All API endpoints verify the user has Admin role
2. **Self-deletion protection:** Admins cannot delete their own account
3. **Auto-confirmed emails:** New users are automatically email-confirmed
4. **Role validation:** Only valid roles (Admin, Team, AM) are accepted
5. **Password validation:** Minimum 6 characters required

## Navigation
The admin users page includes a navigation bar with:
- **Dashboard** - Returns to the support dashboard
- **Users** - Current page (highlighted)

## UI/UX Features
- Clean, minimal Linear/Asana-inspired design
- Dark mode support
- Mobile-responsive table
- Toast notifications for all actions
- Loading states during API calls
- Confirmation dialog for deletions
- Proper error handling with user-friendly messages

## Integration with Existing System
The user management system integrates seamlessly with the existing support ticketing system:
- Roles control access to different features
- Users created here can immediately login at `/support/login`
- The role is stored in Supabase `user_metadata` and checked by RLS policies

## Next Steps
To add user management to the main navigation:
1. Edit `app/support/dashboard/page.tsx`
2. Add a "Users" button in the header (for Admin users only):
```tsx
{role === 'Admin' && (
  <Button
    variant="ghost"
    size="sm"
    onClick={() => router.push('/support/admin/users')}
  >
    Users
  </Button>
)}
```

## Troubleshooting

### "Unauthorized - Admin access required"
- Ensure you're logged in as a user with Admin role
- Check that your role is properly set in Supabase user metadata

### "Failed to fetch users"
- Verify the service role key is set in `.env.local`
- Check that Supabase Admin API is accessible
- Review the browser console and server logs for errors

### User creation fails
- Ensure password is at least 6 characters
- Verify the email format is valid
- Check if the email already exists in the system
