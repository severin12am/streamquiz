import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Live game rooms and API routes are not meant for search indexing.
      disallow: ["/api/", "/game/"],
    },
    sitemap: "https://whosmarter.com/sitemap.xml",
    host: "https://whosmarter.com",
  };
}
