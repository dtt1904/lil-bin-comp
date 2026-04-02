import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "lil_Bin | AI Company OS",
  description: "AI-native company operating system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="dark h-full antialiased"
    >
      <body className="h-full bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
