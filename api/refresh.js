const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;

const CHANNELS = ['dev', 'ai', 'miniapps', 'build'];
const LANGUAGES = ['en', 'zh'];

const LANGUAGE_MAP = {
  en: 'English',
  zh: 'Chinese (Simplified)',
  ja: 'Japanese',
  ko: 'Korean',
  es: 'Spanish',
  fr: 'French',
};

async function kvGet(key) {
  try {
    const res = await fetch(`${KV_REST_API_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    let result = data.result;
    if (!result) return null;
    if (typeof result === 'string') {
      try { result = JSON.parse(result); } catch { return null; }
    }
    if (result.value && !result.authors) {
      result = typeof result.value === 'string' ? JSON.parse(result.value) : result.value;
    }
    return result;
  } catch {
    return null;
  }
}

async function updateAuthorStats(signals) {
  if (!signals || signals.length === 0) return;
  const existing = (await kvGet('stats:authors')) || {};
  for (const s of signals) {
    const fid = String(s.author?.fid);
    if (!fid || fid === '0') continue;
    if (!existing[fid]) {
      existing[fid] = { username: s.author.username, displayName: s.author.displayName, count: 0, lastSeen: null };
    }
    existing[fid].count += 1;
    existing[fid].lastSeen = new Date().toISOString();
    existing[fid].username = s.author.username;
    existing[fid].displayName = s.author.displayName;
  }
  // Keep stats for 30 days
  await kvSet('stats:authors', JSON.stringify(existing), 30 * 24 * 60 * 60);
}

async function kvSet(key, value, ttlSeconds) {
  const res = await fetch(`${KV_REST_API_URL}/set/${encodeURIComponent(key)}?EX=${ttlSeconds}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: value,
  });
  if (!res.ok) {
    console.error('KV SET failed:', res.status, await res.text());
  }
}

async function fetchGlobalTrending() {
  const res = await fetch(
    'https://api.neynar.com/v2/farcaster/feed/?feed_type=filter&filter_type=global_trending&limit=100',
    { headers: { accept: 'application/json', 'x-api-key': NEYNAR_API_KEY } }
  );
  if (!res.ok) {
    console.error('Global trending fetch failed:', res.status);
    return [];
  }
  const data = await res.json();
  return (data.casts || []).map((cast) => ({ ...cast, _channel: 'trending' }));
}

async function fetchChannelCasts(channel) {
  const res = await fetch(
    `https://api.neynar.com/v2/farcaster/feed/channels?channel_ids=${channel}&with_recasts=false&limit=50`,
    { headers: { accept: 'application/json', 'x-api-key': NEYNAR_API_KEY } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.casts || []).map((cast) => ({ ...cast, _channel: channel }));
}

function basicFilter(casts) {
  const gmPatterns = /^(gm|gn|gm!|gn!|good morning|good night|hey|hello|hi|👋|🌞|☀️)/i;
  const emojiOnly = /^[\p{Emoji}\s]+$/u;
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return casts.filter((cast) => {
    const text = (cast.text || '').trim();
    if (text.length < 80) return false;
    if (gmPatterns.test(text)) return false;
    if (emojiOnly.test(text)) return false;
    const castTime = new Date(cast.timestamp || 0).getTime();
    if (castTime < oneDayAgo) return false;
    return true;
  });
}

function deduplicate(casts) {
  const seen = new Set();
  return casts.filter((cast) => {
    if (seen.has(cast.hash)) return false;
    seen.add(cast.hash);
    return true;
  });
}

function engagementScore(cast) {
  const base = (cast.replies?.count || 0) * 2 + (cast.reactions?.likes_count || 0);
  const hoursAgo = (Date.now() - new Date(cast.timestamp || 0).getTime()) / 3600000;
  const recency = Math.max(0, 1 - hoursAgo / 24);
  return base + recency * 5;
}

function stratifiedSample(casts) {
  const channelCasts = casts.filter((c) => c._channel !== 'trending' && c._channel !== 'following');
  const trendingCasts = casts.filter((c) => c._channel === 'trending');
  const userCasts = casts.filter((c) => c._channel === 'following');

  const sortByEng = (a, b) => engagementScore(b) - engagementScore(a);
  channelCasts.sort(sortByEng);
  trendingCasts.sort(sortByEng);
  userCasts.sort(sortByEng);

  const sampled = [
    ...channelCasts.slice(0, 15),
    ...trendingCasts.slice(0, 10),
    ...userCasts.slice(0, 5),
  ];

  sampled.sort(sortByEng);
  const top = sampled.slice(0, 25);
  const rest = sampled.slice(25);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [...top, ...rest.slice(0, 5)];
}

async function analyzeWithGemini(casts, languages) {
  if (casts.length === 0) return {};
  const castsForAnalysis = casts.slice(0, 30);
  const castTexts = castsForAnalysis.map((c, i) => (
    `[${i}] @${c.author?.username || 'unknown'} (/${c._channel}):\n${c.text}\n---`
  )).join('\n');

  const transLangs = languages.filter((l) => l !== 'en');
  const transFields = transLangs.map((l) => `"summary_${l}": "${LANGUAGE_MAP[l]} translation"`).join(',\n    ');

  const prompt = `You are a signal analyst for Farcaster (a crypto social network).

Below are ${castsForAnalysis.length} posts from trending feed, developer/AI channels, and followed users.

Your job:
1. Score each post 1-10 for "information density" (10 = very valuable technical insight, announcement, analysis; 1 = casual chat, self-promotion, no substance)
   Score 1-3 for: airdrops, token promotions, "follow these accounts", shill posts, giveaways, hashtag spam, referral links, anything asking users to claim/mint/buy tokens, selling source code or IP, "DM me", self-promotional product launches disguised as technical posts
2. For posts scoring 7+, write a concise 2-3 sentence English summary
3. Translate each summary to: ${transLangs.map((l) => LANGUAGE_MAP[l]).join(', ')}

Return ONLY valid JSON array, no markdown:
[
  {
    "index": 0,
    "score": 8,
    "summary": "English summary here",
    ${transFields}
  }
]

Only include posts with score >= 7. Skip the rest entirely.

Posts:
${castTexts}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
      }),
    }
  );

  if (!res.ok) return {};
  const data = await res.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  try {
    const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const results = JSON.parse(cleaned);
    return Array.isArray(results) ? results : {};
  } catch {
    return {};
  }
}

function extractImages(cast) {
  const images = [];
  for (const embed of (cast.embeds || [])) {
    const url = embed.url || embed.uri || '';
    if (/\.(jpg|jpeg|png|gif|webp)/i.test(url) || url.includes('imagedelivery.net')) {
      images.push(url);
    }
  }
  return images;
}

function extractQuotedCast(cast) {
  for (const embed of (cast.embeds || [])) {
    if (embed.cast) {
      const qc = embed.cast;
      return {
        hash: qc.hash || '',
        author: {
          username: qc.author?.username || 'unknown',
          displayName: qc.author?.display_name || qc.author?.displayName || 'Unknown',
          pfpUrl: qc.author?.pfp_url || qc.author?.pfpUrl || '',
        },
        text: qc.text || '',
      };
    }
  }
  return null;
}

function buildSignals(casts, analyses) {
  return analyses
    .filter((a) => a.score >= 7)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((analysis) => {
      const cast = casts[analysis.index];
      if (!cast) return null;
      return {
        id: cast.hash,
        hash: cast.hash,
        author: {
          fid: cast.author?.fid || 0,
          username: cast.author?.username || 'unknown',
          displayName: cast.author?.display_name || 'Unknown',
          pfpUrl: cast.author?.pfp_url || '',
        },
        text: cast.text || '',
        summary: analysis.summary || '',
        translatedSummary: analysis.translatedSummary || null,
        channel: cast._channel || 'unknown',
        score: analysis.score,
        likes: cast.reactions?.likes_count || 0,
        replies: cast.replies?.count || 0,
        recasts: cast.reactions?.recasts_count || 0,
        timestamp: cast.timestamp || new Date().toISOString(),
        originalUrl: `https://warpcast.com/${cast.author?.username || 'unknown'}/${cast.hash?.slice(0, 10) || ''}`,
        images: extractImages(cast),
        quotedCast: extractQuotedCast(cast),
      };
    })
    .filter(Boolean);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Fetch trending + channel casts
    const [trendingCasts, ...channelResults] = await Promise.all([
      fetchGlobalTrending(),
      ...CHANNELS.map(fetchChannelCasts),
    ]);
    const allCasts = [...trendingCasts, ...channelResults.flat()];
    const filtered = basicFilter(allCasts);
    const unique = deduplicate(filtered);
    const candidates = stratifiedSample(unique);

    // Single Gemini call for all languages
    const analyses = await analyzeWithGemini(candidates, LANGUAGES);
    if (!Array.isArray(analyses)) {
      return res.status(500).json({ error: 'Gemini analysis failed' });
    }

    // Build and cache signals for each language
    let firstSignals = [];
    for (const lang of LANGUAGES) {
      const langAnalyses = analyses.map((a) => ({
        ...a,
        translatedSummary: lang !== 'en' ? (a[`summary_${lang}`] || null) : null,
      }));
      const signals = buildSignals(candidates, langAnalyses);
      if (lang === LANGUAGES[0]) firstSignals = signals;

      const cacheData = JSON.stringify({
        signals,
        meta: {
          totalFetched: allCasts.length,
          afterFilter: filtered.length,
          afterDedup: unique.length,
          finalSignals: signals.length,
          channels: CHANNELS,
          language: lang,
          timestamp: new Date().toISOString(),
        },
      });

      await kvSet(`signals:${lang}`, cacheData, 2400);
    }

    // Track author stats
    await updateAuthorStats(firstSignals);

    return res.status(200).json({
      success: true,
      languages: LANGUAGES,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Refresh error:', err);
    return res.status(500).json({ error: 'Refresh failed' });
  }
}
