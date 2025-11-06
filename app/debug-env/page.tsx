'use client';

export default function DebugEnvPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKeyExists = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <div style={{ padding: '40px', fontFamily: 'monospace' }}>
      <h1>🔍 Environment Variables Debug</h1>

      <div style={{ marginTop: '20px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>Supabase Configuration:</h2>

        <p><strong>NEXT_PUBLIC_SUPABASE_URL:</strong></p>
        <p style={{
          padding: '10px',
          background: supabaseUrl ? '#d4edda' : '#f8d7da',
          color: supabaseUrl ? '#155724' : '#721c24',
          borderRadius: '4px'
        }}>
          {supabaseUrl || '❌ NOT SET'}
        </p>

        <p style={{ marginTop: '20px' }}><strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong></p>
        <p style={{
          padding: '10px',
          background: supabaseKeyExists ? '#d4edda' : '#f8d7da',
          color: supabaseKeyExists ? '#155724' : '#721c24',
          borderRadius: '4px'
        }}>
          {supabaseKeyExists ? '✅ SET (hidden for security)' : '❌ NOT SET'}
        </p>
      </div>

      <div style={{ marginTop: '30px', padding: '20px', background: '#fff3cd', borderRadius: '8px' }}>
        <h3>⚠️ If variables show "NOT SET":</h3>
        <ol>
          <li>Go to Vercel Dashboard → Settings → Environment Variables</li>
          <li>Verify variables are set for <strong>Preview</strong> environment</li>
          <li>Click "Redeploy" after adding/updating variables</li>
        </ol>
      </div>

      <div style={{ marginTop: '20px' }}>
        <p><strong>Deployment Info:</strong></p>
        <p>Build ID: {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local'}</p>
        <p>Environment: {process.env.NEXT_PUBLIC_VERCEL_ENV || 'local'}</p>
      </div>
    </div>
  );
}
