// Landing page logic — no SDK, just fetch().
// Saves ~120KB vs @supabase/supabase-js.

(function () {
  'use strict';

  var cfg = window.APP_CONFIG || {};
  var SUPA_OK = cfg.SUPABASE_URL && cfg.SUPABASE_URL.indexOf('YOUR-') === -1;
  var REST = cfg.SUPABASE_URL + '/rest/v1';
  var FN   = cfg.SUPABASE_URL + '/functions/v1';
  var AUTH = { apikey: cfg.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + cfg.SUPABASE_ANON_KEY };

  var $  = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  var activeClasses = [];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  // ── Active classes fetch (REST) ─────────────────────────────────────
  function loadActiveClasses() {
    if (!SUPA_OK) return Promise.resolve([]);
    var url = REST + '/classes?select=*&is_active=eq.true&order=date_iso.asc';
    return fetch(url, { headers: AUTH })
      .then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; });
  }

  function renderHero(cls) {
    if (!cls) return;
    function set(id, val) { var el = document.getElementById(id); if (el && val) el.textContent = val; }
    set('cls-date',     cls.date_display);
    set('cls-hebrew',   cls.hebrew_date);
    set('cls-time',     cls.time_start);
    set('cls-time-end', cls.time_end ? 'עד ' + cls.time_end : '');
    set('cls-place-1',  cls.location_line1);
    set('cls-place-2',  cls.location_line2);

    // Waze: use cls.waze_url if the admin set one for this class; otherwise leave
    // the static (correct) href that is hardcoded in the HTML.
    var waze = document.getElementById('cls-waze');
    if (waze && cls.waze_url) waze.href = cls.waze_url;
  }

  function populateClassSelect(classes) {
    var wrap = $('#class-select-wrap');
    var sel  = $('#class-select');
    if (!wrap || !sel) return;
    if (!classes.length) { wrap.hidden = true; return; }

    sel.innerHTML = classes.map(function (c, i) {
      var bits = [c.date_display, c.title, c.time_start].filter(Boolean).join(' · ');
      return '<option value="' + esc(c.id) + '"' + (i === 0 ? ' selected' : '') + '>' + esc(bits) + '</option>';
    }).join('');

    // Always show the field — even with one class — so the user can see
    // (and confirm) which lesson they're enrolling in.
    wrap.hidden = false;
  }

  // ── Modal ───────────────────────────────────────────────────────────
  var modal = $('#enroll-modal');
  function openModal() {
    modal.classList.remove('hidden');
    var nameField = modal.querySelector('input[name=name]');
    if (nameField) nameField.focus();
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    resetForm();
  }
  function resetForm() {
    $('#enroll-form').reset();
    $('#form-error').classList.add('hidden');
    $('#form-success').classList.add('hidden');
    $('#enroll-form').classList.remove('hidden');
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('#cta') || e.target.closest('#cta-hero') || e.target.closest('[data-open-modal]')) {
      e.preventDefault(); openModal();
    }
    if (e.target.closest('[data-close]')) closeModal();
    if (e.target === modal)               closeModal();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });

  // Floating mobile CTA — show after hero scrolls out
  var floating = document.getElementById('floating-cta');
  if (floating) {
    var heroEl = document.querySelector('[data-anim="logo"]');
    if (heroEl && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          floating.classList.toggle('hidden', entry.isIntersecting);
        });
      }, { threshold: 0 });
      io.observe(heroEl);
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────
  $('#enroll-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn   = $('#submit-btn');
    var errEl = $('#form-error');
    errEl.classList.add('hidden');

    var fd = new FormData(e.target);
    var selectedClassId = (fd.get('class_id') || '').toString() || (activeClasses[0] && activeClasses[0].id) || null;
    var payload = {
      name:     (fd.get('name')  || '').toString().trim(),
      phone:    (fd.get('phone') || '').toString().trim(),
      email:    (fd.get('email') || '').toString().trim() || null,
      notes:    (fd.get('notes') || '').toString().trim() || null,
      class_id: selectedClassId,
    };

    if (!payload.name || !payload.phone) {
      errEl.textContent = 'נא למלא שם וטלפון';
      errEl.classList.remove('hidden');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'שולח…';

    var insertReq = SUPA_OK
      ? fetch(REST + '/enrollments', {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, AUTH),
          body: JSON.stringify({
            class_id: payload.class_id,
            name:     payload.name,
            phone:    payload.phone,
            email:    payload.email,
            notes:    payload.notes,
          }),
        }).then(function (r) {
          if (!r.ok) return r.text().then(function (t) { throw new Error('שמירה נכשלה: ' + (t || r.status)); });
        })
      : Promise.resolve();

    var chosen = activeClasses.filter(function (c) { return c.id === payload.class_id; })[0];
    var classInfo = chosen
      ? [chosen.date_display, chosen.hebrew_date, chosen.title, chosen.time_start, chosen.location_line1].filter(Boolean).join(' · ')
      : [
          ($('#cls-date')      || {}).textContent,
          ($('#cls-hebrew')    || {}).textContent,
          ($('#cls-time')      || {}).textContent,
          ($('#cls-place-1')   || {}).textContent,
        ].filter(Boolean).join(' · ');

    var emailReq = SUPA_OK
      ? fetch(FN + '/send-enrollment-email', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name:       payload.name,
            phone:      payload.phone,
            email:      payload.email,
            notes:      payload.notes,
            class_info: classInfo,
          }),
        }).catch(function (e) { console.warn('Email send failed', e); })
      : Promise.resolve();

    insertReq
      .then(function () { return emailReq; })
      .then(function () {
        $('#enroll-form').classList.add('hidden');
        $('#form-success').classList.remove('hidden');
      })
      .catch(function (err) {
        errEl.textContent = err.message || 'משהו השתבש. נסי שוב או צרי קשר בטלפון.';
        errEl.classList.remove('hidden');
      })
      .then(function () {
        btn.disabled = false;
        btn.textContent = 'הרשמה';
      });
  });

  // ── Init ────────────────────────────────────────────────────────────
  loadActiveClasses().then(function (classes) {
    activeClasses = classes;
    if (classes[0]) renderHero(classes[0]);
    populateClassSelect(classes);
  });
})();
