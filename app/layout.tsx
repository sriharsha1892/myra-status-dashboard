import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "myRA AI - System Status",
  description: "Real-time status monitoring for myRA AI infrastructure and LLM providers",
  keywords: ["myRA AI", "status", "monitoring", "OpenAI", "Anthropic", "Claude", "Gemini", "Exa", "Brave"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
