const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { fids } = req.query;
  if (!fids) return res.status(400).json({ error: 'Missing fids' });

  try {
    const fidList = fids.split(',').slice(0, 30);
    const allCasts = [];

    const batchSize = 5;
    for (let i = 0; i < fidList.length; i += batchSize) {
      const batch = fidList.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (fid) => {
          const response = await fetch(
            `https://api.neynar.com/v2/farcaster/feed/user/${fid}/casts?limit=10&include_replies=false`,
            { headers: { accept: 'application/json', api_key: NEYNAR_API_KEY } }
          );
          if (!response.ok) return [];
          const data = await response.json();
          return (data.casts || []).map((c) => ({ ...c, _channel: 'following' }));
        })
      );
      allCasts.push(...results.flat());
    }

    return res.status(200).json({ casts: allCasts });
  } catch (err) {
    console.error('User casts error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
