import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "lil_Bin | AI Company OS",
  description: "AI-native company operating system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const renderNowMs = Date.now();
  // Used to make client/server relative-time rendering deterministic.
  (globalThis as any).__LILBIN_RENDER_NOW__ = renderNowMs;

  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full bg-background text-foreground">
        <Script
          id="lilbin-render-now"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.__LILBIN_RENDER_NOW__=${renderNowMs};`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
