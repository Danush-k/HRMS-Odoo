import type { Metadata } from "next";
import { Suspense } from "react";

import { TopLoader } from "@/components/top-loader";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "DayFlow", template: "%s · DayFlow" },
  description: "Every workday, perfectly aligned. A human resource management system.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=Outfit:wght@700;800;900&family=Space+Grotesk:wght@700;800&family=Syne:wght@700;800&display=swap"
        />
      </head>
      <body suppressHydrationWarning>
        <Suspense fallback={null}>
          <TopLoader />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
