import { mnemonicToAccount } from 'viem/accounts';

const MNEMONIC = process.env.FARCASTER_DEVELOPER_MNEMONIC;
const DOMAIN = 'attn.ink';
const FID = 275646;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!MNEMONIC) {
    return res.status(500).json({ error: 'FARCASTER_DEVELOPER_MNEMONIC not set' });
  }

  try {
    const account = mnemonicToAccount(MNEMONIC);

    const header = { fid: FID, type: 'custody', key: account.address };
    const payload = { domain: DOMAIN };

    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

    const signatureHex = await account.signMessage({
      message: `${headerB64}.${payloadB64}`,
    });

    const signatureB64 = Buffer.from(signatureHex.slice(2), 'hex').toString('base64url');

    const manifest = {
      accountAssociation: {
        header: headerB64,
        payload: payloadB64,
        signature: signatureB64,
      },
      miniapp: {
        version: '1',
        name: 'Attn.',
        iconUrl: `https://${DOMAIN}/icon.png`,
        homeUrl: `https://${DOMAIN}`,
        splashImageUrl: `https://${DOMAIN}/icon.png`,
        splashBackgroundColor: '#000000',
        subtitle: 'only signal, no noise',
        description: 'AI-powered signal filter for Farcaster. Cuts through noise to surface high-density insights.',
        primaryCategory: 'developer-tools',
        tags: ['ai', 'signal', 'filter', 'farcaster'],
      },
    };

    return res.status(200).json(manifest);
  } catch (err) {
    console.error('Manifest generation error:', err);
    return res.status(500).json({ error: err.message });
  }
}
