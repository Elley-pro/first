// Phase 6 — synthesize all phases into a one-page profile

export function synthesize({ companyName, domain, footprint, traffic, search, social, ads }) {
  const dominantChannel = findDominantChannel(traffic?.channelMix);
  const primarySocial = social?.[0] ?? null;
  const apparentGoal = inferGoal(traffic, search, ads);

  return {
    company: companyName,
    domain,
    generatedAt: new Date().toISOString(),

    // One-page profile table
    profile: {
      estimatedMonthlyTraffic: formatTraffic(traffic?.estimatedMonthlyVisits, traffic?.trend),
      dominantChannel: dominantChannel
        ? `${dominantChannel.name} (${dominantChannel.pct}%)`
        : 'unknown',
      channelMix: traffic?.channelMix ?? null,
      seoFocus: extractSeoFocus(search),
      paidSpendSignal: search?.paid?.spendSignal ?? 'none',
      primarySocialPlatform: primarySocial
        ? `${primarySocial.platform} — @${primarySocial.handle}${primarySocial.followers ? ` (${fmtNum(primarySocial.followers)} followers)` : ''}`
        : 'not detected',
      adStrategy: ads?.summary ?? 'not assessed',
      apparentGoal,
    },

    // Full detail sections
    footprint,
    trafficDetail: traffic,
    searchDetail: search,
    socialProfiles: social,
    adsDetail: ads,
  };
}

function findDominantChannel(channelMix) {
  if (!channelMix) return null;
  const entries = Object.entries(channelMix).sort((a, b) => b[1].percentage - a[1].percentage);
  if (!entries.length) return null;
  return { name: entries[0][0], pct: entries[0][1].percentage };
}

function formatTraffic(visits, trend) {
  if (visits == null) return 'unknown';
  return `~${fmtNum(visits)}/mo (${trend ?? 'unknown'})`;
}

function extractSeoFocus(search) {
  const kws = search?.organic?.topKeywords ?? [];
  if (!kws.length) return 'insufficient data';
  // Group keywords into topic clusters by first word
  const topics = {};
  for (const kw of kws) {
    const root = kw.keyword.split(' ')[0];
    topics[root] = (topics[root] ?? 0) + (kw.traffic ?? 1);
  }
  const sorted = Object.entries(topics).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return sorted.map(([t]) => t).join(', ');
}

function inferGoal(traffic, search, ads) {
  const hasPaid = search?.paid?.hasPaidActivity;
  const hasAds = ads?.meta?.activeAdCount > 0;
  const trend = traffic?.trend;

  if (hasPaid && hasAds) return 'acquisition (paid-heavy)';
  if (hasPaid || hasAds) return 'acquisition (mixed)';
  if (trend === 'growing') return 'brand + organic growth';
  if (trend === 'declining') return 'retention / defending share';
  return 'brand / awareness';
}

function fmtNum(n) {
  if (n == null) return '?';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return String(n);
}
