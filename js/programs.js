/* BeforeCost — eligibility engine + enrollment-gap calculation.
 * Returns a list of program keys (matching BC.PROGRAMS_TEXT) plus flags used
 * to render badges and the coverage-gap bundle. All figures are estimates. */
window.BC = window.BC || {};

/* input: { age, monthlyIncome, familySize, county:'harris'|'other',
 *          sex:'female'|'male'|'other', pregnant:bool, kids:bool, kidsCount,
 *          lifeEvent:bool, disability:bool }
 * `today` is injected for the ACA enrollment-window check (defaults to now). */
BC.evaluate = function (input, today) {
  today = today || new Date();
  const size = Math.max(1, parseInt(input.familySize, 10) || 1);
  const income = Number(input.monthlyIncome) || 0;
  const age = Number(input.age) || 0;
  const fplPct = BC.fplPercent(income, size);
  const harris = input.county === 'harris';

  const out = {
    fplPct: fplPct,
    programs: [],      // ordered list of { key, badge? }
    coverageGap: false,
    goldCardEligible: false
  };
  const add = (key, badge) => out.programs.push({ key: key, badge: badge || null });

  // ---- Harris Health Gold Card (top priority) ----
  if (harris && fplPct != null && fplPct <= 150) {
    add('goldcard', 'priority');
    out.goldCardEligible = true;
  }

  // ---- Pregnancy pathways ----
  const isFemale = input.sex !== 'male';
  if (input.pregnant && isFemale) {
    const mpLimit = BC.limitFor(BC.LIMITS.medicaidPregnant, size);
    if (income <= mpLimit) {
      add('medicaidPregnant', 'best');
    }
    // CHIP Perinatal: at/below 202% FPL, surfaced when just over Medicaid limit
    if (fplPct != null && fplPct <= 202 && income > mpLimit) {
      add('chipPerinatal');
    }
  }

  // ---- Children in household ----
  if (input.kids) {
    const cmLimit = BC.limitFor(BC.LIMITS.childrensMedicaid, size);
    if (income <= cmLimit) {
      add('childrensMedicaid', 'kids');
    } else if (fplPct != null && fplPct <= 201) {
      add('chip', 'kids');
    }
  }

  // ---- Healthy Texas Women (preventive; women 15-44, not pregnant) ----
  if (isFemale && age >= 15 && age <= 44 && !input.pregnant) {
    const htwLimit = BC.limitFor(BC.LIMITS.healthyTexasWomen, size);
    if (income <= htwLimit) add('healthyTexasWomen');
  }

  // ---- Medicaid for Adults with Disabilities (SSI-linked) ----
  if (input.disability) {
    const ssiLimit = size >= 2 ? BC.LIMITS.ssiCouple : BC.LIMITS.ssiIndividual;
    if (income <= ssiLimit) {
      add('medicaidDisability', 'bridge');
      // Bridge coverage while the SSI application is pending.
      if (harris && !out.goldCardEligible) add('goldcard', 'bridge');
    }
  }

  // ---- Income-band routes: ACA / coverage gap / above subsidy ----
  if (fplPct != null) {
    if (fplPct < 100) {
      // Coverage gap only if no other Medicaid pathway matched.
      const hasMedicaidPath = out.programs.some(p =>
        ['medicaidPregnant', 'childrensMedicaid', 'medicaidDisability', 'goldcard'].includes(p.key));
      out.coverageGap = true;
      if (harris && !out.goldCardEligible) { add('goldcard', 'priority'); out.goldCardEligible = true; }
      // (bundle rendered separately regardless of hasMedicaidPath)
      void hasMedicaidPath;
    } else if (fplPct <= 400) {
      add(BC.acaVariant(today, input.lifeEvent));
    } else {
      add('aboveSubsidy');
    }
  }

  // ---- Hospital charity care fallback ----
  // Anyone at/above 100% FPL who isn't already getting comprehensive free/low-cost
  // coverage still qualifies for hospital charity-care discounts (free at/below
  // 200% FPL, discounted up to 400–500% FPL). Surface it so middle-income patients
  // aren't left with only a closed ACA window and no actionable path.
  const comprehensive = ['medicaidPregnant', 'childrensMedicaid', 'medicaidDisability', 'goldcard', 'chip', 'chipPerinatal'];
  const hasComprehensive = out.programs.some(p => comprehensive.includes(p.key));
  const hasCharity = out.programs.some(p => p.key === 'aboveSubsidy');
  if (fplPct != null && fplPct >= 100 && !hasComprehensive && !hasCharity) {
    add('aboveSubsidy');
  }

  // De-duplicate by key, keeping the strongest badge (priority/best first).
  const rank = { priority: 3, best: 3, kids: 2, bridge: 1, null: 0 };
  const seen = {};
  out.programs = out.programs.filter(p => {
    if (!seen[p.key]) { seen[p.key] = p; return true; }
    const prev = seen[p.key];
    if ((rank[p.badge] || 0) > (rank[prev.badge] || 0)) prev.badge = p.badge;
    return false;
  });

  return out;
};

/* Which ACA copy to show, based on the enrollment window + life event. */
BC.acaVariant = function (today, lifeEvent) {
  const m = today.getMonth(); // 0=Jan ... 10=Nov 11=Dec
  const d = today.getDate();
  const openEnrollment = (m === 10 || m === 11) || (m === 0 && d <= 15);
  if (openEnrollment) return 'acaOpen';
  if (lifeEvent) return 'acaSep';
  return 'acaClosed';
};

/* Lowest single discounted/estimated cash price across private hospitals for a
 * procedure. Used as the reference number for the enrollment-gap calculator. */
BC.lowestCashFor = function (procKey) {
  let low = null;
  BC.HOSPITALS.forEach(h => {
    const row = (BC.PRICES[h.id] || {})[procKey];
    if (!row || row.note === 'not_offered' || row.note === 'suppressed' || row.note === 'ct_contrast') return;
    let v = null;
    if (row.low != null) v = row.low;
    else if (row.disc != null && row.disc > 0) v = row.disc;
    else if (row.cash != null) v = row.cash;
    if (v != null && (low == null || v < low)) low = v;
  });
  return low;
};

/* Estimated out-of-pocket cost for the reference procedure AFTER a program
 * applies. null => "varies by plan" (not summed). */
BC.residualCost = {
  goldcard: 50,               // inpatient copay
  medicaidPregnant: 0,
  chipPerinatal: 0,
  childrensMedicaid: 0,
  chip: 35,
  medicaidDisability: 0,
  aboveSubsidy: null,
  acaOpen: null,
  acaSep: null,
  acaClosed: null,
  healthyTexasWomen: null     // preventive only; excluded from procedure math
};

/* Build enrollment-gap rows. procKey defaults to vaginal_delivery. */
BC.enrollmentGap = function (evalResult, procKey) {
  procKey = procKey || 'vaginal_delivery';
  const lowest = BC.lowestCashFor(procKey);
  const rows = [];
  let total = 0;
  if (lowest == null) return { procKey, lowest, rows, total };

  evalResult.programs.forEach(p => {
    if (!(p.key in BC.residualCost)) return;
    const residual = BC.residualCost[p.key];
    if (residual === null) { rows.push({ key: p.key, varies: true }); return; }
    const value = Math.max(0, lowest - residual);
    if (value <= 0) return;
    rows.push({ key: p.key, value: value });
    total += value;
  });

  return { procKey, lowest, rows, total };
};
