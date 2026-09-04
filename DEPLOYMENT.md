# Zeabur Deployment Guide

Get your Chuckleclips backend live in under 5 minutes.

## Step 1: Push to GitHub

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial backend setup for Chuckleclips"
git remote add origin https://github.com/YOUR_USERNAME/chuckleclips-backend.git
git branch -M main
git push -u origin main
```

**Important:** Make sure `.gitignore` includes `.env` so credentials never get committed.

## Step 2: Create Zeabur Project

1. Go to [Zeabur Dashboard](https://dashboard.zeabur.com)
2. Click **"New Project"**
3. Select **"Create New"** (or "Deploy from GitHub" if you prefer)
4. Name it: `chuckleclips-backend`

## Step 3: Connect GitHub

1. Click **"Deploy New Service"**
2. Select **"GitHub"**
3. Authorize Zeabur to access your GitHub account (one-time)
4. Search for `chuckleclips-backend` repository
5. Select it and click **"Deploy"**

Zeabur will:
- Detect it's a Node.js project
- Auto-run `npm install`
- Auto-run `npm start`

## Step 4: Add Environment Variables

In your Zeabur project dashboard:

1. Go to **"Settings"** → **"Environment"**
2. Click **"Add Variable"** and add each key from `.env.example`:

```
YOUTUBE_API_KEY = AIza...
YOUTUBE_CHANNEL_ID = UCa...
INSTAGRAM_BUSINESS_ACCOUNT_ID = 123456...
INSTAGRAM_ACCESS_TOKEN = EAA...
FACEBOOK_PAGE_ID = 123456...
FACEBOOK_ACCESS_TOKEN = EAA...
TIKTOK_USERNAME = @chuckleclips_official (optional)
```

3. Click **"Save"**
4. Zeabur will automatically redeploy with new variables

## Step 5: Get Your Backend URL

After deployment:

1. In Zeabur, go to your service settings
2. Find **"Domain"** section
3. Copy the assigned URL (e.g., `https://chuckleclips-backend-abc123.zeabur.app`)
4. Keep this handy - you'll need it for the website frontend

## Step 6: Test It Works

```bash
# Replace with your actual Zeabur URL
curl https://your-zeabur-url.com/api/feed
```

You should get a JSON response with your feed data (or empty if credentials aren't added yet).

## Step 7: Connect to Website Frontend

Update your website HTML to call your backend:

```javascript
const BACKEND_URL = 'https://your-zeabur-url.com';

// In the "Fresh Drops" section, fetch and display
async function loadLatestContent() {
  const response = await fetch(`${BACKEND_URL}/api/feed`);
  const { data } = await response.json();
  // Display videos...
}
```

## Updating Credentials Later

When you have the actual API keys:

1. Open your Zeabur project
2. Go to **Settings** → **Environment**
3. Update each variable
4. Click **Save**
5. Zeabur automatically redeploys

No code changes needed!

## Monitoring & Logs

Click **"Logs"** in your Zeabur service to see:
- Deployment progress
- Server startup messages
- API errors in real-time
- Rate limit warnings

## Troubleshooting

### Deployment fails

- Check README.md section "Troubleshooting"
- Click **Logs** to see error details
- Verify `package.json` is valid JSON
- Make sure `server.js` exists

### API returns empty data

- Verify all environment variables are added (exactly as in `.env.example`)
- Check spelling - vars are case-sensitive
- Wait a few seconds after saving vars (Zeabur needs to redeploy)

### 502 / Service Unavailable

- Server may still be redeploying after env changes
- Wait 30 seconds and try again
- Check logs in Zeabur dashboard

### Still stuck?

1. Check the full README.md
2. Review Zeabur docs: https://zeabur.com/docs
3. Verify API keys are still valid (test them independently)

## Next Steps

Once deployed:
1. Add credentials when ready
2. Test `/api/feed` returns data
3. Update website HTML to call your backend
4. Test the full integration
5. Deploy website updates

---

**Ready?** Start with Step 1 above! 🚀
