const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const LANGUAGE_MAP = {
  en: 'English',
  zh: 'Chinese (Simplified)',
  ja: 'Japanese',
  ko: 'Korean',
  es: 'Spanish',
  fr: 'French',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, lang } = req.body;
  if (!text || !lang) return res.status(400).json({ error: 'Missing text or lang' });

  const langName = LANGUAGE_MAP[lang] || 'Chinese (Simplified)';

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Translate the following text to ${langName}. Return ONLY the translation, nothing else.\n\n${text}` }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
        }),
      }
    );

    if (!r.ok) return res.status(500).json({ error: 'Translation failed' });
    const data = await r.json();
    const translation = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ translation: translation.trim() });
  } catch (err) {
    console.error('Translate error:', err);
    return res.status(500).json({ error: 'Translation failed' });
  }
}
