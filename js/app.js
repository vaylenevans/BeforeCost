/* BeforeCost — app shell: i18n, router, views, calculators, analytics. */
(function () {
  'use strict';
  var BC = window.BC;

  /* ---------------- i18n ---------------- */
  function getLang() { return sessionStorage.getItem('bc_lang') || 'en'; }
  function setLang(l) {
    sessionStorage.setItem('bc_lang', l);
    if (l !== 'en') track('language_switched', { language: l === 'es' ? 'spanish' : 'vietnamese' });
    document.documentElement.lang = l;
    renderChrome();
    render();
  }
  BC.t = function (key, vars) {
    var lang = getLang();
    var tbl = BC.STRINGS[lang] || BC.STRINGS.en;
    var s = (tbl[key] != null ? tbl[key] : BC.STRINGS.en[key]);
    if (s == null) return key;
    if (vars) s = s.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? vars[k] : '{' + k + '}'; });
    return s;
  };
  BC.pt = function () {
    var lang = getLang();
    return BC.PROGRAMS_TEXT[lang] || BC.PROGRAMS_TEXT.en;
  };
  function t(k, v) { return BC.t(k, v); }

  /* ---------------- helpers ---------------- */
  function money(n) { return '$' + Math.round(Number(n)).toLocaleString('en-US'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(id) { return document.getElementById(id); }
  function track(name, props) {
    try { if (window.plausible) window.plausible(name, props ? { props: props } : undefined); } catch (e) {}
  }

  // PRIVACY: screener answers (income, age, family size, pregnancy, disability,
  // procedure selection) live ONLY in memory for the life of the page. They are
  // never written to sessionStorage, localStorage, cookies, or any server, and
  // are gone the instant the tab is closed or reloaded. Only two non-sensitive
  // flags are persisted (sessionStorage): the language choice and the
  // pending-apply-check used for the "did you apply?" follow-up.
  var memScreener = null;          // the full screener answer object, in memory only
  var memProc = 'vaginal_delivery'; // currently selected procedure, in memory only

  function getScreener() { return memScreener; }
  function setScreener(obj) { memScreener = obj; }

  // Screener hospital/procedure narrowing. Return null => "all" (no filter).
  function selHospitalIds() {
    var s = getScreener();
    return (s && s.hospitalMode === 'specific' && s.hospitals && s.hospitals.length) ? s.hospitals : null;
  }
  function selProcKeys() {
    var s = getScreener();
    return (s && s.procMode === 'specific' && s.procedures && s.procedures.length) ? s.procedures : null;
  }
  function setProc(key) { memProc = key || 'vaginal_delivery'; }
  function getProc() {
    // The in-memory procedure is authoritative (set by the results dropdown /
    // compare tabs) so switching procedures always sticks.
    return memProc || 'vaginal_delivery';
  }

  // Real current date — drives the ACA open-enrollment window (Nov 1–Jan 15).
  var TODAY = new Date();

  // Set when "Check Eligibility" is clicked from another page, so the landing
  // view scrolls straight to the embedded eligibility screener once rendered.
  var scrollToScreener = false;

  // Subtle Houston skyline silhouette, shown at the top of the footer site-wide.
  var HOUSTON_SKYLINE = '<div class="skyline" aria-hidden="true">' +
    '<svg viewBox="0 0 1200 140" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' +
    '<polygon points="0,140 0,112 26,112 26,124 52,124 52,98 84,98 84,120 104,120 104,66 112,66 112,52 120,52 120,66 146,66 146,116 168,116 168,90 200,90 200,118 226,118 226,44 236,30 246,44 246,116 278,116 278,104 312,104 312,120 338,120 338,74 372,74 372,118 398,118 398,58 408,58 408,44 418,44 418,58 442,58 442,116 470,116 470,94 502,94 502,120 528,120 528,78 562,78 562,116 588,116 588,52 622,52 622,120 648,120 648,98 682,98 682,118 708,118 708,68 740,68 740,116 766,116 766,88 798,88 798,120 824,120 824,48 834,32 844,48 844,116 868,116 868,104 902,104 902,120 928,120 928,72 962,72 962,116 988,116 988,90 1022,90 1022,120 1048,120 1048,58 1082,58 1082,116 1108,116 1108,98 1142,98 1142,118 1168,118 1168,110 1200,110 1200,140"/>' +
    '</svg></div>';

  // Richer Houston skyline for the homepage hero — soft sunrise glow + a Lone Star.
  var HERO_SKYLINE = '<div class="hero-skyline" aria-hidden="true">' +
    '<svg class="sky-svg" viewBox="0 0 1200 200" xmlns="http://www.w3.org/2000/svg">' +
    '<circle class="sky-sun" cx="985" cy="118" r="60"/>' +
    '<polygon class="sky-star" points="185,46 190.39,62.58 207.83,62.58 193.72,72.83 199.11,89.42 185,79.17 170.89,89.42 176.28,72.83 162.17,62.58 179.61,62.58"/>' +
    '<g transform="translate(0,60)"><polygon class="sky-buildings" points="0,140 0,112 26,112 26,124 52,124 52,98 84,98 84,120 104,120 104,66 112,66 112,52 120,52 120,66 146,66 146,116 168,116 168,90 200,90 200,118 226,118 226,44 236,30 246,44 246,116 278,116 278,104 312,104 312,120 338,120 338,74 372,74 372,118 398,118 398,58 408,58 408,44 418,44 418,58 442,58 442,116 470,116 470,94 502,94 502,120 528,120 528,78 562,78 562,116 588,116 588,52 622,52 622,120 648,120 648,98 682,98 682,118 708,118 708,68 740,68 740,116 766,116 766,88 798,88 798,120 824,120 824,48 834,32 844,48 844,116 868,116 868,104 902,104 902,120 928,120 928,72 962,72 962,116 988,116 988,90 1022,90 1022,120 1048,120 1048,58 1082,58 1082,116 1108,116 1108,98 1142,98 1142,118 1168,118 1168,110 1200,110 1200,140"/></g>' +
    '</svg></div>';

  // Small Texas outline with a pin on Houston — a subtle "you are here" for the hero.
  var TEXAS_MAP = '<div class="hero-map">' +
    '<svg viewBox="0 0 100 100" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
    '<path class="tx-shape" d="M30,7 L44,7 L44,22 L58,25 L72,23 L83,29 L80,42 L74,53 L69,58 L60,67 L53,77 L48,87 L42,79 L35,72 L30,66 L26,71 L22,62 L8,46 L20,32 L24,22 L30,22 Z"/>' +
    '<path class="tx-pin" d="M62,60 C56.5,52.5 56.5,45 62,45 C67.5,45 67.5,52.5 62,60 Z"/>' +
    '<circle class="tx-pin-dot" cx="62" cy="50" r="1.9"/>' +
    '</svg>' +
    '<span class="hero-map-label">Houston, Texas</span>' +
  '</div>';

  /* ---------------- outbound / apply handling ---------------- */
  // Delegated: any [data-out] link records a follow-up flag and fires analytics.
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('[data-out]') : null;
    if (!a) return;
    var kind = a.getAttribute('data-out');      // apply | charity | gold | estimator | plain
    var name = a.getAttribute('data-name') || '';
    // The "did you apply?" follow-up only arms for links that surface through the
    // eligibility-screener flow (results, compare, gold card) — never from the
    // Resources directory, which people browse without having screened.
    var arm = currentPath() !== '/resources';
    if (kind === 'charity') {
      track('charity_care_link_clicked', { hospital: name });
      if (arm) setPending(name);
    } else if (kind === 'gold') {
      track('gold_card_apply_clicked');
      if (arm) setPending('Harris Health Gold Card');
    } else if (kind === 'estimator') {
      track('insurance_estimator_clicked', { hospital: name });
    } else if (kind === 'apply') {
      if (arm) setPending(name);
    }
    // links carry target=_blank + rel; let the browser open them normally.
  });

  // Any [data-scroll-screener] link (nav "Check Eligibility", How-page CTAs,
  // About/How "Start" buttons) leads to the eligibility screener embedded on the
  // homepage: scroll in place if already home, otherwise navigate to '#/' and
  // flag wireLanding() to scroll once the landing view renders.
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('[data-scroll-screener]') : null;
    if (!a) return;
    if (currentPath() === '/') { e.preventDefault(); scrollToScreenerSection(true); }
    else { scrollToScreener = true; }
  });

  // A [data-faq-open="<key>"] link opens the matching FAQ item (single-open) and
  // scrolls to it — used by the homepage "reference the FAQ" prompt.
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('[data-faq-open]') : null;
    if (!a) return;
    e.preventDefault();
    var item = document.querySelector('.faq-item[data-faq="' + a.getAttribute('data-faq-open') + '"]');
    if (!item) return;
    document.querySelectorAll('#footer .faq-item').forEach(function (x) {
      x.classList.remove('open');
      var q = x.querySelector('.faq-q'); if (q) q.setAttribute('aria-expanded', 'false');
    });
    item.classList.add('open');
    var btn = item.querySelector('.faq-q'); if (btn) btn.setAttribute('aria-expanded', 'true');
    var nav = el('nav');
    var headerH = nav ? nav.getBoundingClientRect().height : 0;
    var y = item.getBoundingClientRect().top + window.scrollY - headerH - 12;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  });

  function setPending(name) {
    sessionStorage.setItem('pendingApplyCheck', JSON.stringify({ program: name, ts: Date.now() }));
  }

  /* ---------------- follow-up toast ---------------- */
  function maybeShowFollowup() {
    var raw = sessionStorage.getItem('pendingApplyCheck');
    if (!raw) return;
    var data; try { data = JSON.parse(raw); } catch (e) { data = null; }
    sessionStorage.removeItem('pendingApplyCheck'); // show once per click
    if (!data) return;
    var prog = data.program || '';
    var host = el('followup-host');
    host.innerHTML =
      '<div class="followup" role="dialog" aria-live="polite">' +
        '<button class="fu-close" aria-label="Dismiss" data-fu="dismiss">✕</button>' +
        '<h4>' + esc(t('followup.title', { program: prog })) + '</h4>' +
        '<p>' + esc(t('followup.body')) + '</p>' +
        '<div class="fu-btns">' +
          '<button class="btn btn-primary" data-fu="yes">' + esc(t('followup.yes')) + '</button>' +
          '<button class="btn btn-outline" data-fu="notyet">' + esc(t('followup.notyet')) + '</button>' +
          '<button class="btn btn-ghost" data-fu="trouble">' + esc(t('followup.trouble')) + '</button>' +
        '</div>' +
      '</div>';
    host.querySelectorAll('[data-fu]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-fu');
        var evt = { yes: 'application_confirmed', notyet: 'application_not_yet', trouble: 'application_trouble', dismiss: 'application_followup_dismissed' }[v];
        track(evt, { program: prog });
        host.innerHTML = '';
      });
    });
  }

  /* ---------------- fee type ---------------- */
  // Maps any sheet fee-type variation to one of three patient-facing scopes.
  function feeScope(feeText) {
    var f = (feeText || '').toLowerCase();
    if (f.indexOf('both') > -1) return 'both';
    if (f.indexOf('physician only') > -1) return 'physician';
    return 'hospital';
  }
  // Info icon with a CSS-driven popover (works on hover + tap/focus). An optional
  // extra note (e.g. the separate-bill warning) is appended inside the popover.
  function feeInfo(extra) {
    var general =
      '<span class="fee-pop-line">' + esc(t('fee.infoHospital')) + '</span>' +
      '<span class="fee-pop-line">' + esc(t('fee.infoPhysician')) + '</span>' +
      '<span class="fee-pop-line">' + esc(t('fee.infoBundled')) + '</span>' +
      '<span class="fee-pop-line fee-pop-estimate">' + esc(t('fee.infoEstimate')) + '</span>';
    var body = extra ? ('<span class="fee-pop-note">' + esc(extra) + '</span>' + general) : general;
    return '<span class="fee-info" tabindex="0" role="button" aria-label="' + esc(t('fee.infoLabel')) + '">ⓘ' +
      '<span class="fee-pop" role="tooltip">' + body + '</span></span>';
  }
  // Fee-type pill + info icon (the separate-bill note lives inside the icon).
  function feeRowHtml(row, hosp) {
    if (!row || !row.fee) return '';
    var phone = hosp.pricingPhone || hosp.phone;
    var scope = feeScope(row.fee);
    var pill, note = '';
    if (scope === 'both') {
      pill = '<span class="fee-pill fee-pill-all">✓ ' + esc(t('compare.includesFees')) + '</span>';
    } else if (scope === 'physician') {
      pill = '<span class="fee-pill fee-pill-warn">' + esc(t('fee.physician')) + '</span>';
      note = t('fee.physicianNote', { hospital: hosp.name, phone: phone });
    } else {
      pill = '<span class="fee-pill fee-pill-warn">' + esc(t('fee.hospital')) + '</span>';
      note = t('fee.hospitalNote', { hospital: hosp.name, phone: phone });
    }
    return '<div class="fee-fees-row">' + pill + feeInfo(note) + '</div>';
  }

  /* ---------------- price view (Rules 1–6) ---------------- */
  // returns { tier:0|1|2, value:Number, badgeEligible:bool, html:function() }
  function priceView(row, hosp, procKey, scr) {
    var phone = hosp.pricingPhone || hosp.phone;
    if (!row || row.note === 'suppressed') return null;

    // MRI Lumbar: hospitals with no published cash price show the CPT 72148 card.
    if (procKey === 'mri_lumbar') {
      var noPrice = row.note === 'not_offered' || row.note === 'ct_contrast' ||
        (row.cash == null && row.disc == null && row.low == null);
      if (noPrice) {
        return { tier: 2, value: Infinity, badgeEligible: false, html: function () {
          return '<div class="mri-na"><p class="mri-na-head">' + esc(t('mri.naHead')) + '</p>' +
            '<p>' + esc(t('mri.naBody')) + '</p></div>';
        } };
      }
    }

    var isRule6 = BC.INSURANCE_ESTIMATOR_PROCS.indexOf(procKey) > -1;
    var insHtml = '';
    if (isRule6) {
      insHtml = '<p class="insurance-note">' +
        esc(t('compare.insuranceNote', { hospital: hosp.name }).replace(' →', '')) +
        ' <a href="' + esc(BC.ESTIMATORS[hosp.system]) + '" target="_blank" rel="noopener noreferrer" ' +
        'data-out="estimator" data-name="' + esc(hosp.name) + '">' + esc(hosp.name) + ' →</a></p>';
    }

    function feeRow() { return feeRowHtml(row, hosp); }

    // Under-12 age limit warning — applies on any price rule where the row is flagged.
    var ageWarn = row.note === 'age_under_12'
      ? '<div class="warn-box">' + esc(t('compare.age12', { phone: phone })) + '</div>' : '';

    // Rule 4 — not offered
    if (row.note === 'not_offered') {
      return { tier: 2, value: Infinity, badgeEligible: false, html: function () {
        return '<p class="not-offered">' + esc(t('compare.rule4')) + '</p>';
      } };
    }
    // St Luke's CT — special not-offered w/ contrast secondary note
    if (row.note === 'ct_contrast') {
      return { tier: 2, value: Infinity, badgeEligible: false, html: function () {
        return '<p class="not-offered">' + esc(t('compare.rule4')) + '</p>' +
          '<p class="flat-note">' + esc(t('compare.ctContrast')) + '</p>';
      } };
    }
    // Rule 1 range
    if (row.low != null && row.high != null) {
      return { tier: 0, value: row.low, badgeEligible: true, html: function (isLowest) {
        return '<div class="price-block">' +
          '<div class="price-line"><span class="label">' + esc(t('compare.rangeLabel')) + '</span>' +
          '<span class="amount big"><span class="estimated-label">' + esc(t('compare.estimated')) + '</span> ' +
          money(row.low) + ' – ' + money(row.high) + '</span></div>' +
          '<p class="flat-note">' + esc(t('compare.rangeNote', { phone: phone })) + '</p>' +
          ageWarn + feeRow() + insHtml + '</div>';
      } };
    }

    var hasDisc = row.disc != null && row.disc > 0 && row.cash != null && row.disc < row.cash;
    // Rule 1 single discounted
    if (hasDisc) {
      var pct = Math.round((row.cash - row.disc) / row.cash * 100);
      return { tier: 0, value: row.disc, badgeEligible: true, html: function () {
        return '<div class="price-block">' +
          '<div class="price-line"><span class="label">' + esc(t('compare.grossLabel')) + '</span>' +
          '<span class="strike">' + money(row.cash) + '</span></div>' +
          '<div class="price-line"><span class="label">' + esc(t('compare.oweLabel')) + '</span>' +
          '<span class="amount big">' + money(row.disc) + '</span></div>' +
          ageWarn + feeRow() + insHtml + '</div>';
      } };
    }
    // Rule 2 — list price, no self-pay discount
    var listAmt = (row.cash != null) ? row.cash : row.disc;
    if (listAmt != null) {
      return { tier: 1, value: listAmt, badgeEligible: false, html: function () {
        return '<div class="price-block">' +
          '<div class="warn-box">' + esc(t('compare.rule2', { amount: money(listAmt), phone: phone })) + '</div>' +
          ageWarn + feeRow() + insHtml + '</div>';
      } };
    }
    // Rule 3 — price not available
    return { tier: 2, value: Infinity, badgeEligible: false, html: function () {
      return '<p class="not-offered">' + esc(t('compare.rule3', { phone: phone })) + '</p>';
    } };
  }

  /* ---------------- charity block ---------------- */
  // Best self-pay figure for a price row (what charity care is applied against).
  function priceBase(row) {
    if (!row || row.note === 'suppressed' || row.note === 'not_offered' || row.note === 'ct_contrast') return null;
    if (row.disc != null && row.disc > 0) return row.disc;
    if (row.low != null) return row.low;
    if (row.cash != null) return row.cash;
    return null;
  }
  // Sliding scale: 100% off at the free-care threshold, tapering linearly to 0%
  // off at the discount ceiling. Returns the estimated discount % and $ owed.
  function charityEstimate(pct, policy, basePrice) {
    if (pct == null) return null;
    if (pct <= policy.free) return { band: 'free', discountPct: 100, owed: 0 };
    if (pct <= policy.disc) {
      var payFrac = (pct - policy.free) / (policy.disc - policy.free);
      payFrac = Math.max(0, Math.min(1, payFrac));
      var owed = (basePrice != null && isFinite(basePrice)) ? Math.round(basePrice * payFrac) : null;
      return { band: 'disc', discountPct: Math.round((1 - payFrac) * 100), owed: owed };
    }
    return { band: 'none', discountPct: 0, owed: null };
  }

  // Discount-band sentence. When the estimate rounds up to 100% off but the
  // person still owes something, say "Almost 100%" rather than "About 100%".
  function charityDiscLine(pct) {
    return t(pct >= 100 ? 'compare.charityDiscPctAlmost' : 'compare.charityDiscPct', { pct: pct });
  }

  // Whether this income qualifies for charity care at any BeforeCost hospital.
  function charityQualifies(pct) {
    return pct != null && BC.HOSPITALS.some(function (h) { return pct <= BC.CHARITY_POLICY[h.system].disc; });
  }

  function charityBlock(hosp, scr, basePrice, breakdownHtml) {
    var policy = BC.CHARITY_POLICY[hosp.system];
    var bd = breakdownHtml || '';
    var html = '';
    if (scr) {
      var pct = BC.fplPercent(scr.monthlyIncome, scr.familySize);
      var est = charityEstimate(pct, policy, basePrice);
      if (est && est.band === 'free') {
        html += '<div class="after-charity"><div class="ac-label">' + esc(t('compare.afterCharity')) + '</div>' + bd +
          '<div class="ac-amt"><span class="ac-check">✓</span>$0</div><p>' + esc(t('compare.afterCharityZero')) + '</p></div>';
      } else if (est && est.band === 'disc') {
        html += '<div class="after-charity"><div class="ac-label">' + esc(t('compare.afterCharity')) + '</div>' + bd +
          (est.owed != null ? '<div class="ac-amt ac-amt-est"><span class="estimated-label">' + esc(t('compare.estimated')) + '</span> ' + money(est.owed) + '</div>' : '') +
          '<p>' + esc(charityDiscLine(est.discountPct)) + '</p></div>';
      } else if (est && est.band === 'none') {
        html += '<div class="after-charity after-charity-none"><div class="ac-label">' + esc(t('compare.afterCharity')) + '</div>' +
          '<p>' + esc(t('compare.afterCharityNone')) + '</p></div>';
      }
    }
    return html + charityFoot(hosp);
  }

  // Charity thresholds + apply link + Dollar For + verified date (card footer).
  function charityFoot(hosp) {
    var policy = BC.CHARITY_POLICY[hosp.system];
    return '<div class="hosp-foot">' +
      '<p class="flat-note">' + esc(t('compare.charityFree', { pct: policy.free })) + ' ' +
      esc(t('compare.charityDisc', { pct: policy.disc })) + '</p>' +
      '<a class="charity-link" href="' + esc(BC.CHARITY_LINKS[hosp.system]) + '" target="_blank" rel="noopener noreferrer" ' +
      'data-out="charity" data-name="' + esc(hosp.name) + '">' +
      esc(hosp.system === 'hca' ? t('compare.hcaPolicyLink') : t('compare.charityLink', { hospital: hosp.name })) + '</a>' +
      (hosp.system === 'hca' ? '<p class="hca-note">' + esc(t('hca.noApp')) + '</p>' : '') +
      '<p class="dollar-for">' + t('compare.dollarFor', { link: '<a href="https://www.dollarfor.org" target="_blank" rel="noopener noreferrer" data-out="plain">dollarfor.org</a>' }) + '</p>' +
      (hosp.system === 'hca' ? '<p class="hca-note">' + esc(t('compare.hcaCharity')) + '</p>' : '') +
      '<p class="verified-date">' + esc(t('compare.lastVerified', { date: hosp.lastVerified })) + '</p>' +
      '</div>';
  }

  // The price row the results charity estimate is based on: strictly the
  // selected procedure at this hospital (no cross-procedure fallback), so the
  // figures always match the procedure chosen in the dropdown.
  function charityBaseRow(hosp) {
    return (BC.PRICES[hosp.id] || {})[getProc()];
  }
  function charityBase(hosp) { return priceBase(charityBaseRow(hosp)); }

  // Full charity-care card for the results page: mirrors the compare card, with
  // the gross / self-pay numbers struck through and the charity figure emphasized.
  function charityCard(hosp, scr, isLowest) {
    var pol = BC.CHARITY_POLICY[hosp.system];
    var pct = BC.fplPercent(scr.monthlyIncome, scr.familySize);
    var row = charityBaseRow(hosp);
    var isRange = row && row.low != null && row.high != null;
    var gross = row ? row.cash : null;
    var selfLow = isRange ? row.low : priceBase(row);
    var selfHigh = isRange ? row.high : priceBase(row);

    // Determine the charity band first. Only strike the self-pay price when
    // charity actually supersedes it (free/discount). Above the limit, the
    // self-pay price IS what the person would owe, so it stays as the headline.
    var estLow = charityEstimate(pct, pol, selfLow);
    var estHigh = charityEstimate(pct, pol, selfHigh);
    var band = estLow ? estLow.band : 'none';
    var charityApplies = band === 'free' || band === 'disc';

    var block = '<div class="price-block">';
    if (gross != null && gross !== selfLow) {
      block += '<div class="price-line"><span class="label">' + esc(t('compare.grossLabel')) + '</span>' +
        '<span class="strike">' + money(gross) + '</span></div>';
    }
    var oweVal = isRange ? (money(selfLow) + ' – ' + money(selfHigh)) : money(selfLow);
    block += '<div class="price-line"><span class="label">' + esc(t('compare.oweLabel')) + '</span>' +
      '<span class="amount' + (charityApplies ? ' strike-owe' : '') + '">' + oweVal + '</span></div>' +
      feeRowHtml(row, hosp) + '</div>';

    // After-charity value — a single Estimated label, a range when the base is a range.
    var after = '';
    if (band === 'free') {
      after = '<div class="after-charity"><div class="ac-label">' + esc(t('compare.afterCharity')) + '</div>' +
        '<div class="ac-amt"><span class="ac-check">✓</span>$0</div><p>' + esc(t('compare.afterCharityZero')) + '</p></div>';
    } else if (band === 'disc') {
      var amt = (isRange && estLow.owed !== estHigh.owed) ? (money(estLow.owed) + ' – ' + money(estHigh.owed)) : money(estLow.owed);
      after = '<div class="after-charity"><div class="ac-label">' + esc(t('compare.afterCharity')) + '</div>' +
        '<div class="ac-amt ac-amt-est"><span class="estimated-label">' + esc(t('compare.estimated')) + '</span> ' + amt + '</div>' +
        '<p>' + esc(charityDiscLine(estLow.discountPct)) + '</p></div>';
    } else {
      after = '<div class="after-charity after-charity-none">' +
        '<p>' + esc(t('compare.afterCharityNone')) + '</p></div>';
    }

    return '<div class="hosp charity-card' + (isLowest ? ' lowest' : '') + '">' +
      '<div class="hosp-head"><div><h3>' + esc(hosp.name) + '</h3>' +
      '<div class="hosp-addr">' + esc(hosp.address) + '</div></div>' +
      (isLowest ? '<span class="badge badge-mint">' + esc(t('compare.lowestBadge')) + '</span>' : '') + '</div>' +
      block + after + charityFoot(hosp) +
    '</div>';
  }

  /* ---------------- Harris callout ---------------- */
  function harrisCallout() {
    var h = BC.HARRIS;
    return '<div class="harris">' +
      '<h3>' + esc(t('harris.title')) + '</h3>' +
      '<p>' + esc(t('harris.intro')) + '</p>' +
      '<div class="harris-more hidden" id="harris-more">' +
        '<ul>' +
          '<li><strong>' + esc(h[0].name) + '</strong> — ' + esc(h[0].address) + ' — ' + esc(t('harris.q1').length ? h[0].area : '') + '</li>' +
          '<li><strong>' + esc(h[1].name) + '</strong> — ' + esc(h[1].address) + ' — ' + esc(h[1].area) + '</li>' +
        '</ul>' +
        '<p>' + esc(t('harris.perform')) + '</p>' +
        '<div class="sub-h">' + esc(t('harris.qualifyTitle')) + '</div>' +
        '<ul><li>' + esc(t('harris.q1')) + '</li><li>' + esc(t('harris.q2')) + '</li><li>' + esc(t('harris.q3')) + '</li></ul>' +
        '<div class="sub-h">' + esc(t('harris.copayTitle')) + '</div>' +
        '<ul><li>' + esc(t('harris.c1')) + '</li><li>' + esc(t('harris.c2')) + '</li><li>' + esc(t('harris.c3')) + '</li>' +
        '<li>' + esc(t('harris.c4')) + '</li><li>' + esc(t('harris.c5')) + '</li></ul>' +
        '<p>' + esc(t('harris.underinsured')) + '</p>' +
        '<p>' + esc(t('harris.separate')) + '</p>' +
        '<div class="btn-row"><a class="btn btn-primary" href="https://ola.veritysource.com/harris" target="_blank" rel="noopener noreferrer" data-out="gold">' + esc(t('btn.applyGold')) + '</a></div>' +
        '<div class="sources">' +
          '<a href="https://www.harrishealth.org/access-care-hh/Pages/financial-assistance-program.aspx" target="_blank" rel="noopener noreferrer" data-out="plain">' + esc(t('harris.source1')) + '</a>' +
          '<a href="https://www.harrishealth.org/SiteCollectionDocuments/eligibility/policies/financial-assistance-program-policy-5.02.pdf" target="_blank" rel="noopener noreferrer" data-out="plain">' + esc(t('harris.source2')) + '</a>' +
        '</div>' +
        '<p class="pbo">' + esc(t('harris.pbo')) + '</p>' +
      '</div>' +
      '<button type="button" class="harris-toggle" id="harris-toggle" aria-expanded="false" data-more="' + esc(t('harris.more')) + '" data-less="' + esc(t('harris.less')) + '">' + esc(t('harris.more')) + '</button>' +
    '</div>';
  }

  function disclaimer() { return '<div class="disclaimer">' + esc(t('disclaimer')) + '</div>'; }

  /* ---------------- MRI imaging-center card ---------------- */
  function mriImagingCard() {
    var items = BC.IMAGING_CENTERS.map(function (c) {
      var h = '<div class="mc-name">' + esc(c.name) + '</div>';
      if (c.detail) h += '<div class="mc-detail">' + esc(c.detail) + '</div>';
      if (c.phones && c.phones.length) {
        var ph = c.phones.map(function (p) {
          return '<a href="tel:' + esc(p.replace(/[^0-9+]/g, '')) + '">' + esc(p) + '</a>';
        }).join(' · ');
        h += '<div class="mc-line"><span class="mc-lbl">' + esc(t('mri.phone')) + ':</span> ' + ph + '</div>';
      }
      if (c.email) h += '<div class="mc-line"><span class="mc-lbl">' + esc(t('mri.email')) + ':</span> ' +
        '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a></div>';
      if (c.site) h += '<div class="mc-line"><span class="mc-lbl">' + esc(t('mri.web')) + ':</span> ' +
        '<a href="' + esc(c.url) + '" target="_blank" rel="noopener noreferrer" data-out="plain">' + esc(c.site) + '</a></div>';
      if (c.note) h += '<div class="mc-note">' + esc(c.note) + '</div>';
      return '<li class="mc">' + h + '</li>';
    }).join('');
    return '<div class="mri-card">' +
      '<h3>💡 ' + esc(t('mri.introHead')) + '</h3>' +
      '<p>' + esc(t('mri.introBody')) + '</p>' +
      '<p class="mri-call">' + esc(t('mri.introCall')) + '</p>' +
      '<ul class="mri-centers">' + items + '</ul>' +
      '<p class="mri-foot">' + esc(t('mri.introFooter')) + '</p>' +
    '</div>';
  }

  /* ================= VIEWS ================= */

  function viewLanding() {
    var goodbill = t('landing.goodbill', { link: '<a href="#/" data-faq-open="charity">' + esc(t('landing.faqLink')) + '</a>' });
    return '<div class="page landing-page">' +
      '<div class="hero-section">' +
        '<div class="hero-grid">' +
          '<div class="hero-left">' +
            '<h1 class="hero-wordmark"><span>Before</span><span class="c">Cost</span></h1>' +
            '<p class="hero-eyebrow">' + esc(t('landing.eyebrow')) + '</p>' +
            '<div class="btn-row">' +
              '<button type="button" class="btn btn-primary" id="start-scroll">' + esc(t('btn.start')) + '</button>' +
            '</div>' +
            '<p class="hero-time">⏱ ' + esc(t('landing.time')) + '</p>' +
            '<p class="goodbill">' + goodbill + '</p>' +
            TEXAS_MAP +
          '</div>' +
          '<div class="hero-right">' +
            '<div class="card landing-card">' +
              '<h2>' + esc(t('landing.title')) + '</h2>' +
              '<p class="landing-intro">' + esc(t('landing.intro')) + '</p>' +
              '<ul>' +
                '<li><span class="chk">✓</span>' + esc(t('landing.b1')) + '</li>' +
                '<li><span class="chk">✓</span>' + esc(t('landing.b2')) + '</li>' +
                '<li><span class="chk">✓</span>' + esc(t('landing.b3')) + '</li>' +
              '</ul>' +
            '</div>' +
          '</div>' +
        '</div>' +
        HERO_SKYLINE +
      '</div>' +
      '<div class="landing-screener" id="screener-section">' +
        '<p class="eyebrow">' + esc(t('screener.eyebrow')) + '</p>' +
        '<h2 class="landing-screener-title">' + esc(t('screener.title')) + '</h2>' +
        '<p class="lede">' + esc(t('screener.intro')) + '</p>' +
        screenerFormMarkup() +
      '</div>' +
    '</div>';
  }
  function scrollToScreenerSection(smooth) {
    var sec = el('screener-section');
    if (!sec) return;
    // Land the "Eligibility screener" eyebrow just below the sticky nav so it
    // isn't hidden behind it.
    var nav = el('nav');
    var headerH = nav ? nav.getBoundingClientRect().height : 0;
    var y = sec.getBoundingClientRect().top + window.scrollY - headerH - 12;
    window.scrollTo({ top: Math.max(0, y), behavior: smooth === false ? 'auto' : 'smooth' });
  }
  function wireLanding() {
    wireScreener();
    var btn = el('start-scroll');
    if (btn) btn.addEventListener('click', function () { scrollToScreenerSection(true); });
    // Arrived here via "Check Eligibility" from another page — jump to the screener.
    if (scrollToScreener) {
      scrollToScreener = false;
      scrollToScreenerSection(false);
    }
  }

  /* -------- screener -------- */
  function screenerFormMarkup() {
    var s = getScreener() || {};
    function radio(name, value, label, current) {
      var checked = current === value ? ' checked' : '';
      return '<label class="opt' + (checked ? ' checked' : '') + '">' +
        '<input type="radio" name="' + name + '" value="' + value + '"' + checked + '>' +
        '<span class="dot"></span><span>' + esc(label) + '</span></label>';
    }
    function checkGroup(name, items, selected) {
      return '<div class="check-list">' + items.map(function (it) {
        var on = !selected || !selected.length || selected.indexOf(it.value) > -1;
        return '<label class="chk-opt' + (on ? ' checked' : '') + '">' +
          '<input type="checkbox" name="' + name + '" value="' + esc(it.value) + '"' + (on ? ' checked' : '') + '>' +
          '<span class="chk-box"></span><span>' + esc(it.label) + '</span></label>';
      }).join('') + '</div>';
    }
    var hospItems = BC.HOSPITALS.map(function (h) { return { value: h.id, label: h.name }; });
    var procItems = BC.PROCEDURES.filter(function (p) { return p.key !== 'other'; })
      .map(function (p) { return { value: p.key, label: t('proc.' + p.key) }; });
    var narrowOpen = s.hospitalMode === 'specific';
    // Procedures are NOT pre-selected — the resident picks which ones. ("All
    // procedures" is only pre-checked if they explicitly chose it before.)
    // Hospitals stay defaulted to all (handled separately below).
    var procAll = s.procMode === 'all';
    return '<div class="scr-wrap">' +
      '<div class="scr-vbar"><div class="scr-vbar-fill" id="scr-vfill"></div></div>' +
      '<form id="screener-form" class="card">' +
        '<div id="scr-teaser"></div>' +
        field(t('screener.q.age'), '<input type="number" name="age" min="0" inputmode="numeric" value="' + esc(s.age || '') + '">') +
        field(t('screener.q.income'),
          '<div class="income-row">' +
            '<input type="number" name="monthlyIncome" min="0" inputmode="numeric" value="' + esc(s.monthlyIncome || '') + '">' +
            '<select name="incomeFreq" class="income-freq" aria-label="' + esc(t('screener.q.income')) + '">' +
              '<option value="yearly"' + ((s.incomeFreq || 'yearly') === 'yearly' ? ' selected' : '') + '>' + esc(t('screener.freq.yearly')) + '</option>' +
              '<option value="monthly"' + (s.incomeFreq === 'monthly' ? ' selected' : '') + '>' + esc(t('screener.freq.monthly')) + '</option>' +
            '</select>' +
          '</div>', t('screener.q.income.help')) +
        field(t('screener.q.size'), '<input type="number" name="familySize" min="1" inputmode="numeric" value="' + esc(s.familySize || '') + '">', t('screener.q.size.help')) +
        field(t('screener.q.county'),
          '<div class="opt-list">' + radio('county', 'harris', t('screener.opt.harris'), s.county) +
          radio('county', 'other', t('screener.opt.other'), s.county) + '</div>') +
        field(t('screener.q.sex'),
          '<div class="opt-inline">' + radio('sex', 'female', t('screener.opt.female'), s.sex) +
          radio('sex', 'male', t('screener.opt.male'), s.sex) +
          radio('sex', 'other', t('screener.opt.otherSex'), s.sex) + '</div>') +
        field(t('screener.q.pregnant'),
          '<div class="opt-inline">' + radio('pregnant', 'yes', t('opt.yes'), s.pregnant) +
          radio('pregnant', 'no', t('opt.no'), s.pregnant) + '</div>') +
        field(t('screener.q.kids'),
          '<div class="opt-inline">' + radio('kids', 'yes', t('opt.yes'), s.kids) +
          radio('kids', 'no', t('opt.no'), s.kids) + '</div>') +
        '<div id="kids-detail" class="' + (s.kids === 'yes' ? '' : 'hidden') + '">' +
          field(t('screener.q.kidsCount'), '<input type="number" name="kidsCount" min="0" inputmode="numeric" value="' + esc(s.kidsCount || '') + '">') +
          field(t('screener.q.kidsAges'), '<input type="text" name="kidsAges" value="' + esc(s.kidsAges || '') + '">') +
        '</div>' +
        field(t('screener.q.life'),
          '<div class="opt-inline">' + radio('lifeEvent', 'yes', t('opt.yes'), s.lifeEvent) +
          radio('lifeEvent', 'no', t('opt.no'), s.lifeEvent) + '</div>', t('screener.q.life.help')) +
        field(t('screener.q.disability'),
          '<div class="opt-inline">' + radio('disability', 'yes', t('opt.yes'), s.disability) +
          radio('disability', 'no', t('opt.no'), s.disability) + '</div>') +
        field(t('screener.q.procedures'),
          '<label class="chk-opt chk-all"><input type="checkbox" id="proc-all"' + (procAll ? ' checked' : '') + '>' +
            '<span class="chk-box"></span><span>' + esc(t('screener.opt.allProcedures')) + '</span></label>' +
          '<div class="check-list proc-list' + (procAll ? ' hidden' : '') + '" id="procedure-checks">' +
            procItems.map(function (it) {
              var on = procAll || (s.procedures && s.procedures.indexOf(it.value) > -1);
              return '<label class="chk-opt' + (on ? ' checked' : '') + '"><input type="checkbox" name="procedure" value="' + esc(it.value) + '"' + (on ? ' checked' : '') + '>' +
                '<span class="chk-box"></span><span>' + esc(it.label) + '</span></label>';
            }).join('') +
          '</div>', t('screener.q.procedures.help')) +
        '<div class="opt-section">' +
          '<button type="button" class="opt-toggle" id="opt-narrow-btn" aria-expanded="' + (narrowOpen ? 'true' : 'false') + '">' +
            '<span>' + esc(t('screener.narrowToggle')) + '</span><span class="opt-toggle-ic" aria-hidden="true"></span></button>' +
          '<div class="opt-section-body' + (narrowOpen ? '' : ' hidden') + '" id="opt-narrow">' +
            field(t('screener.q.hospitals'),
              '<div class="opt-inline">' + radio('hospitalMode', 'all', t('screener.opt.allHospitals'), s.hospitalMode || 'all') +
              radio('hospitalMode', 'specific', t('screener.opt.specificHospitals'), s.hospitalMode || 'all') + '</div>' +
              '<div class="check-group' + (s.hospitalMode === 'specific' ? '' : ' hidden') + '" id="hospital-checks">' +
              checkGroup('hospital', hospItems, s.hospitals) + '</div>', t('screener.q.hospitals.help')) +
          '</div>' +
        '</div>' +
        '<div class="btn-row"><button type="submit" class="btn btn-primary">' + esc(t('btn.seeResults')) + '</button></div>' +
      '</form>' +
    '</div>';
  }
  function viewScreener() {
    return '<div class="page narrow">' +
      '<p class="eyebrow">' + esc(t('screener.eyebrow')) + '</p>' +
      '<h1>' + esc(t('screener.title')) + '</h1>' +
      '<p class="lede">' + esc(t('screener.intro')) + '</p>' +
      screenerFormMarkup() +
    '</div>';
  }
  function field(label, control, help) {
    return '<div class="field"><label>' + esc(label) + '</label>' + control +
      (help ? '<div class="help">' + esc(help) + '</div>' : '') + '</div>';
  }

  function wireScreener() {
    var form = el('screener-form');
    if (!form) return;
    function live() { screenerProgress(form); screenerTeaser(form); }
    // radio visual state + kids toggle
    form.addEventListener('change', function (e) {
      if (e.target.type === 'radio') {
        form.querySelectorAll('input[name="' + e.target.name + '"]').forEach(function (r) {
          r.closest('.opt').classList.toggle('checked', r.checked);
        });
        if (e.target.name === 'kids') el('kids-detail').classList.toggle('hidden', e.target.value !== 'yes');
        if (e.target.name === 'hospitalMode') el('hospital-checks').classList.toggle('hidden', e.target.value !== 'specific');
      } else if (e.target.type === 'checkbox') {
        var opt = e.target.closest('.chk-opt');
        if (opt) opt.classList.toggle('checked', e.target.checked);
        if (e.target.id === 'proc-all') el('procedure-checks').classList.toggle('hidden', e.target.checked);
      }
      live();
    });
    form.addEventListener('input', live);
    var narrowBtn = el('opt-narrow-btn');
    if (narrowBtn) narrowBtn.addEventListener('click', function () {
      var open = el('opt-narrow').classList.toggle('hidden') === false;
      narrowBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    live(); // reflect any pre-filled values
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var data = {
        age: fd.get('age'), monthlyIncome: fd.get('monthlyIncome'), incomeFreq: fd.get('incomeFreq') || 'yearly', familySize: fd.get('familySize'),
        county: fd.get('county'), sex: fd.get('sex'),
        pregnant: fd.get('pregnant') === 'yes', kids: fd.get('kids'),
        kidsCount: fd.get('kidsCount'), kidsAges: fd.get('kidsAges'),
        lifeEvent: fd.get('lifeEvent') === 'yes', disability: fd.get('disability') === 'yes'
      };
      // store raw radio strings too for repopulation
      data.pregnant = fd.get('pregnant'); data.lifeEvent = fd.get('lifeEvent'); data.disability = fd.get('disability');
      // hospital / procedure narrowing
      data.hospitalMode = fd.get('hospitalMode') || 'all';
      data.hospitals = data.hospitalMode === 'specific' ? fd.getAll('hospital') : [];
      var procAllChecked = el('proc-all') ? el('proc-all').checked : true;
      data.procMode = procAllChecked ? 'all' : 'specific';
      data.procedures = data.procMode === 'specific' ? fd.getAll('procedure') : [];
      setScreener(data);
      // default the compare procedure to the first one they chose
      if (data.procedures.length) {
        if (data.procedures.indexOf(getProc()) === -1) setProc(data.procedures[0]);
      }
      track('screener_completed');
      location.hash = '#/results';
    });
  }

  // Live completion bar for the core eligibility questions.
  function screenerProgress(form) {
    var textF = ['age', 'monthlyIncome', 'familySize'];
    var radioF = ['county', 'sex', 'pregnant', 'kids', 'lifeEvent', 'disability'];
    var done = 0;
    textF.forEach(function (n) { var i = form.querySelector('[name="' + n + '"]'); if (i && String(i.value).trim() !== '') done++; });
    radioF.forEach(function (n) { if (form.querySelector('input[name="' + n + '"]:checked')) done++; });
    var pct = Math.round(done / (textF.length + radioF.length) * 100);
    var fill = el('scr-vfill'); if (fill) fill.style.height = pct + '%';
  }

  // Live teaser: once income + family size are entered, show a running count
  // of the programs they may qualify for.
  function screenerTeaser(form) {
    var host = el('scr-teaser'); if (!host) return;
    var fd = new FormData(form);
    var income = fd.get('monthlyIncome'), size = fd.get('familySize');
    if (!income || !size) { host.innerHTML = ''; return; }
    var data = {
      age: fd.get('age'), monthlyIncome: income, incomeFreq: fd.get('incomeFreq') || 'yearly', familySize: size,
      county: fd.get('county'), sex: fd.get('sex'), pregnant: fd.get('pregnant'),
      kids: fd.get('kids'), kidsCount: fd.get('kidsCount'),
      lifeEvent: fd.get('lifeEvent'), disability: fd.get('disability')
    };
    var norm = normalizeScreener(data);
    var res = BC.evaluate(norm, TODAY);
    var charityQ = charityQualifies(BC.fplPercent(norm.monthlyIncome, norm.familySize)) ? 1 : 0;
    var count = res.programs.length + (res.coverageGap ? 1 : 0) + charityQ;
    host.innerHTML = count > 0
      ? '<div class="scr-teaser-box">' + esc(t('screener.teaser', { n: count })) + '</div>'
      : '';
  }

  /* -------- results -------- */
  // Income is entered as a raw amount plus a frequency (per year / per month).
  // Everything downstream works in MONTHLY dollars, so convert here in one place.
  function monthlyIncomeOf(amount, freq) {
    var v = Number(amount) || 0;
    return freq === 'monthly' ? v : v / 12; // default (incl. undefined) = yearly
  }
  function normalizeScreener(s) {
    return {
      age: s.age, monthlyIncome: monthlyIncomeOf(s.monthlyIncome, s.incomeFreq), familySize: s.familySize,
      county: s.county, sex: s.sex,
      pregnant: s.pregnant === 'yes' || s.pregnant === true,
      kids: s.kids === 'yes' || s.kids === true,
      kidsCount: s.kidsCount,
      lifeEvent: s.lifeEvent === 'yes' || s.lifeEvent === true,
      disability: s.disability === 'yes' || s.disability === true
    };
  }

  function viewResults() {
    var s = getScreener();
    if (!s) { scrollToScreener = true; location.hash = '#/'; return ''; }
    return '<div class="page">' +
      '<p class="eyebrow">' + esc(t('results.eyebrow')) + '</p>' +
      '<div id="results-live"></div>' +
    '</div>';
  }

  function programCard(p, P) {
    var info = P[p.key] || {};
    var cls = 'program' + (p.badge === 'best' ? ' best' : (p.badge === 'priority' ? ' priority' : ''));
    var badge = '';
    if (p.badge === 'best') badge = '<span class="badge badge-best">' + esc(t('results.badge.best')) + '</span>';
    else if (p.badge === 'kids') badge = '<span class="badge badge-kids">' + esc(t('results.badge.kids')) + '</span>';
    else if (p.badge === 'priority') badge = '<span class="badge badge-priority">' + esc(t('results.badge.priority')) + '</span>';
    else if (p.badge === 'bridge') badge = '<span class="badge badge-bridge">' + esc(t('results.badge.bridge')) + '</span>';
    return '<div class="' + cls + '">' +
      '<div class="program-head"><h3>' + esc(info.name || p.key) + '</h3>' + badge + '</div>' +
      '<p>' + esc(info.desc || '') + '</p>' +
      (info.note ? '<p class="note-line">' + esc(info.note) + '</p>' : '') +
      '<a class="apply-link" href="' + esc(info.url || '#') + '" target="_blank" rel="noopener noreferrer" data-out="apply" data-name="' + esc(info.name || '') + '">' +
      esc(info.apply || t('results.apply')) + ' →</a>' +
    '</div>';
  }
  function coverageGapCard(P) {
    var cg = P.coverageGap;
    return '<div class="program priority">' +
      '<div class="program-head"><h3>' + esc(P.coverageGapTitle) + '</h3></div>' +
      '<p>' + esc(P.coverageGapBody) + '</p>' +
      '<ul class="route-list">' +
        '<li>' + esc(cg.r1) + '</li><li>' + esc(cg.r2) + '</li><li>' + esc(cg.r3) + '</li>' +
        '<li>' + esc(cg.r4) + '</li><li>' + esc(cg.r5) + '</li>' +
      '</ul>' +
    '</div>';
  }

  function renderResultsLive(quiet) {
    var host = el('results-live');
    if (!host) return;
    var raw = getScreener(); if (!raw) return;
    var s = normalizeScreener(raw);
    var res = BC.evaluate(s, TODAY);
    var P = BC.pt();
    var progs = res.programs.filter(function (p) { return p.key !== 'healthyTexasWomen' || true; });

    var charityQ = charityQualifies(BC.fplPercent(s.monthlyIncome, s.familySize)) ? 1 : 0;
    var count = res.programs.length + (res.coverageGap ? 1 : 0) + charityQ;
    if (!quiet) track('programs_surfaced', { count: count });
    var html = '';
    html += '<h1>' + esc(count > 0 ? t('results.title.some', { n: count }) : t('results.title.none')) + '</h1>';

    // live adjusters — procedure dropdown drives the charity estimates.
    var curProc = getProc();
    var procOpts = BC.PROCEDURES.filter(function (p) { return p.key !== 'other'; }).map(function (p) {
      return '<option value="' + p.key + '"' + (p.key === curProc ? ' selected' : '') + '>' + esc(t('proc.' + p.key)) + '</option>';
    }).join('');
    html += '<div class="card" style="margin:14px 0;max-width:520px">' +
      '<div class="field" style="margin-bottom:12px"><label>' + esc(t('compare.selectLabel')) + '</label>' +
      '<select id="live-proc">' + procOpts + '</select></div>' +
      '<div class="field" style="margin-bottom:12px"><label>' + esc(t('screener.q.income')) + '</label>' +
      '<div class="income-row"><input type="text" id="live-income" inputmode="numeric" value="' + esc(raw.monthlyIncome || '') + '">' +
      '<select id="live-freq" class="income-freq">' +
        '<option value="yearly"' + ((raw.incomeFreq || 'yearly') === 'yearly' ? ' selected' : '') + '>' + esc(t('screener.freq.yearly')) + '</option>' +
        '<option value="monthly"' + (raw.incomeFreq === 'monthly' ? ' selected' : '') + '>' + esc(t('screener.freq.monthly')) + '</option>' +
      '</select></div></div>' +
      '<div class="field" style="margin-bottom:0"><label>' + esc(t('screener.q.size')) + '</label>' +
      '<input type="text" id="live-size" inputmode="numeric" value="' + esc(raw.familySize || '') + '"></div>' +
    '</div>';

    // Coverage programs (Gold Card, Medicaid, CHIP, etc.) stay prominent above
    // charity care so people see them first; ACA + fallbacks go in an accordion.
    var COVERAGE = ['goldcard', 'medicaidPregnant', 'chipPerinatal', 'childrensMedicaid', 'chip', 'healthyTexasWomen', 'medicaidDisability'];
    var prominentPrograms = res.programs.filter(function (p) { return COVERAGE.indexOf(p.key) > -1; });
    var otherPrograms = res.programs.filter(function (p) { return COVERAGE.indexOf(p.key) === -1; });
    if (prominentPrograms.length) {
      html += '<div class="program-grid">' + prominentPrograms.map(function (p) { return programCard(p, P); }).join('') + '</div>';
    }

    // charity-care cards (prominent) for eligible hospitals, ordered by estimated
    // cost least → greatest.
    var selH = selHospitalIds();
    var pctNow = BC.fplPercent(s.monthlyIncome, s.familySize);
    // Show every hospital that prices the selected procedure. Charity discounts
    // are applied when the person qualifies; above the limit, the self-pay price
    // is shown — so residents always see real dollar amounts, never a dead end.
    var eligible = BC.HOSPITALS.filter(function (h) {
      if (selH && selH.indexOf(h.id) === -1) return false;
      if (!BC.CHARITY_POLICY[h.system]) return false;
      return priceBase((BC.PRICES[h.id] || {})[getProc()]) != null;
    }).map(function (h) {
      var est = charityEstimate(pctNow, BC.CHARITY_POLICY[h.system], charityBase(h));
      var base = charityBase(h);
      var owed;
      if (est && est.band === 'free') owed = 0;
      else if (est && est.band === 'disc') owed = (est.owed != null ? est.owed : Infinity);
      else owed = (base != null ? base : Infinity); // above the limit → self-pay price
      return { hosp: h, owed: owed };
    }).sort(function (a, b) { return a.owed - b.owed; });
    if (eligible.length) {
      var anyCharity = charityQualifies(pctNow);
      html += '<h2 class="section-gap">' + esc(anyCharity ? t('results.charityTitle') : t('results.priceTitle')) + '</h2>' +
        '<p class="lede" style="margin-top:6px">' + esc(anyCharity ? t('results.charityIntro') : t('results.priceIntro')) + '</p>' +
        '<div class="hosp-grid">' + eligible.map(function (x, i) { return charityCard(x.hosp, s, i === 0); }).join('') + '</div>';
    }

    // ACA Marketplace + all other programs, tucked into a collapsible accordion.
    if (otherPrograms.length || res.coverageGap) {
      var accInner = '<div class="program-grid">' +
        otherPrograms.map(function (p) { return programCard(p, P); }).join('') +
        (res.coverageGap ? coverageGapCard(P) : '') +
      '</div>';
      html += '<div class="prog-acc section-gap">' +
        '<button type="button" class="prog-acc-toggle" id="prog-acc-btn" aria-expanded="true">' +
          '<span>' + esc(t('results.moreTitle')) + '</span><span class="prog-acc-ic" aria-hidden="true"></span></button>' +
        '<div class="prog-acc-body" id="prog-acc-body">' + accInner + '</div>' +
      '</div>';
    }

    // footer 211
    html += '<p class="lede section-gap" style="font-size:.85rem">' +
      t('results.footer', { link: '<a href="https://www.211texas.org" target="_blank" rel="noopener noreferrer" data-out="plain">2-1-1</a>' }) + '</p>';

    html += '<div class="btn-row"><a class="btn btn-outline" href="#/" data-scroll-screener="1">' + esc(t('btn.back')) + '</a></div>';

    host.innerHTML = html;

    var accBtn = el('prog-acc-btn');
    if (accBtn) accBtn.addEventListener('click', function () {
      var open = el('prog-acc-body').classList.toggle('hidden') === false;
      accBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    var lproc = el('live-proc');
    if (lproc) lproc.addEventListener('change', function () {
      setProc(lproc.value);
      renderResultsLive(true);
    });

    function relive() {
      var inc = el('live-income').value, sz = el('live-size').value;
      var fq = el('live-freq') ? el('live-freq').value : (raw.incomeFreq || 'yearly');
      raw.monthlyIncome = inc; raw.familySize = sz; raw.incomeFreq = fq;
      setScreener(raw);
      var focusId = document.activeElement && document.activeElement.id;
      renderResultsLive(true);
      if (focusId) { var f = el(focusId); if (f) { f.focus(); try { f.setSelectionRange(f.value.length, f.value.length); } catch (e) {} } }
    }
    el('live-income').addEventListener('input', relive);
    el('live-size').addEventListener('input', relive);
    if (el('live-freq')) el('live-freq').addEventListener('change', relive);
  }

  /* -------- compare -------- */
  function viewCompare() {
    // Everyone screens first — no bypass into prices.
    if (!getScreener()) { scrollToScreener = true; location.hash = '#/'; return ''; }
    var cur = getProc();
    var selP = selProcKeys();
    var procs = BC.PROCEDURES.filter(function (p) { return p.key === 'other' || p.key === cur || !selP || selP.indexOf(p.key) > -1; });
    var tabs = procs.map(function (p) {
      var extra = p.key === 'other' ? ' proc-tab-other' : '';
      return '<button type="button" class="proc-tab' + (p.key === cur ? ' active' : '') + extra +
        '" data-proc="' + p.key + '">' + esc(t('proc.' + p.key)) + '</button>';
    }).join('');
    return '<div class="page">' +
      '<p class="eyebrow">' + esc(t('compare.eyebrow')) + '</p>' +
      '<h1>' + esc(t('compare.title')) + '</h1>' +
      '<p class="lede">' + esc(t('compare.intro')) + '</p>' +
      '<div class="field"><label>' + esc(t('compare.selectLabel')) + '</label>' +
      '<div class="proc-tabs" id="proc-tabs">' + tabs + '</div></div>' +
      '<div id="compare-results"></div>' +
    '</div>';
  }

  function renderCompareResults() {
    var host = el('compare-results');
    if (!host) return;
    var procKey = getProc();
    var scr = getScreener() ? normalizeScreener(getScreener()) : null;

    if (procKey === 'other') {
      track('procedure_not_available'); track('other_procedure_selected');
      host.innerHTML = '<div class="card other-card">' +
        '<h3>' + esc(t('other.title')) + '</h3>' +
        '<p>' + esc(t('other.b1')) + '</p>' +
        '<p>' + esc(t('other.b2')) + '</p>' +
        '<p>' + esc(t('other.b3')) + '</p>' +
        '<p>' + esc(t('other.b4')) + '</p>' +
        '<div class="btn-row">' +
          '<a class="btn btn-primary" href="#/resources">' + esc(t('btn.goResources')) + '</a>' +
          '<a class="btn btn-outline" href="mailto:beforecost@gmail.com">' + esc(t('other.emailBtn')) + '</a>' +
        '</div></div>';
      return;
    }

    track('procedure_search', { procedure: BC.PROCEDURES.filter(function (p) { return p.key === procKey; })[0].code });

    // build views (respecting any hospital narrowing from the screener)
    var selH = selHospitalIds();
    var cards = BC.HOSPITALS.filter(function (h) { return !selH || selH.indexOf(h.id) > -1; }).map(function (h) {
      var row = (BC.PRICES[h.id] || {})[procKey];
      var pv = priceView(row, h, procKey, scr);
      return { hosp: h, pv: pv };
    }).filter(function (c) { return c.pv != null; });

    // sort by tier then value
    cards.sort(function (a, b) {
      if (a.pv.tier !== b.pv.tier) return a.pv.tier - b.pv.tier;
      return a.pv.value - b.pv.value;
    });
    // lowest badge = first tier-0 badge-eligible card
    var lowestId = null;
    for (var i = 0; i < cards.length; i++) { if (cards[i].pv.tier === 0 && cards[i].pv.badgeEligible) { lowestId = cards[i].hosp.id; break; } }

    var html = '';
    if (procKey === 'mri_lumbar') html += mriImagingCard();
    html += harrisCallout();
    html += '<p class="compare-meta">' + esc(t('compare.count', { n: cards.length })) + '</p>';

    html += '<div class="hosp-grid">';
    cards.forEach(function (c) {
      var isLowest = c.hosp.id === lowestId;
      html += '<div class="hosp' + (isLowest ? ' lowest' : '') + '" data-hosp="' + esc(c.hosp.name) + '">' +
        '<div class="hosp-head"><div><h3>' + esc(c.hosp.name) + '</h3>' +
        '<div class="hosp-addr">' + esc(c.hosp.address) + '</div></div>' +
        (isLowest ? '<span class="badge badge-mint">' + esc(t('compare.lowestBadge')) + '</span>' : '') + '</div>' +
        c.pv.html(isLowest) +
        charityBlock(c.hosp, scr, (c.pv && isFinite(c.pv.value)) ? c.pv.value : null) +
      '</div>';
    });
    html += '</div>';

    html += disclaimer();
    host.innerHTML = html;

    var htoggle = el('harris-toggle'), hmore = el('harris-more');
    if (htoggle && hmore) htoggle.addEventListener('click', function () {
      var open = hmore.classList.toggle('hidden') === false;
      htoggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      htoggle.textContent = open ? htoggle.getAttribute('data-less') : htoggle.getAttribute('data-more');
    });

    // fire hospital_clicked on card interaction (ignore links/buttons)
    host.querySelectorAll('.hosp').forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (e.target.closest('a,button')) return;
        track('hospital_clicked', { hospital: card.getAttribute('data-hosp') });
      });
    });
  }

  /* -------- gold card calculator -------- */
  function viewGold() {
    return '<div class="page narrow">' +
      '<p class="eyebrow">' + esc(t('gold.eyebrow')) + '</p>' +
      '<h1>' + esc(t('gold.title')) + '</h1>' +
      '<p class="lede">' + esc(t('gold.intro')) + '</p>' +
      '<div class="card">' +
        field(t('gold.income'), '<input type="number" id="gold-income" inputmode="numeric" min="0">') +
        field(t('gold.size'), '<input type="number" id="gold-size" inputmode="numeric" min="1">') +
        '<div class="btn-row"><button class="btn btn-primary" id="gold-calc">' + esc(t('gold.calc')) + '</button></div>' +
      '</div>' +
      '<div id="gold-result"></div>' +
    '</div>';
  }
  function wireGold() {
    var b = el('gold-calc'); if (!b) return;
    b.addEventListener('click', function () {
      var inc = Number(el('gold-income').value) || 0, sz = Number(el('gold-size').value) || 1;
      var pct = BC.fplPercent(inc, sz);
      var qualifies = pct != null && pct <= 150;
      var html = '<div class="card section-gap">' +
        '<p>' + esc(qualifies ? t('gold.resultQualify') : t('gold.resultMaybe')) + '</p>' +
        '<div class="sub-h" style="font-weight:700;color:var(--forest);margin-top:8px">' + esc(t('gold.copayHeader')) + '</div>' +
        '<ul class="route-list" style="margin-top:10px">' +
          '<li>' + esc(t('harris.c1')) + '</li><li>' + esc(t('harris.c2')) + '</li><li>' + esc(t('harris.c3')) + '</li>' +
          '<li>' + esc(t('harris.c4')) + '</li><li>' + esc(t('harris.c5')) + '</li>' +
          '<li><strong>' + esc(t('gold.pediatric')) + '</strong></li>' +
        '</ul>' +
        '<div class="btn-row"><a class="btn btn-primary" href="https://ola.veritysource.com/harris" target="_blank" rel="noopener noreferrer" data-out="gold">' + esc(t('btn.applyGold')) + '</a></div>' +
        '<p class="verified-date">' + esc(t('gold.disclaimerHarris')) + '</p>' +
      '</div>';
      el('gold-result').innerHTML = html;
    });
  }

  /* -------- resources -------- */
  function viewResources() {
    function tel(p) { return 'tel:' + String(p).replace(/[^0-9+]/g, ''); }
    var dfLink = '<a href="https://www.dollarfor.org" target="_blank" rel="noopener noreferrer" data-out="plain">Dollar For</a>';
    var goodbillLink = '<a href="https://www.goodbill.com" target="_blank" rel="noopener noreferrer" data-out="plain">GoodBill</a>';

    // Collapsible card: the name is the toggle, the details expand on click.
    function accCard(name, body) {
      return '<div class="res-hosp res-acc">' +
        '<button type="button" class="res-acc-head" aria-expanded="false">' +
          '<span class="res-hosp-name">' + esc(name) + '</span>' +
          '<span class="res-acc-chev" aria-hidden="true">▾</span>' +
        '</button>' +
        '<div class="res-acc-body">' + body + '</div>' +
      '</div>';
    }

    function hospCard(h) {
      var pol = BC.CHARITY_POLICY[h.system];
      var est = BC.ESTIMATORS[h.system];
      var char = BC.CHARITY_LINKS[h.system];
      var ph = h.pricingPhone || h.phone;
      var body = '<div class="res-hosp-addr">' + esc(h.address) + '</div>' +
        '<div class="res-hosp-line"><span class="res-lbl">' + esc(t('resources.callLabel')) + ':</span> ' +
          '<a href="' + tel(ph) + '">' + esc(ph) + '</a></div>' +
        (pol ? '<div class="res-hosp-thresh">' + esc(t('resources.charityThresh', { free: pol.free, disc: pol.disc })) + '</div>' : '') +
        '<div class="res-hosp-links">' +
          (est ? '<a href="' + esc(est) + '" target="_blank" rel="noopener noreferrer" data-out="plain">' + esc(t('resources.estimatorLink')) + '</a>' : '') +
          (char ? '<a href="' + esc(char) + '" target="_blank" rel="noopener noreferrer" data-out="charity" data-name="' + esc(h.name) + '">' + esc(h.system === 'hca' ? t('resources.hcaPolicyLink') : t('resources.charityApplyLink')) + '</a>' : '') +
        '</div>' +
        (h.system === 'hca' ? '<p class="res-hca-note">' + esc(t('hca.noApp')) + '</p>' : '') +
        '<p class="res-dollar">' + t('resources.dollarNote', { link: dfLink }) + '</p>';
      return accCard(h.name, body);
    }
    var harrisCards = BC.HARRIS.map(function (h) {
      var body = '<div class="res-hosp-addr">' + esc(h.address) + '</div>' +
        '<div class="res-hosp-line"><span class="res-lbl">' + esc(t('resources.callLabel')) + ':</span> ' +
          '<a href="tel:7135666509">713-566-6509</a></div>' +
        '<div class="res-hosp-thresh">' + esc(t('resources.goldThresh')) + '</div>' +
        '<div class="res-hosp-links"><a href="https://ola.veritysource.com/harris" target="_blank" rel="noopener noreferrer" data-out="gold">' + esc(t('resources.goldApplyLink')) + '</a></div>';
      return accCard(h.name, body);
    }).join('');

    var programs = [
      { name: 'Medicaid, CHIP & CHIP Perinatal', descKey: 'res.prog.medicaid', site: 'yourtexasbenefits.com', url: 'https://www.yourtexasbenefits.com', phone: '2-1-1', kind: 'apply' },
      { name: 'ACA Marketplace', descKey: 'res.prog.aca', site: 'healthcare.gov', url: 'https://www.healthcare.gov', phone: '1-800-318-2596', kind: 'apply' },
      { name: 'Healthy Texas Women', descKey: 'res.prog.htw', site: 'healthytexaswomen.org', url: 'https://www.healthytexaswomen.org', phone: '1-866-993-9972', kind: 'apply' },
      { name: 'Harris Health Gold Card', descKey: 'res.prog.goldcard', site: 'ola.veritysource.com/harris', url: 'https://ola.veritysource.com/harris', phone: '713-566-6509', kind: 'gold' },
      { name: 'SSI (Supplemental Security Income)', descKey: 'res.prog.ssi', site: 'ssa.gov/apply/ssi', url: 'https://www.ssa.gov/apply/ssi', phone: '1-800-772-1213', kind: 'plain' },
      { name: 'Community Health Centers', descKey: 'res.prog.chc', site: 'findahealthcenter.hrsa.gov', url: 'https://findahealthcenter.hrsa.gov', phone: '', kind: 'plain' },
      { name: 'NeedyMeds', descKey: 'res.prog.needymeds', site: 'needymeds.org', url: 'https://www.needymeds.org', phone: '', kind: 'plain' },
      { name: 'Dollar For', descKey: 'res.prog.dollarfor', site: 'dollarfor.org', url: 'https://www.dollarfor.org', phone: '', kind: 'plain' },
      { name: '2-1-1 Texas', descKey: 'res.prog.t211', site: '211texas.org', url: 'https://www.211texas.org', phone: '2-1-1', kind: 'plain' },
      { name: 'WIC', descKey: 'res.prog.wic', site: 'texaswic.org', url: 'https://www.texaswic.org', phone: '', kind: 'plain' }
    ];
    function progCard(p) {
      var body = '<div class="res-hosp-addr">' + esc(t(p.descKey)) + '</div>' +
        (p.phone ? '<div class="res-hosp-line"><span class="res-lbl">' + esc(t('resources.callLabel')) + ':</span> ' +
          '<a href="' + tel(p.phone) + '">' + esc(p.phone) + '</a></div>' : '') +
        '<div class="res-hosp-links"><a href="' + esc(p.url) + '" target="_blank" rel="noopener noreferrer" data-out="' + p.kind + '" data-name="' + esc(p.name) + '">' + esc(p.site) + ' ↗</a></div>';
      return accCard(p.name, body);
    }

    return '<div class="page narrow">' +
      '<p class="eyebrow">' + esc(t('resources.eyebrow')) + '</p>' +
      '<h1>' + esc(t('resources.title')) + '</h1>' +
      '<div class="disclaimer">' + esc(t('resources.disclaimer')) + '</div>' +
      '<h2 class="how-section section-gap">' + esc(t('resources.hospitalsTitle')) + '</h2>' +
      '<div class="res-hosp-grid">' + BC.HOSPITALS.map(hospCard).join('') + harrisCards + '</div>' +
      '<h2 class="how-section section-gap">' + esc(t('resources.programsTitle')) + '</h2>' +
      '<div class="res-hosp-grid">' + programs.map(progCard).join('') + '</div>' +
      '<h2 class="how-section section-gap">' + esc(t('resources.billsTitle')) + '</h2>' +
      '<div class="res-list">' +
        '<div class="res"><div><div class="res-name">GoodBill</div><div class="res-desc">' + t('resources.goodbill', { link: goodbillLink }) + '</div></div>' +
          '<a class="res-go" href="https://www.goodbill.com" target="_blank" rel="noopener noreferrer" data-out="plain">Open ↗</a></div>' +
        '<div class="res"><div><div class="res-name">Dollar For</div><div class="res-desc">' + t('resources.dollarfor', { link: dfLink }) + '</div></div>' +
          '<a class="res-go" href="https://www.dollarfor.org" target="_blank" rel="noopener noreferrer" data-out="plain">Open ↗</a></div>' +
      '</div>' +
    '</div>';
  }

  function wireResources() {
    document.querySelectorAll('.res-acc-head').forEach(function (head) {
      head.addEventListener('click', function () {
        var card = head.parentNode;
        var open = card.classList.toggle('open');
        head.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  }

  function viewHow() {
    // Steps 1 & 2 have a CTA that leads to the eligibility screener embedded on
    // the homepage (data-scroll-screener). Step 3 has no CTA; its body carries a
    // "FAQ" link that opens the charity-after-the-bill FAQ item.
    var faqLink = '<a href="#/" data-faq-open="charity">' + esc(t('faq.shortLink')) + '</a>';
    var patientSteps = [
      ['1', 'how.p1t', 'how.p1b', 'how.p1cta', '#/', true, null],
      ['2', 'how.p2t', 'how.p2b', 'how.p2cta', '#/', true, null],
      ['3', 'how.p3t', 'how.p3b', null, null, false, faqLink]
    ].map(function (s) {
      var scrollAttr = s[5] ? ' data-scroll-screener="1"' : '';
      // Body may hold multiple paragraphs separated by a blank line. The link
      // step is trusted i18n HTML (holds the anchor); the others are escaped.
      var paras = s[6]
        ? t(s[2], { link: s[6] }).split('\n\n')
        : t(s[2]).split('\n\n').map(function (x) { return esc(x); });
      var bodyHtml = paras.map(function (x) { return '<p>' + x + '</p>'; }).join('');
      var cta = s[3] ? '<a class="how-cta" href="' + s[4] + '"' + scrollAttr + '>' + esc(t(s[3])) + '</a>' : '';
      return '<div class="how-step"><div class="how-num">' + s[0] + '</div>' +
        '<div class="how-body"><h3>' + esc(t(s[1])) + '</h3>' + bodyHtml + cta + '</div></div>';
    }).join('');
    var clinicSteps = ['how.c1', 'how.c2', 'how.c3', 'how.c5', 'how.c6']
      .map(function (k) { return '<li>' + esc(t(k)) + '</li>'; }).join('');
    return '<div class="page narrow">' +
      '<p class="eyebrow">' + esc(t('how.eyebrow')) + '</p>' +
      '<h1>' + esc(t('how.title')) + '</h1>' +
      '<p class="lede">' + esc(t('how.subtitle')) + '</p>' +
      '<h2 class="how-section">' + esc(t('how.forPatients')) + '</h2>' +
      '<div class="how-steps">' + patientSteps + '</div>' +
      '<p class="how-closing">' + esc(t('how.closing')) + '</p>' +
      '<h2 class="how-section section-gap clinic-hl">' + esc(t('how.clinicTitle')) + '</h2>' +
      '<p class="lede">' + esc(t('how.clinicSub')) + '</p>' +
      '<ol class="how-clinic">' + clinicSteps + '</ol>' +
      '<div class="disclaimer">' + esc(t('how.clinicNote')) + '</div>' +
      '<div class="btn-row"><a class="btn btn-primary" href="#/" data-scroll-screener="1">' + esc(t('btn.start')) + '</a></div>' +
    '</div>';
  }

  function viewAbout() {
    var email = '<a href="mailto:beforecost@gmail.com">beforecost@gmail.com</a>';
    var paras = ['about.p1', 'about.p2', 'about.p3', 'about.p4', 'about.p5', 'about.p6', 'about.p7']
      .map(function (k) { return t(k).split('\n\n').map(function (x) { return '<p>' + esc(x) + '</p>'; }).join(''); }).join('');
    return '<div class="page narrow">' +
      '<p class="eyebrow">' + esc(t('about.eyebrow')) + '</p>' +
      '<h1>' + esc(t('about.title')) + '</h1>' +
      '<div class="about-founder">' +
        '<p class="about-creator">' + t('about.creator', { name: '<a href="https://www.linkedin.com/in/vaylen-j-p-evans-a51416250/" target="_blank" rel="noopener noreferrer" data-out="plain">Vaylen J.P. Evans</a>' }) + '</p>' +
        '<p class="about-school">' + esc(t('about.school')) + '</p>' +
      '</div>' +
      '<div class="about-body section-gap">' + paras +
        '<div class="btn-row"><a class="btn btn-primary" href="#/" data-scroll-screener="1">' + esc(t('btn.start')) + '</a></div>' +
        '<p class="about-source">' + esc(t('about.priceSource')) + '</p>' +
        '<p class="about-contact">' + t('about.contact', { link: email }) + '</p>' +
      '</div>' +
    '</div>';
  }

  /* ================= ROUTER ================= */
  var ROUTES = {
    '': { view: viewLanding, after: wireLanding },
    '/': { view: viewLanding, after: wireLanding },
    '/screener': { view: viewScreener, after: wireScreener },
    '/results': { view: viewResults, after: renderResultsLive },
    '/compare': { view: viewCompare, after: wireCompare },
    '/goldcard': { view: viewGold, after: wireGold },
    '/resources': { view: viewResources, after: wireResources },
    '/how': { view: viewHow },
    '/about': { view: viewAbout }
  };

  function wireCompare() {
    var tabs = el('proc-tabs');
    if (!tabs) return;
    tabs.addEventListener('click', function (e) {
      var btn = e.target.closest('.proc-tab');
      if (!btn) return;
      selectProc(btn.getAttribute('data-proc'));
    });
    renderCompareResults();
  }

  function selectProc(key) {
    setProc(key);
    var tabs = el('proc-tabs');
    if (tabs) tabs.querySelectorAll('.proc-tab').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-proc') === key);
    });
    renderCompareResults();
  }

  function currentPath() {
    var h = location.hash.replace(/^#/, '');
    return h || '/';
  }

  function render() {
    var path = currentPath();
    var route = ROUTES[path] || ROUTES['/'];
    el('app').innerHTML = route.view();
    window.scrollTo(0, 0);
    setActiveNav(path);
    if (route.after) route.after();
    maybeShowFollowup();
  }

  /* ================= CHROME (nav, footer) ================= */
  function renderChrome() {
    var lang = getLang();
    // Nav is locked to four items. "Check Eligibility" leads to the eligibility
    // screener embedded on the homepage and scrolls straight to that section.
    var links = [
      ['#/', 'nav.compare', true],
      ['#/how', 'nav.how'],
      ['#/resources', 'nav.resources'],
      ['#/about', 'nav.about']
    ];
    var navLinks = links.map(function (l) {
      return '<a href="' + l[0] + '" data-nav="' + l[0] + '"' + (l[2] ? ' data-scroll-screener="1"' : '') + '>' + esc(t(l[1])) + '</a>';
    }).join('');
    var curLang = BC.LANGS.filter(function (l) { return l.code === lang; })[0] || BC.LANGS[0];
    var langOpts = BC.LANGS.map(function (l) {
      return '<button type="button" role="option" data-lang="' + l.code + '"' +
        (l.code === lang ? ' aria-selected="true" class="active"' : ' aria-selected="false"') + '>' +
        esc(l.label) + '</button>';
    }).join('');
    var langDropdown =
      '<div class="lang-select" id="lang-select">' +
        '<button type="button" class="lang-btn" id="lang-btn" aria-haspopup="listbox" aria-expanded="false" ' +
          'aria-label="' + esc(t('nav.language')) + '">' +
          '<span class="lang-cur">' + esc(curLang.short || curLang.label) + '</span>' +
          '<span class="lang-caret" aria-hidden="true">▾</span>' +
        '</button>' +
        '<div class="lang-menu" id="lang-menu" role="listbox" aria-label="' + esc(t('nav.language')) + '">' + langOpts + '</div>' +
      '</div>';

    el('nav').innerHTML =
      '<div class="nav-inner">' +
        '<a class="brand" href="#/"><span>Before</span><span class="c">Cost</span></a>' +
        '<div class="nav-links">' + navLinks + '</div>' +
        '<div class="nav-right">' +
          langDropdown +
          '<button class="nav-menu-btn" id="menu-btn" aria-expanded="false" aria-controls="mobile-menu" aria-label="' + esc(t('nav.menu')) + '">' +
            '<span class="nav-menu-icon" aria-hidden="true">☰</span>' +
            '<span class="nav-menu-label">' + esc(t('nav.menu')) + '</span>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="mobile-menu" id="mobile-menu">' + navLinks + '</div>';

    el('nav').querySelectorAll('[data-lang]').forEach(function (b) {
      b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); });
    });
    var lb = el('lang-btn'), lsel = el('lang-select');
    if (lb) lb.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !lsel.classList.contains('open');
      lsel.classList.toggle('open', open);
      lb.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // Close the language dropdown on outside click or Escape (bound once).
    if (!BC._langDocBound) {
      BC._langDocBound = true;
      document.addEventListener('click', function (e) {
        var sel = el('lang-select');
        if (sel && !sel.contains(e.target)) sel.classList.remove('open');
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { var sel = el('lang-select'); if (sel) sel.classList.remove('open'); }
      });
    }
    var mb = el('menu-btn'), mm = el('mobile-menu');
    function setMenu(open) {
      mm.classList.toggle('open', open);
      if (mb) {
        mb.setAttribute('aria-expanded', open ? 'true' : 'false');
        mb.classList.toggle('open', open);
        var icon = mb.querySelector('.nav-menu-icon');
        if (icon) icon.textContent = open ? '✕' : '☰';
      }
    }
    if (mb) mb.addEventListener('click', function () { setMenu(!mm.classList.contains('open')); });
    mm.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });


    el('footer').innerHTML =
      HOUSTON_SKYLINE +
      '<div class="footer-inner">' +
        faqBlock() +
        '<p class="footer-fine">' + esc(t('footer')) + '</p>' +
      '</div>';

    el('footer').querySelectorAll('.faq-q').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = btn.parentNode;
        var wasOpen = item.classList.contains('open');
        el('footer').querySelectorAll('.faq-item').forEach(function (x) {
          x.classList.remove('open');
          x.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
        });
        if (!wasOpen) { item.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
      });
    });
  }

  /* ---------------- FAQ accordion (footer) ---------------- */
  function faqBlock() {
    var tw = '<a href="https://www.turquoisehealth.com" target="_blank" rel="noopener noreferrer" data-out="plain">Turquoise Health</a>';
    var df = '<a href="https://www.dollarfor.org" target="_blank" rel="noopener noreferrer" data-out="plain">dollarfor.org</a>';
    var resLink = '<a href="#/resources">' + esc(t('faq.resourcesPage')) + '</a>';
    var items = [
      { q: t('faq.q1'), a: esc(t('faq.a1')) },
      { q: t('faq.q5'), a: t('faq.a5', { link: tw }) },
      { q: t('faq.q2'), a: esc(t('faq.a2')) },
      { key: 'charity', q: t('faq.q8'), a: t('faq.a8', { link: resLink }) },
      { q: t('faq.q3'), a: esc(t('faq.a3')) },
      { q: t('faq.q4'), a: esc(t('faq.a4')) },
      { q: t('faq.q6'), a: t('faq.a6', { link: df }) },
      { q: t('faq.q7'), a: esc(t('faq.a7')) }
    ];
    var lis = items.map(function (it, i) {
      var open = i === 0;
      return '<div class="faq-item' + (open ? ' open' : '') + '"' + (it.key ? ' data-faq="' + it.key + '"' : '') + '>' +
        '<button class="faq-q" type="button" aria-expanded="' + (open ? 'true' : 'false') + '">' +
        '<span>' + esc(it.q) + '</span><span class="faq-ic" aria-hidden="true"></span></button>' +
        '<div class="faq-a"><p>' + it.a + '</p></div>' +
      '</div>';
    }).join('');
    return '<div class="faq"><h2 class="faq-title">' + esc(t('faq.title')) + '</h2>' +
      '<div class="faq-list">' + lis + '</div></div>';
  }

  function setActiveNav(path) {
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-nav') === '#' + path);
    });
  }

  /* ================= BOOT ================= */
  window.addEventListener('hashchange', render);
  // Show the "did you apply?" card when the user returns to the tab after an
  // apply link opened in a new tab (not only on the next navigation).
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') maybeShowFollowup();
  });
  document.addEventListener('DOMContentLoaded', function () {
    document.documentElement.lang = getLang();
    renderChrome();
    render();
  });
})();
