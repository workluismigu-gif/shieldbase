import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShieldBase — SOC 2 Compliance in 30 Days",
  description: "AI-powered SOC 2 compliance for startups. Get audit-ready in 30 days for a flat $5,000. Not $50,000+.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
