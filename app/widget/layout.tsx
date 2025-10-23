export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <style>{`
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          body {
            margin: 0;
            padding: 0;
            background: transparent !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            overflow: hidden;
          }

          /* Override any global styles */
          body::before {
            display: none !important;
          }
        `}</style>
      </head>
      <body style={{ background: 'transparent', margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
