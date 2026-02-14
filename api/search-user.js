const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query' });

  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/search?q=${encodeURIComponent(q)}&limit=8`,
      { headers: { accept: 'application/json', api_key: NEYNAR_API_KEY } }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Search failed' });
    }

    const data = await response.json();
    const users = (data.result?.users || []).map((u) => ({
      fid: u.fid,
      username: u.username,
      displayName: u.display_name,
      pfpUrl: u.pfp_url,
      followerCount: u.follower_count || 0,
    }));

    return res.status(200).json({ users });
  } catch (err) {
    console.error('Search user error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
