import {
  getTopOrganicKeywords,
  getTopOrganicPages,
  getPaidKeywords,
  getPaidPages,
} from './ahrefs.js';

// Phase 3 — organic + paid search detail
export async function analyzeSearch(domain) {
  const [orgKw, orgPages, paidKw, paidPages] = await Promise.allSettled([
    getTopOrganicKeywords(domain, 20),
    getTopOrganicPages(domain, 10),
    getPaidKeywords(domain, 20),
    getPaidPages(domain, 10),
  ]);

  const organic = {
    topKeywords: extractKeywords(orgKw),
    topPages: extractPages(orgPages),
  };

  const paid = {
    topKeywords: extractKeywords(paidKw),
    topLandingPages: extractPages(paidPages),
    hasPaidActivity: false,
    spendSignal: 'none',
  };

  if (paid.topKeywords.length > 0) {
    paid.hasPaidActivity = true;
    paid.spendSignal = classifySpend(paid.topKeywords);
  }

  return { organic, paid };
}

function extractKeywords(result) {
  if (result.status !== 'fulfilled') return [];
  const items = result.value?.keywords ?? result.value?.data ?? [];
  return items.slice(0, 20).map((k) => ({
    keyword: k.keyword ?? k.query ?? '',
    position: k.position ?? k.rank ?? null,
    traffic: k.traffic ?? k.monthly_traffic ?? null,
    volume: k.volume ?? k.search_volume ?? null,
    cpc: k.cpc ?? null,
  }));
}

function extractPages(result) {
  if (result.status !== 'fulfilled') return [];
  const items = result.value?.pages ?? result.value?.data ?? [];
  return items.slice(0, 10).map((p) => ({
    url: p.url ?? p.page ?? '',
    traffic: p.traffic ?? p.monthly_traffic ?? null,
    keywords: p.keywords_count ?? p.keywords ?? null,
  }));
}

function classifySpend(paidKeywords) {
  const totalTraffic = paidKeywords.reduce((s, k) => s + (k.traffic ?? 0), 0);
  if (totalTraffic > 50000) return 'heavy';
  if (totalTraffic > 10000) return 'active';
  if (totalTraffic > 1000) return 'moderate';
  return 'light';
}
