import type { MetadataRoute } from "next";

const siteUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

// Only public pages belong here — the app shell is session-gated.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/security`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${siteUrl}/terms`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/login`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/signup`, changeFrequency: "monthly", priority: 0.8 },
  ];
}
