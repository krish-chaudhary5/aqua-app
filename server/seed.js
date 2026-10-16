// Seeds Aqua with FICTIONAL demo data for ISMT College. Safe to run repeatedly with --reset.
const bcrypt = require('bcryptjs');
const { db, log } = require('./db');

function rng(seed) { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; }

function seedIfEmpty() {
  if (db.prepare('SELECT COUNT(*) n FROM users').get().n > 0) return false;
  const rand = rng(7);
  const now = Date.now();
  const iso = (daysAgo, hour = 10) => new Date(now - daysAgo * 864e5 - (10 - hour) * 36e5).toISOString().replace('T', ' ').slice(0, 19);

  const adminHash = bcrypt.hashSync('Admin@123', 10);
  const empHash = bcrypt.hashSync('Employee@123', 10);

  const insUser = db.prepare('INSERT INTO users (name,email,password_hash,role,department,created_at) VALUES (?,?,?,?,?,?)');
  insUser.run('Krish Chaudhary', 'admin@aquatech.demo', adminHash, 'admin', 'IT Support', iso(60));
  insUser.run('Nishan Raj Shrestha', 'nishan.admin@aquatech.demo', adminHash, 'admin', 'IT Support', iso(60));

  const people = [
    ['Anita Sharma','Teaching Staff'],['Bikash Thapa','Teaching Staff'],['Sunita Gurung','Teaching Staff'],
    ['Rajesh Karki','Teaching Staff'],['Prabina Adhikari','Teaching Staff'],['Suman Basnet','Teaching Staff'],
    ['Kritika Pandey','Teaching Staff'],['Dipak Rai','Teaching Staff'],['Mina Tamang','Teaching Staff'],
    ['Hari Bhandari','Teaching Staff'],['Sarita Joshi','Teaching Staff'],['Ramesh Khadka','Teaching Staff'],
    ['Pooja Neupane','Administration'],['Anil Maharjan','Administration'],['Sabina Shrestha','Administration'],
    ['Binod Lama','Administration'],['Nirmala Acharya','Administration'],['Kamal Dahal','Administration'],
    ['Roshan Magar','IT Support'],['Aayush Poudel','IT Support'],['Sapana Khatri','IT Support'],['Bibek Oli','IT Support'],
    ['Gita Subedi','Library'],['Manoj Regmi','Library'],['Laxmi Chhetri','Library'],
    ['Santosh Giri','Finance'],['Rina Bista','Finance'],['Dinesh Koirala','Finance'],
    ['Alisha Rana','Student Services'],['Prakash Sherpa','Student Services'],
  ];
  const emp = [];
  people.forEach(([n, d], i) => {
    const email = n.toLowerCase().replace(/[^a-z ]/g, '').split(' ').join('.') + '@ismt.demo';
    const id = insUser.run(n, email, empHash, 'employee', d, iso(55 - (i % 20))).lastInsertRowid;
    emp.push({ id: Number(id), dept: d });
  });
  // one deactivated leaver for realism
  db.prepare('UPDATE users SET active=0 WHERE id=?').run(emp[emp.length - 1].id);
  emp.pop();

  const modules = require('./content').modules;
  const insMod = db.prepare('INSERT INTO modules (title,summary,minutes,lessons) VALUES (?,?,?,?)');
  const insQ = db.prepare('INSERT INTO questions (module_id,text,options,correct,explanation) VALUES (?,?,?,?,?)');
  const modIds = modules.map(m => {
    const id = Number(insMod.run(m.title, m.summary, m.minutes, JSON.stringify(m.lessons)).lastInsertRowid);
    m.questions.forEach(q => insQ.run(id, q.text, JSON.stringify(q.options), q.correct, q.explanation));
    return id;
  });

  // Assignments: everyone gets modules 1-3, some get 4-6; progress varies by department discipline
  const disc = { 'Teaching Staff': .92, 'Administration': .78, 'IT Support': .98, 'Library': .88, 'Finance': .94, 'Student Services': .82 };
  const insA = db.prepare('INSERT INTO assignments (user_id,module_id,assigned_at,due_date,score,completed_at) VALUES (?,?,?,?,?,?)');
  emp.forEach(e => {
    modIds.forEach((mid, mi) => {
      if (mi > 2 && rand() > .55) return;
      const assigned = 40 - mi * 4;
      const done = rand() < disc[e.dept] - mi * .02;
      const score = done ? Math.min(100, Math.round(70 + rand() * 30)) : null;
      insA.run(e.id, mid, iso(assigned), iso(assigned - 14).slice(0, 10), score, done ? iso(assigned - 2 - Math.floor(rand() * 8)) : null);
    });
  });

  const templates = require('./content').templates;
  const insT = db.prepare('INSERT INTO templates (name,from_name,from_email,subject,body,link_text,red_flags) VALUES (?,?,?,?,?,?,?)');
  const tplIds = templates.map(t => Number(insT.run(t.name, t.from_name, t.from_email, t.subject, t.body, t.link_text, JSON.stringify(t.red_flags)).lastInsertRowid));

  // Campaigns: three closed with history (behaviour improves over time), one active
  const insC = db.prepare('INSERT INTO campaigns (name,template_id,department,status,launched_at,created_by) VALUES (?,?,?,?,?,1)');
  const insR = db.prepare('INSERT INTO sim_results (campaign_id,user_id,status,acted_at) VALUES (?,?,?,?)');
  const camps = [
    ['Q3 Baseline Test', tplIds[0], 'All Staff', 'closed', 45, .26, .22],
    ['Payroll Update Check', tplIds[4], 'Finance', 'closed', 28, .17, .44],
    ['Library Fine Notice', tplIds[2], 'All Staff', 'closed', 17, .10, .56],
    ['Password Expiry Drill', tplIds[1], 'All Staff', 'active', 3, .0, .0],
  ];
  camps.forEach(([name, tid, dept, status, ago, pClick, pReport]) => {
    const cid = Number(insC.run(name, tid, dept, status, iso(ago)).lastInsertRowid);
    emp.filter(e => dept === 'All Staff' || e.dept === dept).forEach(e => {
      if (status === 'active') { insR.run(cid, e.id, 'delivered', null); return; }
      const r = rand();
      const st = r < pClick ? 'clicked' : r < pClick + pReport ? 'reported' : 'delivered';
      insR.run(cid, e.id, st, st === 'delivered' ? null : iso(ago - 0.1));
    });
  });

  const actions = [
    [1,'login','Admin signed in'],[1,'campaign.create','Created campaign "Q3 Baseline Test"'],
    [1,'assign','Assigned "Spotting Phishing Emails" to All Staff'],[2,'employee.add','Added employee Gita Subedi'],
    [1,'campaign.close','Closed campaign "Library Fine Notice"'],[1,'report.export','Exported compliance report'],
  ];
  actions.forEach((a, i) => db.prepare('INSERT INTO activity_log (user_id,action,detail,at) VALUES (?,?,?,?)').run(a[0], a[1], a[2], iso(30 - i * 4)));
  log(1, 'campaign.create', 'Created campaign "Password Expiry Drill"');
  return true;
}

if (require.main === module) {
  if (process.argv.includes('--reset')) {
    ['activity_log','sim_results','campaigns','templates','assignments','questions','modules','users'].forEach(t => db.exec(`DELETE FROM ${t}`));
    db.exec("DELETE FROM sqlite_sequence");
  }
  console.log(seedIfEmpty() ? 'Seeded demo data.' : 'Database already has data (use --reset to reseed).');
}
module.exports = { seedIfEmpty };
