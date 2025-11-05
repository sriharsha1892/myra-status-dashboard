'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  separator?: React.ReactNode;
}

/**
 * Breadcrumb navigation component with automatic path detection
 *
 * Usage:
 * // Automatic mode (generates from URL path):
 * <Breadcrumbs />
 *
 * // Manual mode (custom items):
 * <Breadcrumbs items={[
 *   { label: 'Dashboard', href: '/support/dashboard' },
 *   { label: 'Trials', href: '/support/trials' },
 *   { label: 'Acme Corp' }
 * ]} />
 */
export default function Breadcrumbs({ items, separator }: BreadcrumbsProps) {
  const pathname = usePathname();

  // Generate breadcrumbs from pathname if items not provided
  const breadcrumbItems = items || generateBreadcrumbsFromPath(pathname);

  if (breadcrumbItems.length === 0) return null;

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600">
      {/* Home icon */}
      <Link
        href="/support/dashboard"
        className="hover:text-gray-900 transition-colors"
        title="Dashboard"
      >
        <Home className="w-4 h-4" />
      </Link>

      {/* Breadcrumb items */}
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;

        return (
          <div key={index} className="flex items-center space-x-2">
            {/* Separator */}
            {separator || <ChevronRight className="w-4 h-4 text-gray-400" />}

            {/* Breadcrumb link or text */}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-gray-900 transition-colors font-medium"
              >
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-gray-900 font-semibold' : 'font-medium'}>
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/**
 * Generate breadcrumbs from URL pathname
 */
function generateBreadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  if (!pathname || pathname === '/') return [];

  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  // Remove 'support' from path since it's implicit
  const cleanSegments = segments[0] === 'support' ? segments.slice(1) : segments;

  let currentPath = '/support';

  cleanSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;

    // Don't link the last segment (current page)
    const isLast = index === cleanSegments.length - 1;

    // Format segment label
    let label = formatSegmentLabel(segment, index, cleanSegments);

    // Skip UUIDs and numeric IDs in display
    if (isUUID(segment) || /^\d+$/.test(segment)) {
      // For org/ticket IDs, fetch the name (you can enhance this with actual data)
      label = 'Details';
    }

    breadcrumbs.push({
      label,
      href: isLast ? undefined : currentPath,
    });
  });

  return breadcrumbs;
}

/**
 * Format segment label for display
 */
function formatSegmentLabel(segment: string, index: number, allSegments: string[]): string {
  // Special cases
  const labelMap: Record<string, string> = {
    'trials': 'Trial Organizations',
    'tickets': 'Support Tickets',
    'dashboard': 'Dashboard',
    'settings': 'Settings',
    'reports': 'Reports',
    'new': 'New',
    'edit': 'Edit',
    'users': 'Users',
    'demos': 'Demos',
    'meetings': 'Meetings',
    'features': 'Feature Requests',
    'followups': 'Follow-ups',
    'activitylog': 'Activity Log',
  };

  if (labelMap[segment]) {
    return labelMap[segment];
  }

  // Check if it's a UUID or ID
  if (isUUID(segment) || /^\d+$/.test(segment)) {
    // Try to determine what this ID refers to based on previous segment
    const previousSegment = index > 0 ? allSegments[index - 1] : '';
    if (previousSegment === 'trials') return 'Organization Details';
    if (previousSegment === 'tickets') return 'Ticket Details';
    if (previousSegment === 'users') return 'User Details';
    return 'Details';
  }

  // Default: Capitalize first letter and replace dashes/underscores with spaces
  return segment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Check if string is a UUID
 */
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Breadcrumbs with custom styling
 */
export function BreadcrumbsWithBackground({ items }: { items?: BreadcrumbItem[] }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/60 px-8 py-3">
      <Breadcrumbs items={items} />
    </div>
  );
}
