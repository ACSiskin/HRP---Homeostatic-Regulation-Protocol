import type { Metadata } from "next";
import "./globals.css";
import { SidebarProvider } from "@/components/sidebar-context"; // Importujemy provider

export const metadata: Metadata = {
  title: "MIND_OS",
  description: "powered by H.R.P. - Homeostatic Regulation Protocol",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className="dark">
      <body className="bg-slate-950 text-slate-200 antialiased">
        {/* Owijamy całą aplikację w SidebarProvider */}
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </body>
    </html>
  );
}
