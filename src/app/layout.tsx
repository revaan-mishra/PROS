import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "PROS · Personal RPG Operating System",
  description:
    "A premium mobile-first RPG life operating system where real-world actions become character progression.",
  applicationName: "PROS",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PROS",
  },
};

export const viewport: Viewport = {
  themeColor: "#070A12",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

import { getTheme } from "@/lib/pros/data";
import { Toaster } from "sonner";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const theme = await getTheme();
  
  return (
    <html lang="en" className={theme}>
      <body className="bg-[#070A12] text-slate-100 antialiased">
        {children}
        <Toaster position="top-center" theme={theme as "dark" | "light"} />
      </body>
    </html>
  );
}
