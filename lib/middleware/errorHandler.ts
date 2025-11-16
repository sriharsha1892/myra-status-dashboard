/**
 * Global Error Handler Middleware
 * Catches and handles all API errors gracefully
 */

import { NextRequest, NextResponse } from 'next/server';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Wraps an API route handler with error handling
 */
export function withErrorHandler<T>(
  handler: (req: NextRequest) => Promise<NextResponse<T>>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Parse JSON body with error handling
      let body = null;
      const contentType = req.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        try {
          const text = await req.text();
          if (text) {
            body = JSON.parse(text);
          }
        } catch (jsonError) {
          return NextResponse.json(
            {
              error: 'Invalid JSON',
              message: 'Request body contains malformed JSON',
              details: 'Please ensure your request body is valid JSON format'
            },
            { status: 400 }
          );
        }
      }

      // Create a new request with parsed body
      const newReq = new Request(req.url, {
        method: req.method,
        headers: req.headers,
        body: body ? JSON.stringify(body) : null,
      }) as NextRequest;

      // Call the actual handler
      return await handler(newReq);

    } catch (error) {
      return handleError(error);
    }
  };
}

/**
 * Handles errors and returns appropriate responses
 */
export function handleError(error: unknown): NextResponse {
  console.error('API Error:', error);

  // Type check and extract error details
  if (error instanceof SyntaxError) {
    return NextResponse.json(
      {
        error: 'Invalid JSON',
        message: 'Request body contains malformed JSON',
        details: error.message
      },
      { status: 400 }
    );
  }

  if (error && typeof error === 'object' && 'statusCode' in error) {
    const apiError = error as ApiError;
    return NextResponse.json(
      {
        error: apiError.name || 'API Error',
        message: apiError.message,
        code: apiError.code
      },
      { status: apiError.statusCode || 500 }
    );
  }

  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes('JSON')) {
      return NextResponse.json(
        {
          error: 'Invalid JSON',
          message: 'Request body contains malformed JSON'
        },
        { status: 400 }
      );
    }

    if (error.message.includes('required') || error.message.includes('missing')) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: error.message
        },
        { status: 422 }
      );
    }

    if (error.message.includes('not found')) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message: error.message
        },
        { status: 404 }
      );
    }

    if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: error.message
        },
        { status: 401 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }

  // Unknown error type
  return NextResponse.json(
    {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    },
    { status: 500 }
  );
}

/**
 * Validates request body has required fields
 */
export function validateRequired(body: any, fields: string[]): void {
  const missing = fields.filter(field => !body[field]);

  if (missing.length > 0) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`) as ApiError;
    error.statusCode = 422;
    throw error;
  }
}

/**
 * Creates a validation error
 */
export function createValidationError(message: string): ApiError {
  const error = new Error(message) as ApiError;
  error.statusCode = 422;
  error.code = 'VALIDATION_ERROR';
  return error;
}

/**
 * Creates a not found error
 */
export function createNotFoundError(resource: string): ApiError {
  const error = new Error(`${resource} not found`) as ApiError;
  error.statusCode = 404;
  error.code = 'NOT_FOUND';
  return error;
}
