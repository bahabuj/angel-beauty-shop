import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import SessionProvider from "@/components/providers/session-provider";
import ServiceWorkerRegister from "@/components/service-worker-register";
import { buildBaseMetadata, SITE_CONFIG } from "@/lib/seo";

// Preload fonts — `display: swap` lets text render immediately with fallback font
// while the web font downloads, so users see content instantly.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = buildBaseMetadata();

export const viewport: Viewport = {
  themeColor: SITE_CONFIG.themeColor,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${playfair.variable} ${inter.variable} antialiased bg-background text-foreground font-sans`}
        style={{ fontFamily: 'var(--font-inter), sans-serif' }}
      >
        <SessionProvider>
          {children}
        </SessionProvider>
        <ServiceWorkerRegister />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
