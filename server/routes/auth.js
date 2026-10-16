const router = require('express').Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { db, log } = require('../db');
const { issue, clear, requireAuth } = require('../auth');

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Try again in 15 minutes.' } });

// A constant dummy hash so unknown emails take as long as wrong passwords (no user enumeration by timing).
const DUMMY = bcrypt.hashSync('not-a-real-password', 10);

router.post('/login', limiter, (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!email || !password) return res.status(400).json({ error: 'Enter your email and password.' });
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  const ok = bcrypt.compareSync(password, u ? u.password_hash : DUMMY);
  if (!u || !ok || !u.active) return res.status(401).json({ error: 'Email or password is incorrect.' });
  issue(res, u);
  log(u.id, 'login', `${u.name} signed in`);
  res.json({ role: u.role, name: u.name, redirect: u.role === 'admin' ? '/admin/' : '/app/' });
});

router.post('/logout', (req, res) => { clear(res); res.json({ ok: true }); });
router.get('/whoami', requireAuth, (req, res) => res.json({ id: req.user.id, name: req.user.name, role: req.user.role, department: req.user.department }));

module.exports = router;
