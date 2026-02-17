const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;

const CHANNELS = ['dev', 'ai', 'miniapps', 'build'];
const HEAT_ORDER = { red: 0, yellow: 1, green: 2 };
function signalSort(a, b) {
  const ha = HEAT_ORDER[a.heat] ?? 2;
  const hb = HEAT_ORDER[b.heat] ?? 2;
  if (ha !== hb) return ha - hb;
  return b.score - a.score;
}

const LANGUAGE_MAP = {
  en: 'English',
  zh: 'Chinese (Simplified)',
  ja: 'Japanese',
  ko: 'Korean',
  fa: 'Persian (Farsi)',
};

// --- Try reading from KV cache first ---
async function kvGet(key) {
  try {
    const res = await fetch(`${KV_REST_API_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    let result = data.result;
    if (!result) return null;
    // Unwrap: Upstash may return string or nested object
    if (typeof result === 'string') {
      try { result = JSON.parse(result); } catch { return null; }
    }
    // Handle case where result has a .value wrapper
    if (result.value && !result.signals) {
      result = typeof result.value === 'string' ? JSON.parse(result.value) : result.value;
    }
    return result;
  } catch {
    return null;
  }
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
    'https://api.neynar.com/v2/farcaster/feed/?feed_type=filter&filter_type=global_trending&limit=50',
    { headers: { accept: 'application/json', 'x-api-key': NEYNAR_API_KEY } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.casts || []).map((cast) => ({ ...cast, _channel: 'trending' }));
}

// --- Fallback: live fetch if no cache ---
async function fetchChannelCasts(channel) {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const res = await fetch(
    `https://api.neynar.com/v2/farcaster/feed/channels?channel_ids=${channel}&with_recasts=false&limit=15`,
    { headers: { accept: 'application/json', 'x-api-key': NEYNAR_API_KEY } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const casts = (data.casts || []).map((cast) => ({ ...cast, _channel: channel }));
  return casts.filter((c) => new Date(c.timestamp || 0).getTime() > oneDayAgo);
}

async function fetchUserCasts(fids) {
  if (!fids || fids.length === 0) return [];
  const allCasts = [];
  const batchSize = 5;
  for (let i = 0; i < fids.length; i += batchSize) {
    const batch = fids.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (fid) => {
        try {
          const response = await fetch(
            `https://api.neynar.com/v2/farcaster/feed/user/${fid}/casts?limit=10&include_replies=false`,
            { headers: { accept: 'application/json', 'x-api-key': NEYNAR_API_KEY } }
          );
          if (!response.ok) return [];
          const data = await response.json();
          return (data.casts || []).map((c) => ({ ...c, _channel: 'following' }));
        } catch {
          return [];
        }
      })
    );
    allCasts.push(...results.flat());
  }
  return allCasts;
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
    const neynarScore = cast.author?.experimental?.neynar_user_score ?? 1;
    if (neynarScore < 0.5) return false;
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
  return sampled.slice(0, 30);
}

async function fetchTopReplies(castHash, limit = 5) {
  try {
    const neynarHeaders = { accept: 'application/json', 'x-api-key': NEYNAR_API_KEY };
    const emojiOnly = /^[\p{Emoji}\p{Emoji_Presentation}\p{Emoji_Modifier}\p{Emoji_Component}\s]*$/u;
    const lowValue = /^(gm|gn|gm!|gn!|good morning|good night|hey|hello|hi|wow|lol|lmao|nice|based|fr|facts|this|same|true|rip|lfg|wagmi|ngmi|ser|fren|💯|🔥|👀|😂|🫡|👆|💀|☠️|🤝|w|L)\s*$/i;

    const [repliesRes, quotesRes] = await Promise.all([
      fetch(`https://api.neynar.com/v2/farcaster/cast/conversation?identifier=${castHash}&type=hash&reply_depth=1&limit=20`, { headers: neynarHeaders }),
      fetch(`https://api.neynar.com/v2/farcaster/cast/quotes/${castHash}?limit=15`, { headers: neynarHeaders }),
    ]);

    const replies = (repliesRes.ok ? (await repliesRes.json()).conversation?.cast?.direct_replies || [] : []).map((r) => ({ ...r, _isQuote: false }));
    const quotes = (quotesRes.ok ? (await quotesRes.json()).casts || [] : []).map((r) => ({ ...r, _isQuote: true }));

    const all = [...replies, ...quotes];
    const seen = new Set();
    const sorted = all
      .filter((r) => {
        if (seen.has(r.hash)) return false;
        seen.add(r.hash);
        const text = (r.text || '').trim();
        return text.length > 10 && !emojiOnly.test(text) && !lowValue.test(text);
      })
      .sort((a, b) => (b.author?.follower_count || 0) - (a.author?.follower_count || 0))
      .slice(0, limit);

    const structured = sorted.map((r) => {
      const followers = r.author?.follower_count || 0;
      const nScore = r.author?.experimental?.neynar_user_score ?? 0;
      const isKol = followers >= 50000 && nScore >= 0.9;
      return {
        username: r.author?.username || '?',
        followers,
        text: (r.text || '').slice(0, 150),
        isKol,
        isQuote: !!r._isQuote,
        hash: r.hash || '',
      };
    });

    const forGemini = sorted.map((r) => {
      const followers = r.author?.follower_count || 0;
      const nScore = r.author?.experimental?.neynar_user_score ?? 0;
      const tag = (followers >= 50000 && nScore >= 0.9) ? '[KOL]' : followers >= 5000 ? '[notable]' : '';
      const quoteTag = r._isQuote ? '[quote] ' : '';
      return `  ${quoteTag}${tag}@${r.author?.username || '?'} (${followers} followers, credibility:${nScore.toFixed(2)}): ${(r.text || '').slice(0, 150)}`;
    });

    return { forGemini, structured };
  } catch {
    return { forGemini: [], structured: [] };
  }
}

async function analyzeWithGemini(casts, targetLang) {
  if (casts.length === 0) return { analyses: [], replyData: {} };
  const castsForAnalysis = casts.slice(0, 30);

  const highEngagement = castsForAnalysis.filter((c) => (c.replies?.count || 0) >= 5);
  const replyData = {};
  await Promise.all(
    highEngagement.slice(0, 10).map(async (c) => {
      replyData[c.hash] = await fetchTopReplies(c.hash);
    })
  );

  const castTexts = castsForAnalysis.map((c, i) => {
    const likes = c.reactions?.likes_count || 0;
    const replies = c.replies?.count || 0;
    const recasts = c.reactions?.recasts_count || 0;
    let text = `[${i}] @${c.author?.username || 'unknown'} (/${c._channel}) [♥${likes} 💬${replies} 🔁${recasts}]:\n${c.text}`;
    const rd = replyData[c.hash];
    if (rd && rd.forGemini.length > 0) {
      text += `\n[Top replies from community]\n${rd.forGemini.join('\n')}`;
    }
    text += '\n---';
    return text;
  }).join('\n');

  const langName = LANGUAGE_MAP[targetLang] || 'English';
  const needsTranslation = targetLang !== 'en';

  const prompt = `You are a signal analyst for Farcaster (a crypto social network).

Below are ${castsForAnalysis.length} posts from trending feed, developer/AI channels, and followed users.

Your job:
1. Score each post 1-10 for "information density" (10 = very valuable technical insight, announcement, analysis; 1 = casual chat, self-promotion, no substance)
   Score 1-3 for: airdrops, token promotions, "follow these accounts", shill posts, giveaways, hashtag spam, referral links, anything asking users to claim/mint/buy tokens, selling source code or IP, "DM me", self-promotional product launches disguised as technical posts, AI-generated summaries of other people's content without original insight, pure news reposting with bullet points but no personal analysis
2. For posts scoring 7+, write a concise 2-3 sentence English summary
3. For posts scoring 7+, assign a "heat" level based on EVENT SEVERITY. Use BOTH the post content AND community replies + engagement metrics to judge:
   - "red": security incidents, hacks, exploits, scams, account compromises, protocol failures, rug pulls. IMPORTANT: even if the original post looks normal, check community replies. Mark RED only when ALL conditions are met: (1) at least 1 [KOL] user (50k+ followers, credibility ≥ 0.9 — these are genuinely well-known Farcaster figures, not just mutual-follow accounts) confirms the issue, AND (2) at least 2 other users corroborate. Without KOL confirmation, use yellow at most.
   - "yellow": important announcements, major launches, significant debates, controversial decisions, breaking news. Posts with unusually high engagement relative to content = worth flagging yellow.
   - "green": normal high-quality content, technical insights, tutorials, thoughtful analysis
${needsTranslation ? `4. Translate each summary to ${langName}
5. For posts with heat "red" or "yellow" that have [Top replies], translate each reply text to ${langName} and include as "translatedReplies" array (same order as replies appear)` : ''}

Return ONLY valid JSON array, no markdown:
[
  {
    "index": 0,
    "score": 8,
    "heat": "green",
    "summary": "English summary here"${needsTranslation ? `,
    "translatedSummary": "${langName} translation here",
    "translatedReplies": ["translated reply 1", "translated reply 2"]` : ''}
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
        generationConfig: { temperature: 0, maxOutputTokens: 8192 },
      }),
    }
  );

  if (!res.ok) return { analyses: [], replyData };
  const data = await res.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  try {
    const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const results = JSON.parse(cleaned);
    return { analyses: Array.isArray(results) ? results : [], replyData };
  } catch {
    return { analyses: [], replyData };
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
      if (!qc.author?.username) continue;
      return {
        hash: qc.hash || '',
        author: {
          username: qc.author.username,
          displayName: qc.author.display_name || qc.author.displayName || qc.author.username,
          pfpUrl: qc.author.pfp_url || qc.author.pfpUrl || '',
        },
        text: qc.text || '',
      };
    }
  }
  return null;
}

function buildSignals(casts, analyses, replyData) {
  return analyses
    .filter((a) => a.score >= 7)
    .sort((a, b) => {
      const ha = HEAT_ORDER[a.heat] ?? 2;
      const hb = HEAT_ORDER[b.heat] ?? 2;
      if (ha !== hb) return ha - hb;
      return b.score - a.score;
    })
    .map((analysis) => {
      const cast = casts[analysis.index];
      if (!cast) return null;
      const likes = cast.reactions?.likes_count || 0;
      const replies = cast.replies?.count || 0;
      const recasts = cast.reactions?.recasts_count || 0;
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
        heat: ['red', 'yellow', 'green'].includes(analysis.heat) ? analysis.heat : 'green',
        communityReactions: (() => {
          const h = ['red', 'yellow', 'green'].includes(analysis.heat) ? analysis.heat : 'green';
          if (h === 'green') return undefined;
          const rd = replyData[cast.hash];
          if (!rd?.structured?.length) return undefined;
          const translated = analysis.translatedReplies || [];
          return rd.structured.map((r, i) => ({
            ...r,
            translatedText: translated[i] || null,
          }));
        })(),
        likes,
        replies,
        recasts,
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
    const lang = req.query.lang || 'en';
    const fids = req.query.fids ? req.query.fids.split(',').map(Number).filter(Boolean) : [];

    // Try cache first
    const cached = await kvGet(`signals:${lang}`);
    if (cached && cached.signals && fids.length === 0) {
      cached.meta = cached.meta || {};
      cached.meta.cached = true;
      return res.status(200).json(cached);
    }

    // Has watchlist — use cached base signals + cached watchlist signals
    if (cached && cached.signals && fids.length > 0) {
      const watchlistCacheKey = `signals:watchlist:${[...fids].sort().join(',')}:${lang}`;
      const watchlistCached = await kvGet(watchlistCacheKey);

      let watchlistSignals = [];
      if (watchlistCached && watchlistCached.signals) {
        watchlistSignals = watchlistCached.signals;
      } else {
        // No watchlist cache — fetch and cache for 30 min
        const userCasts = await fetchUserCasts(fids);
        const filtered = basicFilter(userCasts);
        const unique = deduplicate(filtered);
        if (unique.length > 0) {
          const { analyses, replyData } = await analyzeWithGemini(unique, lang);
          watchlistSignals = buildSignals(unique, analyses, replyData);
          await kvSet(watchlistCacheKey, JSON.stringify({ signals: watchlistSignals }), 1800);
        }
      }

      const allSignals = [...watchlistSignals, ...cached.signals]
        .sort(signalSort);
      const seen = new Set();
      const deduped = allSignals.filter((s) => {
        if (seen.has(s.hash)) return false;
        seen.add(s.hash);
        return true;
      });
      return res.status(200).json({ signals: deduped, meta: { ...cached.meta, cached: true, watchlistFids: fids } });
    }

    // No cache at all — full live fetch
    const [trendingCasts, channelCasts, userCasts] = await Promise.all([
      fetchGlobalTrending(),
      Promise.all(CHANNELS.map(fetchChannelCasts)).then((r) => r.flat()),
      fetchUserCasts(fids),
    ]);

    const allCasts = [...trendingCasts, ...channelCasts, ...userCasts];
    const filtered = basicFilter(allCasts);
    const unique = deduplicate(filtered);
    const candidates = stratifiedSample(unique);
    const { analyses, replyData } = await analyzeWithGemini(candidates, lang);
    const signals = buildSignals(candidates, analyses, replyData);

    return res.status(200).json({
      signals,
      meta: {
        totalFetched: allCasts.length,
        afterFilter: filtered.length,
        afterDedup: unique.length,
        finalSignals: signals.length,
        channels: CHANNELS,
        watchlistFids: fids,
        language: lang,
        cached: false,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Signal API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
