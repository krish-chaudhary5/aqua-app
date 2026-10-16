(async function () {
  const me = await api('/auth/whoami');
  if (me.role !== 'employee') { location.href = '/admin/'; return; }

  const NAV = [{ id: 'home', label: 'Home' }, { id: 'training', label: 'My training' }, { id: 'inbox', label: 'Inbox', badge: '' }, { id: 'results', label: 'My results' }];
  const ui = shell({ role: 'Employee', nav: NAV, user: me, onNav: go });
  const main = ui.main;
  const pillFor = n => n === null ? 'pill' : n >= 80 ? 'pill good' : n >= 60 ? 'pill warn' : 'pill bad';
  const header = (title, sub) => h('div', { class: 'head' }, h('div', null, h('h1', { text: title }), sub ? h('p', { text: sub }) : null));

  function setBadge(n) {
    const b = document.querySelector('[data-badge="inbox"]');
    if (b) { b.textContent = n || ''; b.hidden = !n; }
  }

  async function go(id, arg) {
    ui.setActive(id === 'module' ? 'training' : id === 'email' ? 'inbox' : id);
    history.replaceState(null, '', '#' + id);
    main.replaceChildren(h('p', { class: 'hint', text: 'Loading...' }));
    try { await VIEWS[id](arg); } catch (e) { main.replaceChildren(h('div', { class: 'error', text: e.message }), h('div', { class: 'actions' }, h('button', { class: 'btn ghost', onclick: () => go('home') }, 'Back to home'))); }
    main.focus({ preventScroll: true });
  }

  const VIEWS = {
    async home() {
      const d = await api('/me/home');
      setBadge(d.unreadEmails);
      const t = d.risk === null ? '' : d.risk >= 80 ? 'good' : d.risk >= 60 ? 'warn' : 'bad';
      main.replaceChildren(h('div', null,
        header('Hello, ' + d.name.split(' ')[0], d.department + ' · ISMT College'),
        h('div', { class: 'stats' },
          h('div', { class: 'stat' }, h('div', { class: 'v ' + t, text: d.risk ?? '-' }), h('div', { class: 'l', text: 'Your risk score (' + d.band.toLowerCase() + '). Higher is safer.' })),
          h('div', { class: 'stat' }, h('div', { class: 'v', text: `${d.completed} / ${d.assigned}` }), h('div', { class: 'l', text: 'Training modules completed' })),
          h('div', { class: 'stat' }, h('div', { class: 'v good', text: d.reported }), h('div', { class: 'l', text: 'Phishing emails you reported' })),
          h('div', { class: 'stat' }, h('div', { class: 'v ' + (d.clicked ? 'bad' : ''), text: d.clicked }), h('div', { class: 'l', text: 'Practice emails you clicked' }))),
        d.unreadEmails ? h('div', { class: 'card', style: 'margin-bottom:16px;border-left:4px solid var(--amber)' }, h('b', { text: `You have ${d.unreadEmails} new email${d.unreadEmails > 1 ? 's' : ''} in your inbox.` }),
          h('div', { class: 'hint', text: 'Check each one carefully before you act.' }), h('div', { class: 'actions' }, h('button', { class: 'btn amber', onclick: () => go('inbox') }, 'Open inbox'))) : null,
        h('div', { class: 'card' }, h('h2', { text: 'Up next' }),
          d.pending.length ? d.pending.map(m => h('div', { class: 'row' },
            h('div', null, h('b', { text: m.title }), h('div', { class: 'meta', text: m.minutes + ' minutes' + (m.due_date ? ' · due ' + fmtDate(m.due_date) : '') })),
            h('button', { class: 'btn sm', onclick: () => go('module', m.id) }, 'Start')))
            : h('div', { class: 'empty', text: 'You are all caught up. Nice work.' }))));
    },

    async training() {
      const { modules } = await api('/me/training');
      main.replaceChildren(h('div', null, header('My training', 'Short modules, each ending with a quick quiz. You can retake any quiz to improve your score.'),
        h('div', { class: 'card' }, modules.length ? modules.map(m => h('div', { class: 'row' },
          h('div', null, h('b', { text: m.title }), h('div', { class: 'meta', text: m.summary }),
            h('div', { class: 'meta', text: m.minutes + ' min' + (m.due_date && !m.completed_at ? ' · due ' + fmtDate(m.due_date) : '') })),
          h('div', { style: 'text-align:right;flex:none' }, m.completed_at ? h('span', { class: pillFor(m.score), text: 'Score ' + m.score + '%' }) : m.score != null ? h('span', { class: 'pill warn', text: 'Best ' + m.score + '% \u00b7 70% to pass' }) : h('span', { class: 'pill info', text: 'To do' }),
            h('div', { style: 'margin-top:8px' }, h('button', { class: 'btn sm ' + (m.completed_at ? 'ghost' : ''), onclick: () => go('module', m.id) }, m.completed_at ? 'Review' : 'Start')))))
          : h('div', { class: 'empty', text: 'No training has been assigned to you yet.' }))));
    },

    async module(id) {
      const m = await api('/me/training/' + id);
      const picks = new Array(m.questions.length).fill(null);
      const err = h('div', { role: 'alert' });
      const form = h('form', { onsubmit: async ev => {
        ev.preventDefault(); err.replaceChildren();
        if (picks.includes(null)) { err.append(h('div', { class: 'error', text: 'Answer every question before you submit.' })); return; }
        try { showResult(m, await api(`/me/training/${id}/submit`, { method: 'POST', body: { answers: picks } })); }
        catch (e) { err.append(h('div', { class: 'error', text: e.message })); }
      } },
        m.questions.map((q, qi) => h('div', { class: 'q' }, h('fieldset', null, h('legend', { text: `${qi + 1}. ${q.text}` }),
          q.options.map((o, oi) => h('label', { class: 'opt' }, h('input', { type: 'radio', name: 'q' + qi, value: oi, onchange: () => { picks[qi] = oi; } }), h('span', { text: o })))))),
        err, h('div', { class: 'actions' }, h('button', { class: 'btn amber', type: 'submit' }, 'Submit answers'), h('button', { class: 'btn ghost', type: 'button', onclick: () => go('training') }, 'Back')));
      main.replaceChildren(h('div', null, header(m.title, m.minutes + ' minute read, then a ' + m.questions.length + '-question quiz.'),
        h('div', { class: 'stack' }, m.lessons.map(l => h('div', { class: 'card' }, h('h3', { text: l.heading }), h('p', { class: 'lesson', style: 'margin-top:6px', text: l.text }))),
          h('div', { class: 'card' }, h('h2', { text: 'Check what you learned' }), form))));
    },

    async inbox() {
      const { emails, filler } = await api('/me/inbox');
      setBadge(emails.filter(e => e.status === 'delivered').length);
      main.replaceChildren(h('div', null, header('Inbox', 'Some messages here may be practice phishing emails from your college’s Aqua programme. Treat every email with care.'),
        h('div', { class: 'card mail-list', style: 'padding:0' },
          emails.map(e => h('button', { class: 'item', onclick: () => go('email', e.campaign_id) },
            h('div', null, h('b', { text: e.from_name }), h('span', { text: e.subject })),
            h('span', { class: 'pill ' + (e.status === 'delivered' ? 'info' : ''), text: e.status === 'delivered' ? 'New' : 'Opened' }))),
          filler.map(f => h('div', { class: 'item', style: 'cursor:default;opacity:.75' }, h('div', null, h('b', { text: f.from_name }), h('span', { text: f.subject + ' — ' + f.preview })), h('span', { class: 'pill', text: 'Read' }))))));
    },

    async email(cid) {
      const e = await api('/me/inbox/' + cid);
      const out = h('div');
      const showOutcome = (status, flags, score) => {
        const clicked = status === 'clicked';
        out.replaceChildren(h('div', { class: 'result-box ' + (clicked ? 'bad' : 'good') },
          h('h3', { text: clicked ? 'That was a practice phishing email.' : 'Well spotted. You reported it.' }),
          h('p', { text: clicked ? 'No harm done. Nothing was sent anywhere. In a real attack, clicking that link could have exposed your login. Here is what gave it away:' : 'Reporting suspicious email is exactly the right move. This one was a practice email. Here is what gave it away:' }),
          h('ul', { class: 'flags' }, flags.map(f => h('li', { text: f }))),
          score != null ? h('p', { class: 'hint', style: 'margin-top:10px', text: 'Your risk score is now ' + score + '.' }) : null,
          h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => go('inbox') }, 'Back to inbox'),
            clicked ? h('button', { class: 'btn ghost', onclick: () => go('training') }, 'Do some training') : null)));
        lock.forEach(b => { b.disabled = true; });
      };
      const act = async kind => {
        try { const r = await api(`/me/inbox/${cid}/${kind}`, { method: 'POST' }); showOutcome(r.status, r.red_flags, r.score); api('/me/home').then(d => setBadge(d.unreadEmails)); }
        catch (er) { out.replaceChildren(h('div', { class: 'error', text: er.message })); }
      };
      const linkBtn = h('button', { class: 'btn amber', onclick: () => act('click') }, e.link_text);
      const reportBtn = h('button', { class: 'btn ghost', onclick: () => act('report') }, 'Report as phishing');
      const lock = [linkBtn, reportBtn];
      main.replaceChildren(h('div', null, h('button', { class: 'btn sm ghost', onclick: () => go('inbox') }, 'Back to inbox'),
        h('div', { class: 'card mail-view', style: 'margin-top:14px' },
          h('h1', { text: e.subject }), h('div', { class: 'meta', text: `From: ${e.from_name} <${e.from_email}>` }),
          h('div', { class: 'mail-body', text: e.body }), h('div', { class: 'actions', style: 'margin-top:0' }, linkBtn, reportBtn), out)));
      if (e.status !== 'delivered') showOutcome(e.status, e.red_flags, null);
    },

    async results() {
      const r = await api('/me/results');
      const st = { reported: ['good', 'Reported'], clicked: ['bad', 'Clicked the link'], delivered: ['', 'No action'] };
      main.replaceChildren(h('div', null, header('My results', 'How you are doing across training and phishing practice.'),
        h('div', { class: 'card' }, h('div', { class: 'score-ring' }, h('b', { text: r.risk ?? '-' }), h('span', { class: pillFor(r.risk), text: r.band })),
          h('p', { class: 'hint', text: 'Your score blends your quiz results and how you handle practice phishing emails. Finishing training and reporting suspicious email both raise it.' })),
        h('div', { class: 'grid2', style: 'margin-top:16px' },
          h('div', { class: 'card' }, h('h2', { text: 'Training' }), r.training.length ? h('table', null, h('tbody', null, r.training.map(t => h('tr', null, h('td', { text: t.title }), h('td', { class: 'r' }, h('span', { class: pillFor(t.score), text: t.score + '%' })))))) : h('div', { class: 'empty', text: 'No completed modules yet.' })),
          h('div', { class: 'card' }, h('h2', { text: 'Phishing practice' }), r.sims.length ? h('table', null, h('tbody', null, r.sims.map(s => h('tr', null, h('td', null, s.name, h('div', { class: 'hint', text: s.subject })), h('td', { class: 'r' }, h('span', { class: 'pill ' + st[s.status][0], text: st[s.status][1] })))))) : h('div', { class: 'empty', text: 'No practice emails yet.' })))));
    },
  };

  function showResult(m, r) {
    const pass = r.pass;
    main.replaceChildren(h('div', null, header(m.title, 'Quiz results'),
      h('div', { class: 'card' }, h('div', { class: 'score-ring' }, h('b', { text: r.score + '%' }), h('span', { class: pass ? 'pill good' : 'pill warn', text: `${r.right} of ${r.total} correct \u00b7 ${pass ? 'Passed' : 'Not yet passed'}` })),
        h('p', { class: 'hint', style: 'margin-top:8px', text: pass ? 'Module complete. Your best score is on your record.' : `You need ${r.passMark}% to complete this module. Review the answers below and try again. Your best score is kept.` })),
      r.review.map((q, i) => h('div', { class: 'q' }, h('b', { text: `${i + 1}. ${q.question}` }),
        q.options.map((o, oi) => h('div', { class: 'opt ' + (oi === q.correct ? 'right' : oi === q.chosen ? 'wrong' : '') }, h('span', { text: (oi === q.correct ? '✓ ' : oi === q.chosen ? '✗ ' : '') + o }))),
        h('p', { class: 'hint', style: 'margin-top:8px', text: q.explanation }))),
      h('div', { class: 'actions' }, h('button', { class: 'btn amber', onclick: () => go('training') }, 'Back to my training'), h('button', { class: 'btn ghost', onclick: () => go('module', m.id) }, 'Retake quiz'))));
  }

  api('/me/home').then(d => setBadge(d.unreadEmails)).catch(() => {});
  const start = (location.hash || '#home').slice(1);
  go(['home', 'training', 'inbox', 'results'].includes(start) ? start : 'home');
})();
