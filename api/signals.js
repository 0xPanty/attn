const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const CHANNELS = ['dev', 'ai', 'miniapps', 'build'];

const LANGUAGE_MAP = {
  en: 'English',
  zh: 'Chinese (Simplified)',
  ja: 'Japanese',
  ko: 'Korean',
  es: 'Spanish',
  fr: 'French',
};

// --- Step 1: Fetch casts from Neynar ---
async function fetchChannelCasts(channel) {
  const res = await fetch(
    `https://api.neynar.com/v2/farcaster/feed/channels?channel_ids=${channel}&with_recasts=false&limit=50`,
    { headers: { accept: 'application/json', api_key: NEYNAR_API_KEY } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.casts || []).map((cast) => ({ ...cast, _channel: channel }));
}

// --- Step 2: Basic filter (remove short, gm, emoji-only) ---
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

// --- Step 3: Deduplicate by hash ---
function deduplicate(casts) {
  const seen = new Set();
  return casts.filter((cast) => {
    if (seen.has(cast.hash)) return false;
    seen.add(cast.hash);
    return true;
  });
}

// --- Step 4: Ask Gemini to score and summarize ---
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

  if (!res.ok) {
    console.error('Gemini API error:', res.status);
    return [];
  }

  const data = await res.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  try {
    const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const results = JSON.parse(cleaned);
    return Array.isArray(results) ? results : [];
  } catch {
    console.error('Failed to parse Gemini response');
    return [];
  }
}

// --- Step 5: Build final signal objects ---
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

// --- Main handler ---
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const lang = req.query.lang || 'en';

    const allCasts = (
      await Promise.all(CHANNELS.map(fetchChannelCasts))
    ).flat();

    const filtered = basicFilter(allCasts);
    const unique = deduplicate(filtered);
    const analyses = await analyzeWithGemini(unique, lang);
    const signals = buildSignals(unique, analyses);

    return res.status(200).json({
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
  } catch (err) {
    console.error('Signal API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
