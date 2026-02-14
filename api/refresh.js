const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;

const CHANNELS = ['dev', 'ai', 'miniapps', 'build'];
const LANGUAGES = ['en', 'zh', 'ja', 'ko', 'es', 'fr'];

const LANGUAGE_MAP = {
  en: 'English',
  zh: 'Chinese (Simplified)',
  ja: 'Japanese',
  ko: 'Korean',
  es: 'Spanish',
  fr: 'French',
};

async function kvSet(key, value, ttlSeconds) {
  await fetch(`${KV_REST_API_URL}/set/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value, ex: ttlSeconds }),
  });
}

async function fetchChannelCasts(channel) {
  const res = await fetch(
    `https://api.neynar.com/v2/farcaster/feed/channels?channel_ids=${channel}&with_recasts=false&limit=50`,
    { headers: { accept: 'application/json', api_key: NEYNAR_API_KEY } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.casts || []).map((cast) => ({ ...cast, _channel: channel }));
}

function basicFilter(casts) {
  const gmPatterns = /^(gm|gn|gm!|gn!|good morning|good night|hey|hello|hi|👋|🌞|☀️)/i;
  const emojiOnly = /^[\p{Emoji}\s]+$/u;
  return casts.filter((cast) => {
    const text = (cast.text || '').trim();
    if (text.length < 80) return false;
    if (gmPatterns.test(text)) return false;
    if (emojiOnly.test(text)) return false;
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

async function analyzeWithGemini(casts, targetLang) {
  if (casts.length === 0) return [];
  const castsForAnalysis = casts.slice(0, 30);
  const castTexts = castsForAnalysis.map((c, i) => (
    `[${i}] @${c.author?.username || 'unknown'} (/${c._channel}):\n${c.text}\n---`
  )).join('\n');

  const langName = LANGUAGE_MAP[targetLang] || 'English';
  const needsTranslation = targetLang !== 'en';

  const prompt = `You are a signal analyst for Farcaster (a crypto social network).

Below are ${castsForAnalysis.length} posts from developer/AI channels.

Your job:
1. Score each post 1-10 for "information density" (10 = very valuable technical insight, announcement, analysis; 1 = casual chat, self-promotion, no substance)
2. For posts scoring 7+, write a concise 2-3 sentence summary
${needsTranslation ? `3. Translate each summary to ${langName}` : ''}

Return ONLY valid JSON array, no markdown:
[
  {
    "index": 0,
    "score": 8,
    "summary": "English summary here"${needsTranslation ? `,
    "translatedSummary": "Translated summary here"` : ''}
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

  if (!res.ok) return [];
  const data = await res.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  try {
    const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const results = JSON.parse(cleaned);
    return Array.isArray(results) ? results : [];
  } catch {
    return [];
  }
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
      };
    })
    .filter(Boolean);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Fetch all channel casts
    const allCasts = (await Promise.all(CHANNELS.map(fetchChannelCasts))).flat();
    const filtered = basicFilter(allCasts);
    const unique = deduplicate(filtered);

    // Generate signals for each language and cache
    for (const lang of LANGUAGES) {
      const analyses = await analyzeWithGemini(unique, lang);
      const signals = buildSignals(unique, analyses);

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

      // Cache for 35 minutes (slightly longer than cron interval)
      await kvSet(`signals:${lang}`, cacheData, 2100);
    }

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
