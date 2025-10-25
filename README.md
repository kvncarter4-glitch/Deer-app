# Carters Deer Guide – NC Whitetail Analyzer (Demo)

A lightweight Next.js + Leaflet demo that suggests stand locations in North Carolina using free public data sources:
- Geocoding: OpenStreetMap Nominatim
- Weather & wind: Open-Meteo
- Elevation/topography: OpenTopoData (demo dataset)
- Map tiles: OpenTopoMap (CC-BY-SA)

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000

## Deploy to Vercel
1. Create a new Vercel project and **Import** this folder (or upload the .zip).
2. Framework: **Next.js** (no special settings required).
3. Build command: `next build` (default). Output: `.next` (default).
4. Environment variables: none needed for demo.
5. Deploy. Your URL should be live in 1–2 minutes.

## Notes
- This demo uses public, no-key endpoints so it works out of the box.
- For higher resolution elevation and terrain overlays (or Google Maps), you can add API keys later.
- The app auto-refreshes analysis every hour.
- Suggestions are heuristic and should be adapted with your local knowledge.