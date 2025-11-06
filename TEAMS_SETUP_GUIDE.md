# MS Teams Integration Setup Guide

## 📋 Overview

The MS Teams integration allows you to receive ticket notifications directly in Microsoft Teams channels using rich Adaptive Cards.

## 🔧 Azure AD App Registration

### Step 1: Create App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Fill in:
   - **Name:** myRA Support Teams Integration
   - **Supported account types:** Accounts in this organizational directory only
   - **Redirect URI:** Web - `https://your-domain.com/api/teams/auth/callback`
5. Click **Register**

### Step 2: Configure API Permissions

1. Go to **API permissions**
2. Click **Add a permission** → **Microsoft Graph**
3. Select **Delegated permissions**, add:
   - `Team.ReadBasic.All`
   - `Channel.ReadBasic.All`
   - `ChannelMessage.Send`
4. Click **Grant admin consent**

### Step 3: Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Description: "Teams Integration Secret"
4. Expires: 24 months
5. Click **Add**
6. **Copy the secret value** (you won't see it again!)

### Step 4: Note Your Credentials

Copy these values to your `.env.local`:

```env
TEAMS_CLIENT_ID=your-application-client-id
TEAMS_CLIENT_SECRET=your-client-secret-value
TEAMS_TENANT_ID=your-tenant-id
TEAMS_REDIRECT_URI=https://your-domain.com/api/teams/auth/callback
```

## 🚀 Usage

### Configure in App

1. Go to `/support/settings/teams`
2. Enter your Team and Channel names
3. Select notification rules
4. Enable notifications
5. Save configuration

### Adaptive Card Examples

**New Ticket Card:**
```
🎫 New Support Ticket
─────────────────
Ticket ID: #a1b2c3d4
Organization: Acme Corp
Category: Security
Priority: High
Submitted by: John Doe

Description preview...

[View Ticket]
```

**Status Change Card:**
```
🔄 Ticket Status Updated
─────────────────
In Progress → Resolved

Ticket: #a1b2c3d4
Organization: Acme Corp

[View Ticket]
```

## 🔔 Notification Events

- ✅ New tickets created
- ✅ Status changes
- ✅ Priority changes
- ✅ New comments added
- ✅ Ticket assignments

## 📚 Resources

- [Adaptive Cards Designer](https://adaptivecards.io/designer/)
- [Microsoft Graph API Docs](https://docs.microsoft.com/en-us/graph/)
- [Teams Webhooks Guide](https://docs.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/)

---

**Note:** This is a framework implementation. Full OAuth flow requires production Azure AD setup.
