import { NextRequest, NextResponse } from 'next/server';

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * GET /api/ad-creative?platform=Meta&adId=123
 * 
 * Fetches creative assets (image, video thumbnail, headline, body) for an ad.
 * Supports Meta and TikTok.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform') || 'Meta';
  const adId = searchParams.get('adId');

  if (!adId) {
    return NextResponse.json({ success: false, error: 'adId is required' }, { status: 400 });
  }

  try {
    if (platform === 'Meta') {
      return await fetchMetaCreative(adId);
    }
    if (platform === 'TikTok') {
      return await fetchTikTokCreative(adId);
    }
    return NextResponse.json({ success: false, error: `Creative fetch not supported for ${platform}` }, { status: 400 });
  } catch (error: any) {
    console.error(`${platform} creative fetch error:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function fetchMetaCreative(adId: string) {
  const accessToken = process.env.META_ACCESS_TOKEN?.trim();
  if (!accessToken) throw new Error('Missing META_ACCESS_TOKEN');

  // Step 1: Get the ad's creative ID
  const adUrl = `${GRAPH_BASE}/${adId}?fields=creative{id}&access_token=${accessToken}`;
  const adRes = await fetch(adUrl);
  if (!adRes.ok) {
    const err = await adRes.json().catch(() => ({}));
    throw new Error(`Meta ad fetch failed: ${err.error?.message || adRes.statusText}`);
  }
  const adData = await adRes.json();
  const creativeId = adData.creative?.id;

  if (!creativeId) {
    return NextResponse.json({
      success: true,
      data: { platform: 'Meta', adId, imageUrl: null, videoUrl: null, headline: null, body: null, callToAction: null },
    });
  }

  // Step 2: Get creative details (image, video, text)
  // Request image_crops and image_hash for higher resolution
  const creativeUrl = `${GRAPH_BASE}/${creativeId}?fields=name,title,body,image_url,image_hash,thumbnail_url,object_story_spec,asset_feed_spec,effective_object_story_id&access_token=${accessToken}`;
  const creativeRes = await fetch(creativeUrl);
  if (!creativeRes.ok) {
    const err = await creativeRes.json().catch(() => ({}));
    throw new Error(`Meta creative fetch failed: ${err.error?.message || creativeRes.statusText}`);
  }
  const creative = await creativeRes.json();

  // Extract image URL from various possible fields
  let imageUrl = creative.image_url || creative.thumbnail_url || null;
  let thumbnailUrl = creative.thumbnail_url || creative.image_url || null;
  let headline = creative.title || null;
  let body = creative.body || null;
  let videoUrl = null;
  let callToAction = null;

  // If we have an image_hash, fetch the full-size image from adimages
  if (creative.image_hash) {
    try {
      const adAccountId = process.env.META_AD_ACCOUNT_ID?.trim();
      const accountId = adAccountId?.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
      const imgUrl = `${GRAPH_BASE}/${accountId}/adimages?hashes=["${creative.image_hash}"]&fields=url,url_128,url_256,url_256_height,permalink_url&access_token=${accessToken}`;
      const imgRes = await fetch(imgUrl);
      if (imgRes.ok) {
        const imgData = await imgRes.json();
        const imgEntry = imgData.data?.[0];
        if (imgEntry) {
          // url is full resolution, url_128/url_256 are smaller versions
          imageUrl = imgEntry.permalink_url || imgEntry.url || imageUrl;
          thumbnailUrl = imgEntry.url_128 || thumbnailUrl;
        }
      }
    } catch (e) {
      // Fall back to existing imageUrl
    }
  }

  // Try to get from object_story_spec (richer data)
  const storySpec = creative.object_story_spec;
  if (storySpec) {
    if (storySpec.link_data) {
      imageUrl = imageUrl || storySpec.link_data.image_hash ? null : storySpec.link_data.picture;
      headline = headline || storySpec.link_data.name || storySpec.link_data.message;
      body = body || storySpec.link_data.description || storySpec.link_data.message;
      callToAction = storySpec.link_data.call_to_action?.type || null;
    }
    if (storySpec.video_data) {
      imageUrl = imageUrl || storySpec.video_data.image_url;
      headline = headline || storySpec.video_data.title;
      body = body || storySpec.video_data.message;
      callToAction = callToAction || storySpec.video_data.call_to_action?.type || null;
    }
  }

  // Try asset_feed_spec for dynamic creatives
  const feedSpec = creative.asset_feed_spec;
  if (feedSpec) {
    if (!imageUrl && feedSpec.images?.length > 0) {
      imageUrl = feedSpec.images[0].url || null;
    }
    if (!headline && feedSpec.titles?.length > 0) {
      headline = feedSpec.titles[0].text || null;
    }
    if (!body && feedSpec.bodies?.length > 0) {
      body = feedSpec.bodies[0].text || null;
    }
    if (!callToAction && feedSpec.call_to_action_types?.length > 0) {
      callToAction = feedSpec.call_to_action_types[0] || null;
    }
    if (feedSpec.videos?.length > 0) {
      videoUrl = feedSpec.videos[0].thumbnail_url || null;
    }
  }

  // Meta CDN URLs often have an stp= param that forces a tiny thumbnail (e.g. p64x64).
  // Strip it to get full resolution, and create a medium thumbnail from it.
  const stripStpParam = (url: string | null): string | null => {
    if (!url) return null;
    try {
      const u = new URL(url);
      const stp = u.searchParams.get('stp');
      if (stp && stp.includes('p64x64')) {
        // Remove the stp param entirely for full res
        u.searchParams.delete('stp');
        return u.toString();
      }
      return url;
    } catch {
      return url;
    }
  };

  const makeThumbnailUrl = (url: string | null): string | null => {
    if (!url) return null;
    try {
      const u = new URL(url);
      // Set stp to a reasonable thumbnail size
      u.searchParams.set('stp', 'dst-emg0_p128x128_q75');
      return u.toString();
    } catch {
      return url;
    }
  };

  const fullImageUrl = stripStpParam(imageUrl) || imageUrl;
  const thumbUrl = makeThumbnailUrl(imageUrl) || thumbnailUrl;

  return NextResponse.json({
    success: true,
    data: {
      platform: 'Meta',
      adId,
      creativeId,
      imageUrl: fullImageUrl,
      thumbnailUrl: thumbUrl,
      videoUrl,
      headline,
      body,
      callToAction: callToAction?.replace(/_/g, ' ') || null,
    },
  });
}

async function fetchTikTokCreative(adId: string) {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN?.trim();
  const advertiserId = process.env.TIKTOK_ADVERTISER_ID?.trim();
  if (!accessToken || !advertiserId) throw new Error('Missing TikTok credentials');

  // Fetch ad details including creative info
  const url = new URL('https://business-api.tiktok.com/open_api/v1.3/ad/get/');
  url.searchParams.set('advertiser_id', advertiserId);
  url.searchParams.set('filtering', JSON.stringify({ ad_ids: [adId] }));
  url.searchParams.set('fields', JSON.stringify(['ad_id', 'ad_name', 'ad_text', 'image_ids', 'video_id', 'call_to_action', 'landing_page_url']));

  const res = await fetch(url.toString(), {
    headers: { 'Access-Token': accessToken },
  });

  if (!res.ok) throw new Error(`TikTok API ${res.status}`);
  const json = await res.json();
  
  if (json.code !== 0) throw new Error(`TikTok API error: ${json.message}`);

  const ad = json.data?.list?.[0];
  if (!ad) {
    return NextResponse.json({
      success: true,
      data: { platform: 'TikTok', adId, imageUrl: null, videoUrl: null, headline: null, body: null },
    });
  }

  // If there's a video_id, fetch the video info for thumbnail
  let videoThumbnail = null;
  if (ad.video_id) {
    try {
      const videoUrl = new URL('https://business-api.tiktok.com/open_api/v1.3/file/video/ad/info/');
      videoUrl.searchParams.set('advertiser_id', advertiserId);
      videoUrl.searchParams.set('video_ids', JSON.stringify([ad.video_id]));
      const videoRes = await fetch(videoUrl.toString(), {
        headers: { 'Access-Token': accessToken },
      });
      const videoJson = await videoRes.json();
      if (videoJson.code === 0 && videoJson.data?.list?.[0]) {
        videoThumbnail = videoJson.data.list[0].poster_url || videoJson.data.list[0].preview_url || null;
      }
    } catch (e) {
      // Fail silently — thumbnail is optional
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      platform: 'TikTok',
      adId,
      imageUrl: videoThumbnail,
      videoUrl: null,
      headline: ad.ad_name || null,
      body: ad.ad_text || null,
      callToAction: ad.call_to_action || null,
    },
  });
}
