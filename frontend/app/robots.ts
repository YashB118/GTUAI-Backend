import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/register", "/brahmastra/share/"],
        disallow: [
          "/admin/",
          "/dashboard",
          "/predict",
          "/chat",
          "/community",
          "/materials",
          "/coins",
          "/leaderboard",
          "/my-uploads",
          "/question-bank",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
