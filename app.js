const $ = s => document.querySelector(s);
const STAGES = [['wishlist','Wishlist','#8B93A7'],['applied','Applied','#2F5BFF'],['interview','Interview','#F59E0B'],['offer','Offer','#12B76A'],['rejected','Rejected','#E5484D']];
const SC = Object.fromEntries(STAGES.map(([k, l, c]) => [k, { l, c }]));
const DONE = ['offer', 'rejected'];
const KEY = 'jobtrail-v1';

const pad = n => String(n).padStart(2, '0');
const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => fmt(new Date());
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return fmt(d); };
const diff = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
const ym = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const safeUrl = u => /^https?:\/\//i.test(u) ? u : '';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

let S = load(), view = 'board', sortK = 'applied', sortD = -1, calM = ym(new Date()), editId = null, q = '', dragId = null, tt;

function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && Array.isArray(s.apps)) return s; } catch (e) {}
  return { apps: [] };
}
const save = () => localStorage.setItem(KEY, JSON.stringify(S));
const toast = m => { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => t.hidden = true, 3000); };
const overdue = a => a.followup && a.followup < today() && !DONE.includes(a.stage);
const visible = () => S.apps.filter(a => !q || [a.company, a.role, a.location, a.notes].join(' ').toLowerCase().includes(q));
const reached = a => new Set([a.stage, ...a.history.map(h => h.stage)]);

function move(a, stage) {
  if (a.stage === stage) return;
  a.stage = stage; a.history.push({ stage, date: today() });
  if (stage === 'applied' && !a.applied) a.applied = today();
}

/* ---------- views ---------- */
const card = a => `<article class="card" draggable="true" tabindex="0" data-id="${a.id}">
  <b>${esc(a.company)}</b><span>${esc(a.role)}</span>
  <div class="chips">${a.applied ? `<em>Applied ${diff(a.applied, today())}d ago</em>` : ''}
  ${a.interview ? `<em class="iv">Interview ${a.interview}</em>` : ''}
  ${a.followup ? `<em class="${overdue(a) ? 'od' : ''}">${overdue(a) ? 'Overdue: ' : 'Follow up '}${a.followup}</em>` : ''}</div></article>`;

function board() {
  const list = visible();
  return `<div class="board">${STAGES.map(([k, l, c]) => {
    const items = list.filter(a => a.stage === k);
    return `<section class="col" data-stage="${k}" style="--c:${c}"><h3>${l}<span>${items.length}</span></h3>
      ${items.map(card).join('') || '<p class="drop">Drag a card here</p>'}</section>`;
  }).join('')}</div>`;
}

function list() {
  const cols = [['company', 'Company'], ['role', 'Role'], ['stage', 'Stage'], ['applied', 'Applied'], ['followup', 'Follow-up'], ['salary', 'Salary']];
  const rows = visible().sort((a, b) => String(a[sortK] || '￿').localeCompare(String(b[sortK] || '￿')) * sortD);
  if (!rows.length) return '<p class="empty">No applications match. Add one or load sample data.</p>';
  return `<div class="panel scroll"><table><thead><tr>${cols.map(([k, l]) =>
    `<th data-sort="${k}" aria-sort="${sortK === k ? (sortD > 0 ? 'ascending' : 'descending') : 'none'}">${l}${sortK === k ? (sortD > 0 ? ' ↑' : ' ↓') : ''}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(a => `<tr data-id="${a.id}" tabindex="0"><td><b>${esc(a.company)}</b></td><td>${esc(a.role)}</td>
    <td><span class="pill" style="--c:${SC[a.stage].c}">${SC[a.stage].l}</span></td><td>${a.applied || '–'}</td>
    <td>${a.followup ? (overdue(a) ? `<b style="color:var(--bad)">${a.followup}</b>` : a.followup) : '–'}</td><td>${esc(a.salary) || '–'}</td></tr>`).join('')}</tbody></table></div>`;
}

function calendar() {
  const [y, m] = calM.split('-').map(Number), first = new Date(y, m - 1, 1), n = new Date(y, m, 0).getDate();
  const ev = {};
  visible().forEach(a => {
    if (a.interview) (ev[a.interview] ||= []).push(['iv', 'Interview', a]);
    if (a.followup) (ev[a.followup] ||= []).push(['', 'Follow up', a]);
  });
  let cells = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => `<div class="dow">${d}</div>`).join('');
  cells += '<div class="day blank"></div>'.repeat((first.getDay() + 6) % 7);
  for (let d = 1; d <= n; d++) {
    const key = `${calM}-${pad(d)}`;
    cells += `<div class="day ${key === today() ? 'today' : ''}"><b>${d}</b>${(ev[key] || []).map(([c, l, a]) =>
      `<button class="ev ${c}" data-id="${a.id}">${l}: ${esc(a.company)}</button>`).join('')}</div>`;
  }
  return `<div class="calhead"><button id="prev" aria-label="Previous month">‹</button>
    <h2>${first.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</h2><button id="next" aria-label="Next month">›</button></div>
    <div class="cal">${cells}</div>`;
}

function insights() {
  const all = S.apps;
  if (!all.length) return '<p class="empty">Add applications to see your funnel and weekly activity.</p>';
  const cnt = k => all.filter(a => reached(a).has(k)).length;
  const base = Math.max(1, cnt('applied'));
  const rate = (a, b) => b ? Math.round(a / b * 100) + '%' : '–';
  const funnel = ['applied', 'interview', 'offer'].map(k =>
    `<div class="fr"><span>${SC[k].l}</span><div class="fb"><i style="width:${cnt(k) / base * 100}%;--c:${SC[k].c}"></i></div><span>${cnt(k)} (${rate(cnt(k), base)})</span></div>`).join('');
  // applications per week (last 8 weeks, weeks start Monday)
  const mon = s => { const d = parse(s); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return fmt(d); };
  const thisWk = mon(today()), weeks = Array.from({ length: 8 }, (_, i) => addDays(thisWk, (i - 7) * 7));
  const wc = weeks.map(w => all.filter(a => a.applied && mon(a.applied) === w).length), wmax = Math.max(1, ...wc);
  const od = all.filter(overdue);
  const soon = all.filter(a => a.interview && a.interview >= today() && a.interview <= addDays(today(), 14)).sort((a, b) => a.interview.localeCompare(b.interview));
  const li = (a, t) => `<li><button data-id="${a.id}"><b>${esc(a.company)}</b> · ${esc(a.role)} · ${t}</button></li>`;
  return `<div class="ins">
    <div class="panel"><h2>Funnel</h2><p class="help">Share of applications that reached each stage.</p><div class="funnel">${funnel}</div></div>
    <div class="panel"><h2>Applications per week</h2><p class="help">Last 8 weeks, ${all.filter(a => a.applied).length} in total.</p>
      <div class="weeks">${wc.map((c, i) => `<div class="wk"><span>${c}</span><i style="height:${c / wmax * 100}%"></i><span>${weeks[i].slice(5)}</span></div>`).join('')}</div></div>
    <div class="panel"><h2>Needs follow-up</h2>${od.length ? `<ul class="plain">${od.map(a => li(a, `due ${a.followup}`)).join('')}</ul>` : '<p class="help">Nothing overdue. Nice.</p>'}</div>
    <div class="panel"><h2>Interviews in the next 14 days</h2>${soon.length ? `<ul class="plain">${soon.map(a => li(a, a.interview)).join('')}</ul>` : '<p class="help">No interviews scheduled.</p>'}</div>
  </div>`;
}

function render() {
  $('#view').innerHTML = { board, list, cal: calendar, insights }[view]();
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.view === view));
  $('#sActive').textContent = S.apps.filter(a => !DONE.includes(a.stage) && a.stage !== 'wishlist').length;
  $('#sIv').textContent = S.apps.filter(a => a.stage === 'interview').length;
  $('#sOd').textContent = S.apps.filter(overdue).length;
}

/* ---------- dialog ---------- */
const f = $('#f');
f.elements.stage.innerHTML = STAGES.map(([k, l]) => `<option value="${k}">${l}</option>`).join('');

function openDlg(id, stage) {
  editId = id || null;
  const a = id ? S.apps.find(x => x.id === id) : { stage: stage || 'applied', applied: today() };
  $('#dTitle').textContent = id ? 'Edit application' : 'New application';
  ['company', 'role', 'location', 'salary', 'link', 'stage', 'applied', 'interview', 'followup', 'notes'].forEach(k => f.elements[k].value = a[k] || '');
  $('#del').hidden = !id;
  $('#hist').innerHTML = id ? 'History: ' + a.history.map(h => `${SC[h.stage].l} (${h.date})`).join(' → ') +
    (safeUrl(a.link) ? ` · <a href="${esc(safeUrl(a.link))}" target="_blank" rel="noopener noreferrer">Open job post</a>` : '') : '';
  $('#dlg').showModal();
}
f.addEventListener('submit', e => {
  e.preventDefault();
  const v = Object.fromEntries(new FormData(f));
  Object.keys(v).forEach(k => v[k] = v[k].trim());
  if (v.link && !safeUrl(v.link)) { toast('Job link must start with http:// or https://'); return; }
  if (editId) { const a = S.apps.find(x => x.id === editId); const st = v.stage; Object.assign(a, v, { stage: a.stage }); move(a, st); }
  else S.apps.push({ id: uid(), ...v, history: [{ stage: v.stage, date: today() }] });
  save(); $('#dlg').close(); render(); toast('Saved.');
});
$('#cancel').onclick = () => $('#dlg').close();
$('#del').onclick = () => {
  if (!confirm('Delete this application?')) return;
  S.apps = S.apps.filter(a => a.id !== editId); save(); $('#dlg').close(); render(); toast('Deleted.');
};

/* ---------- events ---------- */
$('#add').onclick = () => openDlg();
$('#nav').onclick = e => { if (e.target.dataset.view) { view = e.target.dataset.view; render(); } };
$('#q').oninput = e => { q = e.target.value.toLowerCase(); render(); };

const view$ = $('#view');
view$.addEventListener('click', e => {
  if (e.target.id === 'prev' || e.target.id === 'next') {
    const [y, m] = calM.split('-').map(Number); calM = ym(new Date(y, m - 1 + (e.target.id === 'next' ? 1 : -1), 1)); return render();
  }
  const th = e.target.closest('th[data-sort]');
  if (th) { sortD = sortK === th.dataset.sort ? -sortD : 1; sortK = th.dataset.sort; return render(); }
  const el = e.target.closest('[data-id]');
  if (el) openDlg(el.dataset.id);
});
view$.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset.id) openDlg(e.target.dataset.id); });
view$.addEventListener('dragstart', e => { const c = e.target.closest('.card'); if (c) { dragId = c.dataset.id; c.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); } });
view$.addEventListener('dragend', () => { dragId = null; render(); });
view$.addEventListener('dragover', e => { const c = e.target.closest('.col'); if (c && dragId) { e.preventDefault(); document.querySelectorAll('.col.over').forEach(x => x.classList.remove('over')); c.classList.add('over'); } });
view$.addEventListener('drop', e => {
  const c = e.target.closest('.col'); if (!c || !dragId) return;
  e.preventDefault(); const a = S.apps.find(x => x.id === dragId);
  if (a) { move(a, c.dataset.stage); save(); toast(`Moved ${a.company} to ${SC[a.stage].l}.`); }
});

/* ---------- backup & sample ---------- */
$('#export').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }));
  a.download = `jobtrail-${today()}.json`; a.click(); URL.revokeObjectURL(a.href);
};
$('#import').onclick = () => $('#file').click();
$('#file').onchange = async e => {
  const file = e.target.files[0]; e.target.value = ''; if (!file) return;
  try {
    const d = JSON.parse(await file.text());
    if (!Array.isArray(d.apps) || d.apps.some(a => typeof a.company !== 'string' || !SC[a.stage])) throw 0;
    if (!confirm(`Replace your data with ${d.apps.length} applications from this file?`)) return;
    S = { apps: d.apps.map(a => ({ history: [], ...a, id: a.id || uid() })) }; save(); render(); toast('Backup imported.');
  } catch (err) { toast('That file is not a valid JobTrail backup.'); }
};
$('#clear').onclick = () => { if (confirm('Delete all applications? Export a backup first if you need one.')) { S = { apps: [] }; save(); render(); } };
$('#sample').onclick = () => {
  const t = today(), path = { wishlist: ['wishlist'], applied: ['applied'], interview: ['applied', 'interview'], offer: ['applied', 'interview', 'offer'], rejected: ['applied', 'rejected'] };
  [['Northwind Labs', 'Frontend Developer', 'interview', 12, 3, 5, 'Remote'], ['Brightpath', 'Web Developer', 'applied', 6, -2, 0, 'Kuala Lumpur'],
   ['Cloudgrid', 'UI Engineer', 'offer', 30, 0, 0, 'Remote'], ['Pixelforge', 'Frontend Engineer', 'rejected', 25, 0, 0, 'Singapore'],
   ['Lumen Health', 'React Developer', 'applied', 9, 4, 0, 'Remote'], ['Orbit Pay', 'Frontend Developer', 'wishlist', 0, 0, 0, 'Penang'],
   ['Tidewater', 'Web Developer', 'interview', 18, -5, 2, 'Remote'], ['Greenleaf', 'JavaScript Developer', 'applied', 15, 0, 0, 'Johor Bahru'],
   ['Skyline Apps', 'Frontend Developer', 'applied', 3, 7, 0, 'Remote'], ['Nimbus', 'UI Developer', 'rejected', 40, 0, 0, 'Remote']]
   .forEach(([company, role, stage, ago, fu, iv, location]) => {
     const steps = path[stage], applied = stage === 'wishlist' ? '' : addDays(t, -ago);
     S.apps.push({ id: uid(), company, role, stage, location, salary: '', link: '', notes: '', applied,
       followup: fu ? addDays(t, fu) : '', interview: iv ? addDays(t, iv) : '',
       history: steps.map((s, i) => ({ stage: s, date: applied ? addDays(applied, i * 4) : t })) });
   });
  save(); render(); toast('Sample data added.');
};

render();
