const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { db, log } = require('../db');
const { requireAuth, requireRole } = require('../auth');
const { scoreFor, band, csvCell } = require('../util');

router.use(requireAuth, requireRole('admin'));

const str = (v, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const departments = () => db.prepare("SELECT DISTINCT department d FROM users WHERE role='employee' ORDER BY d").all().map(r => r.d);

function employeeRows() {
  return db.prepare("SELECT id,name,email,department,active,created_at FROM users WHERE role='employee' ORDER BY name").all()
    .map(u => {
      const a = db.prepare('SELECT COUNT(*) total, SUM(completed_at IS NOT NULL) done FROM assignments WHERE user_id=?').get(u.id);
      const s = scoreFor(u.id);
      return { ...u, assigned: a.total, completed: a.done || 0, risk: s, band: band(s) };
    });
}

router.get('/overview', (req, res) => {
  const emps = employeeRows().filter(e => e.active);
  const scored = emps.filter(e => e.risk !== null);
  const avg = scored.length ? Math.round(scored.reduce((t, e) => t + e.risk, 0) / scored.length) : null;
  const a = db.prepare('SELECT COUNT(*) total, SUM(completed_at IS NOT NULL) done FROM assignments a JOIN users u ON u.id=a.user_id WHERE u.active=1').get();
  const sim = db.prepare("SELECT COUNT(*) n, SUM(status='clicked') c, SUM(status='reported') r FROM sim_results s JOIN users u ON u.id=s.user_id WHERE u.active=1").get();
  const byDept = departments().map(d => {
    const m = emps.filter(e => e.department === d);
    const sc = m.filter(e => e.risk !== null);
    const risk = sc.length ? Math.round(sc.reduce((t, e) => t + e.risk, 0) / sc.length) : null;
    return { department: d, staff: m.length, risk, band: band(risk) };
  }).filter(d => d.staff > 0);
  const trend = db.prepare(`SELECT c.id, c.name, c.launched_at, COUNT(*) n, SUM(r.status='clicked') clicked, SUM(r.status='reported') reported
    FROM campaigns c JOIN sim_results r ON r.campaign_id=c.id WHERE c.status='closed' GROUP BY c.id ORDER BY c.launched_at`).all()
    .map(t => ({ name: t.name, date: t.launched_at.slice(0, 10), clickRate: Math.round(100 * t.clicked / t.n), reportRate: Math.round(100 * t.reported / t.n) }));
  res.json({
    employees: emps.length, orgRisk: avg, band: band(avg),
    completionRate: a.total ? Math.round(100 * (a.done || 0) / a.total) : 0,
    clickRate: sim.n ? Math.round(100 * (sim.c || 0) / sim.n) : 0,
    reportRate: sim.n ? Math.round(100 * (sim.r || 0) / sim.n) : 0,
    activeCampaigns: db.prepare("SELECT COUNT(*) n FROM campaigns WHERE status='active'").get().n,
    byDept, trend,
    atRisk: scored.filter(e => e.risk < 60).sort((x, y) => x.risk - y.risk).slice(0, 5).map(e => ({ name: e.name, department: e.department, risk: e.risk })),
  });
});

router.get('/employees', (req, res) => res.json({ employees: employeeRows(), departments: departments() }));

router.post('/employees', (req, res) => {
  const name = str(req.body.name), email = str(req.body.email, 160), department = str(req.body.department, 60);
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!name || !department) return res.status(400).json({ error: 'Name and department are required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (db.prepare('SELECT 1 FROM users WHERE email=?').get(email)) return res.status(409).json({ error: 'That email already has an account.' });
  const id = db.prepare('INSERT INTO users (name,email,password_hash,role,department) VALUES (?,?,?,?,?)')
    .run(name, email, bcrypt.hashSync(password, 10), 'employee', department).lastInsertRowid;
  log(req.user.id, 'employee.add', `Added employee ${name}`);
  res.status(201).json({ id: Number(id) });
});

router.patch('/employees/:id', (req, res) => {
  const u = db.prepare("SELECT * FROM users WHERE id=? AND role='employee'").get(req.params.id);
  if (!u) return res.status(404).json({ error: 'Employee not found.' });
  if (typeof req.body.active === 'boolean') {
    db.prepare('UPDATE users SET active=? WHERE id=?').run(req.body.active ? 1 : 0, u.id);
    log(req.user.id, req.body.active ? 'employee.activate' : 'employee.deactivate', `${req.body.active ? 'Reactivated' : 'Deactivated'} ${u.name}`);
  }
  if (req.body.department !== undefined) {
    const d = str(req.body.department, 60);
    if (!d) return res.status(400).json({ error: 'Department cannot be empty.' });
    db.prepare('UPDATE users SET department=? WHERE id=?').run(d, u.id);
    log(req.user.id, 'employee.move', `Moved ${u.name} to ${d}`);
  }
  res.json({ ok: true });
});

router.get('/training', (req, res) => {
  const rows = db.prepare(`SELECT m.id, m.title, m.minutes, COUNT(a.id) assigned, SUM(a.completed_at IS NOT NULL) done, ROUND(AVG(a.score)) avg
    FROM modules m LEFT JOIN assignments a ON a.module_id=m.id LEFT JOIN users u ON u.id=a.user_id AND u.active=1 GROUP BY m.id ORDER BY m.id`).all()
    .map(r => ({ ...r, done: r.done || 0, avg: r.avg ?? null }));
  res.json({ modules: rows, departments: departments() });
});

router.post('/assign', (req, res) => {
  const mod = db.prepare('SELECT * FROM modules WHERE id=?').get(Number(req.body.module_id));
  if (!mod) return res.status(404).json({ error: 'Module not found.' });
  const dept = str(req.body.department, 60) || 'All Staff';
  const due = /^\d{4}-\d{2}-\d{2}$/.test(req.body.due_date || '') ? req.body.due_date : null;
  const targets = db.prepare("SELECT id FROM users WHERE role='employee' AND active=1" + (dept === 'All Staff' ? '' : ' AND department=?')).all(...(dept === 'All Staff' ? [] : [dept]));
  const ins = db.prepare('INSERT OR IGNORE INTO assignments (user_id,module_id,due_date) VALUES (?,?,?)');
  let added = 0;
  db.transaction(() => targets.forEach(t => { added += ins.run(t.id, mod.id, due).changes; }))();
  log(req.user.id, 'assign', `Assigned "${mod.title}" to ${dept} (${added} new)`);
  res.json({ assigned: added, alreadyHad: targets.length - added });
});

router.get('/templates', (req, res) =>
  res.json({ templates: db.prepare('SELECT id,name,from_name,from_email,subject FROM templates ORDER BY id').all(), departments: departments() }));

router.get('/campaigns', (req, res) => {
  const rows = db.prepare(`SELECT c.id,c.name,c.department,c.status,c.launched_at,t.name template,
    COUNT(r.id) targeted, SUM(r.status='clicked') clicked, SUM(r.status='reported') reported
    FROM campaigns c JOIN templates t ON t.id=c.template_id LEFT JOIN sim_results r ON r.campaign_id=c.id
    GROUP BY c.id ORDER BY c.launched_at DESC, c.id DESC`).all();
  res.json({ campaigns: rows.map(r => ({ ...r, clicked: r.clicked || 0, reported: r.reported || 0, ignored: r.targeted - (r.clicked || 0) - (r.reported || 0) })) });
});

router.post('/campaigns', (req, res) => {
  const name = str(req.body.name, 80), dept = str(req.body.department, 60) || 'All Staff';
  const tpl = db.prepare('SELECT * FROM templates WHERE id=?').get(Number(req.body.template_id));
  if (!name) return res.status(400).json({ error: 'Give the campaign a name.' });
  if (!tpl) return res.status(400).json({ error: 'Choose an email template.' });
  const targets = db.prepare("SELECT id FROM users WHERE role='employee' AND active=1" + (dept === 'All Staff' ? '' : ' AND department=?')).all(...(dept === 'All Staff' ? [] : [dept]));
  if (!targets.length) return res.status(400).json({ error: 'No active employees in that department.' });
  let cid;
  db.transaction(() => {
    cid = Number(db.prepare('INSERT INTO campaigns (name,template_id,department,created_by) VALUES (?,?,?,?)').run(name, tpl.id, dept, req.user.id).lastInsertRowid);
    const ins = db.prepare("INSERT INTO sim_results (campaign_id,user_id,status) VALUES (?,?,'delivered')");
    targets.forEach(t => ins.run(cid, t.id));
  })();
  log(req.user.id, 'campaign.create', `Launched campaign "${name}" to ${dept} (${targets.length} staff)`);
  res.status(201).json({ id: cid, targeted: targets.length });
});

router.post('/campaigns/:id/close', (req, res) => {
  const c = db.prepare('SELECT * FROM campaigns WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Campaign not found.' });
  db.prepare("UPDATE campaigns SET status='closed' WHERE id=?").run(c.id);
  log(req.user.id, 'campaign.close', `Closed campaign "${c.name}"`);
  res.json({ ok: true });
});

router.get('/campaigns/:id', (req, res) => {
  const c = db.prepare('SELECT c.*, t.name template, t.subject, t.from_email FROM campaigns c JOIN templates t ON t.id=c.template_id WHERE c.id=?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Campaign not found.' });
  const results = db.prepare('SELECT u.name, u.department, r.status, r.acted_at FROM sim_results r JOIN users u ON u.id=r.user_id WHERE r.campaign_id=? ORDER BY u.name').all(c.id);
  res.json({ campaign: c, results });
});

router.get('/activity', (req, res) =>
  res.json({ entries: db.prepare('SELECT a.id,a.action,a.detail,a.at,u.name FROM activity_log a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 60').all() }));

router.get('/report.csv', (req, res) => {
  const rows = employeeRows();
  const head = ['Name', 'Email', 'Department', 'Status', 'Modules assigned', 'Modules completed', 'Risk score', 'Risk band'];
  const lines = [head.map(csvCell).join(',')].concat(rows.map(e =>
    [e.name, e.email, e.department, e.active ? 'Active' : 'Inactive', e.assigned, e.completed, e.risk ?? '', e.band].map(csvCell).join(',')));
  log(req.user.id, 'report.export', 'Exported compliance report');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="aqua-compliance-report.csv"');
  res.send('﻿' + lines.join('\r\n'));
});

module.exports = router;
