// node:test reporter that emits a JSON summary of test results (consumed by build-status.js).
export default async function* jsonReporter(source) {
  const tests = [];
  for await (const ev of source) {
    if ((ev.type === 'test:pass' || ev.type === 'test:fail') && ev.data.details && ev.data.nesting === 0 && ev.data.details.type !== 'suite') {
      const file = (ev.data.file || '').replace(/^.*\/tests\//, 'tests/');
      tests.push({
        name: ev.data.name, file, status: ev.type === 'test:pass' ? (ev.data.skip ? 'skip' : 'pass') : 'fail',
        durationMs: Math.round(ev.data.details.duration_ms || 0),
        error: ev.type === 'test:fail' ? String((ev.data.details.error && (ev.data.details.error.cause || ev.data.details.error).message) || ev.data.details.error).slice(0, 400) : null,
      });
    }
  }
  yield JSON.stringify({ generatedAt: new Date().toISOString(), node: process.version, total: tests.length, passed: tests.filter((t) => t.status === 'pass').length, failed: tests.filter((t) => t.status === 'fail').length, tests }, null, 2);
}
