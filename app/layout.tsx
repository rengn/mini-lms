import "./globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";

import { AccountControls } from "@/components/auth/account-controls";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { cn } from "@/lib/utils";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Mini LMS",
  description: "Consultation Management",
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
      <body
        className={cn(
          geistSans.className,
          "flex min-h-screen flex-col antialiased",
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <header className={cn("border-b")}>
            <nav
              aria-label="Main navigation"
              className={cn(
                "mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-4 px-5",
              )}
            >
              <Link href="/" className={cn("font-semibold")}>
                Mini LMS
              </Link>
              <Suspense fallback={null}>
                <AccountControls />
              </Suspense>
            </nav>
          </header>
          {children}
          <footer className={cn("mt-auto flex justify-end border-t px-5 py-4")}>
            <ThemeSwitcher />
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
