import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3e3;
  const isProduction = process.env.NODE_ENV === "production";
  app.use(express.json());
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });
  app.get("/api/yt-search", async (req, res) => {
    const query = req.query.q;
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      res.status(400).json({ error: "Missing query param q" });
      return;
    }
    const cleanQuery = query.replace(/^search:/i, "").trim();
    try {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`;
      const ytResponse = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9,es;q=0.8"
        }
      });
      if (ytResponse.ok) {
        const html = await ytResponse.text();
        const matches = [...html.matchAll(/\/watch\?v=([a-zA-Z0-9_-]{11})/g)];
        const videoIds = Array.from(new Set(matches.map((m) => m[1]))).filter(
          (id) => !id.startsWith("search")
        );
        if (videoIds.length > 0) {
          res.json({
            success: true,
            videoId: videoIds[0],
            allIds: videoIds.slice(0, 5),
            source: "youtube-direct"
          });
          return;
        }
      }
    } catch (err) {
      console.warn("Direct YouTube search failed, falling back:", err);
    }
    try {
      if (process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({});
        const prompt = `Find the exact official 11-character YouTube video ID for this song or query: "${cleanQuery}". Output ONLY the 11-character ID (like dQw4w9WgXcQ). No other words or explanation.`;
        const aiResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt
        });
        const idMatch = aiResponse.text?.trim().match(/[a-zA-Z0-9_-]{11}/);
        if (idMatch) {
          res.json({
            success: true,
            videoId: idMatch[0],
            source: "gemini"
          });
          return;
        }
      }
    } catch (aiErr) {
      console.warn("Gemini video ID fallback failed:", aiErr);
    }
    res.status(404).json({
      error: "Could not find a valid YouTube video ID for this query",
      query: cleanQuery
    });
  });
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT} (isProduction: ${isProduction})`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
