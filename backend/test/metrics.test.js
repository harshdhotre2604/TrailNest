// Run with: npm test  (CI runs this via `npm test --if-present`)
// No database needed: /api/health answers 503 when MySQL is unreachable, which
// is still a matched route — exactly what the histogram should record.
const { test } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');

test('/metrics records requests by route pattern, not raw URL', async () => {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fetch(`${base}/api/health`);
    await fetch(`${base}/no-such-path-12345`);

    const res = await fetch(`${base}/metrics`);
    assert.strictEqual(res.status, 200);
    const body = await res.text();

    assert.match(body, /process_cpu_user_seconds_total/, 'default Node metrics missing');
    assert.match(body, /http_request_duration_seconds_count\{method="GET",route="\/api\/health\/",status="(200|503)"\} 1/);
    assert.match(body, /route="unmatched",status="404"/, '404s must collapse into one "unmatched" series');
    assert.doesNotMatch(body, /no-such-path-12345/, 'raw URLs must never become label values');
  } finally {
    server.close();
  }
});
