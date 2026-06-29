import fetch from 'node-fetch';

// Phase 5 — Ad creative & strategy
// Queries public ad libraries to surface active creative
export async function analyzeAds(companyName, domain, socialProfiles) {
  const [metaAds, googleAds] = await Promise.allSettled([
    fetchMetaAds(companyName),
    fetchGoogleAdsTransparency(companyName, domain),
  ]);

  const meta = metaAds.status === 'fulfilled' ? metaAds.value : null;
  const google = googleAds.status === 'fulfilled' ? googleAds.value : null;

  return {
    meta,
    google,
    // LinkedIn and TikTok ad libraries require browser interaction; surface manual URLs
    manualChecks: buildManualCheckUrls(companyName, socialProfiles),
    summary: synthesizeAdStrategy(meta, google),
  };
}

// Meta Marketing API — public ad library endpoint (no auth required for active ads)
async function fetchMetaAds(companyName) {
  const url = new URL('https://www.facebook.com/ads/library/api/');
  url.searchParams.set('ad_type', 'ALL');
  url.searchParams.set('country', 'US');
  url.searchParams.set('active_status', 'ACTIVE');
  url.searchParams.set('search_terms', companyName);
  url.searchParams.set('fields', 'id,ad_creative_bodies,ad_creative_link_captions,ad_snapshot_url,delivery_start_time,page_name');
  url.searchParams.set('limit', '25');

  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ProfileBot/1.0)' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return { status: 'unavailable', reason: `HTTP ${res.status}` };
    const data = await res.json();
    const ads = data?.data ?? [];
    return {
      activeAdCount: ads.length,
      longestRunningAds: findLongestRunning(ads),
      formats: detectFormats(ads),
      sampleCopy: extractSampleCopy(ads, 3),
      libraryUrl: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=${encodeURIComponent(companyName)}`,
    };
  } catch (e) {
    return { status: 'unavailable', reason: e.message };
  }
}

// Google Ads Transparency Center — public search (no auth)
async function fetchGoogleAdsTransparency(companyName, domain) {
  // Google doesn't have a public JSON API; surface the manual URL with prefilled query
  return {
    status: 'manual_check_required',
    transparencyCenterUrl: `https://adstransparency.google.com/?region=anywhere&query=${encodeURIComponent(domain)}`,
  };
}

function findLongestRunning(ads) {
  return ads
    .filter((a) => a.delivery_start_time)
    .sort((a, b) => new Date(a.delivery_start_time) - new Date(b.delivery_start_time))
    .slice(0, 3)
    .map((a) => ({
      pageName: a.page_name,
      startDate: a.delivery_start_time,
      snapshotUrl: a.ad_snapshot_url,
    }));
}

function detectFormats(ads) {
  // Heuristic: if creative has video indicators in captions
  const formats = new Set();
  for (const ad of ads) {
    const body = (ad.ad_creative_bodies ?? []).join(' ').toLowerCase();
    if (body.includes('video') || body.includes('watch')) formats.add('video');
    else formats.add('static');
    if ((ad.ad_creative_link_captions ?? []).length > 1) formats.add('carousel');
  }
  return [...formats];
}

function extractSampleCopy(ads, n) {
  return ads
    .slice(0, n)
    .map((ad) => ({
      body: (ad.ad_creative_bodies ?? [])[0]?.slice(0, 200) ?? null,
      cta: (ad.ad_creative_link_captions ?? [])[0] ?? null,
    }))
    .filter((s) => s.body);
}

function buildManualCheckUrls(companyName, socialProfiles) {
  const q = encodeURIComponent(companyName);
  const linkedInProfile = socialProfiles?.find((p) => p.platform === 'linkedin');
  return {
    metaAdLibrary: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=${q}`,
    googleAdsTransparency: `https://adstransparency.google.com/?region=anywhere&query=${q}`,
    tiktokCreativeCenter: `https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en?keyword=${q}`,
    linkedInAdLibrary: linkedInProfile
      ? `https://www.linkedin.com/company/${linkedInProfile.handle}/posts/?feedView=ads`
      : `https://www.linkedin.com/ad-library/search?query=${q}`,
  };
}

function synthesizeAdStrategy(meta, google) {
  const parts = [];

  if (meta?.activeAdCount > 0) {
    parts.push(`${meta.activeAdCount} active Meta ads detected`);
    if (meta.formats?.length) parts.push(`formats: ${meta.formats.join(', ')}`);
    if (meta.longestRunningAds?.length) {
      const oldest = meta.longestRunningAds[0];
      if (oldest?.startDate) parts.push(`longest-running ad since ${oldest.startDate.split('T')[0]}`);
    }
  } else if (meta?.status === 'unavailable') {
    parts.push('Meta ad library check failed (rate-limited or requires browser)');
  } else {
    parts.push('No active Meta ads found');
  }

  parts.push('Google Ads Transparency Center requires manual review');

  return parts.join('. ') + '.';
}
