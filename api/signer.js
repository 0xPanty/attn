import { mnemonicToAccount } from 'viem/accounts';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const FARCASTER_DEVELOPER_MNEMONIC = process.env.FARCASTER_DEVELOPER_MNEMONIC;

const SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN = {
  name: 'Farcaster SignedKeyRequestValidator',
  version: '1',
  chainId: 10,
  verifyingContract: '0x00000000FC700472606ED4fA22623Acf62c60553',
};

const SIGNED_KEY_REQUEST_TYPE = [
  { name: 'requestFid', type: 'uint256' },
  { name: 'key', type: 'bytes' },
  { name: 'deadline', type: 'uint256' },
];

const APP_FID = parseInt(process.env.APP_FID || '275646', 10);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!FARCASTER_DEVELOPER_MNEMONIC) {
    return res.status(500).json({ error: 'Developer mnemonic not configured' });
  }

  try {
    // Step 1: Create signer via Neynar
    const createRes = await fetch('https://api.neynar.com/v2/farcaster/signer/', {
      method: 'POST',
      headers: { 'x-api-key': NEYNAR_API_KEY },
    });
    if (!createRes.ok) {
      const err = await createRes.text();
      console.error('Create signer error:', err);
      return res.status(500).json({ error: 'Failed to create signer' });
    }
    const signer = await createRes.json();

    // Step 2: Sign key request with developer account
    const account = mnemonicToAccount(FARCASTER_DEVELOPER_MNEMONIC);

    const deadline = Math.floor(Date.now() / 1000) + 86400; // 24h

    const signature = await account.signTypedData({
      domain: SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN,
      types: { SignedKeyRequest: SIGNED_KEY_REQUEST_TYPE },
      primaryType: 'SignedKeyRequest',
      message: {
        requestFid: BigInt(APP_FID),
        key: signer.public_key,
        deadline: BigInt(deadline),
      },
    });

    // Step 3: Register signed key
    const registerRes = await fetch(
      'https://api.neynar.com/v2/farcaster/signer/signed_key/',
      {
        method: 'POST',
        headers: {
          'x-api-key': NEYNAR_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signer_uuid: signer.signer_uuid,
          app_fid: APP_FID,
          deadline,
          signature,
        }),
      }
    );

    if (!registerRes.ok) {
      const err = await registerRes.text();
      console.error('Register signed key error:', err);
      return res.status(500).json({ error: 'Failed to register signer' });
    }

    const registered = await registerRes.json();

    return res.status(200).json({
      signerUuid: signer.signer_uuid,
      status: registered.status,
      approvalUrl: registered.signer_approval_url,
    });
  } catch (err) {
    console.error('Signer API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
