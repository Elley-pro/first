import fetch from 'node-fetch';

const PLATFORM_URLS = {
  instagram: (handle) => `https://www.instagram.com/${handle}/`,
  tiktok: (handle) => `https://www.tiktok.com/@${handle}`,
  linkedin: (handle) => `https://www.linkedin.com/company/${handle}`,
  twitter: (handle) => `https://twitter.com/${handle}`,
  facebook: (handle) => `https://www.facebook.com/${handle}`,
  youtube: (handle) => `https://www.youtube.com/@${handle}`,
  pinterest: (handle) => `https://www.pinterest.com/${handle}/`,
  reddit: (handle) => `https://www.reddit.com/r/${handle}`,
};

// Phase 4 — social media inventory
// Uses Social Blade's unofficial data endpoint where available, otherwise HEAD-checks the URL.
export async function analyzeSocial(companyName, domain) {
  const companySlug = slugify(companyName);
  const domainSlug = domain.split('.')[0];

  // Try multiple handle variants per platform
  const handleCandidates = dedupeHandles([companySlug, domainSlug]);

  const results = [];

  for (const [platform, urlFn] of Object.entries(PLATFORM_URLS)) {
    for (const handle of handleCandidates) {
      const url = urlFn(handle);
      const exists = await checkUrlExists(url);
      if (exists) {
        const socialBladeData = await fetchSocialBlade(platform, handle);
        results.push({
          platform,
          handle,
          url,
          followers: socialBladeData?.followers ?? null,
          monthlyGrowth: socialBladeData?.monthlyGrowth ?? null,
          uploadFrequency: socialBladeData?.uploadFrequency ?? null,
          adLibraryUrl: getAdLibraryUrl(platform, companyName, handle),
        });
        break; // found a valid handle for this platform
      }
    }
  }

  return rankByImportance(results);
}

async function checkUrlExists(url) {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ProfileBot/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    // A 200 or even a 302 to the same host means it exists; 404/302-to-login means it doesn't
    return res.status < 400;
  } catch {
    return false;
  }
}

async function fetchSocialBlade(platform, handle) {
  // Social Blade has a public stats page we can scrape lightly
  const sbPlatformMap = {
    youtube: 'youtube',
    twitter: 'twitter',
    instagram: 'instagram',
    tiktok: 'tiktok',
    facebook: 'facebook',
  };

  const sbPlatform = sbPlatformMap[platform];
  if (!sbPlatform) return null;

  try {
    const url = `https://socialblade.com/${sbPlatform}/user/${handle}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ProfileBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return parseSocialBlade(html);
  } catch {
    return null;
  }
}

function parseSocialBlade(html) {
  // Extract follower counts from Social Blade page
  const followerMatch = html.match(/id="YouTubeUserFollowersCount"[^>]*>([0-9,]+)/i)
    ?? html.match(/Total Followers[^<]*<\/[^>]+>[^<]*<[^>]+>([0-9,]+)/i)
    ?? html.match(/"followers"\s*:\s*([0-9]+)/i);

  const followers = followerMatch
    ? parseInt(followerMatch[1].replace(/,/g, ''), 10)
    : null;

  return followers !== null ? { followers } : null;
}

function getAdLibraryUrl(platform, companyName, handle) {
  const q = encodeURIComponent(companyName);
  if (platform === 'instagram' || platform === 'facebook') {
    return `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=US&q=${q}`;
  }
  if (platform === 'tiktok') {
    return `https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en?keyword=${q}`;
  }
  if (platform === 'linkedin') {
    return `https://www.linkedin.com/ad-library/search?query=${q}`;
  }
  return null;
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
}

function dedupeHandles(handles) {
  return [...new Set(handles.filter(Boolean))];
}

function rankByImportance(profiles) {
  const order = ['linkedin', 'instagram', 'facebook', 'twitter', 'youtube', 'tiktok', 'pinterest', 'reddit'];
  return profiles.sort((a, b) => order.indexOf(a.platform) - order.indexOf(b.platform));
}
