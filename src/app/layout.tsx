import type { Metadata, Viewport } from "next";
import { Syne, Instrument_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import "@/styles/globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "GoBuzz",
    template: "%s · GoBuzz",
  },
  description: "The social platform that buzzes.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  openGraph: {
    title: "GoBuzz",
    description: "The social platform that buzzes.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${syne.variable} ${instrumentSans.variable}`}
    >
      <body className="font-sans antialiased bg-background text-foreground min-h-dvh">
        <Providers>
          {children}
          <Toaster
            position="bottom-center"
            richColors
            closeButton
            toastOptions={{
              classNames: {
                toast:
                  "font-sans text-sm rounded-xl border border-border/60 shadow-lg",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}