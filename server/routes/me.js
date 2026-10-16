const router = require('express').Router();
const { db, log } = require('../db');
const { requireAuth, requireRole } = require('../auth');
const { scoreFor, band } = require('../util');

router.use(requireAuth, requireRole('employee'));

router.get('/home', (req, res) => {
  const uid = req.user.id;
  const risk = scoreFor(uid);
  const a = db.prepare('SELECT COUNT(*) total, SUM(completed_at IS NOT NULL) done FROM assignments WHERE user_id=?').get(uid);
  const pending = db.prepare(`SELECT m.id,m.title,m.minutes,a.due_date FROM assignments a JOIN modules m ON m.id=a.module_id
    WHERE a.user_id=? AND a.completed_at IS NULL ORDER BY a.due_date IS NULL, a.due_date LIMIT 4`).all(uid);
  const unread = db.prepare("SELECT COUNT(*) n FROM sim_results r JOIN campaigns c ON c.id=r.campaign_id WHERE r.user_id=? AND r.status='delivered' AND c.status='active'").get(uid).n;
  const sim = db.prepare('SELECT status, COUNT(*) n FROM sim_results WHERE user_id=? GROUP BY status').all(uid);
  const count = s => sim.find(x => x.status === s)?.n || 0;
  res.json({ name: req.user.name, department: req.user.department, risk, band: band(risk),
    assigned: a.total, completed: a.done || 0, pending, unreadEmails: unread,
    reported: count('reported'), clicked: count('clicked'), ignored: count('delivered') });
});

router.get('/training', (req, res) => {
  const rows = db.prepare(`SELECT m.id,m.title,m.summary,m.minutes,a.due_date,a.score,a.completed_at FROM assignments a
    JOIN modules m ON m.id=a.module_id WHERE a.user_id=? ORDER BY a.completed_at IS NOT NULL, a.due_date IS NULL, a.due_date, m.id`).all(req.user.id);
  res.json({ modules: rows });
});

function ownedModule(userId, id) {
  const a = db.prepare('SELECT * FROM assignments WHERE user_id=? AND module_id=?').get(userId, id);
  if (!a) return null;
  return { assignment: a, mod: db.prepare('SELECT * FROM modules WHERE id=?').get(id) };
}

router.get('/training/:id', (req, res) => {
  const o = ownedModule(req.user.id, Number(req.params.id));
  if (!o) return res.status(404).json({ error: 'That module is not assigned to you.' });
  const qs = db.prepare('SELECT id,text,options FROM questions WHERE module_id=? ORDER BY id').all(o.mod.id)
    .map(q => ({ id: q.id, text: q.text, options: JSON.parse(q.options) })); // correct answer is never sent
  res.json({ id: o.mod.id, title: o.mod.title, minutes: o.mod.minutes, lessons: JSON.parse(o.mod.lessons), questions: qs,
    previousScore: o.assignment.score, completed: !!o.assignment.completed_at });
});

router.post('/training/:id/submit', (req, res) => {
  const o = ownedModule(req.user.id, Number(req.params.id));
  if (!o) return res.status(404).json({ error: 'That module is not assigned to you.' });
  const qs = db.prepare('SELECT * FROM questions WHERE module_id=? ORDER BY id').all(o.mod.id);
  const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
  if (answers.length !== qs.length) return res.status(400).json({ error: 'Answer every question before submitting.' });
  let right = 0;
  const review = qs.map((q, i) => {
    const ok = Number(answers[i]) === q.correct;
    if (ok) right++;
    return { question: q.text, options: JSON.parse(q.options), chosen: Number(answers[i]), correct: q.correct, ok, explanation: q.explanation };
  });
  const score = Math.round(100 * right / qs.length);
  const best = Math.max(score, o.assignment.score ?? 0);
  const PASS = 70; // a module only counts as complete once the best score reaches the pass mark
  db.prepare("UPDATE assignments SET score=?, completed_at=CASE WHEN completed_at IS NOT NULL THEN completed_at WHEN ? >= ? THEN datetime('now') END WHERE id=?").run(best, best, PASS, o.assignment.id);
  log(req.user.id, 'training.complete', `${req.user.name} scored ${score}% on "${o.mod.title}"`);
  res.json({ score, right, total: qs.length, best, pass: best >= PASS, passMark: PASS, review });
});

router.get('/inbox', (req, res) => {
  const rows = db.prepare(`SELECT c.id campaign_id, t.from_name, t.from_email, t.subject, c.launched_at, r.status
    FROM sim_results r JOIN campaigns c ON c.id=r.campaign_id JOIN templates t ON t.id=c.template_id
    WHERE r.user_id=? ORDER BY c.launched_at DESC, c.id DESC`).all(req.user.id);
  res.json({ emails: rows, filler: [
    { from_name: 'Library Services', subject: 'Your monthly resource usage report is ready', preview: 'The report for last month is available in the staff portal.' },
    { from_name: 'Academic Office', subject: 'Timetable change: Thursday 10:00', preview: 'Room 204 has moved to Room 311 for Thursday only.' },
    { from_name: 'Canvas', subject: 'New submission in your course', preview: 'A student has submitted Assignment 2.' },
  ] });
});

function sim(req) {
  return db.prepare(`SELECT r.status, c.name cname, c.status cstatus, t.* FROM sim_results r JOIN campaigns c ON c.id=r.campaign_id
    JOIN templates t ON t.id=c.template_id WHERE r.user_id=? AND r.campaign_id=?`).get(req.user.id, Number(req.params.cid));
}

router.get('/inbox/:cid', (req, res) => {
  const s = sim(req);
  if (!s) return res.status(404).json({ error: 'Email not found.' });
  res.json({ from_name: s.from_name, from_email: s.from_email, subject: s.subject, body: s.body, link_text: s.link_text, status: s.status,
    red_flags: s.status === 'delivered' ? null : JSON.parse(s.red_flags) }); // red flags only after you act
});

function act(status, verb) {
  return (req, res) => {
    const s = sim(req);
    if (!s) return res.status(404).json({ error: 'Email not found.' });
    if (s.status !== 'delivered') return res.status(409).json({ error: 'You have already responded to this email.', status: s.status });
    if (s.cstatus !== 'active') return res.status(409).json({ error: 'This exercise has ended.' });
    db.prepare("UPDATE sim_results SET status=?, acted_at=datetime('now') WHERE campaign_id=? AND user_id=?").run(status, Number(req.params.cid), req.user.id);
    log(req.user.id, `simulation.${status}`, `${req.user.name} ${verb} "${s.cname}"`);
    res.json({ status, red_flags: JSON.parse(s.red_flags), score: scoreFor(req.user.id) });
  };
}
router.post('/inbox/:cid/click', act('clicked', 'clicked the link in'));
router.post('/inbox/:cid/report', act('reported', 'reported'));

router.get('/results', (req, res) => {
  const uid = req.user.id;
  const training = db.prepare(`SELECT m.title, a.score, a.completed_at FROM assignments a JOIN modules m ON m.id=a.module_id
    WHERE a.user_id=? AND a.completed_at IS NOT NULL ORDER BY a.completed_at DESC`).all(uid);
  const sims = db.prepare(`SELECT c.name, t.subject, r.status, r.acted_at FROM sim_results r JOIN campaigns c ON c.id=r.campaign_id
    JOIN templates t ON t.id=c.template_id WHERE r.user_id=? ORDER BY c.launched_at DESC`).all(uid);
  const risk = scoreFor(uid);
  res.json({ risk, band: band(risk), training, sims });
});

module.exports = router;
