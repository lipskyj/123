// Deploy-time wrapper: serves the APK and icons from inside the Worker (no static-assets upload needed).
import app from '../src/index.js';
import { FILES } from './embedded.generated.js';

export default {
  async fetch(request, env, ctx) {
    const f = FILES[new URL(request.url).pathname];
    if (f && (request.method === 'GET' || request.method === 'HEAD')) {
      const bin = Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0));
      return new Response(request.method === 'HEAD' ? null : bin, {
        headers: { 'Content-Type': f.type, 'Content-Length': String(bin.length), 'Cache-Control': 'no-cache' },
      });
    }
    return app.fetch(request, env, ctx);
  },
  scheduled: (e, env, ctx) => app.scheduled(e, env, ctx),
};
