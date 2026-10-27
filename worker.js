// Cloudflare Worker port of server.js: same routes, same response shapes.
// Static files in public/ are served as Workers assets; only /api/* and /health reach this code.
// node-cache is replaced by the Workers Cache API (30 minutes, as before).

const CACHE_TTL_SECONDS = 1800;

async function getJson(url, params) {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const res = await fetch(u);
  if (!res.ok) throw new Error(`${u.hostname} ${res.status}`);
  return res.json();
}

// Helper: Fetch YouTube videos
async function fetchYouTubeVideos(env) {
  try {
    if (!env.YOUTUBE_API_KEY || !env.YOUTUBE_CHANNEL_ID) {
      console.warn('YouTube credentials missing');
      return [];
    }
    const data = await getJson('https://www.googleapis.com/youtube/v3/search', {
      key: env.YOUTUBE_API_KEY,
      channelId: env.YOUTUBE_CHANNEL_ID,
      part: 'snippet',
      order: 'date',
      maxResults: 10,
      type: 'video'
    });
    return data.items.map(item => ({
      id: `youtube_${item.id.videoId}`,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high?.url,
      publishedAt: item.snippet.publishedAt,
      platform: 'YouTube',
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      originalId: item.id.videoId
    }));
  } catch (error) {
    console.error('YouTube fetch error:', error.message);
    return [];
  }
}

// Helper: Fetch Instagram posts
async function fetchInstagramPosts(env) {
  try {
    if (!env.INSTAGRAM_BUSINESS_ACCOUNT_ID || !env.INSTAGRAM_ACCESS_TOKEN) {
      console.warn('Instagram credentials missing');
      return [];
    }
    const data = await getJson(`https://graph.instagram.com/${env.INSTAGRAM_BUSINESS_ACCOUNT_ID}/media`, {
      fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count',
      access_token: env.INSTAGRAM_ACCESS_TOKEN
    });
    return data.data.map(item => ({
      id: `instagram_${item.id}`,
      title: item.caption?.substring(0, 100) || 'Instagram Post',
      description: item.caption || '',
      thumbnail: item.media_url,
      publishedAt: item.timestamp,
      platform: 'Instagram',
      url: item.permalink,
      originalId: item.id
    }));
  } catch (error) {
    console.error('Instagram fetch error:', error.message);
    return [];
  }
}

// Helper: Fetch TikTok videos (placeholder, as in server.js: the API needs separate approval)
async function fetchTikTokVideos(env) {
  if (!env.TIKTOK_USERNAME) {
    console.warn('TikTok credentials missing');
  } else {
    console.warn('TikTok API fetch not yet implemented - requires specific approval');
  }
  return [];
}

// Helper: Fetch Facebook posts
async function fetchFacebookPosts(env) {
  try {
    if (!env.FACEBOOK_PAGE_ID || !env.FACEBOOK_ACCESS_TOKEN) {
      console.warn('Facebook credentials missing');
      return [];
    }
    const data = await getJson(`https://graph.facebook.com/v18.0/${env.FACEBOOK_PAGE_ID}/posts`, {
      fields: 'id,message,story,created_time,permalink_url,picture,link',
      access_token: env.FACEBOOK_ACCESS_TOKEN
    });
    return data.data.map(item => ({
      id: `facebook_${item.id}`,
      title: item.message?.substring(0, 100) || item.story || 'Facebook Post',
      description: item.message || item.story || '',
      thumbnail: item.picture,
      publishedAt: item.created_time,
      platform: 'Facebook',
      url: item.permalink_url || `https://facebook.com/${env.FACEBOOK_PAGE_ID}`,
      originalId: item.id
    }));
  } catch (error) {
    console.error('Facebook fetch error:', error.message);
    return [];
  }
}

// Helper: Fetch YouTube subscriber count
async function fetchYouTubeStats(env) {
  try {
    if (!env.YOUTUBE_API_KEY || !env.YOUTUBE_CHANNEL_ID) {
      console.warn('YouTube credentials missing');
      return null;
    }
    const data = await getJson('https://www.googleapis.com/youtube/v3/channels', {
      key: env.YOUTUBE_API_KEY,
      id: env.YOUTUBE_CHANNEL_ID,
      part: 'statistics'
    });
    const stats = data.items?.[0]?.statistics;
    return stats ? Number(stats.subscriberCount) : null;
  } catch (error) {
    console.error('YouTube stats error:', error.message);
    return null;
  }
}

// Helper: Fetch Instagram / Facebook follower count (same Graph API call shape)
async function fetchGraphFollowers(label, id, token) {
  try {
    if (!id || !token) {
      console.warn(`${label} credentials missing`);
      return null;
    }
    const data = await getJson(`https://graph.facebook.com/v18.0/${id}`, {
      fields: 'followers_count',
      access_token: token
    });
    return data.followers_count ?? null;
  } catch (error) {
    console.error(`${label} stats error:`, error.message);
    return null;
  }
}

// Helper: Deduplicate content by matching title/description similarity and date proximity
function deduplicateContent(allPosts) {
  const dedupMap = new Map();
  const sorted = allPosts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  sorted.forEach(post => {
    // Same content posted across platforms shares a title prefix and a day
    const dateKey = new Date(post.publishedAt).toISOString().split('T')[0];
    const titleKey = post.title.substring(0, 50).toLowerCase().replace(/\s+/g, '');
    const key = `${titleKey}${dateKey}`;
    if (!dedupMap.has(key)) {
      dedupMap.set(key, { ...post, platforms: [post.platform] });
    } else {
      const existing = dedupMap.get(key);
      if (!existing.platforms.includes(post.platform)) existing.platforms.push(post.platform);
      if (post.thumbnail && !existing.thumbnail) existing.thumbnail = post.thumbnail;
    }
  });
  return Array.from(dedupMap.values()).slice(0, 12); // top 12 unique posts
}

async function buildFeed(env) {
  const [youtube, instagram, facebook, tiktok] = await Promise.all([
    fetchYouTubeVideos(env),
    fetchInstagramPosts(env),
    fetchFacebookPosts(env),
    fetchTikTokVideos(env)
  ]);
  const uniqueFeed = deduplicateContent([...youtube, ...instagram, ...facebook, ...tiktok]);
  return { success: true, count: uniqueFeed.length, lastUpdated: new Date().toISOString(), data: uniqueFeed };
}

async function buildStats(env) {
  const [youtube, instagram, facebook] = await Promise.all([
    fetchYouTubeStats(env),
    fetchGraphFollowers('Instagram', env.INSTAGRAM_BUSINESS_ACCOUNT_ID, env.INSTAGRAM_ACCESS_TOKEN),
    fetchGraphFollowers('Facebook', env.FACEBOOK_PAGE_ID, env.FACEBOOK_ACCESS_TOKEN)
  ]);
  return { success: true, lastUpdated: new Date().toISOString(), data: { youtube, instagram, facebook, tiktok: null } };
}

const CORS = { 'Access-Control-Allow-Origin': '*' };

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, ...extra }
  });
}

// Serve from the edge cache when fresh, otherwise build, cache for 30 minutes and return.
async function cached(request, ctx, label, build) {
  const cache = caches.default;
  const key = new Request(new URL(request.url).origin + `/__cache/${label}`);
  const hit = await cache.match(key);
  if (hit) return hit;
  try {
    const res = json(await build(), 200, { 'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}` });
    ctx.waitUntil(cache.put(key, res.clone()));
    return res;
  } catch (error) {
    console.error(`${label} error:`, error.message);
    return json({ success: false, error: `Failed to fetch ${label}`, message: error.message }, 500);
  }
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': '*' } });
    }
    if (pathname === '/api/feed') return cached(request, ctx, 'feed', () => buildFeed(env));
    if (pathname === '/api/stats') return cached(request, ctx, 'stats', () => buildStats(env));
    if (pathname === '/health') return json({ status: 'ok', timestamp: new Date().toISOString() });
    return env.ASSETS.fetch(request);
  }
};
