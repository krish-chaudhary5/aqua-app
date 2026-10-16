const { db } = require('./db');

// Risk score: higher = safer. Blends training (50%) and phishing-simulation behaviour (50%).
//  training: average over ALL assigned modules, unfinished modules count as 0 (rewards completion)
//  simulation: reported = 100, ignored = 70, clicked = 0
function scoreFor(userId) {
  const a = db.prepare('SELECT COUNT(*) n, COALESCE(SUM(score),0) s FROM assignments WHERE user_id=?').get(userId);
  const s = db.prepare(`SELECT status FROM sim_results WHERE user_id=?`).all(userId);
  const training = a.n ? a.s / a.n : null;
  const sim = s.length
    ? s.reduce((t, r) => t + (r.status === 'reported' ? 100 : r.status === 'clicked' ? 0 : 70), 0) / s.length
    : null;
  if (training === null && sim === null) return null;
  if (training === null) return Math.round(sim);
  if (sim === null) return Math.round(training);
  return Math.round(0.5 * training + 0.5 * sim);
}

function band(score) {
  if (score === null) return 'No data';
  if (score >= 80) return 'Low risk';
  if (score >= 60) return 'Medium risk';
  return 'High risk';
}

function csvCell(v) {
  const s = String(v ?? '');
  // neutralise spreadsheet formula injection as well as quoting
  const safe = /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
  return '"' + safe.replace(/"/g, '""') + '"';
}

module.exports = { scoreFor, band, csvCell };
