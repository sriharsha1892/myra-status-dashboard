import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { feedback_type, subject, message, user_email } = body;

    const emailContent = `
New Feedback Submission

Type: ${feedback_type}
From: ${user_email || 'Anonymous'}
Subject: ${subject}

Message:
${message}

---
Submitted at: ${new Date().toISOString()}
    `.trim();

    // Send email using Resend
    if (process.env.RESEND_API_KEY) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'MyRA AI <onboarding@resend.dev>', // Use your verified domain
            to: ['sriharsha@mordorintelligence.com'],
            subject: `[MyRA Feedback] ${feedback_type}: ${subject}`,
            text: emailContent,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error('Resend API error:', result);
          throw new Error('Failed to send email via Resend');
        }

        console.log('Email sent via Resend:', result);
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Don't fail the whole request if email fails
      }
    } else {
      console.log('RESEND_API_KEY not set. Email not sent. Feedback:', emailContent);
    }

    return NextResponse.json({ success: true, message: 'Feedback submitted successfully' });
  } catch (error: any) {
    console.error('Error processing feedback:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
