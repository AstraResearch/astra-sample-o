import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import AuthProvider from "./components/AuthProvider";

// Single typeface everywhere — Montserrat (per client direction). Character
// comes from weight contrast (heavy display headings vs regular body), not
// from mixing fonts. The font var lives on <html> so Tailwind's @theme
// (--font-sans: var(--font-montserrat)) resolves at :root.
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-montserrat",
  display: "swap",
});

// Define the global page title and description
export const metadata: Metadata = {
  title: "Astra Workspace",
  description: "AI-Powered Qualitative Research",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${montserrat.variable}`}>
      <head>
        {/* No-flash theme init: set data-theme before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('astra-theme')||'light';document.documentElement.dataset.theme=t;}catch(e){}`,
          }}
        />
      </head>
      <body className="font-sans bg-canvas text-ink antialiased">
        {/* The AuthProvider gives every component access to your Google Session */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
