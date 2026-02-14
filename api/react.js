const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { fid, castHash, type, text } = req.body;

  if (!fid || !castHash || !type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    if (type === 'like') {
      const response = await fetch('https://api.neynar.com/v2/farcaster/reaction', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-api-key': NEYNAR_API_KEY,
        },
        body: JSON.stringify({
          signer_uuid: req.body.signerUuid,
          reaction_type: 'like',
          target: castHash,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error('Neynar like error:', err);
        return res.status(response.status).json({ error: 'Like failed' });
      }

      return res.status(200).json({ success: true });
    }

    if (type === 'reply') {
      if (!text) return res.status(400).json({ error: 'Reply text required' });

      const response = await fetch('https://api.neynar.com/v2/farcaster/cast', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-api-key': NEYNAR_API_KEY,
        },
        body: JSON.stringify({
          signer_uuid: req.body.signerUuid,
          text,
          parent: castHash,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error('Neynar reply error:', err);
        return res.status(response.status).json({ error: 'Reply failed' });
      }

      return res.status(200).json({ success: true });
    }

    if (type === 'recast') {
      const response = await fetch('https://api.neynar.com/v2/farcaster/reaction', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-api-key': NEYNAR_API_KEY,
        },
        body: JSON.stringify({
          signer_uuid: req.body.signerUuid,
          reaction_type: 'recast',
          target: castHash,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error('Neynar recast error:', err);
        return res.status(response.status).json({ error: 'Recast failed' });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid type' });
  } catch (err) {
    console.error('React API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
