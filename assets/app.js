// Landing page logic — class registration system
// No SDK — raw fetch() to Supabase REST + RPC + Edge Function

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

  function hebrewDayName(isoDate) {
    if (!isoDate) return '';
    var days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    var d = new Date(isoDate + 'T00:00:00');
    return days[d.getDay()];
  }

  // ── Load classes via the security-definer RPC (includes spots_left) ──
  // Falls back to plain SELECT on classes table if the function doesn't exist yet
  // (e.g., migration not run). This way the site still shows classes.
  function loadActiveClasses() {
    if (!SUPA_OK) return Promise.resolve([]);
    return fetch(REST + '/rpc/classes_for_landing', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, AUTH),
      body: '{}',
    })
      .then(function (r) {
        if (r.ok) return r.json();
        // Function missing → fallback to plain SELECT (no spots_left)
        console.warn('classes_for_landing RPC failed (status ' + r.status + '), falling back to plain SELECT');
        return fetch(REST + '/classes?select=*&is_active=eq.true&order=date_iso.asc', {
          headers: AUTH,
        }).then(function (r2) { return r2.ok ? r2.json() : []; });
      })
      .catch(function (err) {
        console.error('Class fetch failed:', err);
        return [];
      });
  }

  // ── Render the grid of class cards ──
  function renderClasses(classes) {
    var grid  = $('#classes-grid');
    var empty = $('#classes-empty');
    if (!grid) return;
    if (!classes.length) {
      grid.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');

    grid.innerHTML = classes.map(function (c) {
      var dayName  = hebrewDayName(c.date_iso);
      var spots    = (typeof c.spots_left === 'number') ? c.spots_left : null;
      var almostFull = spots !== null && spots > 0 && spots <= 3;
      var hasRoom    = spots !== null && spots > 3;
      var full       = spots === 0;

      var badges = [];
      if (c.is_trial) badges.push('<span class="class-badge class-badge-trial">שיעור ניסיון</span>');
      if (full)       badges.push('<span class="class-badge class-badge-low">מלא</span>');
      else if (almostFull) badges.push('<span class="class-badge class-badge-low">' + spots + ' מקומות נותרו</span>');
      else if (hasRoom) badges.push('<span class="class-badge class-badge-good">' + spots + ' מקומות</span>');

      var wazeUrl = c.waze_url || ('https://waze.com/ul?q=' + encodeURIComponent([c.location_line2, c.location_line1].filter(Boolean).join(', ')) + '&navigate=yes');

      var loc = [c.location_line1, c.location_line2].filter(Boolean).map(esc).join(' · ');
      var timeStr = esc(c.time_start) + (c.time_end ? ' – ' + esc(c.time_end) : '');

      return '' +
      '<article class="class-card" data-class-id="' + esc(c.id) + '">' +
        '<div class="class-card-top">' +
          '<span class="class-card-day">יום ' + esc(dayName) + '</span>' +
          '<div class="class-card-badges">' + badges.join('') + '</div>' +
        '</div>' +
        '<div class="class-card-date">' + esc(c.date_display) + '</div>' +
        (c.hebrew_date ? '<div class="class-card-hebrew-date">' + esc(c.hebrew_date) + '</div>' : '') +
        '<div class="class-card-title">' + esc(c.title || 'שיעור יוגה') + '</div>' +
        '<div class="class-card-meta">' +
          '<div class="class-card-meta-row">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>' +
            '<span dir="ltr">' + timeStr + '</span>' +
          '</div>' +
          (loc ? '<a class="class-card-meta-row class-card-waze" href="' + esc(wazeUrl) + '" target="_blank" rel="noopener noreferrer" aria-label="ניווט בוויז">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s-8-9.5-8-14a8 8 0 0 1 16 0c0 4.5-8 14-8 14Z"/><circle cx="12" cy="8" r="2.5"/></svg>' +
            '<span>' + loc + '</span></a>' : '') +
        '</div>' +
        '<div class="class-card-actions">' +
          '<button type="button" class="class-card-register" data-register="' + esc(c.id) + '"' + (full ? ' disabled' : '') + '>' +
            (full ? 'מלא' : 'הרשמה') +
            (full ? '' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1rem;height:1rem;transform:scaleX(-1)"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>') +
          '</button>' +
          '<button type="button" class="class-card-share" data-share="' + esc(c.id) + '" aria-label="שיתוף קישור לשיעור">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
              '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>' +
              '<path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>' +
            '</svg>' +
          '</button>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  // ── Modal ──
  var modal = $('#enroll-modal');
  function openModal(preselectClassId) {
    modal.classList.remove('hidden');
    populateClassSelect(activeClasses, preselectClassId);
    syncTrialCheckbox();
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

  function populateClassSelect(classes, preselectId) {
    var wrap = $('#class-select-wrap');
    var sel  = $('#class-select');
    if (!wrap || !sel) return;
    if (!classes.length) { wrap.hidden = true; return; }

    sel.innerHTML = classes.map(function (c) {
      var bits = [c.date_display, c.title, c.time_start].filter(Boolean).join(' · ');
      return '<option value="' + esc(c.id) + '">' + esc(bits) + '</option>';
    }).join('');

    if (preselectId && classes.some(function (c) { return c.id === preselectId; })) {
      sel.value = preselectId;
    }
    wrap.hidden = false;
  }

  // Sync trial checkbox to currently selected class's is_trial (still user-editable)
  function syncTrialCheckbox() {
    var sel  = $('#class-select');
    var cb   = $('#is-trial-input');
    if (!sel || !cb) return;
    var c = activeClasses.find(function (x) { return x.id === sel.value; });
    cb.checked = !!(c && c.is_trial);
  }

  // ── Share button ──
  function showToast(text) {
    var t = $('#share-toast');
    if (!t) return;
    t.textContent = text;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 1800);
  }

  function shareClass(classId) {
    var c = activeClasses.find(function (x) { return x.id === classId; });
    var url = location.origin + location.pathname + '?class=' + encodeURIComponent(classId);
    var shareData = {
      title: 'טנא - יוגה משמחת',
      text:  c ? ('שיעור יוגה · ' + (c.date_display || '') + ' · ' + (c.title || '')) : 'שיעור יוגה',
      url:   url,
    };
    if (navigator.share) {
      navigator.share(shareData).catch(function () {});
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { showToast('הקישור הועתק'); });
    } else {
      // Fallback: select-and-copy
      var ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); showToast('הקישור הועתק'); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  // ── Click delegation ──
  document.addEventListener('click', function (e) {
    var regBtn = e.target.closest('[data-register]');
    if (regBtn) { e.preventDefault(); openModal(regBtn.getAttribute('data-register')); return; }

    var shareBtn = e.target.closest('[data-share]');
    if (shareBtn) { e.preventDefault(); shareClass(shareBtn.getAttribute('data-share')); return; }

    if (e.target.closest('#cta') || e.target.closest('#cta-hero') || e.target.closest('[data-open-modal]')) {
      e.preventDefault(); openModal(); return;
    }
    if (e.target.closest('[data-close]')) closeModal();
    if (e.target === modal)               closeModal();
  });

  // Trial checkbox auto-syncs when user picks a different class in the dropdown
  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'class-select') syncTrialCheckbox();
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
        entries.forEach(function (entry) { floating.classList.toggle('hidden', entry.isIntersecting); });
      }, { threshold: 0 });
      io.observe(heroEl);
    }
  }

  // Pause continuous CSS animations when their host is off-screen
  if ('IntersectionObserver' in window) {
    var pauseObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('anim-paused', !entry.isIntersecting);
      });
    }, { threshold: 0, rootMargin: '50px' });
    Array.prototype.forEach.call(document.querySelectorAll('.logo-halo, .leaf-float'), function (el) {
      pauseObs.observe(el);
    });
  }

  // ── ICS calendar export ──
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function icsTimestamp(isoDate, hhmm) {
    if (!isoDate) return null;
    var parts = isoDate.split('-');
    var t = (hhmm || '00:00').split(':');
    return parts[0] + parts[1] + parts[2] + 'T' + pad(parseInt(t[0], 10) || 0) + pad(parseInt(t[1], 10) || 0) + '00';
  }
  function buildIcs(cls) {
    var dtStart = icsTimestamp(cls.date_iso, cls.time_start || '08:00');
    var dtEnd   = icsTimestamp(cls.date_iso, cls.time_end   || cls.time_start || '09:00');
    var location = [cls.location_line1, cls.location_line2].filter(Boolean).join(', ');
    var summary  = (cls.title || 'שיעור יוגה') + ' · טנא - יוגה משמחת';
    var uid      = 'tene-' + cls.id + '@r-hag.ai';
    var now      = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    var ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Tene Yoga//Class Registration//HE',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + uid,
      'DTSTAMP:' + now,
      'DTSTART;TZID=Asia/Jerusalem:' + dtStart,
      'DTEND;TZID=Asia/Jerusalem:' + dtEnd,
      'SUMMARY:' + summary.replace(/,/g, '\\,'),
      'LOCATION:' + location.replace(/,/g, '\\,'),
      'DESCRIPTION:הרשמה דרך https://tene-yoga.r-hag.ai',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    return ics;
  }

  function downloadIcs(cls) {
    var blob = new Blob([buildIcs(cls)], { type: 'text/calendar;charset=utf-8' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href = url;
    a.download = 'tene-yoga-' + (cls.date_iso || 'class') + '.ics';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 500);
  }

  // ── Submit ──
  var lastEnrolledClass = null;

  $('#enroll-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn   = $('#submit-btn');
    var errEl = $('#form-error');
    errEl.classList.add('hidden');

    var fd = new FormData(e.target);
    var selectedClassId = (fd.get('class_id') || '').toString() || (activeClasses[0] && activeClasses[0].id) || null;
    var isTrial         = !!fd.get('is_trial');
    var payload = {
      name:     (fd.get('name')  || '').toString().trim(),
      phone:    (fd.get('phone') || '').toString().trim(),
      email:    (fd.get('email') || '').toString().trim() || null,
      notes:    (fd.get('notes') || '').toString().trim() || null,
      class_id: selectedClassId,
      is_trial: isTrial,
    };

    if (!payload.name || !payload.phone) {
      errEl.textContent = 'נא למלא שם וטלפון';
      errEl.classList.remove('hidden');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'שולח…';

    var chosen = activeClasses.find(function (c) { return c.id === payload.class_id; });
    lastEnrolledClass = chosen || null;

    var insertReq = SUPA_OK
      ? fetch(REST + '/enrollments', {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, AUTH),
          body: JSON.stringify(payload),
        }).then(function (r) {
          if (!r.ok) return r.text().then(function (t) { throw new Error('שמירה נכשלה: ' + (t || r.status)); });
        })
      : Promise.resolve();

    var classInfo = chosen
      ? [chosen.date_display, chosen.hebrew_date, chosen.title, chosen.time_start].filter(Boolean).join(' · ')
      : '';
    var locationStr = chosen
      ? [chosen.location_line1, chosen.location_line2].filter(Boolean).join(', ')
      : '';

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
            location:   locationStr,
            is_trial:   payload.is_trial,
          }),
        }).catch(function (e) { console.warn('Email send failed', e); })
      : Promise.resolve();

    insertReq
      .then(function () { return emailReq; })
      .then(function () {
        $('#enroll-form').classList.add('hidden');
        $('#form-success').classList.remove('hidden');
        // ICS button only useful when we have a class
        var icsBtn = $('#ics-download');
        if (icsBtn) icsBtn.style.display = lastEnrolledClass ? '' : 'none';
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

  // ICS download button on success state
  document.addEventListener('click', function (e) {
    if (e.target.closest('#ics-download') && lastEnrolledClass) {
      e.preventDefault();
      downloadIcs(lastEnrolledClass);
    }
  });

  // ── Init: deep-link awareness via ?class=ID ──
  function deepLinkedClassId() {
    var params = new URLSearchParams(location.search);
    return params.get('class') || null;
  }

  loadActiveClasses().then(function (classes) {
    activeClasses = classes;
    renderClasses(classes);

    var deep = deepLinkedClassId();
    if (deep && classes.some(function (c) { return c.id === deep; })) {
      openModal(deep);
    }
  });
})();
