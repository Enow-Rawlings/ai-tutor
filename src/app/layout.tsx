import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

/**
 * Next.js automatically optimizes fonts from Google Fonts at build time.
 * This prevents layout shifts and improves performance.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

/**
 * Metadata API in Next.js App Router.
 * This automatically injects <title>, <meta name="description">, etc. into the <head>.
 * This is crucial for SEO and sharing on social media.
 */
export const metadata: Metadata = {
  title: "AI Mentor | Your Personal Learning Path",
  description: "A production-grade AI-powered learning and mentorship platform.",
};

/**
 * RootLayout is the outermost component that wraps every page in the app.
 * It's required in the Next.js App Router (app/ directory).
 * We use it to set the `html` and `body` tags, and apply global font variables.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body>{children}</body>
    </html>
  );
}
