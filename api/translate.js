const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, targetLang } = req.body;

  if (!text || !targetLang) {
    return res.status(400).json({ error: 'Missing text or targetLang' });
  }

  const langMap = {
    en: 'English',
    zh: 'Chinese (Simplified)',
    ja: 'Japanese',
    ko: 'Korean',
    es: 'Spanish',
    fr: 'French',
  };

  const langName = langMap[targetLang] || 'English';

  const prompt = `Translate the following text to ${langName}. Keep crypto/tech terms as-is. Return ONLY the translated text, nothing else.

Text: ${text}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
        }),
      }
    );

    if (!response.ok) {
      return res.status(500).json({ error: 'Gemini API error' });
    }

    const data = await response.json();
    const translated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    return res.status(200).json({ translated });
  } catch (err) {
    console.error('Translate API error:', err);
    return res.status(500).json({ error: 'Translation failed' });
  }
}
