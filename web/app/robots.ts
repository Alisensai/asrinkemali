import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots { const productionUrl = process.env.NEXT_PUBLIC_SITE_URL; return productionUrl ? { rules: { userAgent: "*", allow: "/" }, sitemap: `${productionUrl}/sitemap.xml` } : { rules: { userAgent: "*", disallow: "/" } }; }
