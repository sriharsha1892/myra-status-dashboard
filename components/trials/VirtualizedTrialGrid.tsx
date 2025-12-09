'use client';

import { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TrialCard } from './TrialCard';
import type { OrgWithUsers } from '@/hooks/useTrialOrganizations';

interface AccountManager {
  user_id: string;
  email: string;
  full_name: string | null;
}

interface VirtualizedTrialGridProps {
  organizations: OrgWithUsers[];
  selectedOrgIds: Set<string>;
  onSelect: (orgId: string) => void;
  accountManagers: AccountManager[];
  formatStage: (stage: string) => string;
  onActivityLogged?: () => void;
  onPrefetch?: (orgId: string) => void;
}

// Card height estimate including gap (320px min-height + 16px gap)
const CARD_HEIGHT = 336;
const GAP = 16;

export function VirtualizedTrialGrid({
  organizations,
  selectedOrgIds,
  onSelect,
  accountManagers,
  formatStage,
  onActivityLogged,
  onPrefetch,
}: VirtualizedTrialGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(3);

  // Calculate columns based on container width
  useEffect(() => {
    const updateColumns = () => {
      if (!parentRef.current) return;
      const width = parentRef.current.offsetWidth;
      // Match Tailwind breakpoints: sm:640, md:768, lg:1024
      if (width >= 1024) {
        setColumns(3); // lg:grid-cols-3
      } else if (width >= 768) {
        setColumns(2); // md:grid-cols-2
      } else {
        setColumns(1); // grid-cols-1
      }
    };

    updateColumns();
    const resizeObserver = new ResizeObserver(updateColumns);
    if (parentRef.current) {
      resizeObserver.observe(parentRef.current);
    }
    return () => resizeObserver.disconnect();
  }, []);

  // Group organizations into rows based on current column count
  const rows = useMemo(() => {
    const result: OrgWithUsers[][] = [];
    for (let i = 0; i < organizations.length; i += columns) {
      result.push(organizations.slice(i, i + columns));
    }
    return result;
  }, [organizations, columns]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_HEIGHT,
    overscan: 2, // Render 2 extra rows above and below viewport
  });

  const virtualRows = virtualizer.getVirtualItems();

  // For small datasets, use regular grid (more reliable)
  if (organizations.length <= 12) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {organizations.map((org) => (
          <TrialCard
            key={org.org_id}
            org={org}
            isSelected={selectedOrgIds.has(org.org_id)}
            onSelect={onSelect}
            accountManagers={accountManagers}
            formatStage={formatStage}
            onActivityLogged={onActivityLogged}
            onPrefetch={onPrefetch}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-400px)] min-h-[500px] overflow-auto"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualRows.map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                }}
              >
                {row.map((org) => (
                  <TrialCard
                    key={org.org_id}
                    org={org}
                    isSelected={selectedOrgIds.has(org.org_id)}
                    onSelect={onSelect}
                    accountManagers={accountManagers}
                    formatStage={formatStage}
                    onActivityLogged={onActivityLogged}
                    onPrefetch={onPrefetch}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default VirtualizedTrialGrid;
