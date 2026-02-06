import { Router } from "express";
import { XMLParser } from "fast-xml-parser";

const router = Router();

const FEEDS = [
  { source: "Variety", url: "https://variety.com/feed/" },
  { source: "The Hollywood Reporter", url: "https://www.hollywoodreporter.com/feed/" },
  { source: "Deadline", url: "https://deadline.com/feed/" },
  { source: "IndieWire", url: "https://www.indiewire.com/feed/" }
];

const CACHE_DURATION_MS = 30 * 60 * 1000;
let cache = { timestamp: 0, items: [] };

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
});

const stripHtml = (value) => {
  if (!value) return "";
  return value.replace(/<[^>]*>/g, "").trim();
};

const normalizeItem = (item, source) => {
  const mediaContent = item["media:content"] || item["media:thumbnail"];
  const image = mediaContent?.url || null;

  return {
    title: item.title || "Untitled",
    description: stripHtml(item.description || item["content:encoded"] || ""),
    link: item.link,
    pubDate: item.pubDate || item.updated || null,
    source,
    image,
  };
};

const fetchFeed = async ({ source, url }) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${source}`);
  }
  const xml = await response.text();
  const data = parser.parse(xml);
  const items =
    data?.rss?.channel?.item ||
    data?.feed?.entry ||
    [];

  return items.map((item) => normalizeItem(item, source));
};

router.get("/", async (req, res) => {
  try {
    if (Date.now() - cache.timestamp < CACHE_DURATION_MS && cache.items.length > 0) {
      return res.json({ success: true, items: cache.items });
    }

    const results = await Promise.allSettled(FEEDS.map(fetchFeed));
    const items = results
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value)
      .filter((item) => item.link)
      .sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0))
      .slice(0, 12);

    cache = { timestamp: Date.now(), items };
    return res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to load news" });
  }
});

export default router;
