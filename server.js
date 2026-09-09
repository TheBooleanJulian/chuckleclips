import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import NodeCache from 'node-cache';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cache: store results for 30 minutes
const cache = new NodeCache({ stdTTL: 1800 });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: Fetch YouTube videos
async function fetchYouTubeVideos() {
  try {
    if (!process.env.YOUTUBE_API_KEY || !process.env.YOUTUBE_CHANNEL_ID) {
      console.warn('YouTube credentials missing');
      return [];
    }

    const response = await axios.get(
      'https://www.googleapis.com/youtube/v3/search',
      {
        params: {
          key: process.env.YOUTUBE_API_KEY,
          channelId: process.env.YOUTUBE_CHANNEL_ID,
          part: 'snippet',
          order: 'date',
          maxResults: 10,
          type: 'video'
        }
      }
    );

    return response.data.items.map(item => ({
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
async function fetchInstagramPosts() {
  try {
    if (!process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || !process.env.INSTAGRAM_ACCESS_TOKEN) {
      console.warn('Instagram credentials missing');
      return [];
    }

    const response = await axios.get(
      `https://graph.instagram.com/${process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID}/media`,
      {
        params: {
          fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count',
          access_token: process.env.INSTAGRAM_ACCESS_TOKEN
        }
      }
    );

    return response.data.data.map(item => ({
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

// Helper: Fetch TikTok videos
async function fetchTikTokVideos() {
  try {
    if (!process.env.TIKTOK_USERNAME) {
      console.warn('TikTok credentials missing');
      return [];
    }

    // Note: TikTok API is limited. This is a placeholder for when/if you get access
    // For now, you may need to manually add TikTok videos or use a different approach
    console.warn('TikTok API fetch not yet implemented - requires specific approval');
    return [];
  } catch (error) {
    console.error('TikTok fetch error:', error.message);
    return [];
  }
}

// Helper: Fetch Facebook posts
async function fetchFacebookPosts() {
  try {
    if (!process.env.FACEBOOK_PAGE_ID || !process.env.FACEBOOK_ACCESS_TOKEN) {
      console.warn('Facebook credentials missing');
      return [];
    }

    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${process.env.FACEBOOK_PAGE_ID}/posts`,
      {
        params: {
          fields: 'id,message,story,created_time,permalink_url,picture,link',
          access_token: process.env.FACEBOOK_ACCESS_TOKEN
        }
      }
    );

    return response.data.data.map(item => ({
      id: `facebook_${item.id}`,
      title: item.message?.substring(0, 100) || item.story || 'Facebook Post',
      description: item.message || item.story || '',
      thumbnail: item.picture,
      publishedAt: item.created_time,
      platform: 'Facebook',
      url: item.permalink_url || `https://facebook.com/${process.env.FACEBOOK_PAGE_ID}`,
      originalId: item.id
    }));
  } catch (error) {
    console.error('Facebook fetch error:', error.message);
    return [];
  }
}

// Helper: Fetch YouTube subscriber count
async function fetchYouTubeStats() {
  try {
    if (!process.env.YOUTUBE_API_KEY || !process.env.YOUTUBE_CHANNEL_ID) {
      console.warn('YouTube credentials missing');
      return null;
    }

    const response = await axios.get(
      'https://www.googleapis.com/youtube/v3/channels',
      {
        params: {
          key: process.env.YOUTUBE_API_KEY,
          id: process.env.YOUTUBE_CHANNEL_ID,
          part: 'statistics'
        }
      }
    );

    const stats = response.data.items?.[0]?.statistics;
    return stats ? Number(stats.subscriberCount) : null;
  } catch (error) {
    console.error('YouTube stats error:', error.message);
    return null;
  }
}

// Helper: Fetch Instagram follower count
async function fetchInstagramStats() {
  try {
    if (!process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || !process.env.INSTAGRAM_ACCESS_TOKEN) {
      console.warn('Instagram credentials missing');
      return null;
    }

    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID}`,
      {
        params: {
          fields: 'followers_count',
          access_token: process.env.INSTAGRAM_ACCESS_TOKEN
        }
      }
    );

    return response.data.followers_count ?? null;
  } catch (error) {
    console.error('Instagram stats error:', error.message);
    return null;
  }
}

// Helper: Fetch Facebook follower count
async function fetchFacebookStats() {
  try {
    if (!process.env.FACEBOOK_PAGE_ID || !process.env.FACEBOOK_ACCESS_TOKEN) {
      console.warn('Facebook credentials missing');
      return null;
    }

    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${process.env.FACEBOOK_PAGE_ID}`,
      {
        params: {
          fields: 'followers_count',
          access_token: process.env.FACEBOOK_ACCESS_TOKEN
        }
      }
    );

    return response.data.followers_count ?? null;
  } catch (error) {
    console.error('Facebook stats error:', error.message);
    return null;
  }
}

// Helper: Deduplicate content by matching title/description similarity and date proximity
function deduplicateContent(allPosts) {
  const dedupMap = new Map();

  // Sort by date (newest first)
  const sorted = allPosts.sort((a, b) =>
    new Date(b.publishedAt) - new Date(a.publishedAt)
  );

  sorted.forEach(post => {
    // Create a simple hash based on title + approximate date
    // This helps identify the same content posted across platforms
    const dateKey = new Date(post.publishedAt).toISOString().split('T')[0];
    const titleKey = post.title.substring(0, 50).toLowerCase().replace(/\s+/g, '');
    const key = `${titleKey}${dateKey}`;

    if (!dedupMap.has(key)) {
      dedupMap.set(key, {
        ...post,
        platforms: [post.platform]
      });
    } else {
      // Same content on another platform - add platform to list
      const existing = dedupMap.get(key);
      if (!existing.platforms.includes(post.platform)) {
        existing.platforms.push(post.platform);
      }
      // Keep the better thumbnail/data
      if (post.thumbnail && !existing.thumbnail) {
        existing.thumbnail = post.thumbnail;
      }
    }
  });

  return Array.from(dedupMap.values()).slice(0, 12); // Return top 12 unique posts
}

// Main endpoint: Get unified feed
app.get('/api/feed', async (req, res) => {
  try {
    // Check cache first
    const cached = cache.get('chuckleclips_feed');
    if (cached) {
      return res.json(cached);
    }

    // Fetch from all platforms in parallel
    const [youtube, instagram, facebook, tiktok] = await Promise.all([
      fetchYouTubeVideos(),
      fetchInstagramPosts(),
      fetchFacebookPosts(),
      fetchTikTokVideos()
    ]);

    // Combine and deduplicate
    const allPosts = [...youtube, ...instagram, ...facebook, ...tiktok];
    const uniqueFeed = deduplicateContent(allPosts);

    const response = {
      success: true,
      count: uniqueFeed.length,
      lastUpdated: new Date().toISOString(),
      data: uniqueFeed
    };

    // Cache the result
    cache.set('chuckleclips_feed', response);

    res.json(response);
  } catch (error) {
    console.error('Feed error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feed',
      message: error.message
    });
  }
});

// Stats endpoint: Get follower/subscriber counts per platform
app.get('/api/stats', async (req, res) => {
  try {
    const cached = cache.get('chuckleclips_stats');
    if (cached) {
      return res.json(cached);
    }

    const [youtube, instagram, facebook] = await Promise.all([
      fetchYouTubeStats(),
      fetchInstagramStats(),
      fetchFacebookStats()
    ]);

    const response = {
      success: true,
      lastUpdated: new Date().toISOString(),
      data: {
        youtube,
        instagram,
        facebook,
        tiktok: null
      }
    };

    cache.set('chuckleclips_stats', response);

    res.json(response);
  } catch (error) {
    console.error('Stats error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
      message: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎬 Chuckleclips backend running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📺 Feed endpoint: http://localhost:${PORT}/api/feed`);
  console.log(`📊 Stats endpoint: http://localhost:${PORT}/api/stats`);
});
