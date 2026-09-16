<p align="center">
  <img src="public/assets/cast-card/banner.jpg" alt="The Chuckleclips cast" width="100%">
</p>

<h1 align="center">Chuckleclips Backend</h1>

<p align="center">
  Unified social media feed aggregator + website for <strong>Chuckleclips</strong>, a Singaporean comedy skit channel.<br>
  Fetches the latest videos/posts from Instagram, TikTok, YouTube, and Facebook, deduplicates cross-posted content, and serves it (plus follower counts) through a single REST API — alongside the marketing site itself.
</p>

<p align="center">
  <img alt="version" src="https://img.shields.io/badge/version-1.2.0-blue">
  <img alt="node" src="https://img.shields.io/badge/node-%3E%3D20-green">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-lightgrey">
</p>

---

## Table of Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Getting Credentials](#getting-credentials)
- [How Deduplication Works](#how-deduplication-works)
- [Caching](#caching)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Changelog](#changelog)
- [License](#license)

## Features

- 🎬 Fetches from 4 social platforms simultaneously (YouTube, Instagram, Facebook, TikTok*)
- 🔁 Deduplicates identical content posted across platforms into one card with multi-platform links
- 📊 Follower/subscriber count stats endpoint (`/api/stats`) for YouTube, Instagram, Facebook
- ⚡ 30-minute in-memory caching to stay under API rate limits
- 🌐 Serves the full Chuckleclips marketing website (`/public`) directly from the backend
- 🔌 Simple REST API (`/api/feed`, `/api/stats`, `/health`)
- 🐳 Production-ready with Docker & one-click Zeabur deployment

\* TikTok has no public API without developer approval — it's wired up and ready, but returns an empty list until access is granted (see [Roadmap](#roadmap)).

## Screenshots

<p align="center">
  <img src="public/assets/cast-card/banner.jpg" alt="Hero section with cast banner" width="49%">
  <img src="public/assets/cast-card/cast-auntie-li.jpg" alt="Meet the Cast poster card" width="24%">
  <img src="public/assets/cast-card/cast-lao-wang.jpg" alt="Meet the Cast poster card" width="24%">
</p>

<p align="center"><em>Hero section (left) and two of the "Meet the Cast" poster cards, served from <code>public/index.html</code>.</em></p>

## Architecture

```
Browser
  │
  ▼
Express server (server.js)
  ├── static: public/  (the Chuckleclips website — HTML/CSS/JS + assets)
  ├── GET /api/feed   → fetch YouTube + Instagram + Facebook + TikTok in parallel
  │                       → deduplicate by title + date → cache 30 min → JSON
  ├── GET /api/stats  → fetch follower/subscriber counts per platform → cache 30 min
  └── GET /health     → uptime check
```

- **Runtime:** Node.js (ESM), Express
- **HTTP client:** axios
- **Cache:** `node-cache` (in-memory, 30-min TTL, no external DB required)
- **Frontend:** static HTML/CSS/vanilla JS in [`public/`](public), fetching the backend's own `/api/feed` and `/api/stats`
- **Deploy target:** Zeabur (via [`zeabur.json`](zeabur.json) + [`Dockerfile`](Dockerfile))

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/chuckleclips-backend.git
cd chuckleclips-backend
npm install
```

### 2. Set Environment Variables

```bash
cp .env.example .env
```

Then fill in your credentials — see [Getting Credentials](#getting-credentials) below.

### 3. Run Locally

```bash
npm run dev
```

Server runs on `http://localhost:3000` and serves the website at the same address.

```bash
curl http://localhost:3000/api/feed
curl http://localhost:3000/api/stats
curl http://localhost:3000/health
```

### 4. Deploy

See [Deployment](#deployment) below, or the full walkthrough in [DEPLOYMENT.md](DEPLOYMENT.md).

## API Reference

### `GET /api/feed`

Returns the unified, deduplicated feed from all platforms (top 12).

**Response:**
```json
{
  "success": true,
  "count": 8,
  "lastUpdated": "2026-01-15T10:30:00Z",
  "data": [
    {
      "id": "youtube_abc123",
      "title": "Auntie vs Gen Z",
      "description": "...",
      "thumbnail": "https://...",
      "publishedAt": "2026-01-15T09:00:00Z",
      "platform": "YouTube",
      "platforms": ["YouTube", "Instagram", "TikTok"],
      "url": "https://youtube.com/watch?v=...",
      "originalId": "abc123"
    }
  ]
}
```

Query params:
- `force=true` — bypass the 30-minute cache (useful during development)

### `GET /api/stats`

Returns follower/subscriber counts per platform.

**Response:**
```json
{
  "success": true,
  "lastUpdated": "2026-01-15T10:30:00Z",
  "data": {
    "youtube": 1234,
    "instagram": 5678,
    "facebook": 910,
    "tiktok": null
  }
}
```

### `GET /health`

Health check — `{ "status": "ok", "timestamp": "..." }`.

### `GET /`

Serves the Chuckleclips website ([`public/index.html`](public/index.html)).

## Getting Credentials

### 1. YouTube — `YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_ID`

1. Go to [Google Cloud Console](https://console.cloud.google.com/), create a project (any name).
2. **APIs & Services → Library** → search "YouTube Data API v3" → Enable.
3. **APIs & Services → Credentials** → Create Credentials → API key. Restrict it to "YouTube Data API v3" only.
4. Channel ID: go to your channel → **Settings → Advanced settings** in YouTube Studio, or open your channel page and copy the ID from the URL if it's a `/channel/UC...` link.

**Add to `.env`:**
```
YOUTUBE_API_KEY=AIza...
YOUTUBE_CHANNEL_ID=UCa...
```

### 2. Meta app setup (shared by Instagram + Facebook)

1. Go to [developers.facebook.com](https://developers.facebook.com/) → **My Apps → Create App** → type "Other" → "Business".
2. In the app, add the **Facebook Login** and **Instagram Graph API** products.
3. Make sure your personal Meta account is an **admin** on both the Chuckleclips Facebook Page and the Instagram account, and that the Instagram account is a **Business or Creator account linked to that Facebook Page** (Instagram app → Settings → Account → Switch to Professional, then link the Page).

### 3. Facebook — `FACEBOOK_PAGE_ID`, `FACEBOOK_ACCESS_TOKEN`

1. In the Meta app, go to **Tools → Graph API Explorer**.
2. Select your app, click "Get Token → Get User Access Token", grant `pages_show_list` and `pages_read_engagement`.
3. Run `GET /me/accounts` — the response lists your Page with its `id` (that's `FACEBOOK_PAGE_ID`) and a **Page Access Token**.
4. That Page token from `/me/accounts` is already long-lived (doesn't expire on its own as long as you don't revoke it) — use it directly as `FACEBOOK_ACCESS_TOKEN`.

**Add to `.env`:**
```
FACEBOOK_PAGE_ID=123456...
FACEBOOK_ACCESS_TOKEN=EAA...
```

### 4. Instagram — `INSTAGRAM_BUSINESS_ACCOUNT_ID`, `INSTAGRAM_ACCESS_TOKEN`

1. Still in Graph API Explorer with the same Page Access Token, run:
   `GET /{page-id}?fields=instagram_business_account`
2. The returned id is `INSTAGRAM_BUSINESS_ACCOUNT_ID`.
3. Reuse the same Page Access Token as `INSTAGRAM_ACCESS_TOKEN` — it works for both since Instagram Graph API calls ride on the Page token.

**Add to `.env`:**
```
INSTAGRAM_BUSINESS_ACCOUNT_ID=123456...
INSTAGRAM_ACCESS_TOKEN=EAA...
```

> Since you're an admin/tester on your own Page and IG account, this works immediately at "Standard Access" without needing Meta's App Review — that's only required if you want other people's accounts to grant your app access.

### 5. TikTok API

⚠️ **Note:** TikTok API access is limited and requires approval.

- Apply at [TikTok Developer Portal](https://developers.tiktok.com)
- Approval can take weeks
- For now, this is a placeholder in the code (`fetchTikTokVideos` in `server.js` returns an empty list)

**Add to `.env` (when you get access):**
```
TIKTOK_USERNAME=@chuckleclips_official
```

### 6. Add to Zeabur

Dashboard → your service → **Settings → Environment** → add each var name exactly as in `.env.example` with the real values, Save. Zeabur auto-redeploys.

## How Deduplication Works

When the same video is posted to multiple platforms on the same day:

1. Posts are grouped by title + date
2. First occurrence is kept as the primary entry
3. Additional platforms are added to the `platforms` array
4. The frontend can link to any platform

**Example:** If "Auntie Final Boss" is posted to Instagram, TikTok, and YouTube on Jan 15:

```json
{
  "id": "instagram_abc123",
  "title": "Auntie Final Boss vs Gen Z",
  "platforms": ["Instagram", "TikTok", "YouTube"],
  "url": "https://instagram.com/p/abc123"
}
```

The website shows it **once** with links to all three platforms.

## Caching

- Results cached for **30 minutes** (`/api/feed` and `/api/stats` separately)
- Cache clears automatically after TTL
- Prevents hitting platform API rate limits
- Bypass during dev: `GET /api/feed?force=true`

## Deployment

### Option A: Connect GitHub (Recommended)

1. Push this repo to GitHub
2. Go to [Zeabur Dashboard](https://dashboard.zeabur.com)
3. Click "New Service" → "GitHub"
4. Select this repository
5. Add environment variables in Zeabur dashboard (copy from your `.env`)
6. Deploy!

### Option B: Zeabur CLI

```bash
npm install -g zeabur
zeabur deploy
```

### Option C: Docker

```bash
docker build -t chuckleclips-backend .
docker run -p 3000:3000 --env-file .env chuckleclips-backend
```

Full step-by-step walkthrough (including troubleshooting a first deploy): [DEPLOYMENT.md](DEPLOYMENT.md).

## Troubleshooting

**"Credentials missing" warning:**
- Make sure `.env` file exists with all variables
- Check spelling matches `.env.example`

**No data returned:**
- Verify API keys are valid
- Check rate limits on each platform
- Instagram/Facebook may need page approval

**Zeabur deployment fails:**
- Verify all env vars added in Zeabur dashboard
- Check `npm install` completes without errors
- Review deployment logs

## Roadmap

- [ ] **TikTok feed support** — once developer API access is granted, replace the `fetchTikTokVideos` placeholder with real fetches
- [ ] **TikTok follower count** — no viable API without developer approval; fallback would be a manually-updated static number
- [ ] **Re-enable "Fresh Drops" section** — currently hidden on the site until the live feed is wired into the frontend
- [x] **Follower count stats** — `GET /api/stats` returns YouTube subscriber count, Facebook & Instagram follower counts (shipped in [1.2.0](#changelog))

## Changelog

This project follows [Semantic Versioning](https://semver.org/).

### [1.2.0] - 2026-09-09

**Added**
- Cast banner as the site's hero photo
- Follower/subscriber count stats in the Follow section, backed by a new `GET /api/stats` endpoint

**Changed**
- Compressed hero banner and cast card images for faster page loads

### [1.1.0] - 2026-09-09

**Added**
- Backend now serves the full Chuckleclips website as static files (`public/`)
- `package-lock.json` for reproducible `npm ci` builds
- Documented follower-count stats as a planned feature

**Changed**
- Replaced "Meet the Cast" emoji placeholders with designed poster card images
- Replaced social button emojis with platform icon images
- Moved the Follow section above Fresh Drops
- Updated footer credit line

**Hidden**
- "Fresh Drops" section, until the live feed is wired up on the frontend

### [1.0.0] - 2026-09-04

**Added**
- Initial backend: unified feed aggregation across YouTube, Instagram, Facebook, and TikTok (placeholder)
- Deduplication of cross-posted content
- 30-minute response caching
- Docker and Zeabur deployment configuration

## License

MIT
