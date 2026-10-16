const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { db } = require('./db');

const SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'); // set JWT_SECRET in production
const COOKIE = 'aqua_session';
const secure = process.env.NODE_ENV === 'production';

function issue(res, user) {
  const token = jwt.sign({ sub: user.id, role: user.role }, SECRET, { expiresIn: '8h' });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure, maxAge: 8 * 3600 * 1000 });
}
function clear(res) { res.clearCookie(COOKIE); }

// Loads the user fresh from the DB on every request so deactivation takes effect immediately.
function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE];
  if (!token) return res.status(401).json({ error: 'Please sign in.' });
  try {
    const p = jwt.verify(token, SECRET);
    const u = db.prepare('SELECT id,name,email,role,department,active FROM users WHERE id=?').get(p.sub);
    if (!u || !u.active) return res.status(401).json({ error: 'Account is not active.' });
    req.user = u;
    next();
  } catch { return res.status(401).json({ error: 'Session expired. Please sign in again.' }); }
}
const requireRole = role => (req, res, next) =>
  req.user.role === role ? next() : res.status(403).json({ error: 'You do not have access to this area.' });

module.exports = { issue, clear, requireAuth, requireRole };
