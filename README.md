# Chuckleclips Backend

Unified social media feed aggregator for Chuckleclips. Fetches latest videos from Instagram, TikTok, YouTube, and Facebook, deduplicates content, and serves a single unified feed.

## Features

- ✅ Fetches from 4 social platforms simultaneously
- ✅ Deduplicates identical content posted across platforms
- ✅ 30-minute caching to avoid rate limits
- ✅ Simple REST API (`/api/feed`)
- ✅ Production-ready with Docker & Zeabur support

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/chuckleclips-backend.git
cd chuckleclips-backend
npm install
```

### 2. Set Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Then fill in your credentials (see [Credentials Guide](#getting-credentials) below).

### 3. Run Locally

```bash
npm run dev
```

Server runs on `http://localhost:3000`

Test the feed:
```bash
curl http://localhost:3000/api/feed
```

### 4. Deploy to Zeabur

#### Option A: Connect GitHub (Recommended)

1. Push this repo to GitHub
2. Go to [Zeabur Dashboard](https://dashboard.zeabur.com)
3. Click "New Service" → "GitHub"
4. Select this repository
5. Add environment variables in Zeabur dashboard (copy from your `.env`)
6. Deploy!

#### Option B: Zeabur CLI

```bash
npm install -g zeabur
zeabur deploy
```

## API Endpoints

### GET `/api/feed`

Returns unified, deduplicated feed from all platforms.

**Response:**
```json
{
  "success": true,
  "count": 8,
  "lastUpdated": "2024-01-15T10:30:00Z",
  "data": [
    {
      "id": "youtube_abc123",
      "title": "Auntie vs Gen Z",
      "description": "...",
      "thumbnail": "https://...",
      "publishedAt": "2024-01-15T09:00:00Z",
      "platform": "YouTube",
      "platforms": ["YouTube", "Instagram", "TikTok"],
      "url": "https://youtube.com/watch?v=...",
      "originalId": "abc123"
    }
  ]
}
```

### GET `/health`

Health check endpoint.

### GET `/`

API documentation.

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
3. Additional platforms are added to `platforms` array
4. Frontend can link to any platform

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

- Results cached for **30 minutes**
- Cache clears automatically after TTL
- Prevents hitting API rate limits

To bypass cache (during dev):
```
GET /api/feed?force=true
```

## Monitoring

Check logs in Zeabur dashboard for:
- API errors
- Missing credentials
- Rate limit warnings

## Development

### Testing Locally

```bash
# With mock data
npm run dev

# Test endpoints
curl http://localhost:3000/health
curl http://localhost:3000/api/feed
```

### Troubleshooting

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

## Frontend Integration

The website calls your backend:

```javascript
const response = await fetch('https://your-zeabur-url.com/api/feed');
const { data } = await response.json();
```

## Future Features

### Follower count stats

Show follower/subscriber counts under each social button in the Follow section.

- **YouTube**: `channels.list?part=statistics` returns `subscriberCount` directly with just the API key.
- **Facebook**: `/{page-id}?fields=followers_count` with the Page access token.
- **Instagram**: `/{ig-business-id}?fields=followers_count` with the same Page access token.
- **TikTok**: no viable API without developer approval (same gap as the video feed) — would need a manually-updated static number or to wait for API access.

Plan: add a `GET /api/stats` endpoint that fetches all three counts in parallel (cached like `/api/feed`), then have the Follow section fetch it and render a count under each platform button.

## License

MIT
