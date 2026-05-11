// Landing page logic — class fetch, enrollment, email
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.APP_CONFIG;
const supa = (cfg && cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes('YOUR-'))
  ? createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
  : null;

const $  = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

// ── Active class fetch ──
async function loadActiveClass() {
  if (!supa) return null;
  const { data, error } = await supa
    .from('classes')
    .select('*')
    .eq('is_active', true)
    .order('date_iso', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) { console.warn('classes fetch failed', error); return null; }
  return data;
}

function renderClass(cls) {
  if (!cls) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.textContent = val; };
  set('cls-date',      cls.date_display);
  set('cls-hebrew',    cls.hebrew_date);
  set('cls-time',      cls.time_start);
  set('cls-time-end',  cls.time_end ? `עד ${cls.time_end}` : '');
  set('cls-place-1',   cls.location_line1);
  set('cls-place-2',   cls.location_line2);
  $('#cta')?.setAttribute('data-class-id', cls.id);
}

// ── Modal ──
const modal = $('#enroll-modal');
const openModal  = () => { modal.classList.remove('hidden'); modal.querySelector('input[name=name]')?.focus(); document.body.style.overflow = 'hidden'; };
const closeModal = () => { modal.classList.add('hidden'); document.body.style.overflow = ''; resetForm(); };

function resetForm() {
  $('#enroll-form').reset();
  $('#form-error').classList.add('hidden');
  $('#form-success').classList.add('hidden');
  $('#enroll-form').classList.remove('hidden');
}

document.addEventListener('click', e => {
  if (e.target.closest('#cta'))            { e.preventDefault(); openModal(); }
  if (e.target.closest('[data-close]'))    { closeModal(); }
  if (e.target === modal)                  { closeModal(); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
});

// ── Submit ──
$('#enroll-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#submit-btn');
  const errEl = $('#form-error');
  errEl.classList.add('hidden');

  const fd = new FormData(e.target);
  const payload = {
    name:    (fd.get('name')  || '').toString().trim(),
    phone:   (fd.get('phone') || '').toString().trim(),
    email:   (fd.get('email') || '').toString().trim() || null,
    notes:   (fd.get('notes') || '').toString().trim() || null,
    class_id: $('#cta').getAttribute('data-class-id') || null,
  };

  if (!payload.name || !payload.phone) {
    errEl.textContent = 'נא למלא שם וטלפון';
    errEl.classList.remove('hidden');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'שולח…';

  try {
    // 1) Store in Supabase
    if (supa) {
      const { error } = await supa.from('enrollments').insert({
        class_id: payload.class_id,
        name:     payload.name,
        phone:    payload.phone,
        email:    payload.email,
        notes:    payload.notes,
      });
      if (error) throw new Error('שמירה נכשלה: ' + error.message);
    }

    // 2) Send email via Supabase Edge Function → Resend
    if (supa) {
      const classInfo = [
        $('#cls-date')?.textContent,
        $('#cls-hebrew')?.textContent,
        $('#cls-time')?.textContent,
        $('#cls-place-1')?.textContent,
      ].filter(Boolean).join(' · ');

      const { error: emailErr } = await supa.functions.invoke('send-enrollment-email', {
        body: {
          name:       payload.name,
          phone:      payload.phone,
          email:      payload.email,
          notes:      payload.notes,
          class_info: classInfo,
        },
      });
      if (emailErr) console.warn('Email send failed', emailErr);
    }

    // Success state
    $('#enroll-form').classList.add('hidden');
    $('#form-success').classList.remove('hidden');
  } catch (err) {
    errEl.textContent = err.message || 'משהו השתבש. נסי שוב או צרי קשר בטלפון.';
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'הרשמה';
  }
});

// ── Init ──
loadActiveClass().then(renderClass);
