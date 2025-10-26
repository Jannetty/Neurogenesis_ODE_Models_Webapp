/* Neuroblast interactive grid*/

/* ---------------- Fixed genotypes ---------------- */
const GENOS = [
  ["WT", 0.0, 1.0],
  ["mud mutant", 0.15, 1.0],
  ["nanobody", 0.15, 0.8],
];
const COLORS = { NB: "#1b9e77", GMC: "#d95f02", Im: "#7570b3", Mat: "#e7298a" };
const qs = (s, root = document) => root.querySelector(s);
const qsa = (s, root = document) => Array.from(root.querySelectorAll(s));

/* ---------------- Per-model defaults ---------------- */
const DEFAULTS = {
  tEnd: 48,
  dt: 0.1,
  nb_vol: 285.0,
  n: 3,
  k_max_GMC: 1 / 8,
  V_thresh_NB: 1.25 * 285.0, // 356.25
  V_thresh_GMC: 285.0 * 1.25 * 0.2 * 2, // 142.5
  V_floor_NB: 0.25 * 285.0, // 71.25
  V_floor_GMC: 0.25 * (285.0 * 1.25 * 0.2), // 17.8125
  k_Neuron: 1 / 48,
  g_GMC: (285.0 * 1.25 * 0.2) / 9, // 7.9166667
  k_star: 1 / 1.5, // ~0.6667
  V_thresh_base: 1.25 * 285.0,
  delta_thresh: 0.03 * (1.25 * 285.0),
  V_thresh_min: 0.25 * 285.0,
  K_self: 2.0,
  alpha: 3,
  beta: 4,
};

/* ---------------- UI schemas ---------------- */
const MODEL_SCHEMAS = {
  1: {
    title: "Model 1 — static thresholds",
    fields: {
      tEnd: ["tEnd (h)", "simulation end time"],
      dt: ["dt (h)", "step"],
      nb_vol: ["nb_vol (V0)", "initial NB volume"],
      n: ["n (–)", "Hill exponent"],
      k_max_GMC: ["k_max_GMC (h⁻¹)", "GMC division max"],
      V_thresh_NB: ["V_thresh_NB (vol)", "NB threshold"],
      V_thresh_GMC: ["V_thresh_GMC (vol)", "GMC threshold"],
      V_floor_NB: ["V_floor_NB (vol)", "NB floor"],
      V_floor_GMC: ["V_floor_GMC (vol)", "GMC floor"],
      k_Neuron: ["k_Neuron (h⁻¹)", "immature→mature"],
      g_GMC: ["g_GMC (vol·h⁻¹)", "GMC vol growth"],
      k_star: ["k_star (h⁻¹)", "target NB division @ V0"],
    },
  },
  2: {
    title: "Model 2 — sym pulls threshold",
    fields: {
      tEnd: ["tEnd (h)", ""],
      dt: ["dt (h)", ""],
      nb_vol: ["nb_vol (V0)", ""],
      n: ["n (–)", ""],
      k_max_GMC: ["k_max_GMC (h⁻¹)", ""],
      V_thresh_NB: ["V_thresh_NB", ""],
      V_thresh_GMC: ["V_thresh_GMC", ""],
      V_floor_NB: ["V_floor_NB", ""],
      V_floor_GMC: ["V_floor_GMC", ""],
      k_Neuron: ["k_Neuron (h⁻¹)", ""],
      g_GMC: ["g_GMC (vol·h⁻¹)", ""],
      k_star: ["k_star (h⁻¹)", ""],
      V_thresh_base: ["V_thresh_base", ""],
      delta_thresh: ["delta_thresh (vol)", "pull/Σsym"],
      V_thresh_min: ["V_thresh_min (vol)", "lower bound"],
    },
  },
  3: {
    title: "Model 3 — vol-scaled growth",
    fields: {
      tEnd: ["tEnd (h)", ""],
      dt: ["dt (h)", ""],
      nb_vol: ["nb_vol (V0)", "V_ref = V0"],
      n: ["n (–)", ""],
      k_max_GMC: ["k_max_GMC (h⁻¹)", ""],
      V_thresh_NB: ["V_thresh_NB", ""],
      V_thresh_GMC: ["V_thresh_GMC", ""],
      V_floor_NB: ["V_floor_NB", ""],
      V_floor_GMC: ["V_floor_GMC", ""],
      k_Neuron: ["k_Neuron (h⁻¹)", ""],
      g_GMC: ["g_GMC (vol·h⁻¹)", ""],
      k_star: ["k_star (h⁻¹)", ""],
      alpha: ["α (–)", "growth exponent"],
    },
  },
  4: {
    title: "Model 4 — vol-scaled + sym-threshold",
    fields: {
      tEnd: ["tEnd (h)", ""],
      dt: ["dt (h)", ""],
      nb_vol: ["nb_vol (V0)", "V_ref = V0"],
      n: ["n (–)", ""],
      k_max_GMC: ["k_max_GMC (h⁻¹)", ""],
      V_thresh_GMC: ["V_thresh_GMC", ""],
      V_floor_NB: ["V_floor_NB", ""],
      V_floor_GMC: ["V_floor_GMC", ""],
      k_Neuron: ["k_Neuron (h⁻¹)", ""],
      g_GMC: ["g_GMC (vol·h⁻¹)", ""],
      k_star: ["k_star (h⁻¹)", ""],
      alpha: ["α (–)", "growth exponent"],
      V_thresh_base: ["V_thresh_base", ""],
      delta_thresh: ["delta_thresh (vol)", "pull/Σsym"],
      V_thresh_min: ["V_thresh_min (vol)", "lower bound"],
    },
  },
  5: {
    title: "Model 5 — NB self-repression",
    fields: {
      tEnd: ["tEnd (h)", ""],
      dt: ["dt (h)", ""],
      k_Neuron: ["k_Neuron (h⁻¹)", ""],
      k_max_GMC: ["k_GMC (h⁻¹)", "GMC division"],
      k_star: ["k_star (h⁻¹)", "base NB division"],
      K_self: ["K_self (cells)", "repression scale"],
      beta: ["β (–)", "division exponent"],
    },
  },
};

const MODEL_INFO = {
  1: {
    title: "Model 1 — static thresholds",
    before: `
      <p>This is a simple ODE model that tracks the counts of each cell type in the developing neuroblast lineage. This model does not track cell volume and assumes homogeneous behavior within each cell type.</p>
      
      <h4>Model Species</h4>
      <ul>
        <li><strong>$N_{\\text{NB}}$</strong> - Number of neuroblasts, neuroblasts are stem-like cells that can divide asymmetrically yielding one neuroblast and one GMC or symmetrically yielding two neuroblasts</li>
        <li><strong>$N_{\\text{GMC}}$</strong> - Number of GMCs, Ganglion Mother Cells are neuron precursors that divide symmetrically into two neurons</li>
        <li><strong>$N_{\\text{Neuron}}$</strong> - Number of neurons, neurons are terminally differentiated brain cells that do not grow nor divide</li>
      </ul>
      
      <h4>Model Parameters</h4>
      <ul>
        <li><strong>$k_{\\text{NB}}$</strong> - the rate of neuroblast divisions, in units of divisions/hour</li>
        <li><strong>$k_{\\text{GMC}}$</strong> - the rate of GMC divisions, in units of divisions/hour</li>
        <li><strong>$\\text{sym\\_frac}$</strong> - the fraction of neuroblast divisions that are symmetrical. Unitless. Set to 0 for WT simulations and .15 for mudmut simulations</li>
      </ul>
      
      <h4>Model Structure</h4>
      <p class="equation-note">The number of neuroblasts increases by 1 with each symmetric neuroblast division:</p>
      $$\\frac{dN_{\\text{NB}}}{dt} = \\text{sym\\_frac} \\cdot k_{\\text{NB}} \\cdot N_{\\text{NB}}$$
      
      <p class="equation-note">The number of GMCs increases by 1 with each asymmetric neuroblast division and decreases by 1 with each GMC division:</p>
      $$\\frac{dN_{\\text{GMC}}}{dt} = (1 - \\text{sym\\_frac}) \\cdot k_{\\text{NB}} N_{\\text{NB}} - k_{\\text{GMC}} N_{\\text{GMC}}$$
      
      <p class="equation-note">The number of neurons increases by 2 with each GMC division:</p>
      $$\\frac{dN_{\\text{Neuron}}}{dt} = 2 \\cdot k_{\\text{GMC}} N_{\\text{GMC}}$$
    `,
  },
  2: {
    title: "Model 2 — sym pulls threshold",
    before: `
      Symmetric NB divisions dynamically lower the NB division threshold (up to a floor),
      modeling a feed-forward ‘pull’ on division propensity.
      <p class="equation">
      $$
      V_{th}^{eff}(t) = \\max\\big(V_{th}^{base} - \\Delta_{th} \\cdot S_{sym}(t),\\, V_{th}^{min}\\big)
      $$
      $$
      k_{NB} = k_{\\max}^{NB} \\cdot \\left( \\frac{\\bar V_{NB}}{V_{th}^{eff}} \\right)^n
      $$
      </p>
    `,
  },
  3: {
    title: "Model 3 — vol-scaled growth",
    before: `
      NB growth rate scales with average NB volume relative to initial ($V_0$)
      using an exponent $\\alpha$; division thresholds remain static.
      <p class="equation">
      $$
      g_{NB}^{eff} = g_{NB}^{base} \\cdot \\left( \\frac{\\bar V_{NB}}{V_0} \\right)^{\\alpha}
      $$
      $$
      k_{NB} = k_{\\max}^{NB} \\cdot \\left( \\frac{\\bar V_{NB}}{V_{th}^{NB}} \\right)^n
      $$
      </p>
    `,
  },
  4: {
    title: "Model 4 — vol-scaled + sym-threshold",
    before: `
      Combines vol-scaled NB growth (as in M3) with dynamic threshold lowering
      from cumulative symmetric divisions (as in M2).
      <p class="equation">
      $$
      V_{th}^{eff}(t) = \\max\\big(V_{th}^{base} - \\Delta_{th} \\cdot S_{sym}(t),\\, V_{th}^{min}\\big)
      $$
      $$
      g_{NB}^{eff} = g_{NB}^{base} \\cdot \\left( \\frac{\\bar V_{NB}}{V_0} \\right)^{\\alpha}
      $$
      $$
      k_{NB} = k_{\\max}^{NB} \\cdot \\left( \\frac{\\bar V_{NB}}{V_{th}^{eff}} \\right)^n
      $$
      </p>
    `,
  },
  5: {
    title: "Model 5 — NB self-repression",
    before: `
      NB division rate is repressed by NB count (Hill form).
      No volumes here; focuses on count-level negative feedback.
      <p class="equation">
      $$
      k_{NB}^{eff}(N_{NB}) =
      k_{NB}^{max} \\cdot
      \\frac{K^\\beta}{K^\\beta + N_{NB}^\\beta}
      $$
      </p>
    `,
  },
};

/* ---------------- Build per-model state from defaults ---------------- */
const state = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} };
for (const r of [1, 2, 3, 4, 5]) {
  for (const k of Object.keys(MODEL_SCHEMAS[r].fields)) state[r][k] = DEFAULTS[k];
}

/* ---------------- IO helpers ---------------- */
function readModelInputs(r) {
  qsa(`input[data-model="${r}"]`).forEach((inp) => {
    const k = inp.dataset.key;
    const v = parseFloat(inp.value);
    if (Number.isFinite(v)) state[r][k] = v;
  });
}
function writeModelInputs(r) {
  qsa(`input[data-model="${r}"]`).forEach((inp) => {
    const k = inp.dataset.key;
    if (k in state[r]) inp.value = String(state[r][k]);
  });
}

/* ---------------- Derived params ---------------- */
function derive_kmax_gNB(modelParams) {
  const V0 = modelParams.nb_vol ?? DEFAULTS.nb_vol;
  const n = modelParams.n ?? DEFAULTS.n;
  const V_thresh_NB = modelParams.V_thresh_NB ?? DEFAULTS.V_thresh_NB;
  const k_star = modelParams.k_star ?? DEFAULTS.k_star;
  const core0 = Math.min(1, Math.pow(V0 / V_thresh_NB, n));
  const k_max_NB = k_star / core0;
  const g_NB_WT = 0.2 * k_star * V0;
  return { V0, k_max_NB, g_NB_WT };
}

/* ---------------- Integrator (RK2) ---------------- */
function integrate(rhs, y0, p, tEnd, dt) {
  const steps = Math.max(1, Math.floor(tEnd / dt));
  const d = y0.length;
  const T = new Array(steps + 1), Y = new Array(steps + 1);
  let y = y0.slice(), t = 0;
  T[0] = 0; Y[0] = y.slice();
  for (let i = 1; i <= steps; i++) {
    const k1 = rhs(t, y, p);
    const yMid = new Array(d);
    for (let j = 0; j < d; j++) yMid[j] = y[j] + 0.5 * dt * k1[j];
    const k2 = rhs(t + 0.5 * dt, yMid, p);
    for (let j = 0; j < d; j++) y[j] = y[j] + dt * k2[j];
    t += dt;
    T[i] = t; Y[i] = y.slice();
  }
  return { t: T, y: Y };
}

/* ---------------- Helpers ---------------- */
function satpow(Vbar, Vth, kmax, n) {
  if (Vbar <= 0 || Vth <= 0) return 0;
  const r = Math.pow(Vbar / Vth, n);
  return r >= 1 ? kmax : kmax * r;
}

/* ---------------- RHS systems ---------------- */
// M1
function rhsM1(t, y, p) {
  let [N_NB, V_NB, N_GMC, V_GMC, N_Im, V_Im, N_Mat, V_Mat] = y;
  const {
    g_NB, g_GMC, k_Neuron, sym_frac,
    V_thresh_NB, V_thresh_GMC, k_max_NB, k_max_GMC, n,
    V_floor_NB, V_floor_GMC,
  } = p;
  const Vavg_NB = N_NB > 0 ? V_NB / N_NB : 0;
  const Vavg_GMC = N_GMC > 0 ? V_GMC / N_GMC : 0;
  const Vavg_Im  = N_Im > 0 ? V_Im / N_Im : 0;

  const k_NB = N_NB > 0 && Vavg_NB >= V_floor_NB ? satpow(Vavg_NB, V_thresh_NB, k_max_NB, n) : 0;
  const k_GMC = N_GMC > 0 && Vavg_GMC >= V_floor_GMC ? satpow(Vavg_GMC, V_thresh_GMC, k_max_GMC, n) : 0;

  const sym = sym_frac * k_NB * N_NB;
  const asym = (1 - sym_frac) * k_NB * N_NB;

  return [
    sym,
    g_NB * N_NB - 0.2 * asym * (Vavg_NB || 0),
    asym - k_GMC * N_GMC,
    g_GMC * N_GMC + 0.2 * asym * (Vavg_NB || 0) - k_GMC * N_GMC * (Vavg_GMC || 0),
    2 * k_GMC * N_GMC - k_Neuron * N_Im,
    k_GMC * N_GMC * (Vavg_GMC || 0) - k_Neuron * N_Im * (Vavg_Im || 0),
    k_Neuron * N_Im,
    k_Neuron * N_Im * (Vavg_Im || 0),
  ];
}

// M2
function rhsM2(t, y, p) {
  let [N_NB, V_NB, N_GMC, V_GMC, N_Im, V_Im, N_Mat, V_Mat, Vth_eff] = y;
  const {
    g_NB_base, g_GMC, k_Neuron, sym_frac,
    V_thresh_base, V_thresh_GMC, k_max_NB, k_max_GMC, n,
    V_floor_NB, V_floor_GMC, delta_thresh, V_thresh_min,
  } = p;

  const Vavg_NB = N_NB > 0 ? V_NB / N_NB : 0;
  const Vavg_GMC = N_GMC > 0 ? V_GMC / N_GMC : 0;
  const Vavg_Im  = N_Im > 0 ? V_Im / N_Im : 0;

  const Vth_used = Math.max(Vth_eff, V_thresh_min);
  const k_NB = N_NB > 0 && Vavg_NB >= V_floor_NB ? satpow(Vavg_NB, Vth_used, k_max_NB, n) : 0;
  const k_GMC = N_GMC > 0 && Vavg_GMC >= V_floor_GMC ? satpow(Vavg_GMC, V_thresh_GMC, k_max_GMC, n) : 0;

  const sym = sym_frac * k_NB * N_NB;
  const asym = (1 - sym_frac) * k_NB * N_NB;

  return [
    sym,
    g_NB_base * N_NB - 0.2 * asym * (Vavg_NB || 0),
    asym - k_GMC * N_GMC,
    g_GMC * N_GMC + 0.2 * asym * (Vavg_NB || 0) - k_GMC * N_GMC * (Vavg_GMC || 0),
    2 * k_GMC * N_GMC - k_Neuron * N_Im,
    k_GMC * N_GMC * (Vavg_GMC || 0) - k_Neuron * N_Im * (Vavg_Im || 0),
    k_Neuron * N_Im,
    k_Neuron * N_Im * (Vavg_Im || 0),
    -delta_thresh * sym,
  ];
}

// M3
function rhsM3(t, y, p) {
  let [N_NB, V_NB, N_GMC, V_GMC, N_Im, V_Im, N_Mat, V_Mat] = y;
  const {
    g_NB_base, g_GMC, k_Neuron, sym_frac,
    V_thresh_base, V_thresh_GMC, k_max_NB, k_max_GMC, n,
    V_floor_NB, V_ref, alpha_growth, V_floor_GMC,
  } = p;

  const Vavg_NB = N_NB > 0 ? V_NB / N_NB : 0;
  const Vavg_GMC = N_GMC > 0 ? V_GMC / N_GMC : 0;
  const Vavg_Im  = N_Im > 0 ? V_Im / N_Im : 0;

  const ratio = V_ref > 0 && Vavg_NB > 0 ? Vavg_NB / V_ref : 1.0;
  const g_NB_eff = g_NB_base * Math.pow(ratio, alpha_growth);

  const k_NB = N_NB > 0 && Vavg_NB >= V_floor_NB ? satpow(Vavg_NB, V_thresh_base, k_max_NB, n) : 0;
  const k_GMC = N_GMC > 0 && Vavg_GMC >= V_floor_GMC ? satpow(Vavg_GMC, V_thresh_GMC, k_max_GMC, n) : 0;

  const sym = sym_frac * k_NB * N_NB;
  const asym = (1 - sym_frac) * k_NB * N_NB;

  return [
    sym,
    g_NB_eff * N_NB - 0.2 * asym * (Vavg_NB || 0),
    asym - k_GMC * N_GMC,
    g_GMC * N_GMC + 0.2 * asym * (Vavg_NB || 0) - k_GMC * N_GMC * (Vavg_GMC || 0),
    2 * k_GMC * N_GMC - k_Neuron * N_Im,
    k_GMC * N_GMC * (Vavg_GMC || 0) - k_Neuron * N_Im * (Vavg_Im || 0),
    k_Neuron * N_Im,
    k_Neuron * N_Im * (Vavg_Im || 0),
  ];
}

// M4
function rhsM4(t, y, p) {
  let [N_NB, V_NB, N_GMC, V_GMC, N_Im, V_Im, N_Mat, V_Mat, S_sym] = y;
  const {
    g_NB_base, g_GMC, k_Neuron, sym_frac,
    V_thresh_base, V_thresh_GMC, k_max_NB, k_max_GMC, n,
    V_floor_NB, V_ref, alpha_growth, V_floor_GMC,
    delta_thresh, V_thresh_min,
  } = p;

  const Vavg_NB = N_NB > 0 ? V_NB / N_NB : 0;
  const Vavg_GMC = N_GMC > 0 ? V_GMC / N_GMC : 0;
  const Vavg_Im  = N_Im > 0 ? V_Im / N_Im : 0;

  const ratio = V_ref > 0 && Vavg_NB > 0 ? Vavg_NB / V_ref : 1.0;
  const g_NB_eff = g_NB_base * Math.pow(ratio, alpha_growth);

  let V_thresh_eff = V_thresh_base - delta_thresh * Math.max(S_sym, 0);
  if (V_thresh_min != null) V_thresh_eff = Math.max(V_thresh_eff, V_thresh_min);

  const k_NB = N_NB > 0 && Vavg_NB >= V_floor_NB ? satpow(Vavg_NB, V_thresh_eff, k_max_NB, n) : 0;
  const k_GMC = N_GMC > 0 && Vavg_GMC >= V_floor_GMC ? satpow(Vavg_GMC, V_thresh_GMC, k_max_GMC, n) : 0;

  const sym = sym_frac * k_NB * N_NB;
  const asym = (1 - sym_frac) * k_NB * N_NB;

  return [
    sym,
    g_NB_eff * N_NB - 0.2 * asym * (Vavg_NB || 0),
    asym - k_GMC * N_GMC,
    g_GMC * N_GMC + 0.2 * asym * (Vavg_NB || 0) - k_GMC * N_GMC * (Vavg_GMC || 0),
    2 * k_GMC * N_GMC - k_Neuron * N_Im,
    k_GMC * N_GMC * (Vavg_GMC || 0) - k_Neuron * N_Im * (Vavg_Im || 0),
    k_Neuron * N_Im,
    k_Neuron * N_Im * (Vavg_Im || 0),
    sym,
  ];
}

// M5
function rhsM5(t, y, p) {
  let [N_NB, N_GMC, N_Im, N_Mat] = y;
  const { k_GMC, k_Neuron, K, n_nb, sym, k_NB_max } = p;
  const Np = Math.max(N_NB, 0), Kp = Math.max(K, 1e-12), nn = Math.max(n_nb, 1e-12);
  const k_NB_eff = k_NB_max * (Math.pow(Kp, nn) / (Math.pow(Kp, nn) + Math.pow(Np, nn)));
  const symd = sym * k_NB_eff * N_NB, asymd = (1 - sym) * k_NB_eff * N_NB;
  return [ symd, asymd - k_GMC * N_GMC, 2 * k_GMC * N_GMC - k_Neuron * N_Im, k_Neuron * N_Im ];
}

/* ---------------- Solve wrappers ---------------- */
function solveRow(rowIdx, geno) {
  const [ , sym_frac, g_scale] = geno;
  const p = state[rowIdx];

  if (rowIdx === 1) {
    const { V0, k_max_NB, g_NB_WT } = derive_kmax_gNB(p);
    const args = {
      g_NB: g_NB_WT * g_scale, g_GMC: p.g_GMC, k_Neuron: p.k_Neuron, sym_frac,
      V_thresh_NB: p.V_thresh_NB, V_thresh_GMC: p.V_thresh_GMC,
      k_max_NB, k_max_GMC: p.k_max_GMC, n: p.n, V_floor_NB: p.V_floor_NB, V_floor_GMC: p.V_floor_GMC,
    };
    const y0 = [1, V0, 0, 0, 0, 0, 0, 0];
    return integrate(rhsM1, y0, args, p.tEnd, p.dt);
  }

  if (rowIdx === 2) {
    const { V0, k_max_NB, g_NB_WT } = derive_kmax_gNB(p);
    const args = {
      g_NB_base: g_NB_WT * g_scale, g_GMC: p.g_GMC, k_Neuron: p.k_Neuron, sym_frac,
      V_thresh_base: p.V_thresh_base, V_thresh_GMC: p.V_thresh_GMC,
      k_max_NB, k_max_GMC: p.k_max_GMC, n: p.n, V_floor_NB: p.V_floor_NB, V_floor_GMC: p.V_floor_GMC,
      delta_thresh: p.delta_thresh, V_thresh_min: p.V_thresh_min,
    };
    const y0 = [1, V0, 0, 0, 0, 0, 0, 0, p.V_thresh_base];
    return integrate(rhsM2, y0, args, p.tEnd, p.dt);
  }

  if (rowIdx === 3) {
    const { V0, k_max_NB, g_NB_WT } = derive_kmax_gNB(p);
    const args = {
      g_NB_base: g_NB_WT * g_scale, g_GMC: p.g_GMC, k_Neuron: p.k_Neuron, sym_frac,
      V_thresh_base: p.V_thresh_NB, V_thresh_GMC: p.V_thresh_GMC,
      k_max_NB, k_max_GMC: p.k_max_GMC, n: p.n, V_floor_NB: p.V_floor_NB,
      V_ref: V0, alpha_growth: p.alpha, V_floor_GMC: p.V_floor_GMC,
    };
    const y0 = [1, V0, 0, 0, 0, 0, 0, 0];
    return integrate(rhsM3, y0, args, p.tEnd, p.dt);
  }

  if (rowIdx === 4) {
    const { V0, k_max_NB, g_NB_WT } = derive_kmax_gNB(p);
    const args = {
      g_NB_base: g_NB_WT * g_scale, g_GMC: p.g_GMC, k_Neuron: p.k_Neuron, sym_frac,
      V_thresh_base: p.V_thresh_base, V_thresh_GMC: p.V_thresh_GMC,
      k_max_NB, k_max_GMC: p.k_max_GMC, n: p.n, V_floor_NB: p.V_floor_NB,
      V_ref: V0, alpha_growth: p.alpha, V_floor_GMC: p.V_floor_GMC,
      delta_thresh: p.delta_thresh, V_thresh_min: p.V_thresh_min,
    };
    const y0 = [1, V0, 0, 0, 0, 0, 0, 0, 0];
    return integrate(rhsM4, y0, args, p.tEnd, p.dt);
  }

  if (rowIdx === 5) {
    const k_NB_max = p.k_star * ((Math.pow(p.K_self, p.beta) + 1) / Math.pow(p.K_self, p.beta));
    const args = { k_GMC: p.k_max_GMC, k_Neuron: p.k_Neuron, K: p.K_self, n_nb: p.beta, sym: sym_frac, k_NB_max };
    const y0 = [1, 0, 0, 0];
    return integrate(rhsM5, y0, args, p.tEnd, p.dt);
  }
}

/* ---------------- SVG plotting ---------------- */
function plotRow(r) {
  readModelInputs(r);
  for (let c = 1; c <= 3; c++) {
    const cell = qs(`.cell[data-row="${r}"][data-col="${c}"]`);
    const svg = qs("svg", cell);
    const gAxes = qs(".axes", svg), gSeries = qs(".series", svg), gLabels = qs(".endlabels", svg);
    gAxes.innerHTML = ""; gSeries.innerHTML = ""; gLabels.innerHTML = "";

    const sol = solveRow(r, GENOS[c - 1]);
    const t = sol.t;
    const NB=[], GMC=[], Im=[], Mat=[];
    for (let i = 0; i < t.length; i++) {
      const y = sol.y[i];
      if (r === 5) { NB.push(y[0]); GMC.push(y[1]); Im.push(y[2]); Mat.push(y[3]); }
      else { NB.push(y[0]); GMC.push(y[2]); Im.push(y[4]); Mat.push(y[6]); }
    }

    const W=600, H=360, padL=48, padR=24, padT=18, padB=32;
    const x0=padL, x1=W-padR, y0=padT, y1=H-padB;
    const x = (v)=> x0 + (v/state[r].tEnd)*(x1-x0);
    const maxY = Math.max(1, ...NB, ...GMC, ...Im, ...Mat);
    const y = (v)=> y1 - (v/maxY)*(y1-y0);

    const axis="#32405e", tick="#9aa4b2";
    gAxes.innerHTML = `
      <line x1="${x0}" y1="${y1}" x2="${x1}" y2="${y1}" stroke="${axis}" stroke-width="1"/>
      <line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1}" stroke="${axis}" stroke-width="1"/>
      ${[0,12,24,36,48].map(v=>`
        <line x1="${x(v)}" y1="${y1}" x2="${x(v)}" y2="${y1+5}" stroke="${axis}"/>
        <text x="${x(v)}" y="${y1+18}" fill="${tick}" font-size="11" text-anchor="middle">${v}</text>
      `).join("")}
      ${[0, Math.round(maxY*0.33), Math.round(maxY*0.66), Math.round(maxY)].map(v=>`
        <line x1="${x0-5}" y1="${y(v)}" x2="${x0}" y2="${y(v)}" stroke="${axis}"/>
        <text x="${x0-8}" y="${y(v)+4}" fill="${tick}" font-size="11" text-anchor="end">${v}</text>
      `).join("")}
    `;

    const lw=3.2, pts = arr => arr.map((v,i)=>`${x(t[i])},${y(v)}`).join(" ");
    gSeries.innerHTML = `
      <polyline fill="none" stroke="${COLORS.NB}"  stroke-width="${lw}" stroke-linejoin="round" points="${pts(NB)}"/>
      <polyline fill="none" stroke="${COLORS.GMC}" stroke-width="${lw}" stroke-linejoin="round" points="${pts(GMC)}"/>
      <polyline fill="none" stroke="${COLORS.Im}"  stroke-width="${lw}" stroke-linejoin="round" points="${pts(Im)}"/>
      <polyline fill="none" stroke="${COLORS.Mat}" stroke-width="${lw}" stroke-linejoin="round" points="${pts(Mat)}"/>
    `;

    const ends = [
      ["NB", Math.round(NB.at(-1))],
      ["GMC", Math.round(GMC.at(-1))],
      ["Im", Math.round(Im.at(-1))],
      ["Mat", Math.round(Mat.at(-1))],
    ].map(([name, val]) => ({ name, val, y: y(
      name==="NB"?NB.at(-1):name==="GMC"?GMC.at(-1):name==="Im"?Im.at(-1):Mat.at(-1)
    ) - 2 }));
    ends.sort((a,b)=>a.y-b.y);
    const boxH=26, boxW2=36, right=x1-6;
    for (let i=1;i<ends.length;i++) if (ends[i].y-ends[i-1].y<boxH+6) ends[i].y=ends[i-1].y+boxH+6;

    gLabels.innerHTML = ends.map(e=>{
      const txt=String(e.val);
      const w = txt.length<=2 ? boxW2 : 12 + 10*txt.length;
      const xL = right - w, yT = e.y - boxH/2, col = COLORS[e.name];
      return `
        <rect x="${xL}" y="${yT}" width="${w}" height="${boxH}" fill="white" stroke="${col}" stroke-width="2.4" rx="7" ry="7"/>
        <text x="${xL + w/2}" y="${yT + boxH/2 + 4}" fill="#0b1020"
              font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace"
              font-size="13" text-anchor="middle">${txt}</text>`;
    }).join("");
  }
  renderChanges(r);
  renderAfter(r);
  if (window.MathJax?.typeset) MathJax.typeset();
}

/* ---------------- Build UI and wire events ---------------- */
function buildModels() {
  const grid = qs("#grid");
  grid.innerHTML = "";
  for (let r = 1; r <= 5; r++) {
    // BEFORE info (full width)
    const before = document.createElement("div");
    before.className = "info full";
    before.innerHTML = `
      <h3>${MODEL_INFO[r].title} — overview</h3>
      <p>${MODEL_INFO[r].before}</p>
    `;
    grid.appendChild(before);

    // Plots
    const names = ["WT", "mud mutant", "nanobody"];
    for (let c = 1; c <= 3; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = r;
      cell.dataset.col = c;
      const h = document.createElement("h3");
      h.textContent = `Model ${r} • ${names[c - 1]}`;
      cell.appendChild(h);
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 600 360");
      svg.innerHTML = `<g class="axes"></g><g class="series"></g><g class="endlabels"></g>`;
      cell.appendChild(svg);
      grid.appendChild(cell);
    }

    // Params
    const params = document.createElement("div");
    params.className = "card params";
    params.dataset.row = r;
    const h = document.createElement("h3");
    h.textContent = `${MODEL_SCHEMAS[r].title} — parameters`;
    params.appendChild(h);

    const fields = document.createElement("div");
    fields.className = "fields";
    for (const [key, [label, help]] of Object.entries(MODEL_SCHEMAS[r].fields)) {
      const box = document.createElement("div");
      box.className = "field";
      const lab = document.createElement("label");
      lab.textContent = help ? `${label} — ${help}` : label;
      const inp = document.createElement("input");
      inp.type = "number"; inp.step = "0.0001";
      inp.value = String(state[r][key]);
      inp.dataset.model = r; inp.dataset.key = key;
      box.appendChild(lab); box.appendChild(inp);
      fields.appendChild(box);
    }
    params.appendChild(fields);

    const rowCtl = document.createElement("div");
    rowCtl.className = "inline";
    const left = document.createElement("div");
    left.className = "inline"; left.style.gap = "8px";
    const run = document.createElement("button");
    run.textContent = "Run model"; run.dataset.run = r;
    const share = document.createElement("button");
    share.textContent = "Share model"; share.className = "secondary tiny"; share.dataset.share = r;
    left.appendChild(run); left.appendChild(share);

    const right = document.createElement("div");
    right.className = "changes"; right.id = `changes-${r}`;
    rowCtl.appendChild(left); rowCtl.appendChild(right);
    params.appendChild(rowCtl);
    grid.appendChild(params);

    // AFTER info
    const after = document.createElement("div");
    after.className = "info full";
    after.id = `after-${r}`;
    after.innerHTML = `<h3>Results summary</h3><p class="tiny">Run to update.</p>`;
    grid.appendChild(after);
  }
}

function listChangedParams(r) {
  const diffs = [];
  for (const k of Object.keys(MODEL_SCHEMAS[r].fields)) {
    const cur = state[r][k], def = DEFAULTS[k];
    if (typeof cur === "number" && typeof def === "number" && Math.abs(cur - def) > 1e-12) {
      diffs.push([k, cur]);
    }
  }
  return diffs;
}

function renderChanges(r) {
  const host = qs(`#changes-${r}`); if (!host) return;
  const diffs = listChangedParams(r);
  host.innerHTML = diffs.length
    ? diffs.map(([k,v])=>`<span class="chip-sm">${k}: ${String(v)}</span>`).join("")
    : `<span class="tiny" style="color:var(--muted)">No changes vs defaults</span>`;
}

function summarizeRow(r) {
  const names = ["WT", "mud mutant", "nanobody"];
  const out = [];
  for (let c = 1; c <= 3; c++) {
    const sol = solveRow(r, GENOS[c - 1]);
    const t = sol.t; let NB, GMC, Im, Mat;
    if (r === 5) { NB = sol.y.at(-1)[0]; GMC = sol.y.at(-1)[1]; Im = sol.y.at(-1)[2]; Mat = sol.y.at(-1)[3]; }
    else { const y = sol.y.at(-1); NB = y[0]; GMC = y[2]; Im = y[4]; Mat = y[6]; }
    out.push({ name: names[c - 1], tEnd: t.at(-1), NB, GMC, Im, Mat });
  }
  return out;
}

function renderAfter(r) {
  const box = qs(`#after-${r}`); if (!box) return;
  const rows = summarizeRow(r);
  const lines = rows.map(s => `
    <div class="tiny"><strong>${s.name} @ ${Math.round(s.tEnd)}h</strong> —
      NB ${Math.round(s.NB)}, GMC ${Math.round(s.GMC)}, Im ${Math.round(s.Im)}, Mat ${Math.round(s.Mat)}
    </div>`).join("");
  box.innerHTML = `<h3>Results summary</h3>${lines}`;
}

function shareAll() {
  const sp = new URLSearchParams();
  for (const r of [1,2,3,4,5]) {
    readModelInputs(r);
    Object.entries(state[r]).forEach(([k,v])=> sp.set(`m${r}_${k}`, String(v)));
  }
  const url = `${location.origin}${location.pathname}?${sp.toString()}`;
  navigator.clipboard?.writeText(url);
  alert("Shareable link copied to clipboard.");
}
function shareRow(r) {
  readModelInputs(r);
  const sp = new URLSearchParams();
  Object.entries(state[r]).forEach(([k,v])=> sp.set(`m${r}_${k}`, String(v)));
  sp.set("row", String(r));
  const url = `${location.origin}${location.pathname}?${sp.toString()}`;
  navigator.clipboard?.writeText(url);
  alert(`Link for Model ${r} copied.`);
}

function loadFromURL() {
  const u = new URL(location.href);
  for (const [k, v] of u.searchParams.entries()) {
    const m = k.match(/^m([1-5])_(.+)$/);
    if (m) {
      const r = +m[1], key = m[2];
      const num = parseFloat(v);
      if (!Number.isNaN(num)) state[r][key] = num;
    }
  }
  for (const r of [1,2,3,4,5]) writeModelInputs(r);
  for (const r of [1,2,3,4,5]) plotRow(r);
}

/* ---------------- Boot ---------------- */
buildModels();
loadFromURL();

/* Events */
qsa("button[data-run]").forEach((b)=> b.addEventListener("click", ()=> plotRow(+b.dataset.run)));
qsa("button[data-share]").forEach((b)=> b.addEventListener("click", ()=> shareRow(+b.dataset.share)));
qs("#resetAll").addEventListener("click", () => {
  for (const r of [1,2,3,4,5]) {
    for (const k of Object.keys(MODEL_SCHEMAS[r].fields)) state[r][k] = DEFAULTS[k];
    qsa(`input[data-model="${r}"]`).forEach((inp)=> { const k = inp.dataset.key; inp.value = String(state[r][k]); });
    plotRow(r);
  }
});