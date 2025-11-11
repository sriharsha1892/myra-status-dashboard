import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, context = 'internal' } = await request.json();

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Fetch relevant discussions
    const { data: discussions, error: discussionsError } = await supabase
      .from('resource_discussions')
      .select(`
        id,
        content,
        discussion_type,
        created_at,
        author_id,
        is_pinned
      `)
      .is('parent_discussion_id', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (discussionsError) {
      console.error('Error fetching discussions:', discussionsError);
      return NextResponse.json({ error: 'Failed to fetch discussions' }, { status: 500 });
    }

    // Fetch relevant documents
    const { data: documents, error: documentsError } = await supabase
      .from('document_library')
      .select('id, title, description, file_url, visibility, created_at')
      .eq('visibility', context)
      .order('created_at', { ascending: false })
      .limit(20);

    if (documentsError) {
      console.error('Error fetching documents:', documentsError);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    // Parse and prepare context
    const discussionContext = (discussions || []).map((d: any) => {
      try {
        const parsed = typeof d.content === 'string' ? JSON.parse(d.content) : d.content;
        return {
          type: d.discussion_type,
          title: parsed.title || parsed.question || 'Untitled',
          content: parsed.content || parsed.details || '',
          tags: parsed.tags || [],
          is_pinned: d.is_pinned,
          created_at: d.created_at
        };
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    const documentContext = (documents || []).map((doc: any) => ({
      title: doc.title,
      description: doc.description || '',
      url: doc.file_url,
      created_at: doc.created_at
    }));

    // Simple relevance scoring (keyword matching)
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter((w: string) => w.length > 2);

    const scoredDiscussions = discussionContext
      .map((d: any) => {
        let score = 0;
        const text = `${d.title} ${d.content} ${d.tags.join(' ')}`.toLowerCase();

        queryWords.forEach((word: string) => {
          if (text.includes(word)) score += 1;
        });

        if (d.is_pinned) score += 5; // Boost pinned content

        return { ...d, score };
      })
      .filter((d: any) => d.score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 5);

    const scoredDocuments = documentContext
      .map((doc: any) => {
        let score = 0;
        const text = `${doc.title} ${doc.description}`.toLowerCase();

        queryWords.forEach((word: string) => {
          if (text.includes(word)) score += 1;
        });

        return { ...doc, score };
      })
      .filter((doc: any) => doc.score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 3);

    // Generate AI response
    const response = generateAIResponse(query, scoredDiscussions, scoredDocuments);

    return NextResponse.json({
      answer: response,
      sources: {
        discussions: scoredDiscussions,
        documents: scoredDocuments
      }
    });

  } catch (error: any) {
    console.error('AI Search error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateAIResponse(
  query: string,
  discussions: any[],
  documents: any[]
): string {
  if (discussions.length === 0 && documents.length === 0) {
    return `I couldn't find any resources specifically about "${query}". Try:\n\n• Using different keywords\n• Browsing the discussions and documents tabs\n• Starting a new discussion to ask the team`;
  }

  let response = `Based on your search for "${query}", here's what I found:\n\n`;

  if (discussions.length > 0) {
    response += `**📝 Related Discussions:**\n`;
    discussions.slice(0, 3).forEach((d: any, idx: number) => {
      response += `${idx + 1}. **${d.title}** (${d.type})${d.is_pinned ? ' 📌' : ''}\n   ${d.content.substring(0, 150)}${d.content.length > 150 ? '...' : ''}\n\n`;
    });
  }

  if (documents.length > 0) {
    response += `\n**📄 Related Documents:**\n`;
    documents.forEach((doc: any, idx: number) => {
      response += `${idx + 1}. **${doc.title}**\n   ${doc.description || 'No description'}\n\n`;
    });
  }

  response += `\n💡 **Tip:** Click on any result to view the full content, or refine your search for more specific results.`;

  return response;
}
