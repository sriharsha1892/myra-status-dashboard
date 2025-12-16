// Industry pattern matching for unknown companies
// When a company isn't in our database, we try to infer industry from name patterns

import { Industry, INDUSTRY_CONFIG } from './companies';

interface PatternRule {
  keywords: string[];
  industry: Industry;
  weight: number; // Higher weight = stronger signal
}

// Pattern rules for inferring industry from company name
const PATTERN_RULES: PatternRule[] = [
  // Pharma & Life Sciences
  {
    keywords: ['pharma', 'pharmaceutical', 'therapeutics', 'biosciences', 'biotech', 'biopharma', 'oncology', 'genomics', 'medicines', 'drug', 'clinical'],
    industry: 'pharma',
    weight: 10,
  },
  {
    keywords: ['bio', 'life sciences', 'diagnostics', 'medical devices'],
    industry: 'pharma',
    weight: 5,
  },

  // Financial Services
  {
    keywords: ['capital', 'asset management', 'investment', 'securities', 'wealth', 'private equity', 'venture', 'hedge fund', 'holdings'],
    industry: 'financial',
    weight: 10,
  },
  {
    keywords: ['bank', 'banking', 'financial', 'insurance', 'credit', 'advisors', 'advisory', 'partners lp', 'fund'],
    industry: 'financial',
    weight: 8,
  },

  // Technology
  {
    keywords: ['software', 'technology', 'technologies', 'tech', 'digital', 'cloud', 'data', 'ai', 'artificial intelligence', 'machine learning', 'analytics', 'platform', 'saas'],
    industry: 'technology',
    weight: 10,
  },
  {
    keywords: ['systems', 'solutions', 'labs', 'computing', 'cyber', 'semiconductor', 'automation'],
    industry: 'technology',
    weight: 5,
  },

  // Manufacturing
  {
    keywords: ['manufacturing', 'industrial', 'machinery', 'equipment', 'precision', 'fabrication', 'foundry'],
    industry: 'manufacturing',
    weight: 10,
  },
  {
    keywords: ['engineering', 'materials', 'components', 'products'],
    industry: 'manufacturing',
    weight: 3,
  },

  // Consumer Goods
  {
    keywords: ['consumer', 'brands', 'foods', 'beverages', 'cosmetics', 'beauty', 'apparel', 'fashion', 'personal care'],
    industry: 'consumer',
    weight: 10,
  },
  {
    keywords: ['home', 'lifestyle', 'wellness', 'nutrition'],
    industry: 'consumer',
    weight: 5,
  },

  // Energy
  {
    keywords: ['energy', 'oil', 'gas', 'petroleum', 'power', 'utilities', 'renewable', 'solar', 'wind', 'nuclear'],
    industry: 'energy',
    weight: 10,
  },
  {
    keywords: ['resources', 'fuel', 'mining'],
    industry: 'energy',
    weight: 5,
  },

  // Healthcare
  {
    keywords: ['healthcare', 'health care', 'hospital', 'medical', 'clinical', 'patient', 'care', 'health services'],
    industry: 'healthcare',
    weight: 10,
  },
  {
    keywords: ['wellness', 'dental', 'vision', 'pharmacy'],
    industry: 'healthcare',
    weight: 5,
  },

  // Retail
  {
    keywords: ['retail', 'stores', 'shop', 'mart', 'market', 'depot', 'outlet', 'wholesale'],
    industry: 'retail',
    weight: 10,
  },
  {
    keywords: ['commerce', 'e-commerce', 'marketplace'],
    industry: 'retail',
    weight: 5,
  },

  // Telecom
  {
    keywords: ['telecom', 'telecommunications', 'wireless', 'mobile', 'communications', 'network', 'broadband'],
    industry: 'telecom',
    weight: 10,
  },

  // Automotive
  {
    keywords: ['automotive', 'auto', 'motors', 'vehicles', 'car', 'truck', 'mobility'],
    industry: 'automotive',
    weight: 10,
  },

  // Aerospace
  {
    keywords: ['aerospace', 'aviation', 'aircraft', 'defense', 'space', 'satellite'],
    industry: 'aerospace',
    weight: 10,
  },

  // Chemicals
  {
    keywords: ['chemical', 'chemicals', 'materials', 'polymers', 'plastics', 'coatings'],
    industry: 'chemicals',
    weight: 10,
  },

  // Logistics
  {
    keywords: ['logistics', 'freight', 'shipping', 'transport', 'supply chain', 'delivery', 'express'],
    industry: 'logistics',
    weight: 10,
  },

  // Media
  {
    keywords: ['media', 'entertainment', 'broadcasting', 'studios', 'content', 'publishing', 'news'],
    industry: 'media',
    weight: 10,
  },
  {
    keywords: ['streaming', 'gaming', 'film', 'music'],
    industry: 'media',
    weight: 5,
  },

  // Consulting
  {
    keywords: ['consulting', 'consultants', 'advisory', 'services', 'management consulting', 'professional services'],
    industry: 'consulting',
    weight: 10,
  },
  {
    keywords: ['strategy', 'research', 'intelligence'],
    industry: 'consulting',
    weight: 3,
  },
];

// Common suffixes to strip for better matching
const COMPANY_SUFFIXES = [
  'inc', 'inc.', 'incorporated',
  'corp', 'corp.', 'corporation',
  'llc', 'l.l.c.',
  'ltd', 'ltd.', 'limited',
  'plc', 'p.l.c.',
  'ag', 'sa', 'nv', 'se',
  'co', 'co.', 'company',
  'group', 'holdings',
  'international', 'global',
];

/**
 * Infer industry from company name using pattern matching
 */
export function inferIndustry(companyName: string): Industry {
  const normalizedName = companyName.toLowerCase().trim();

  // Strip common suffixes
  let cleanName = normalizedName;
  for (const suffix of COMPANY_SUFFIXES) {
    const suffixPattern = new RegExp(`\\s+${suffix}\\s*$`, 'i');
    cleanName = cleanName.replace(suffixPattern, '');
  }

  // Score each industry based on keyword matches
  const scores: Record<Industry, number> = {} as Record<Industry, number>;

  for (const rule of PATTERN_RULES) {
    for (const keyword of rule.keywords) {
      if (cleanName.includes(keyword.toLowerCase())) {
        scores[rule.industry] = (scores[rule.industry] || 0) + rule.weight;
      }
    }
  }

  // Find industry with highest score
  let bestIndustry: Industry = 'enterprise';
  let bestScore = 0;

  for (const [industry, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestIndustry = industry as Industry;
    }
  }

  return bestIndustry;
}

/**
 * Get display name for industry
 */
export function getIndustryName(industry: Industry): string {
  return INDUSTRY_CONFIG[industry]?.name || 'Enterprise';
}

/**
 * Get accent color gradient for industry
 */
export function getIndustryAccent(industry: Industry): string {
  return INDUSTRY_CONFIG[industry]?.accent || 'from-violet-500 to-indigo-500';
}

/**
 * Get emphasis text for industry (what myRA helps with)
 */
export function getIndustryEmphasis(industry: Industry): string {
  return INDUSTRY_CONFIG[industry]?.emphasis || 'market intelligence, competitive dynamics, and growth strategy';
}

/**
 * Create a company object for an unknown company
 */
export function createUnknownCompany(name: string) {
  const industry = inferIndustry(name);

  return {
    name: name.trim(),
    aliases: [],
    industry,
    revenueTier: 'enterprise' as const,
    headquarters: '',
    employeeRange: '',
    isKnown: false,
  };
}
