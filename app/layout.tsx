import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { Hanken_Grotesk, Fraunces, Geist_Mono } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"
import { 
  ACCENT_TEXT, 
  ACCENT_GLOBE
} from "@/lib/site-config"

const hankenGrotesk = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-sans" })
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-serif" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "FTC Matchmaker · Sponsorship Portal",
  description: "The moderated sponsorship pipeline for FIRST Tech Challenge teams. Build a verified portfolio, send admin-reviewed pitches, and connect with sponsors.",
}

import { ThemeProvider } from "@/components/theme-provider"
import { GlobalShortcuts } from "@/components/global-shortcuts"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${hankenGrotesk.variable} ${fraunces.variable} ${geistMono.variable}`}
        style={{
          // @ts-expect-error CSS custom properties are not in React.CSSProperties
          '--accent-text': ACCENT_TEXT,
          '--accent-globe': ACCENT_GLOBE,
        }}
        suppressHydrationWarning
      >
        <body>
          <ThemeProvider
            attribute="data-theme"
            defaultTheme="light"
            forcedTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            {children}
            <GlobalShortcuts />
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
