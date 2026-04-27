import type { Metadata } from "next";

import { AppProvider } from "@/components/providers/app-provider";

import "./globals.css";

// Root layout wires shared styling and the client-side app state.

export const metadata: Metadata = {
  title: "ClockHub",
  description:
    "Shift planning, secure auth, and audit-ready operations dashboard.",
  openGraph: {
    title: "ClockHub",
    description:
      "Shift planning, secure auth, and audit-ready operations dashboard.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "ClockHub",
    description:
      "Shift planning, secure auth, and audit-ready operations dashboard.",
  },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico" },
  keywords: ["shift planning", "scheduling", "authentication", "audit"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
