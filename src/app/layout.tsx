import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { StickyCta } from "@/components/sticky-cta";
import { ToastProvider } from "@/components/ui/toast";
import { PROJECT_NAME } from "@/lib/navigation";
import { baseUrl } from "@/lib/base-url";

const schrift = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--schrift-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl()),
  title: {
    default: `${PROJECT_NAME} – Geruch melden für gezielte Kontrollen`,
    template: `%s · ${PROJECT_NAME}`,
  },
  description:
    "Melde Geruch in wenigen Sekunden. Zeitpunkt, Stärke und Windrichtung ergeben das Muster, mit dem die Stadt ihre Kontrollen am Schlachthof gezielt ansetzen kann – anonym und ohne Registrierung.",
  applicationName: PROJECT_NAME,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-64.png", sizes: "64x64", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Bye Schlachthof",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: PROJECT_NAME,
    title: `${PROJECT_NAME} – Geruch melden für gezielte Kontrollen`,
    description:
      "Melde Geruch in wenigen Sekunden. Zeitpunkt, Stärke und Windrichtung helfen der Stadt, ihre Kontrollen am Schlachthof gezielt anzusetzen.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f4ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0f5a52" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={schrift.variable}>
      <body className="flex min-h-dvh flex-col">
        <ToastProvider>
          <a
            href="#inhalt"
            className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2.5 focus:font-semibold focus:text-white"
          >
            Zum Inhalt springen
          </a>
          <SiteHeader />
          <main id="inhalt" className="flex-1 pb-28 sm:pb-0">
            {children}
          </main>
          <SiteFooter />
          <StickyCta />
        </ToastProvider>
      </body>
    </html>
  );
}
