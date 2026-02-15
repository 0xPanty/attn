const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;

async function kvGet(key) {
  try {
    const res = await fetch(`${KV_REST_API_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.result) return null;
    return typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
  } catch {
    return null;
  }
}

async function kvSet(key, value) {
  await fetch(`${KV_REST_API_URL}/set/${encodeURIComponent(key)}?EX=${90 * 24 * 3600}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  });
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const fid = req.query.fid;
  if (!fid) return res.status(400).json({ error: 'Missing fid' });

  const key = `watchlist:${fid}`;

  if (req.method === 'GET') {
    const data = await kvGet(key);
    return res.status(200).json({ watchlist: data || [] });
  }

  if (req.method === 'PUT') {
    const { watchlist } = req.body;
    if (!Array.isArray(watchlist)) return res.status(400).json({ error: 'Invalid watchlist' });
    if (watchlist.length > 10) return res.status(400).json({ error: 'Max 10 users' });
    await kvSet(key, watchlist);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
