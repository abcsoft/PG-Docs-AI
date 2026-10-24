import type { MetadataRoute } from "next";

const siteUrl = process.env.BETTER_AUTH_URL ?? "https://www.pgsofts.org";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Session-gated app routes — nothing indexable behind them.
        disallow: [
          "/chat",
          "/documents",
          "/usage",
          "/settings",
          "/admin",
          "/invite",
          "/api/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
