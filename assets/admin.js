// Admin backoffice logic
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.APP_CONFIG;
const configured = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes('YOUR-');
const supa = configured ? createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

const $  = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

// Username "itael8" → email
const usernameToEmail = (u) => (u || '').includes('@') ? u : `${u}@gmail.com`;

// ── Session check ──
async function init() {
  if (!supa) {
    showLoginError('הגדרות Supabase חסרות. ערוך את assets/config.js והעלה שוב.');
    return;
  }
  const { data: { session } } = await supa.auth.getSession();
  if (session) showDashboard(session.user);
}

function showLoginError(msg) {
  const el = $('#login-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function showDashboard(user) {
  $('#login').classList.add('hidden');
  $('#dashboard').classList.remove('hidden');
  $('#who').textContent = user.email;
  loadClasses();
  loadEnrollments();
}

// ── Login ──
$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#login-error').classList.add('hidden');
  const email = usernameToEmail($('#username').value.trim());
  const password = $('#password').value;
  const btn = $('#login-btn');
  btn.disabled = true; btn.textContent = 'מתחבר…';

  const { data, error } = await supa.auth.signInWithPassword({ email, password });
  btn.disabled = false; btn.textContent = 'כניסה';

  if (error) { showLoginError('שם משתמש או סיסמה שגויים'); return; }
  showDashboard(data.user);
});

$('#logout')?.addEventListener('click', async () => {
  await supa.auth.signOut();
  location.reload();
});

// ── Tabs ──
$$('.tab-btn').forEach(b => {
  b.addEventListener('click', () => {
    const target = b.dataset.tab;
    $$('.tab-btn').forEach(x => x.classList.toggle('bg-cream-100', x.dataset.tab === target));
    $$('[data-pane]').forEach(p => p.classList.toggle('hidden', p.dataset.pane !== target));
  });
});

// ── Classes ──
async function loadClasses() {
  const { data, error } = await supa.from('classes').select('*').order('date_iso', { ascending: false });
  const list = $('#classes-list');
  const sel  = $('#filter-class');
  sel.innerHTML = '<option value="">כל השיעורים</option>';

  if (error) { list.innerHTML = `<div class="text-terra-600">שגיאה: ${error.message}</div>`; return; }
  if (!data || !data.length) { list.innerHTML = '<div class="text-sepia-500 text-center py-8">אין עדיין שיעורים. לחצי "+ שיעור חדש"</div>'; return; }

  list.innerHTML = data.map(c => `
    <article class="glass rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 flex-wrap">
      <div class="flex items-center gap-4">
        <div class="text-center">
          <div class="font-display font-black text-3xl text-terra-600 leading-none">${esc(c.date_display)}</div>
          <div class="text-xs text-sepia-500">${esc(c.hebrew_date || '')}</div>
        </div>
        <div>
          <div class="font-display font-bold text-lg text-sepia-700">${esc(c.title || 'שיעור')}</div>
          <div class="text-sm text-sepia-500">
            ${esc(c.time_start)}${c.time_end ? `–${esc(c.time_end)}` : ''} · ${esc(c.location_line1 || '')}
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="pill ${c.is_active ? 'pill-active' : 'pill-inactive'}">${c.is_active ? 'פעיל' : 'לא פעיל'}</span>
        <button class="btn-ghost px-3 py-1 rounded-full text-xs" data-edit="${c.id}">עריכה</button>
        <button class="btn-ghost px-3 py-1 rounded-full text-xs text-terra-600" data-del="${c.id}">מחיקה</button>
      </div>
    </article>
  `).join('');

  data.forEach(c => {
    const o = document.createElement('option');
    o.value = c.id;
    o.textContent = `${c.date_display} · ${c.title || 'שיעור'}`;
    sel.appendChild(o);
  });

  // bind row actions
  list.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openClassModal(data.find(x => x.id === b.dataset.edit)));
  list.querySelectorAll('[data-del]').forEach(b => b.onclick = () => deleteClass(b.dataset.del));
}

async function deleteClass(id) {
  if (!confirm('למחוק את השיעור? לא ניתן לשחזר.')) return;
  const { error } = await supa.from('classes').delete().eq('id', id);
  if (error) alert('מחיקה נכשלה: ' + error.message);
  else { loadClasses(); loadEnrollments(); }
}

// ── Class modal ──
function openClassModal(cls) {
  const m = $('#class-modal');
  $('#class-modal-title').textContent = cls ? 'עריכת שיעור' : 'שיעור חדש';
  $('#cls-id').value         = cls?.id || '';
  $('#cls-title').value      = cls?.title || 'שיעור ניסיון';
  $('#cls-date-iso').value   = cls?.date_iso || '';
  $('#cls-date-disp').value  = cls?.date_display || '';
  $('#cls-hebrew').value     = cls?.hebrew_date || '';
  $('#cls-time-start').value = cls?.time_start || '08:30';
  $('#cls-time-end').value   = cls?.time_end || '09:45';
  $('#cls-loc-1').value      = cls?.location_line1 || 'סטודיו של איתן';
  $('#cls-loc-2').value      = cls?.location_line2 || 'תכלת מרדכי 529, תקוע';
  $('#cls-capacity').value   = cls?.capacity ?? 20;
  $('#cls-active').checked   = cls?.is_active ?? true;
  $('#cls-notes').value      = cls?.notes || '';
  $('#class-error').classList.add('hidden');
  m.classList.remove('hidden');
}
function closeClassModal() { $('#class-modal').classList.add('hidden'); }

$('#add-class-btn').onclick = () => openClassModal(null);
$('#class-modal').addEventListener('click', (e) => {
  if (e.target.id === 'class-modal' || e.target.closest('[data-close-class]')) closeClassModal();
});

$('#class-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#class-error'); err.classList.add('hidden');
  const id = $('#cls-id').value;
  const payload = {
    title:          $('#cls-title').value.trim(),
    date_iso:       $('#cls-date-iso').value,
    date_display:   $('#cls-date-disp').value.trim(),
    hebrew_date:    $('#cls-hebrew').value.trim() || null,
    time_start:     $('#cls-time-start').value.trim(),
    time_end:       $('#cls-time-end').value.trim() || null,
    location_line1: $('#cls-loc-1').value.trim() || null,
    location_line2: $('#cls-loc-2').value.trim() || null,
    capacity:       parseInt($('#cls-capacity').value, 10) || null,
    is_active:      $('#cls-active').checked,
    notes:          $('#cls-notes').value.trim() || null,
  };

  const op = id
    ? supa.from('classes').update(payload).eq('id', id)
    : supa.from('classes').insert(payload);
  const { error } = await op;
  if (error) { err.textContent = error.message; err.classList.remove('hidden'); return; }
  closeClassModal();
  loadClasses();
});

// ── Enrollments ──
let allEnrollments = [];

async function loadEnrollments() {
  const { data, error } = await supa
    .from('enrollments')
    .select('id, name, phone, email, notes, created_at, class_id, classes(title, date_display, hebrew_date)')
    .order('created_at', { ascending: false });
  const tb = $('#enrollments-tbody');
  if (error) { tb.innerHTML = `<tr><td colspan="7" class="px-4 py-6 text-terra-600">שגיאה: ${error.message}</td></tr>`; return; }
  allEnrollments = data || [];
  renderEnrollments();
}

function renderEnrollments() {
  const tb = $('#enrollments-tbody');
  const filter = $('#filter-class').value;
  const rows = allEnrollments.filter(r => !filter || r.class_id === filter);
  if (!rows.length) {
    tb.innerHTML = `<tr><td colspan="7" class="px-4 py-8 text-center text-sepia-500">אין הרשמות${filter ? ' לשיעור הזה' : ''}.</td></tr>`;
    return;
  }
  tb.innerHTML = rows.map(r => `
    <tr class="border-t border-wheat-500/15 hover:bg-cream-100/50">
      <td class="px-3 sm:px-4 py-3 font-medium">${esc(r.name)}</td>
      <td class="px-3 sm:px-4 py-3" dir="ltr"><a href="tel:${esc(r.phone)}" class="text-terra-600 hover:underline">${esc(r.phone)}</a></td>
      <td class="px-4 py-3 hidden md:table-cell" dir="ltr">${r.email ? `<a href="mailto:${esc(r.email)}" class="text-terra-600 hover:underline">${esc(r.email)}</a>` : '—'}</td>
      <td class="px-4 py-3 text-sepia-600 hidden sm:table-cell">${r.classes ? esc(`${r.classes.date_display} · ${r.classes.title}`) : '—'}</td>
      <td class="px-4 py-3 text-sepia-500 max-w-xs truncate hidden lg:table-cell">${esc(r.notes || '')}</td>
      <td class="px-4 py-3 text-sepia-500 text-xs hidden md:table-cell" dir="ltr">${formatDate(r.created_at)}</td>
      <td class="px-2 py-3"><button class="text-terra-600 text-xs hover:underline" data-del-enr="${r.id}">מחיקה</button></td>
    </tr>
  `).join('');
  tb.querySelectorAll('[data-del-enr]').forEach(b => b.onclick = () => deleteEnrollment(b.dataset.delEnr));
}

async function deleteEnrollment(id) {
  if (!confirm('למחוק את ההרשמה?')) return;
  const { error } = await supa.from('enrollments').delete().eq('id', id);
  if (error) alert('מחיקה נכשלה: ' + error.message);
  else loadEnrollments();
}

$('#filter-class').addEventListener('change', renderEnrollments);

$('#export-csv').addEventListener('click', () => {
  const rows = allEnrollments;
  const header = ['name','phone','email','notes','class','created_at'];
  const body = rows.map(r => [
    r.name, r.phone, r.email || '', r.notes || '',
    r.classes ? `${r.classes.date_display} ${r.classes.title}` : '',
    r.created_at,
  ]);
  const csv = [header, ...body].map(row => row.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: `enrollments-${new Date().toISOString().slice(0,10)}.csv` });
  a.click(); URL.revokeObjectURL(url);
});

// ── Helpers ──
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' });
}

init();
