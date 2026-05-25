import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CleanNews Vault - Extrae, Archiva y Lee Noticias",
  description: "Extrae, archiva y lee artículos de noticias de forma limpia y organizada. Tu biblioteca personal de noticias.",
  keywords: ["noticias", "artículos", "archivo", "lectura", "CleanNews", "Vault"],
  authors: [{ name: "CleanNews Vault" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "CleanNews Vault",
    description: "Extrae, archiva y lee artículos de noticias de forma limpia y organizada.",
    siteName: "CleanNews Vault",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CleanNews Vault",
    description: "Extrae, archiva y lee artículos de noticias de forma limpia y organizada.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
