import { Inter } from "next/font/google";
import "./globals.css";
import React from "react";
import ClientProviders from "@/components/ClientProviders";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Event Platform",
  description: "A platform for managing events.",
};

// ✅ Force dynamic rendering to fix headers() error
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // ✅ Server layout (can export metadata). Providers moved to client wrapper
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}