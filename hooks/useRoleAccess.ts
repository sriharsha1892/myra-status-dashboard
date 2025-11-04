import { useAuth } from './useAuth';

interface RolePermissions {
  canViewAllOrgs: boolean;
  canViewAnalytics: boolean;
  canManageRoadmap: boolean;
  canCreateQueries: boolean;
  canLogActivity: boolean;
  canEditTrialDates: boolean;
  canMarkDealOutcome: boolean;
}

export function useRoleAccess(): RolePermissions {
  const { user, role } = useAuth();

  // Default: no permissions
  let permissions: RolePermissions = {
    canViewAllOrgs: false,
    canViewAnalytics: false,
    canManageRoadmap: false,
    canCreateQueries: false,
    canLogActivity: false,
    canEditTrialDates: false,
    canMarkDealOutcome: false,
  };

  if (!user || !role) {
    return permissions;
  }

  // Admin: full access
  if (role === 'admin') {
    permissions = {
      canViewAllOrgs: true,
      canViewAnalytics: true,
      canManageRoadmap: true,
      canCreateQueries: true,
      canLogActivity: true,
      canEditTrialDates: true,
      canMarkDealOutcome: true,
    };
  }
  // Account Manager: can log activities, create queries, edit own org info
  else if (role === 'account_manager') {
    permissions = {
      canViewAllOrgs: false, // Only sees their own
      canViewAnalytics: false, // Limited to their orgs
      canManageRoadmap: false,
      canCreateQueries: true,
      canLogActivity: true,
      canEditTrialDates: false,
      canMarkDealOutcome: true, // Can mark deals as won/lost
    };
  }
  // Sales Manager: can see all orgs and analytics
  else if (role === 'sales_manager') {
    permissions = {
      canViewAllOrgs: true,
      canViewAnalytics: true,
      canManageRoadmap: false,
      canCreateQueries: false,
      canLogActivity: false,
      canEditTrialDates: false,
      canMarkDealOutcome: false,
    };
  }
  // Product/Admin: can manage roadmaps
  else if (role === 'product') {
    permissions = {
      canViewAllOrgs: true,
      canViewAnalytics: true,
      canManageRoadmap: true,
      canCreateQueries: true,
      canLogActivity: true,
      canEditTrialDates: true,
      canMarkDealOutcome: false,
    };
  }

  return permissions;
}

export function useCanViewOrganization(orgAccountManagerId: string | null): boolean {
  const { user, role } = useAuth();

  if (!user || !role) {
    return false;
  }

  // Admins and Sales Managers can view all orgs
  if (role === 'admin' || role === 'sales_manager' || role === 'product') {
    return true;
  }

  // Account Managers can only view their own orgs
  if (role === 'account_manager') {
    return orgAccountManagerId === user.id;
  }

  return false;
}
