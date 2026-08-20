import { MetadataRoute } from "next";
import { searchProperties } from "@/services/properties";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aetherestates.demo";

  // Static routes
  const routes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/properties`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  try {
    const { properties } = await searchProperties({ limit: 100 });
    const propertyRoutes: MetadataRoute.Sitemap = properties.map((prop) => ({
      url: `${baseUrl}/properties/${prop.id}`,
      lastModified: new Date(prop.updated_at || prop.created_at),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    return [...routes, ...propertyRoutes];
  } catch {
    return routes;
  }
}
