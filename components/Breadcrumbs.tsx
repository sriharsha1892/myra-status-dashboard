'use client';

import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const router = useRouter();

  if (items.length === 0) return null;

  return (
    <nav className="flex items-center gap-2 text-sm mb-4">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
            )}
            {isLast ? (
              <span className="text-slate-900 font-medium">{item.label}</span>
            ) : (
              <button
                onClick={() => item.href && router.push(item.href)}
                className="text-slate-500 hover:text-slate-700 transition-colors"
              >
                {item.label}
              </button>
            )}
          </div>
        );
      })}
    </nav>
  );
}
