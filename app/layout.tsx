import "./globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";

import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Mini LMS",
  description: "Student consultation management",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex min-h-screen flex-col">
            <header className="border-b">
              <nav
                aria-label="Main navigation"
                className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-4 px-5"
              >
                <Link href="/" className="font-semibold">
                  Mini LMS
                </Link>
                <Suspense fallback={<span>Loading account...</span>}>
                  <AuthButton />
                </Suspense>
              </nav>
            </header>
            <div className="flex-1">{children}</div>
            <footer className="flex justify-end border-t px-5 py-4">
              <ThemeSwitcher />
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
