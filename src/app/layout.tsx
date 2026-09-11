import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DirectionProvider } from "@/components/ui/direction";
import "./globals.css";

const cairo = localFont({
  variable: "--font-sans",
  src: [
    { path: "./fonts/cairo-arabic.woff2", weight: "400 800", style: "normal" },
    { path: "./fonts/cairo-latin.woff2", weight: "400 800", style: "normal" },
  ],
});

const geistMono = localFont({
  variable: "--font-geist-mono",
  src: "./fonts/geist-mono-latin.woff2",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "DentaFlow",
  description: "نظام إدارة عيادات أسنان متعددة الفروع",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden">
        <DirectionProvider direction="rtl">
          <TooltipProvider>{children}</TooltipProvider>
        </DirectionProvider>
        <Toaster />
      </body>
    </html>
  );
}
