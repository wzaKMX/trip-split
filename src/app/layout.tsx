import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import OnboardingGate from "@/components/OnboardingGate";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "TripSplit — долги в поездках",
  description: "Делите общие траты в поездках: голосовой ввод и распознавание чеков",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // чёлка/статус-бар: даёт ненулевые env(safe-area-inset-*)
  viewportFit: "cover" as const,
  // клавиатура ужимает вьюпорт → низ модалок остаётся над ней
  interactiveWidget: "resizes-content" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${ibmPlexSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-bg text-ink">
        <OnboardingGate>{children}</OnboardingGate>
      </body>
    </html>
  );
}
