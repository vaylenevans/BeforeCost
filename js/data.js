/* BeforeCost — core data layer
 * Prices sourced from hospital price estimators + Turquoise Health.
 * Values transcribed from the BeforeCost hospital pricing sheet.
 */
window.BC = window.BC || {};

/* 2026 Federal Poverty Level — MONTHLY thresholds by household size (base table). */
BC.FPL_MONTHLY = { 1:1330, 2:1803, 3:2277, 4:2750, 5:3223, 6:3697, 7:4170, 8:4643 };
BC.FPL_MONTHLY_ADD = 473; // each additional person beyond 8

BC.fplMonthly = function (size) {
  size = Math.max(1, parseInt(size, 10) || 1);
  if (size <= 8) return BC.FPL_MONTHLY[size];
  return BC.FPL_MONTHLY[8] + (size - 8) * BC.FPL_MONTHLY_ADD;
};

/* Return income as a % of FPL given MONTHLY income + household size. */
BC.fplPercent = function (monthlyIncome, size) {
  const base = BC.fplMonthly(size);
  if (!base) return null;
  return (Number(monthlyIncome) / base) * 100;
};

/* Exact monthly-dollar program limits (do NOT recalculate from FPL). */
BC.LIMITS = {
  medicaidPregnant: { 1:2634, 2:3571, 3:4508, 4:5445, 5:6383, add:938, addFrom:5 },
  childrensMedicaid: { 1:1735, 2:2345, 3:2954, 4:3564, 5:4173, 6:4783, 7:5393, 8:6002, add:610, addFrom:8 },
  healthyTexasWomen: { 1:2716, 2:3682, 3:4649, 4:5616, 5:6582, 6:7549, 7:8515, add:967, addFrom:7 },
  ssiIndividual: 994,
  ssiCouple: 1491
};

BC.limitFor = function (table, size) {
  size = Math.max(1, parseInt(size, 10) || 1);
  if (table[size] != null) return table[size];
  const base = table[table.addFrom];
  return base + (size - table.addFrom) * table.add;
};

/* Ordered canonical procedures. `key` is the internal id. */
BC.PROCEDURES = [
  { key: 'vaginal_delivery', code: 'Vaginal Delivery without complications' },
  { key: 'cesarean',         code: 'Cesarean Section without complications' },
  { key: 'appendectomy',     code: 'Appendectomy (Removal of the appendix)' },
  { key: 'breast_biopsy',    code: 'Breast Biopsy Accessed Through the Skin' },
  { key: 'hysterectomy',     code: 'Laparoscopic Hysterectomy' },
  { key: 'colonoscopy',      code: 'Colonoscopy' },
  { key: 'cholecystectomy',  code: 'Cholecystectomy' },
  { key: 'ct_abdomen',       code: 'CT Scan Abdomen/Pelvis without contrast' },
  { key: 'mri_lumbar',       code: 'MRI Lumbar Spine without contrast' },
  { key: 'tonsillectomy',    code: 'Tonsillectomy (Tonsil Removal)' },
  { key: 'hernia',           code: 'Inguinal (Groin) Hernia Repair' },
  { key: 'other',            code: 'Other Procedure (not listed)' }
];

/* Procedures where negotiated insurance rates are not published in usable form
   (Rule 6). Show self-pay price + link to the hospital's official estimator. */
BC.INSURANCE_ESTIMATOR_PROCS = ['appendectomy', 'hysterectomy', 'cholecystectomy'];

/* Hospital systems -> official estimator URL (used for Rule 6 links). */
BC.ESTIMATORS = {
  mh:        'https://memorialhermann.org/patients-visitors/patient-services/financial-care/financial-resources/pricing-estimate',
  methodist: 'https://www.houstonmethodist.org/for-patients/patient-resources/billing-insurance/pricing-transparency/',
  hca:       'https://www.hcahoustonhealthcare.com/patient-resources/patient-financial-resources/pricing-estimates-and-information',
  stlukes:   'https://www.stlukeshealth.org/cost-estimator'
};

BC.CHARITY_LINKS = {
  mh:        'https://memorialhermann.org/patients-visitors/patient-services/financial-care',
  methodist: 'https://www.houstonmethodist.org/pay-your-bill/financial-assistance/',
  hca:       'https://www.hcahoustonhealthcare.com/patient-resources/patient-financial-resources',
  stlukes:   'https://www.commonspirit.org/patient-resources/stlukes-health-financial-assistance#accordion-050aba6629-item-a3af1e62dc'
};

/* Charity policy per system: free at/below freeFPL, discounted up to discFPL. */
BC.CHARITY_POLICY = {
  mh:        { free: 200, disc: 400 },
  methodist: { free: 200, disc: 500 },
  hca:       { free: 200, disc: 400 },
  stlukes:   { free: 200, disc: 400 }
};

/* The 8 private comparison hospitals. Ben Taub + LBJ are handled separately
   in the Harris Health callout (they have no per-procedure cash prices). */
BC.HOSPITALS = [
  {
    id: 'mh_tmc', name: 'Memorial Hermann TMC', system: 'mh',
    address: '6411 Fannin St, Houston, TX 77030', phone: '(713) 704-3916',
    pricingPhone: '(713) 704-3916', email: 'MHFinancialAssistance@memorialhermann.org',
    lastVerified: 'April 2026'
  },
  {
    id: 'mh_southwest', name: 'Memorial Hermann Southwest Hospital', system: 'mh',
    address: '7600 Beechnut St, Houston, TX 77074', phone: '(832) 658-6455',
    pricingPhone: '(832) 658-6455', email: 'MHFinancialAssistance@memorialhermann.org',
    lastVerified: 'May 2026'
  },
  {
    id: 'mh_heights', name: 'Memorial Hermann Greater Heights Hospital', system: 'mh',
    address: '1635 North Loop West, Houston, TX 77008', phone: '(832) 658-6455',
    pricingPhone: '(832) 658-6455', email: 'MHFinancialAssistance@memorialhermann.org',
    lastVerified: 'May 2026'
  },
  {
    id: 'methodist_tmc', name: 'Houston Methodist Hospital', system: 'methodist',
    address: '6565 Fannin St, Houston, TX 77030', phone: '832-667-5900',
    pricingPhone: '832-667-5900', email: '', lastVerified: 'April 2026'
  },
  {
    id: 'methodist_west', name: 'Houston Methodist West Hospital', system: 'methodist',
    address: '18500 Katy Fwy, Houston, TX 77094', phone: '832-667-5900',
    pricingPhone: '832-667-5900', email: '', lastVerified: 'May 2026'
  },
  {
    id: 'methodist_baytown', name: 'Houston Methodist Baytown Hospital', system: 'methodist',
    address: '4401 Garth Road, Baytown, TX 77521', phone: '832-667-5900',
    pricingPhone: '832-667-5900', email: '', lastVerified: 'May 2026'
  },
  {
    id: 'hca_clearlake', name: 'HCA Houston Healthcare Clear Lake', system: 'hca',
    address: '500 W Medical Ctr Blvd, Webster, TX 77598', phone: '877-493-3228',
    pricingPhone: '888-246-3812', email: '', lastVerified: 'May 2026'
  },
  {
    id: 'stlukes_pmc', name: "St. Luke's Health Patients Medical Center", system: 'stlukes',
    address: '600 East Sam Houston Parkway South, Pasadena, TX 77505', phone: '(832) 355-3081',
    pricingPhone: '(832) 355-3081', email: '', lastVerified: 'May 2026'
  }
];

/* Standalone imaging centers — shown ONLY on the MRI Lumbar Spine results page.
 * Names, phones, and URLs are language-neutral literals. */
BC.IMAGING_CENTERS = [
  {
    name: 'Touchstone Medical Imaging',
    detail: 'Multiple Houston locations',
    phones: ['(713) 451-2900', '1-877-275-9077'],
    site: 'touchstoneimaging.com', url: 'https://www.touchstoneimaging.com',
    note: 'Offers customized self-pay pricing for uninsured patients.'
  },
  {
    name: 'SimonMed Imaging',
    detail: 'Med Center Houston — 2256 W Holcombe Blvd, Houston, TX 77030',
    phones: ['(346) 335-8519'],
    email: 'estimatedcost@simonmed.com',
    site: 'simonmed.com', url: 'https://www.simonmed.com',
    note: 'Email for a cost estimate.'
  },
  {
    name: 'Houston Medical Imaging (HMI)',
    detail: '13 outpatient centers across Houston',
    phones: ['(713) 797-1919', '(713) 589-5231'],
    site: 'hmixray.com', url: 'https://www.hmixray.com',
    note: 'Radiologist-owned since 1998. Ask about cash prices and payment plans.'
  },
  {
    name: 'Houston MRI & Diagnostic Imaging',
    detail: 'Now part of Capitol Imaging Services',
    phones: [],
    site: 'capitolimagingservices.com/houston-mri', url: 'https://www.capitolimagingservices.com/houston-mri',
    note: ''
  },
  {
    name: 'RadiologyAssist',
    detail: 'Nationwide MRI scheduling service for self-pay patients',
    phones: [],
    site: 'radiologyassist.com', url: 'https://www.radiologyassist.com',
    note: 'Partners with imaging centers across Houston to offer affordable self-pay MRI pricing.'
  }
];

/* Harris Health public hospitals — shown ONLY in the green callout. */
BC.HARRIS = [
  { name: 'Ben Taub Hospital', address: '1504 Ben Taub Loop, Houston, TX 77030', area: 'central Houston' },
  { name: 'Lyndon B. Johnson Hospital', address: '5656 Kelley St, Houston, TX 77026', area: 'northeast Houston' }
];

/* Price matrix: PRICES[hospitalId][procedureKey] = row.
 * Fields: disc (what you owe), cash (gross subtotal), low, high (range),
 * fee (raw fee-type text), note (one of: null | 'not_offered' | 'suppressed' |
 * 'no_discount' | 'age_under_12' | 'ct_contrast'). */
BC.PRICES = {
  mh_tmc: {
    vaginal_delivery: { cash:34969, disc:10956, fee:'Hospital only verified' },
    cesarean:         { cash:49452, disc:15493, fee:'Hospital only verified' },
    appendectomy:     { cash:77976, disc:24853, fee:'Both verified' },
    breast_biopsy:    { cash:3129,  disc:null,  fee:'Hospital only (unverified)', note:'no_discount' },
    hysterectomy:     { cash:1650,  disc:1072,  fee:'Physician only verified' },
    colonoscopy:      { cash:1620,  disc:1620,  fee:'Hospital only (unverified)', note:'no_discount' },
    cholecystectomy:  { cash:83337, disc:26574, fee:'Both verified' },
    ct_abdomen:       { cash:407,   disc:265,   fee:'Physician only verified' },
    mri_lumbar:       { note:'suppressed' },
    tonsillectomy:    { cash:550,   disc:357,   fee:'Physician only verified', note:'age_under_12' },
    hernia:           { cash:25645, disc:25645, fee:'Hospital only (unverified, no self-pay discount applied)', note:'no_discount' }
  },
  mh_southwest: {
    vaginal_delivery: { cash:27435, disc:8595,  fee:'Hospital only verified' },
    cesarean:         { cash:39754, disc:12455, fee:'Hospital only verified' },
    appendectomy:     { cash:38262, disc:12410, fee:'Both verified' },
    breast_biopsy:    { cash:2723,  disc:2723,  fee:'Hospital only (unverified)', note:'no_discount' },
    hysterectomy:     { cash:1650,  disc:1072,  fee:'Physician only verified' },
    colonoscopy:      { cash:1543,  disc:1543,  fee:'Hospital only (unverified)', note:'no_discount' },
    cholecystectomy:  { cash:44008, disc:14251, fee:'Both verified' },
    ct_abdomen:       { cash:5473,  disc:1850,  fee:'Both verified' },
    mri_lumbar:       { note:'suppressed' },
    tonsillectomy:    { cash:7249,  disc:7249,  fee:'Hospital only (unverified)', note:'age_under_12' },
    hernia:           { cash:28854, disc:9408,  fee:'Both verified' }
  },
  mh_heights: {
    vaginal_delivery: { cash:26939, disc:8440,  fee:'Hospital only verified' },
    cesarean:         { cash:37850, disc:11858, fee:'Hospital only verified' },
    appendectomy:     { cash:44857, disc:14477, fee:'Both verified' },
    breast_biopsy:    { cash:10554, disc:3415,  fee:'Both verified' },
    hysterectomy:     { cash:1650,  disc:1072,  fee:'Physician only verified' },
    colonoscopy:      { cash:1543,  disc:1543,  fee:'Hospital only (unverified)', note:'no_discount' },
    cholecystectomy:  { cash:38309, disc:12466, fee:'Both verified' },
    ct_abdomen:       { cash:407,   disc:265,   fee:'Physician only verified' },
    mri_lumbar:       { note:'suppressed' },
    tonsillectomy:    { cash:550,   disc:192,   fee:'Physician only verified', note:'age_under_12' },
    hernia:           { cash:11816, disc:11816, fee:'Hospital only (unverified)', note:'no_discount' }
  },
  methodist_tmc: {
    vaginal_delivery: { cash:30680, disc:15187, fee:'Hospital only (assumed, unverified)' },
    cesarean:         { cash:37462, disc:18544, fee:'Hospital only (assumed, unverified)' },
    appendectomy:     { cash:57356, disc:28391, fee:'Hospital only (assumed, unverified)' },
    breast_biopsy:    { cash:15435, disc:7640,  fee:'Hospital only (assumed, unverified)' },
    hysterectomy:     { cash:84398, disc:41777, fee:'Hospital only (assumed, unverified)' },
    colonoscopy:      { cash:644,   disc:644,   fee:'Hospital only (assumed, unverified)', note:'no_discount' },
    cholecystectomy:  { cash:54880, disc:27166, fee:'Hospital only (assumed, unverified)' },
    ct_abdomen:       { cash:5804,  disc:2873,  fee:'Hospital only (assumed, unverified)' },
    mri_lumbar:       { cash:2112,  disc:1045,  fee:'Hospital only (assumed, unverified)' },
    tonsillectomy:    { cash:31629, disc:15657, fee:'Hospital only (assumed, unverified)' },
    hernia:           { cash:19554, disc:10978, fee:'Both verified (estimated)' }
  },
  methodist_west: {
    vaginal_delivery: { cash:31124, disc:15406, fee:'Hospital only verified' },
    cesarean:         { cash:33331, disc:16499, fee:'Hospital only (assumed, unverified)' },
    appendectomy:     { cash:53074, disc:26272, fee:'Hospital only (assumed, unverified)' },
    breast_biopsy:    { cash:26532, disc:13133, fee:'Hospital only (assumed, unverified)' },
    hysterectomy:     { cash:80107, disc:39653, fee:'Hospital only (assumed, unverified)' },
    colonoscopy:      { cash:1258,  disc:1258,  fee:'Hospital only (assumed, unverified)', note:'no_discount' },
    cholecystectomy:  { cash:55667, disc:27555, fee:'Hospital only (assumed, unverified)' },
    ct_abdomen:       { cash:5802,  disc:2872,  fee:'Hospital only (assumed, unverified)' },
    mri_lumbar:       { cash:2112,  disc:1045,  fee:'Hospital only (assumed, unverified)' },
    tonsillectomy:    { cash:36004, disc:17822, fee:'Hospital only (assumed, unverified)' },
    hernia:           { cash:15604, disc:7724,  fee:'Hospital only (assumed, unverified)' }
  },
  methodist_baytown: {
    vaginal_delivery: { cash:34287, disc:16972, fee:'Hospital only, verified' },
    cesarean:         { cash:44895, disc:22223, fee:'Hospital only, assumed, unverified' },
    appendectomy:     { cash:63474, disc:31420, fee:'Hospital only, assumed, unverified' },
    breast_biopsy:    { cash:26532, disc:13133, fee:'Hospital only, assumed, unverified' },
    hysterectomy:     { cash:121226,disc:60007, fee:'Hospital only, assumed, unverified' },
    colonoscopy:      { cash:1258,  disc:1258,  fee:'Hospital only, assumed, unverified', note:'no_discount' },
    cholecystectomy:  { cash:70097, disc:34698, fee:'Hospital only, assumed, unverified' },
    ct_abdomen:       { cash:5802,  disc:2872,  fee:'Hospital only, assumed, unverified' },
    mri_lumbar:       { cash:2112,  disc:1045,  fee:'Hospital only, assumed, unverified' },
    tonsillectomy:    { cash:35557, disc:17601, fee:'Hospital only, assumed, unverified' },
    hernia:           { cash:18175, disc:10295, fee:'Both (assumed, unverified, estimated)' }
  },
  hca_clearlake: {
    vaginal_delivery: { low:15923, high:20665, fee:'Hospital only (assumed, unverified)' },
    cesarean:         { low:44703, high:59446, fee:'Hospital only (assumed, unverified)' },
    appendectomy:     { low:68246, high:86308, fee:'Hospital only (assumed, unverified)' },
    breast_biopsy:    { low:13665, high:15776, fee:'Hospital only (assumed, unverified)' },
    hysterectomy:     { low:84264, high:91610, fee:'Hospital only (assumed, unverified)' },
    colonoscopy:      { low:15137, high:23030, fee:'Hospital only (assumed, unverified)' },
    cholecystectomy:  { low:49056, high:57710, fee:'Hospital only (assumed, unverified)' },
    ct_abdomen:       { cash:5824, disc:5824,  fee:'Hospital only (assumed, unverified)', note:'no_discount' },
    mri_lumbar:       { cash:8876, disc:8876,  fee:'Hospital only (assumed, unverified)', note:'no_discount' },
    tonsillectomy:    { low:36216, high:48653, fee:'Hospital only (assumed, unverified)' },
    hernia:           { low:47627, high:61631, fee:'Hospital only (assumed, unverified)' }
  },
  stlukes_pmc: {
    vaginal_delivery: { note:'not_offered' },
    cesarean:         { note:'not_offered' },
    appendectomy:     { low:8180.96,  high:12271.44, fee:'Hospital only, verified' },
    breast_biopsy:    { low:3216.44,  high:4824.66,  fee:'Hospital only, verified' },
    hysterectomy:     { note:'not_offered' },
    colonoscopy:      { note:'not_offered' },
    cholecystectomy:  { low:26190.70, high:39286.04, fee:'Hospital only, verified' },
    ct_abdomen:       { note:'ct_contrast' },
    mri_lumbar:       { note:'not_offered' },
    tonsillectomy:    { low:4134.42,  high:6201.64,  fee:'Hospital only, verified' },
    hernia:           { low:6529.05,  high:9793.57,  fee:'Hospital only, verified' }
  }
};
