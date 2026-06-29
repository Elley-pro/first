import {
  getTrafficOverview,
  getTrafficHistory,
  getTrafficBySource,
} from './ahrefs.js';

// Phase 1 + Phase 2
export async function analyzeTraffic(domain) {
  const [overview, history, bySource] = await Promise.allSettled([
    getTrafficOverview(domain),
    getTrafficHistory(domain),
    getTrafficBySource(domain),
  ]);

  const overviewData = overview.status === 'fulfilled' ? overview.value : null;
  const historyData = history.status === 'fulfilled' ? history.value : null;
  const sourceData = bySource.status === 'fulfilled' ? bySource.value : null;

  const monthlyVisits = extractMonthlyVisits(overviewData);
  const trend = calculateTrend(historyData);
  const channelMix = extractChannelMix(sourceData);

  return {
    estimatedMonthlyVisits: monthlyVisits,
    trend,
    channelMix,
  };
}

function extractMonthlyVisits(overview) {
  if (!overview) return null;
  // Ahrefs v3 overview returns metrics at top level
  const traffic = overview?.metrics?.organic_traffic ?? overview?.organic_traffic ?? null;
  return traffic;
}

function calculateTrend(historyData) {
  if (!historyData) return 'unknown';
  const months = historyData?.metrics ?? historyData?.history ?? [];
  if (months.length < 3) return 'unknown';

  const recent = months.slice(-3).map((m) => m.organic_traffic ?? m.traffic ?? 0);
  const earlier = months.slice(0, 3).map((m) => m.organic_traffic ?? m.traffic ?? 0);

  const recentAvg = avg(recent);
  const earlierAvg = avg(earlier);

  if (earlierAvg === 0) return 'unknown';
  const change = (recentAvg - earlierAvg) / earlierAvg;

  if (change > 0.1) return 'growing';
  if (change < -0.1) return 'declining';
  return 'flat';
}

function extractChannelMix(sourceData) {
  if (!sourceData) return null;

  // Ahrefs v3 traffic-by-source structure
  const channels = sourceData?.traffic_by_source ?? sourceData?.channels ?? [];

  const map = {};
  let total = 0;

  for (const ch of channels) {
    const name = normalizeChannel(ch.source ?? ch.channel ?? '');
    const visits = ch.traffic ?? ch.visits ?? 0;
    map[name] = (map[name] ?? 0) + visits;
    total += visits;
  }

  if (total === 0) return null;

  const result = {};
  for (const [name, visits] of Object.entries(map)) {
    result[name] = {
      visits,
      percentage: +((visits / total) * 100).toFixed(1),
    };
  }
  return result;
}

function normalizeChannel(raw) {
  const lower = raw.toLowerCase();
  if (lower.includes('direct')) return 'direct';
  if (lower.includes('organic') || lower.includes('search')) return 'organic_search';
  if (lower.includes('paid') || lower.includes('cpc')) return 'paid_search';
  if (lower.includes('social')) return 'social';
  if (lower.includes('referral')) return 'referral';
  if (lower.includes('email')) return 'email';
  if (lower.includes('display')) return 'display';
  return lower;
}

function avg(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
