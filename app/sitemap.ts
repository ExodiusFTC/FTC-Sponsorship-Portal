import { MetadataRoute } from 'next'
import { env } from '@/lib/env'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = env.NEXT_PUBLIC_APP_URL || 'https://ftcsponsors.example.com'
  return [
    { url: baseUrl, lastModified: new Date() },
    { url: `${baseUrl}/sponsors/apply`, lastModified: new Date() },
    { url: `${baseUrl}/sponsors/browse`, lastModified: new Date() },
    { url: `${baseUrl}/login`, lastModified: new Date() },
    { url: `${baseUrl}/signup`, lastModified: new Date() },
  ]
}
