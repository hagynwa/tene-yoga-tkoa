// Landing page logic — class fetch, enrollment, email
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.APP_CONFIG;
const supa = (cfg && cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes('YOUR-'))
  ? createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
  : null;

const $  = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

let activeClasses = [];

// ── Active classes fetch (all upcoming, not just one) ──
async function loadActiveClasses() {
  if (!supa) return [];
  const { data, error } = await supa
    .from('classes')
    .select('*')
    .eq('is_active', true)
    .order('date_iso', { ascending: true });
  if (error) { console.warn('classes fetch failed', error); return []; }
  return data || [];
}

function renderHero(cls) {
  if (!cls) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.textContent = val; };
  set('cls-date',      cls.date_display);
  set('cls-hebrew',    cls.hebrew_date);
  set('cls-time',      cls.time_start);
  set('cls-time-end',  cls.time_end ? `עד ${cls.time_end}` : '');
  set('cls-place-1',   cls.location_line1);
  set('cls-place-2',   cls.location_line2);

  // Update Waze deep link to the active class's address
  const waze = document.getElementById('cls-waze');
  if (waze && (cls.location_line1 || cls.location_line2)) {
    const q = encodeURIComponent([cls.location_line2, cls.location_line1].filter(Boolean).join(', '));
    waze.href = `https://waze.com/ul?q=${q}&navigate=yes`;
  }
}

function populateClassSelect(classes) {
  const wrap = $('#class-select-wrap');
  const sel  = $('#class-select');
  if (!wrap || !sel) return;

  if (!classes.length) { wrap.hidden = true; return; }

  sel.innerHTML = classes.map(c => {
    const bits = [c.date_display, c.title, c.time_start].filter(Boolean).join(' · ');
    return `<option value="${c.id}">${escapeHtml(bits)}</option>`;
  }).join('');

  // Hide the field entirely if only one option — auto-selected
  wrap.hidden = classes.length < 2;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
  if (e.target.closest('#cta') || e.target.closest('#cta-hero') || e.target.closest('[data-open-modal]'))
                                           { e.preventDefault(); openModal(); }
  if (e.target.closest('[data-close]'))    { closeModal(); }
  if (e.target === modal)                  { closeModal(); }
});

// Show floating mobile CTA once user has scrolled past the hero
const floatingCTA = document.getElementById('floating-cta');
if (floatingCTA) {
  const heroEl = document.querySelector('[data-anim="logo"]');
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) floatingCTA.classList.add('hidden');
      else                      floatingCTA.classList.remove('hidden');
    });
  }, { threshold: 0 });
  if (heroEl) io.observe(heroEl);
}
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
  const selectedClassId = (fd.get('class_id') || '').toString() || (activeClasses[0]?.id || null);
  const payload = {
    name:    (fd.get('name')  || '').toString().trim(),
    phone:   (fd.get('phone') || '').toString().trim(),
    email:   (fd.get('email') || '').toString().trim() || null,
    notes:   (fd.get('notes') || '').toString().trim() || null,
    class_id: selectedClassId,
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
      const chosen = activeClasses.find(c => c.id === payload.class_id);
      const classInfo = chosen
        ? [chosen.date_display, chosen.hebrew_date, chosen.title, chosen.time_start, chosen.location_line1].filter(Boolean).join(' · ')
        : [
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
loadActiveClasses().then(classes => {
  activeClasses = classes;
  if (classes[0]) renderHero(classes[0]);
  populateClassSelect(classes);
});
