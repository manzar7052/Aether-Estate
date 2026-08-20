import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aetherestates.demo";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/properties", "/properties/*"],
        disallow: ["/admin", "/dashboard", "/api/", "/unauthorized"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
