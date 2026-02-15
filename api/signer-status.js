const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { uuid } = req.query;
  if (!uuid) return res.status(400).json({ error: 'Missing signer uuid' });

  try {
    const r = await fetch(`https://api.neynar.com/v2/farcaster/signer/?signer_uuid=${uuid}`, {
      headers: { 'x-api-key': NEYNAR_API_KEY },
    });
    if (!r.ok) return res.status(r.status).json({ error: 'Lookup failed' });
    const data = await r.json();
    return res.status(200).json({ status: data.status, fid: data.fid });
  } catch (err) {
    console.error('Signer status error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
