import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://hahahah-web.vercel.app/sitemap.xml",
    host: "https://hahahah-web.vercel.app",
  };
}
