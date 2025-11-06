'use client';

import { useState, useEffect } from 'react';
import { Sparkles, ExternalLink, TrendingUp, Zap } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: 'llm' | 'b2b-ai' | 'enterprise' | 'research';
  url: string;
  date: string;
  source: string;
  impact: 'high' | 'medium' | 'low';
}

/**
 * Immaculately designed LLM & B2B AI News Feed
 *
 * Features:
 * - Curated AI/LLM news relevant to B2B SaaS
 * - Beautiful gradient design
 * - Category badges with semantic colors
 * - Impact indicators for high-priority news
 * - Smooth hover interactions
 * - Clean, scannable layout
 */
export default function AINewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch curated AI news
    // In production, replace with API call to news aggregator
    fetchAINews();
  }, []);

  const fetchAINews = async () => {
    setLoading(true);

    // Curated news items - replace with API fetch in production
    // Example API: https://newsapi.org/v2/everything?q=LLM+OR+GPT&sortBy=publishedAt
    const curatedNews: NewsItem[] = [
      {
        id: '1',
        title: 'Claude 3.5 Sonnet achieves breakthrough in coding tasks',
        summary: 'Anthropic\'s latest model shows significant improvements in software engineering benchmarks, with 49% success rate on SWE-bench.',
        category: 'llm',
        url: 'https://www.anthropic.com/news/claude-3-5-sonnet',
        date: new Date().toISOString(),
        source: 'Anthropic',
        impact: 'high'
      },
      {
        id: '2',
        title: 'OpenAI introduces GPT-4 Turbo with 128K context window',
        summary: 'New model offers 3x cost reduction and improved instruction following for enterprise applications.',
        category: 'llm',
        url: 'https://openai.com/blog/new-models-and-developer-products-announced-at-devday',
        date: new Date(Date.now() - 86400000).toISOString(),
        source: 'OpenAI',
        impact: 'high'
      },
      {
        id: '3',
        title: 'B2B SaaS companies see 40% efficiency gain with AI assistants',
        summary: 'McKinsey report finds customer success teams reduce response times from hours to minutes using LLM-powered tools.',
        category: 'b2b-ai',
        url: 'https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights/the-economic-potential-of-generative-ai-the-next-productivity-frontier',
        date: new Date(Date.now() - 172800000).toISOString(),
        source: 'McKinsey',
        impact: 'high'
      },
      {
        id: '4',
        title: 'Mistral releases 7B parameter model rivaling GPT-3.5',
        summary: 'Open-source model demonstrates competitive performance while being cost-effective for enterprise deployment.',
        category: 'llm',
        url: 'https://mistral.ai/news/announcing-mistral-7b/',
        date: new Date(Date.now() - 259200000).toISOString(),
        source: 'Mistral AI',
        impact: 'medium'
      },
      {
        id: '5',
        title: 'Enterprise AI adoption reaches 72% in Fortune 500',
        summary: 'Gartner survey shows rapid integration of generative AI into core business processes across industries.',
        category: 'enterprise',
        url: 'https://www.gartner.com/en/newsroom/press-releases/2023-10-11-gartner-survey-finds-55-percent-of-organizations-are-in-piloting-or-production-mode-with-generative-ai',
        date: new Date(Date.now() - 345600000).toISOString(),
        source: 'Gartner',
        impact: 'medium'
      }
    ];

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    setNews(curatedNews);
    setLoading(false);
  };

  const getCategoryColor = (category: NewsItem['category']) => {
    switch (category) {
      case 'llm':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'b2b-ai':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'enterprise':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'research':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getCategoryLabel = (category: NewsItem['category']) => {
    switch (category) {
      case 'llm':
        return 'LLM';
      case 'b2b-ai':
        return 'B2B AI';
      case 'enterprise':
        return 'Enterprise';
      case 'research':
        return 'Research';
      default:
        return category;
    }
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
  };

  if (loading) {
    return (
      <div className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" strokeWidth={1.5} />
          </div>
          <h2 className="text-sm font-semibold text-slate-900">AI & LLM Updates</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-xl border border-slate-200 p-6 overflow-hidden">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">AI & LLM Updates</h2>
              <p className="text-xs text-slate-500">Latest from the AI frontier</p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-white/60 backdrop-blur-sm rounded-full border border-slate-200/50">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-slate-600 font-medium">Live</span>
          </div>
        </div>

        {/* News Items */}
        <div className="space-y-3">
          {news.slice(0, 4).map((item, index) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block relative bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-slate-200/50 hover:border-blue-300 hover:shadow-md transition-all duration-200"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Impact indicator */}
              {item.impact === 'high' && (
                <div className="absolute top-3 right-3">
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded">
                    <TrendingUp className="w-3 h-3 text-amber-600" strokeWidth={2} />
                    <span className="text-xs text-amber-700 font-medium">High Impact</span>
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="pr-20">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${getCategoryColor(item.category)}`}>
                    {getCategoryLabel(item.category)}
                  </span>
                  <span className="text-xs text-slate-500">{getRelativeTime(item.date)}</span>
                </div>

                <h3 className="text-sm font-semibold text-slate-900 mb-1.5 group-hover:text-blue-600 transition-colors duration-200 leading-snug">
                  {item.title}
                </h3>

                <p className="text-xs text-slate-600 mb-2.5 leading-relaxed line-clamp-2">
                  {item.summary}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">{item.source}</span>
                  <div className="flex items-center gap-1 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="text-xs font-medium">Read more</span>
                    <ExternalLink className="w-3 h-3" strokeWidth={2} />
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* View More Link */}
        <button
          onClick={() => window.open('https://news.ycombinator.com/news', '_blank')}
          className="mt-4 w-full py-2.5 px-4 bg-white/60 backdrop-blur-sm hover:bg-white border border-slate-200/50 hover:border-blue-300 rounded-lg text-sm text-slate-700 hover:text-blue-600 font-medium transition-all duration-200 flex items-center justify-center gap-2 group"
        >
          <Zap className="w-4 h-4 group-hover:text-blue-600 transition-colors duration-200" strokeWidth={1.5} />
          <span>Browse more AI news</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
