import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/api";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/profile`, changeFrequency: "weekly", priority: 0.5 },
  ];
}
