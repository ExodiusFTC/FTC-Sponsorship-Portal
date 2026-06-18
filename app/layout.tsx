import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"
import { 
  ACCENT_DARK_TEXT, 
  ACCENT_DARK_GLOBE, 
  ACCENT_LIGHT_TEXT, 
  ACCENT_LIGHT_GLOBE 
} from "@/lib/site-config"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" })

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
    <html 
      lang="en" 
      className={`${inter.variable} ${jetbrainsMono.variable}`} 
      style={{ 
        // @ts-expect-error CSS custom properties are not in React.CSSProperties
        '--accent-text-dark': ACCENT_DARK_TEXT,
        '--accent-globe-dark': ACCENT_DARK_GLOBE,
        '--accent-text-light': ACCENT_LIGHT_TEXT,
        '--accent-globe-light': ACCENT_LIGHT_GLOBE,
      }} 
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <GlobalShortcuts />
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
