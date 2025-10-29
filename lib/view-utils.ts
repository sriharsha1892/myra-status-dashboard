import { Provider } from './types';

/**
 * Gets the appropriate display name for a provider based on view mode
 * @param provider The provider object
 * @param isAdminView Whether to show admin-facing names
 * @returns The appropriate display name
 */
export function getProviderDisplayName(provider: Provider, isAdminView: boolean): string {
  return isAdminView ? provider.displayName : provider.userFacingName;
}

/**
 * Determines if sensitive information should be shown (models, regions, etc.)
 * @param isAdminView Whether admin view is active
 * @returns Whether to show sensitive details
 */
export function shouldShowSensitiveInfo(isAdminView: boolean): boolean {
  return isAdminView;
}
