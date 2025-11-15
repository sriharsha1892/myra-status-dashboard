import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/errorHandler';

export async function POST(request: NextRequest) {
  try {
    const { text, available_users } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Text is required to parse activity',
          suggestion: 'Please provide activity text to extract information from'
        },
        { status: 400 }
      );
    }

    // Simple rule-based parser
    const lowerText = text.toLowerCase();

    // Detect activity type based on keywords
    let activity_type = 'other';
    if (lowerText.includes('login') || lowerText.includes('logged in') || lowerText.includes('signed in')) {
      activity_type = 'login';
    } else if (lowerText.includes('question') || lowerText.includes('asked') || lowerText.includes('query')) {
      activity_type = 'question_asked';
    } else if (lowerText.includes('report') || lowerText.includes('generated') || lowerText.includes('analysis')) {
      activity_type = 'report_generated';
    } else if (lowerText.includes('ppt') || lowerText.includes('presentation') || lowerText.includes('slides')) {
      activity_type = 'ppt_created';
    } else if (lowerText.includes('pause') || lowerText.includes('issue') || lowerText.includes('error')) {
      activity_type = 'agent_paused';
    } else if (lowerText.includes('hi') || lowerText.includes('hello') || lowerText.includes('first') || lowerText.includes('initial')) {
      activity_type = 'initial_contact';
    } else if (lowerText.includes('feature') || lowerText.includes('tried') || lowerText.includes('used')) {
      activity_type = 'feature_used';
    } else if (lowerText.includes('feedback') || lowerText.includes('comment') || lowerText.includes('suggestion')) {
      activity_type = 'feedback';
    }

    // Try to find user name from available users
    let user_name = '';
    let confidence = 0.5;

    if (available_users && available_users.length > 0) {
      for (const userName of available_users) {
        if (lowerText.includes(userName.toLowerCase())) {
          user_name = userName;
          confidence = 0.95;
          break;
        }
      }
    }

    // If no user found, try to extract a name from the text
    if (!user_name) {
      const nameMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
      if (nameMatch) {
        user_name = nameMatch[1];
        confidence = 0.7;
      } else {
        user_name = 'Unknown User';
        confidence = 0.3;
      }
    }

    // Generate title (first sentence or truncated text)
    let title = text.split(/[.!?]/)[0].trim();
    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }
    if (!title) {
      title = text.substring(0, 100);
    }

    // Description is the full text
    const description = text;

    const parsed = {
      user_name,
      activity_type,
      title,
      description,
      confidence
    };

    return NextResponse.json({
      success: true,
      data: parsed,
      meta: {
        confidence,
        activity_type,
        warnings: confidence < 0.7 ? ['Low confidence detection - please review carefully'] : []
      }
    });
  } catch (error: any) {
    // Use graceful error handler for user-friendly messages
    const errorDetails = getErrorMessage(error, 'api_call');

    // Log for debugging
    console.error('[Activity Parser] Error:', {
      error: error.message,
      technical: errorDetails.technical,
      stack: error.stack
    });

    return NextResponse.json(
      {
        success: false,
        error: errorDetails.message,
        suggestion: errorDetails.suggestion,
        technical: errorDetails.technical
      },
      { status: 500 }
    );
  }
}
