// Vercel serverless function. The key lives in the ANTHROPIC_API_KEY environment variable, never in the browser.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ error: 'LLM not configured' });
  const b = req.body || {};
  const payload = JSON.stringify({ invoice: b.invoice, flags: (b.flags || []).slice(0, 6) }).slice(0, 2500);
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: process.env.MODEL || 'claude-haiku-5-5', max_tokens: 220,
        system: 'You assist an Accounts Payable reviewer at a finance company. Explain in at most 3 plain sentences why this invoice was flagged and what the reviewer should check first. Use ONLY the facts in the JSON. Never invent vendors, policies or amounts. You recommend; you never approve, block or release payments.',
        messages: [{ role: 'user', content: payload }]
      })
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: 'upstream error' });
    res.status(200).json({ text: (j.content || []).map(c => c.text || '').join(''), usage: j.usage });
  } catch (e) { res.status(500).json({ error: 'failed' }); }
};
