// Static AI & LLM news data for trial organizations
// Updated periodically by internal team
// No external API calls or database dependencies

export type AINewsItem = {
  org_id: string;
  org_aliases?: string[]; // Alternative names/identifiers
  headline: string;
  summary: string;
  source_url: string;
  date: string; // ISO format
  category: 'partnership' | 'internal_ai_use' | 'executive_hire' | 'product_launch' | 'research' | 'other';
  internal_note?: string; // Pitch angle for account managers
};

export const AI_NEWS_DATA: AINewsItem[] = [
  // Sample entries for testing
  {
    org_id: 'acme-corp',
    org_aliases: ['Acme Corporation', 'ACME'],
    headline: 'Acme Partners with OpenAI for Customer Service Automation',
    summary: 'Acme announced a strategic partnership with OpenAI to deploy GPT-4 powered chatbots across their customer service operations, expected to reduce response times by 60%.',
    source_url: 'https://example.com/acme-openai-partnership',
    date: '2025-01-05',
    category: 'partnership',
    internal_note: 'Pitch angle: They\'re already investing in AI ops — myRA can complement their workflow automation journey.',
  },
  {
    org_id: 'acme-corp',
    org_aliases: ['Acme Corporation', 'ACME'],
    headline: 'Acme Hires Former Google AI Lead as VP of Engineering',
    summary: 'The company brought on Dr. Sarah Chen from Google Brain to lead their machine learning initiatives and scale their AI infrastructure team.',
    source_url: 'https://example.com/acme-hires-ai-vp',
    date: '2024-12-18',
    category: 'executive_hire',
    internal_note: 'Signal: Building internal AI capability. May need tools to coordinate cross-functional AI projects.',
  },
  {
    org_id: 'globex-industries',
    org_aliases: ['Globex', 'Globex Corp'],
    headline: 'Globex Launches AI-Powered Supply Chain Optimization Tool',
    summary: 'Internal teams developed a machine learning platform that predicts demand fluctuations with 85% accuracy, now being piloted across three distribution centers.',
    source_url: 'https://example.com/globex-supply-chain-ai',
    date: '2025-01-02',
    category: 'product_launch',
    internal_note: 'Pitch angle: Internal AI innovation shows tech-forward culture. Perfect fit for myRA\'s data-driven workflow tools.',
  },
  {
    org_id: 'globex-industries',
    org_aliases: ['Globex', 'Globex Corp'],
    headline: 'Globex Partners with Anthropic for Document Processing',
    summary: 'The company is piloting Claude AI for automated contract review and compliance checking across their legal department.',
    source_url: 'https://example.com/globex-anthropic',
    date: '2024-12-10',
    category: 'partnership',
  },
  {
    org_id: 'initech-solutions',
    org_aliases: ['Initech', 'Initech Inc'],
    headline: 'Initech Deploys GitHub Copilot Across Engineering Teams',
    summary: 'The engineering organization rolled out AI-assisted coding tools to 200+ developers, reporting 30% productivity gains in initial trials.',
    source_url: 'https://example.com/initech-copilot',
    date: '2024-12-28',
    category: 'internal_ai_use',
    internal_note: 'Already seeing AI productivity wins. Position myRA as the next layer for workflow automation.',
  },
  {
    org_id: 'vandelay-industries',
    org_aliases: ['Vandelay', 'Vandelay Import/Export'],
    headline: 'Vandelay Invests $5M in Internal AI Research Lab',
    summary: 'The company established a dedicated AI research division focused on logistics optimization and predictive analytics, hiring 15 ML researchers.',
    source_url: 'https://example.com/vandelay-ai-lab',
    date: '2025-01-08',
    category: 'research',
    internal_note: 'Major AI investment. High intent. Great timing for myRA pitch.',
  },
  {
    org_id: 'vandelay-industries',
    org_aliases: ['Vandelay', 'Vandelay Import/Export'],
    headline: 'Vandelay Tests LLM-Powered Market Analysis Tools',
    summary: 'The strategy team is experimenting with large language models to automate competitive intelligence gathering and market trend analysis.',
    source_url: 'https://example.com/vandelay-llm-analysis',
    date: '2024-11-20',
    category: 'internal_ai_use',
  },
  {
    org_id: 'umbrella-corp',
    org_aliases: ['Umbrella Corporation', 'Umbrella'],
    headline: 'Umbrella Corp Partners with Microsoft for Azure AI Integration',
    summary: 'Multi-year agreement to leverage Azure OpenAI Service across enterprise applications, starting with HR and finance automation.',
    source_url: 'https://example.com/umbrella-microsoft-ai',
    date: '2024-12-15',
    category: 'partnership',
    internal_note: 'Enterprise AI adoption underway. Perfect moment to introduce myRA for workflow orchestration.',
  },
];

// Empty state messages (rotated randomly)
export const EMPTY_STATE_MESSAGES = [
  "Quiet week in AI land — maybe they're training something big.",
  "No fresh AI updates here yet. Sometimes silence means stealth mode.",
  "All calm on the AI front. Keep an ear out during your next catch-up.",
  "No LLM partnerships spotted this month — timing might just be on your side.",
  "They've been quiet about AI lately, but others in their sector are moving fast.",
];

// Sector-level insights (optional, shown in empty state)
export const SECTOR_INSIGHTS = [
  "AI hiring in packaging up 9% this quarter",
  "Manufacturing sector AI spend increased 15% YoY",
  "Enterprise LLM adoption reached 43% in Q4 2024",
  "Supply chain AI investments doubled in past 6 months",
  "82% of Fortune 500 now running AI pilots internally",
];

// Helper function to get news for an organization
export function getAINewsForOrg(orgId: string, orgName?: string): AINewsItem[] {
  const normalizedId = orgId.toLowerCase();
  const normalizedName = orgName?.toLowerCase();

  const items = AI_NEWS_DATA.filter(item => {
    // Match by org_id
    if (item.org_id === normalizedId) return true;

    // Match by org name or aliases
    if (normalizedName) {
      if (item.org_aliases?.some(alias => alias.toLowerCase().includes(normalizedName))) return true;
      if (normalizedName.includes(item.org_id)) return true;
    }

    return false;
  });

  // Sort by date descending (newest first)
  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Helper to get a random empty state message
export function getRandomEmptyMessage(): string {
  return EMPTY_STATE_MESSAGES[Math.floor(Math.random() * EMPTY_STATE_MESSAGES.length)];
}

// Helper to get a random sector insight
export function getRandomSectorInsight(): string {
  return SECTOR_INSIGHTS[Math.floor(Math.random() * SECTOR_INSIGHTS.length)];
}
