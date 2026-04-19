import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/sponsor-view/', '/dashboard/'],
    },
    sitemap: 'https://ftcsponsors.example.com/sitemap.xml',
  }
}
