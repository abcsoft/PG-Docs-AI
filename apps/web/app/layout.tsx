import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  // Resolves relative OG/canonical URLs site-wide.
  metadataBase: new URL(siteUrl),
  title: {
    default: "PG Docs AI — AI document intelligence with citations",
    template: "%s · PG Docs AI",
  },
  description:
    "PG Docs AI is a multi-tenant AI document intelligence workspace: upload contracts, proposals and policies, then get Claude-powered answers, summaries, structured extractions, comparisons and reports with verifiable page-level citations.",
  keywords: [
    "AI document intelligence",
    "RAG workspace",
    "document Q&A with citations",
    "Claude document analysis",
    "contract analysis",
    "document comparison",
    "extraction templates",
  ],
  openGraph: {
    type: "website",
    siteName: "PG Docs AI",
    title: "PG Docs AI — AI document intelligence with citations",
    description:
      "Upload contracts, proposals and policies. Get Claude-powered answers, summaries, extractions, comparisons and reports — every claim cited to the page it came from.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "PG Docs AI — AI document intelligence with citations",
    description:
      "Answers, summaries, extractions and reports from your documents — with verifiable page-level citations.",
  },
  alternates: { canonical: "/" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Font variables live on <html>: globals.css applies font-family at the
    // html level, and CSS variables don't resolve upward from <body>.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
