const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;

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

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const authors = (await kvGet('stats:authors')) || {};
    const ranked = Object.entries(authors)
      .map(([fid, data]) => ({ fid: Number(fid), ...data }))
      .sort((a, b) => b.count - a.count);

    return res.status(200).json({
      totalAuthors: ranked.length,
      topAuthors: ranked.slice(0, 30),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Stats error:', err);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
}
