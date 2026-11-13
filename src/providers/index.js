// Provider registry. The pedagogy engine never depends on a provider: providers only
// voice character moves and (optionally) interpret natural-language revision requests.
//   PRIMER_PROVIDER=deterministic (default) | anthropic
// The anthropic provider needs ANTHROPIC_API_KEY. Any provider error falls back to the
// deterministic line and is recorded as a provider-error event.

const deterministic = { name: 'deterministic', voice: null };

function anthropic({ apiKey = process.env.ANTHROPIC_API_KEY, model = process.env.PRIMER_MODEL || 'claude-sonnet-5-5', fetchImpl = globalThis.fetch, baseUrl = 'https://api.anthropic.com' } = {}) {
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is required for PRIMER_PROVIDER=anthropic');
  async function call(system, user, maxTokens = 300) {
    const res = await fetchImpl(baseUrl + '/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
    });
    if (!res.ok) throw new Error('Anthropic API ' + res.status);
    const j = await res.json();
    return (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  }
  return {
    name: 'anthropic:' + model,
    async voice(ctx) {
      const convo = ctx.transcript.map((t) => `${t.role === 'learner' ? 'LEARNER' : t.role.toUpperCase()}: ${t.text}`).join('\n');
      const user = `Recent conversation:\n${convo}\n\nENGINE MOVE: ${ctx.move}\nActive challenge: ${ctx.challenge ? ctx.challenge.line : '(none)'}\nReference line (keep its meaning, rephrase naturally in character): ${ctx.fallback}\nReply with only the character's words.`;
      return call(ctx.prompt, user, 220);
    },
  };
}

function fromEnv() {
  const p = (process.env.PRIMER_PROVIDER || 'deterministic').toLowerCase();
  if (p === 'anthropic') return anthropic();
  return deterministic;
}

module.exports = { deterministic, anthropic, fromEnv };
