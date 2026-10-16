// Run with: npm test  (uses a throwaway database)
process.env.DB_PATH = require('path').join(require('os').tmpdir(), `aqua-test-${process.pid}.db`);
const test = require('node:test');
const assert = require('node:assert');
const app = require('../server/index.js');

let server, base;
test.before(() => new Promise(r => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); }));
test.after(() => server.close());

async function call(path, { method = 'GET', body, cookie } = {}) {
  const res = await fetch(base + path, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
  return { status: res.status, cookie: (res.headers.get('set-cookie') || '').split(';')[0], json: await res.json().catch(() => null), res };
}
const login = async (email, password) => (await call('/api/auth/login', { method: 'POST', body: { email, password } }));

test('rejects bad credentials with a generic message', async () => {
  const r = await login('admin@aquatech.demo', 'nope');
  assert.strictEqual(r.status, 401);
  assert.match(r.json.error, /incorrect/);
  assert.strictEqual((await login('nobody@x.test', 'nope')).json.error, r.json.error); // same message: no user enumeration
});

test('API needs a session', async () => {
  assert.strictEqual((await call('/api/admin/overview')).status, 401);
  assert.strictEqual((await call('/api/me/home')).status, 401);
});

test('role separation: employees cannot use admin API and admins cannot use employee API', async () => {
  const emp = await login('anita.sharma@ismt.demo', 'Employee@123');
  const adm = await login('admin@aquatech.demo', 'Admin@123');
  assert.strictEqual(emp.json.role, 'employee');
  assert.strictEqual((await call('/api/admin/overview', { cookie: emp.cookie })).status, 403);
  assert.strictEqual((await call('/api/me/home', { cookie: adm.cookie })).status, 403);
});

test('quiz answers are never sent to the browser, and scoring is server-side', async () => {
  const emp = await login('anita.sharma@ismt.demo', 'Employee@123');
  const list = (await call('/api/me/training', { cookie: emp.cookie })).json.modules;
  const m = (await call(`/api/me/training/${list[0].id}`, { cookie: emp.cookie })).json;
  assert.ok(m.questions.length > 0);
  assert.ok(m.questions.every(q => !('correct' in q) && !('explanation' in q)));
  const bad = await call(`/api/me/training/${list[0].id}/submit`, { method: 'POST', cookie: emp.cookie, body: { answers: [0] } });
  assert.strictEqual(bad.status, 400);
});

test('a simulated email can only be acted on once', async () => {
  const emp = await login('anita.sharma@ismt.demo', 'Employee@123');
  const inbox = (await call('/api/me/inbox', { cookie: emp.cookie })).json.emails.find(e => e.status === 'delivered');
  assert.ok(inbox, 'seed should leave one live email');
  const first = await call(`/api/me/inbox/${inbox.campaign_id}/report`, { method: 'POST', cookie: emp.cookie });
  assert.strictEqual(first.status, 200);
  const again = await call(`/api/me/inbox/${inbox.campaign_id}/click`, { method: 'POST', cookie: emp.cookie });
  assert.strictEqual(again.status, 409);
});

test('admin can add an employee, duplicates are refused, deactivated users cannot sign in', async () => {
  const adm = await login('admin@aquatech.demo', 'Admin@123');
  const body = { name: 'New Person', email: 'new.person@ismt.demo', department: 'Library', password: 'LongEnough1' };
  const add = await call('/api/admin/employees', { method: 'POST', cookie: adm.cookie, body });
  assert.strictEqual(add.status, 201);
  assert.strictEqual((await call('/api/admin/employees', { method: 'POST', cookie: adm.cookie, body })).status, 409);
  assert.strictEqual((await call('/api/admin/employees', { method: 'POST', cookie: adm.cookie, body: { ...body, email: 'x@y.test', password: 'short' } })).status, 400);
  assert.strictEqual((await login(body.email, body.password)).status, 200);
  await call(`/api/admin/employees/${add.json.id}`, { method: 'PATCH', cookie: adm.cookie, body: { active: false } });
  assert.strictEqual((await login(body.email, body.password)).status, 401);
});

test('compliance report is a CSV and neutralises spreadsheet formulas', async () => {
  const adm = await login('admin@aquatech.demo', 'Admin@123');
  const { csvCell } = require('../server/util');
  assert.strictEqual(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  const res = await fetch(base + '/api/admin/report.csv', { headers: { Cookie: adm.cookie } });
  assert.match(res.headers.get('content-type'), /text\/csv/);
  assert.match(await res.text(), /Risk score/);
});

test('cross-site state-changing requests are blocked', async () => {
  const r = await fetch(base + '/api/auth/logout', { method: 'POST', headers: { Origin: 'https://evil.example' } });
  assert.strictEqual(r.status, 403);
});
