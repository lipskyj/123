// Shared browser helpers.
window.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
window.api = async (method, url, body) => {
  const headers = { 'content-type': 'application/json' };
  try { const k = sessionStorage.getItem('primerEducatorKey'); if (k) headers['x-educator-key'] = k; } catch {}
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data;
  try { data = await res.json(); } catch { data = { error: 'Unexpected response from server' }; }
  if (!res.ok) { const e = new Error(data.error || 'Request failed'); e.status = res.status; throw e; }
  return data;
};
window.announce = (msg) => { const el = document.getElementById('sr-status'); if (el) { el.textContent = ''; setTimeout(() => { el.textContent = msg; }, 30); } };
