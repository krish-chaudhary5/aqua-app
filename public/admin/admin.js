(async function () {
  const me = await api('/auth/whoami');
  if (me.role !== 'admin') { location.href = '/app/'; return; }

  const NAV = [
    { id: 'overview', label: 'Overview' }, { id: 'employees', label: 'Employees' }, { id: 'training', label: 'Training' },
    { id: 'campaigns', label: 'Phishing campaigns' }, { id: 'activity', label: 'Activity log' },
  ];
  const ui = shell({ role: 'Administrator', nav: NAV, user: me, onNav: go });
  const main = ui.main;
  const riskTone = n => n === null ? '' : tone(n);
  const riskPill = (n, b) => h('span', { class: 'pill ' + (n === null ? '' : n >= 80 ? 'good' : n >= 60 ? 'warn' : 'bad') }, n === null ? 'No data' : `${n} · ${b}`);
  const header = (title, sub, ...actions) => h('div', { class: 'head' }, h('div', null, h('h1', { text: title }), sub ? h('p', { text: sub }) : null), h('div', { class: 'actions', style: 'margin:0' }, actions));

  function dialog(title, sub, body) {
    const d = h('dialog', { 'aria-labelledby': 'dt' }, h('h2', { id: 'dt', text: title }), sub ? h('p', { class: 'hint', text: sub }) : null, body);
    d.addEventListener('close', () => d.remove());
    document.body.append(d); d.showModal(); return d;
  }
  const field = (label, input, hint) => h('div', null, h('label', { for: input.id, text: label }), input, hint ? h('div', { class: 'hint', text: hint }) : null);
  const select = (id, options, value) => h('select', { id }, options.map(o => h('option', { value: o.value ?? o, selected: (o.value ?? o) === value, text: o.label ?? o })));

  async function go(id) {
    ui.setActive(id);
    history.replaceState(null, '', '#' + id);
    main.replaceChildren(h('p', { class: 'hint', text: 'Loading...' }));
    try { await VIEWS[id](); } catch (e) { main.replaceChildren(h('div', { class: 'error', text: e.message })); }
    main.focus({ preventScroll: true });
  }

  const VIEWS = {
    async overview() {
      const o = await api('/admin/overview');
      const stat = (v, l, t) => h('div', { class: 'stat' }, h('div', { class: 'v ' + (t || ''), text: v }), h('div', { class: 'l', text: l }));
      const el = h('div', null,
        header('Overview', 'How ISMT College is doing against phishing and training goals.',
          h('a', { class: 'btn ghost', href: '/api/admin/report.csv', download: '' }, 'Export compliance report'),
          h('button', { class: 'btn amber', onclick: () => go('campaigns').then(newCampaign) }, 'New campaign')),
        h('div', { class: 'stats' },
          stat(o.orgRisk ?? '-', 'Organisation risk score (' + o.band.toLowerCase() + ')', riskTone(o.orgRisk)),
          stat(o.completionRate + '%', 'Training completed', tone(o.completionRate)),
          stat(o.clickRate + '%', 'Simulation click rate', o.clickRate <= 15 ? 'good' : o.clickRate <= 25 ? 'warn' : 'bad'),
          stat(o.reportRate + '%', 'Phishing reported by staff', o.reportRate >= 40 ? 'good' : 'warn'),
          stat(o.employees, 'Active employees')),
        h('div', { class: 'grid2' },
          h('div', { class: 'card' }, h('h2', { text: 'Risk score by department' }),
            h('div', { class: 'table-wrap' }, h('table', null,
              h('thead', null, h('tr', null, h('th', { text: 'Department' }), h('th', { class: 'r', text: 'Staff' }), h('th', { text: 'Score' }), h('th', { text: '' }))),
              h('tbody', null, o.byDept.map(d => h('tr', null, h('td', { text: d.department }), h('td', { class: 'r num', text: d.staff }),
                h('td', null, riskPill(d.risk, d.band)), h('td', null, d.risk === null ? '' : bar(d.risk)))))))),
          h('div', { class: 'card' }, h('h2', { text: 'Is behaviour improving?' }), h('p', { class: 'hint', text: 'Closed campaigns, oldest first. Clicks should fall and reports should rise.' }),
            o.trend.length ? h('table', null, h('thead', null, h('tr', null, h('th', { text: 'Campaign' }), h('th', { class: 'r', text: 'Clicked' }), h('th', { class: 'r', text: 'Reported' }))),
              h('tbody', null, o.trend.map(t => h('tr', null, h('td', null, t.name, h('div', { class: 'hint', text: fmtDate(t.date) })), h('td', { class: 'r num', text: t.clickRate + '%' }), h('td', { class: 'r num', text: t.reportRate + '%' }))))) :
              h('div', { class: 'empty', text: 'No closed campaigns yet.' }))),
        h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', { text: 'Staff who need support' }),
          o.atRisk.length ? h('table', null, h('tbody', null, o.atRisk.map(p => h('tr', null, h('td', { text: p.name }), h('td', { text: p.department }), h('td', { class: 'r' }, riskPill(p.risk, 'High risk'))))))
            : h('div', { class: 'empty', text: 'Nobody is currently below a score of 60.' })));
      main.replaceChildren(el); applyBars(main);
    },

    async employees() {
      const { employees, departments } = await api('/admin/employees');
      let q = '', dept = '';
      const body = h('tbody');
      const draw = () => {
        const rows = employees.filter(e => (!q || (e.name + e.email).toLowerCase().includes(q)) && (!dept || e.department === dept));
        body.replaceChildren(...(rows.length ? rows.map(e => h('tr', null,
          h('td', null, h('b', { text: e.name }), h('div', { class: 'hint', text: e.email })),
          h('td', { text: e.department }),
          h('td', { class: 'num', text: `${e.completed} / ${e.assigned}` }),
          h('td', null, e.active ? riskPill(e.risk, e.band) : h('span', { class: 'pill', text: 'Deactivated' })),
          h('td', { class: 'r' }, h('button', { class: 'btn sm ' + (e.active ? 'danger' : 'ghost'), onclick: async () => {
            await api('/admin/employees/' + e.id, { method: 'PATCH', body: { active: !e.active } });
            toast((e.active ? 'Deactivated ' : 'Reactivated ') + e.name); go('employees');
          } }, e.active ? 'Deactivate' : 'Reactivate')))) : [h('tr', null, h('td', { colspan: 5, class: 'empty', text: 'No employees match that search.' }))]));
      };
      main.replaceChildren(h('div', null,
        header('Employees', `${employees.filter(e => e.active).length} active accounts across ${departments.length} departments.`,
          h('button', { class: 'btn amber', onclick: () => addEmployee(departments) }, 'Add employee')),
        h('div', { class: 'card' },
          h('div', { class: 'grid2', style: 'margin-bottom:12px' },
            h('input', { type: 'search', placeholder: 'Search by name or email', 'aria-label': 'Search employees', oninput: e => { q = e.target.value.toLowerCase(); draw(); } }),
            h('select', { 'aria-label': 'Filter by department', onchange: e => { dept = e.target.value; draw(); } }, h('option', { value: '', text: 'All departments' }), departments.map(d => h('option', { value: d, text: d })))),
          h('div', { class: 'table-wrap' }, h('table', null,
            h('thead', null, h('tr', null, h('th', { text: 'Employee' }), h('th', { text: 'Department' }), h('th', { text: 'Training done' }), h('th', { text: 'Risk score' }), h('th', { text: '' }))), body)))));
      draw();
    },

    async training() {
      const { modules, departments } = await api('/admin/training');
      main.replaceChildren(h('div', null,
        header('Training', 'Assign modules to a department or to everyone, and track completion.'),
        h('div', { class: 'card' }, h('div', { class: 'table-wrap' }, h('table', null,
          h('thead', null, h('tr', null, h('th', { text: 'Module' }), h('th', { class: 'r', text: 'Length' }), h('th', { text: 'Completion' }), h('th', { class: 'r', text: 'Avg score' }), h('th', { text: '' }))),
          h('tbody', null, modules.map(m => {
            const pct = m.assigned ? Math.round(100 * m.done / m.assigned) : 0;
            return h('tr', null, h('td', null, h('b', { text: m.title })), h('td', { class: 'r num', text: m.minutes + ' min' }),
              h('td', null, h('div', { class: 'num', text: m.assigned ? `${m.done} of ${m.assigned} (${pct}%)` : 'Not assigned yet' }), m.assigned ? bar(pct) : null),
              h('td', { class: 'r num', text: m.avg ?? '-' }),
              h('td', { class: 'r' }, h('button', { class: 'btn sm', onclick: () => assign(m, departments) }, 'Assign')));
          })))))));
      applyBars(main);
    },

    async campaigns() {
      const { campaigns } = await api('/admin/campaigns');
      main.replaceChildren(h('div', null,
        header('Phishing campaigns', 'Send a safe, simulated phishing email and see who clicks and who reports.',
          h('button', { class: 'btn amber', onclick: newCampaign }, 'New campaign')),
        h('div', { class: 'card' }, h('div', { class: 'table-wrap' }, h('table', null,
          h('thead', null, h('tr', null, h('th', { text: 'Campaign' }), h('th', { text: 'Audience' }), h('th', { text: 'Status' }), h('th', { class: 'r', text: 'Clicked' }), h('th', { class: 'r', text: 'Reported' }), h('th', { class: 'r', text: 'No action' }), h('th', { text: '' }))),
          h('tbody', null, campaigns.map(c => h('tr', null,
            h('td', null, h('b', { text: c.name }), h('div', { class: 'hint', text: `${c.template} · ${fmtDate(c.launched_at)}` })),
            h('td', { text: `${c.department} (${c.targeted})` }),
            h('td', null, h('span', { class: 'pill ' + (c.status === 'active' ? 'info' : '') }, c.status === 'active' ? 'Live' : 'Closed')),
            h('td', { class: 'r num', text: c.clicked }), h('td', { class: 'r num', text: c.reported }), h('td', { class: 'r num', text: c.ignored }),
            h('td', { class: 'r' }, h('button', { class: 'btn sm ghost', onclick: () => campaignDetail(c.id) }, 'View results')))))))))); 
    },

    async activity() {
      const { entries } = await api('/admin/activity');
      main.replaceChildren(h('div', null, header('Activity log', 'The latest 60 actions across the platform.'),
        h('div', { class: 'card' }, h('div', { class: 'table-wrap' }, h('table', null,
          h('thead', null, h('tr', null, h('th', { text: 'When' }), h('th', { text: 'Who' }), h('th', { text: 'What happened' }))),
          h('tbody', null, entries.map(e => h('tr', null, h('td', { class: 'num', text: fmtDate(e.at) + ' ' + e.at.slice(11, 16) }), h('td', { text: e.name || 'System' }), h('td', { text: e.detail }))))))))); 
    },
  };

  function addEmployee(departments) {
    const name = h('input', { id: 'n', required: true, autocomplete: 'off' }), email = h('input', { id: 'e', type: 'email', required: true, autocomplete: 'off' });
    const dept = h('input', { id: 'd', list: 'dl', required: true, value: departments[0] || '' });
    const pw = h('input', { id: 'p', type: 'text', required: true, minlength: 8, value: 'Welcome@' + Math.floor(1000 + Math.random() * 9000) });
    const err = h('div', { role: 'alert' });
    const dlg = dialog('Add employee', 'They can sign in straight away with the password you set.', h('form', { onsubmit: async ev => {
      ev.preventDefault(); err.replaceChildren();
      try { await api('/admin/employees', { method: 'POST', body: { name: name.value, email: email.value, department: dept.value, password: pw.value } });
        dlg.close(); toast('Added ' + name.value); go('employees'); }
      catch (e) { err.append(h('div', { class: 'error', text: e.message })); }
    } }, field('Full name', name), field('Email', email), field('Department', dept), h('datalist', { id: 'dl' }, departments.map(d => h('option', { value: d }))),
      field('Starting password', pw, 'At least 8 characters. Ask them to keep it private.'), err,
      h('div', { class: 'actions' }, h('button', { class: 'btn amber', type: 'submit' }, 'Add employee'), h('button', { class: 'btn ghost', type: 'button', onclick: () => dlg.close() }, 'Cancel'))));
  }

  function assign(m, departments) {
    const dept = select('ad', ['All Staff', ...departments]), due = h('input', { id: 'due', type: 'date' });
    const err = h('div', { role: 'alert' });
    const dlg = dialog('Assign "' + m.title + '"', 'People who already have this module are skipped.', h('form', { onsubmit: async ev => {
      ev.preventDefault(); err.replaceChildren();
      try { const r = await api('/admin/assign', { method: 'POST', body: { module_id: m.id, department: dept.value, due_date: due.value } });
        dlg.close(); toast(`Assigned to ${r.assigned} people` + (r.alreadyHad ? ` (${r.alreadyHad} already had it)` : '')); go('training'); }
      catch (e) { err.append(h('div', { class: 'error', text: e.message })); }
    } }, field('Who should do it?', dept), field('Due date (optional)', due), err,
      h('div', { class: 'actions' }, h('button', { class: 'btn amber', type: 'submit' }, 'Assign module'), h('button', { class: 'btn ghost', type: 'button', onclick: () => dlg.close() }, 'Cancel'))));
  }

  async function newCampaign() {
    const { templates, departments } = await api('/admin/templates');
    const name = h('input', { id: 'cn', required: true, maxlength: 80, placeholder: 'e.g. Term 2 Awareness Check' });
    const tpl = select('ct', templates.map(t => ({ value: t.id, label: t.name })));
    const dept = select('cd', ['All Staff', ...departments]);
    const preview = h('div', { class: 'hint' });
    const showPrev = () => { const t = templates.find(x => String(x.id) === tpl.value); preview.textContent = `Staff will see: "${t.subject}" from ${t.from_name} <${t.from_email}>`; };
    tpl.addEventListener('change', showPrev); showPrev();
    const err = h('div', { role: 'alert' });
    const dlg = dialog('New phishing campaign', 'This sends a harmless practice email to each person’s Aqua inbox. Nothing leaves the platform.', h('form', { onsubmit: async ev => {
      ev.preventDefault(); err.replaceChildren();
      if (!confirm(`Launch "${name.value}" to ${dept.value} now?`)) return;
      try { const r = await api('/admin/campaigns', { method: 'POST', body: { name: name.value, template_id: Number(tpl.value), department: dept.value } });
        dlg.close(); toast(`Launched to ${r.targeted} people`); go('campaigns'); }
      catch (e) { err.append(h('div', { class: 'error', text: e.message })); }
    } }, field('Campaign name', name), field('Email template', tpl), preview, field('Audience', dept), err,
      h('div', { class: 'actions' }, h('button', { class: 'btn amber', type: 'submit' }, 'Launch campaign'), h('button', { class: 'btn ghost', type: 'button', onclick: () => dlg.close() }, 'Cancel'))));
  }

  async function campaignDetail(id) {
    const { campaign: c, results } = await api('/admin/campaigns/' + id);
    const lab = { clicked: ['bad', 'Clicked the link'], reported: ['good', 'Reported it'], delivered: ['', 'No action yet'] };
    const dlg = dialog(c.name, `${c.template} · ${c.department} · ${c.status === 'active' ? 'Live' : 'Closed'}`, h('div', null,
      h('div', { class: 'table-wrap', style: 'max-height:320px;overflow:auto;margin-top:10px' }, h('table', null,
        h('thead', null, h('tr', null, h('th', { text: 'Employee' }), h('th', { text: 'Department' }), h('th', { text: 'Result' }))),
        h('tbody', null, results.map(r => h('tr', null, h('td', { text: r.name }), h('td', { text: r.department }), h('td', null, h('span', { class: 'pill ' + lab[r.status][0], text: lab[r.status][1] }))))))),
      h('div', { class: 'actions' },
        c.status === 'active' ? h('button', { class: 'btn', onclick: async () => { await api(`/admin/campaigns/${id}/close`, { method: 'POST' }); dlg.close(); toast('Campaign closed'); go('campaigns'); } }, 'Close campaign') : null,
        h('button', { class: 'btn ghost', onclick: () => dlg.close() }, 'Done'))));
  }

  const start = (location.hash || '#overview').slice(1);
  go(Object.prototype.hasOwnProperty.call(VIEWS, start) ? start : 'overview');
})();
