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
  title: "FTC Sponsorship Portal",
  description: "Connecting FTC robotics teams with corporate sponsors.",
}

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
        // @ts-ignore
        '--accent-text-dark': ACCENT_DARK_TEXT,
        '--accent-globe-dark': ACCENT_DARK_GLOBE,
        '--accent-text-light': ACCENT_LIGHT_TEXT,
        '--accent-globe-light': ACCENT_LIGHT_GLOBE,
      }} 
      suppressHydrationWarning
    >
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'dark';
                if (theme === 'light') {
                  document.documentElement.setAttribute('data-theme', 'light');
                  document.documentElement.style.colorScheme = 'light';
                } else {
                  document.documentElement.classList.add('dark');
                  document.documentElement.style.colorScheme = 'dark';
                }
              } catch (e) {}
            `,
          }}
        />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
