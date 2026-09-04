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

### YouTube API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable "YouTube Data API v3"
4. Create an **API Key** under Credentials
5. Go to YouTube channel settings, copy your **Channel ID**

**Add to `.env`:**
```
YOUTUBE_API_KEY=AIza...
YOUTUBE_CHANNEL_ID=UCa...
```

### Instagram Graph API

1. Go to [Meta Developers](https://developers.facebook.com)
2. Create a new app (type: Business)
3. Add "Instagram Graph API" product
4. Get your **Instagram Business Account ID**:
   - Business Suite → Settings → Business Accounts
   - Or via API: `/me/accounts` on your Facebook page
5. Generate **Long-Lived Access Token**:
   - Settings → Basic → Get New Access Token
   - Or use Graph API Explorer

**Add to `.env`:**
```
INSTAGRAM_BUSINESS_ACCOUNT_ID=123456...
INSTAGRAM_ACCESS_TOKEN=EAA...
```

### Facebook Graph API

1. Use the same app from Instagram (Meta owns both)
2. Get your **Facebook Page ID**:
   - Page → Settings → Basic → Page ID
3. Use the same access token from Instagram

**Add to `.env`:**
```
FACEBOOK_PAGE_ID=123456...
FACEBOOK_ACCESS_TOKEN=EAA...
```

### TikTok API

⚠️ **Note:** TikTok API access is limited and requires approval.

- Apply at [TikTok Developer Portal](https://developers.tiktok.com)
- Approval can take weeks
- For now, this is a placeholder in the code

**Add to `.env` (when you get access):**
```
TIKTOK_USERNAME=@chuckleclips_official
```

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

## License

MIT
