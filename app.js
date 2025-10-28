/* Neuroblast interactive grid*/

/* ---------------- Fixed genotypes ---------------- */
const GENOS = [
  ["WT", 0.0, 1.0],
  ["mud mutant", 0.15, 1.0],
  ["nanobody", 0.15, 0.8],
];
const COLORS = { NB: "#1b9e77", GMC: "#d95f02", Im: "#7570b3", Mat: "#e7298a" };
const qs  = (s, root) => (root || document).querySelector(s);
const qsa = (s, root) => Array.from((root || document).querySelectorAll(s));

/* ---------------- Plot style (scales all text/lines) ---------------- */
const PLOT_STYLE = {
  axisStroke: 1.8, // axes/thick ticks
  gridStroke: 1.2, // little ticks
  tickSize: 14, // numbers on axes
  axisLabelSize: 20, // "Time (hours)" and "Number of Cells"
  lineWidth: 4.0, // series lines
  endBox: {
    height: 34, // end label pill height
    textSize: 16, // value text inside pill
    stroke: 3.0, // pill border stroke
    rx: 9, // rounded corners
  },
  pads: {
    // extra breathing room for larger labels
    left: 62,
    right: 30,
    top: 22,
    bottom: 58,
  },
};

/* ---------------- Per-model defaults ---------------- */
const DEFAULTS = {
  tEnd: 48,
  dt: 0.1,
  k_NB: 1 / 1.5,
  k_GMC: 1 / 9,
  k_Neuron: 1 / 48,
  nb_vol: 285.0,
  n: 3,
  k_max_GMC: 1 / 8,
  V_thresh_NB: 1.25 * 285.0,
  V_thresh_GMC: 285.0 * 1.25 * 0.2 * 2,
  V_floor_NB: 0.25 * 285.0,
  V_floor_GMC: 0.25 * (285.0 * 1.25 * 0.2),
  g_GMC: (285.0 * 1.25 * 0.2) / 9,
  k_star: 1 / 1.5,
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
    title: "Base Model",
    fields: {
      tEnd: ["tEnd (h)", "simulation end time"],
      k_NB: ["k_NB (h⁻¹)", "neuroblast division rate"],
      k_GMC: ["k_GMC (h⁻¹)", "GMC division rate"],
      k_Neuron: ["k_Neuron (h⁻¹)", "Im→Mat neuron maturation rate"],
    },
  },
  2: {
    title: "Model 1 — volume-activated division (static thresholds)",
    fields: {
      tEnd: ["tEnd (h)", ""],
      nb_vol: ["nb_vol (μM³)", "initial NB volume (V0)"],
      n: ["n (–)", "sat-power exponent"],
      k_max_GMC: ["k_max_GMC (h⁻¹)", "max GMC division rate"],
      V_thresh_NB: ["V_thresh_NB (μM³)", "NB division threshold"],
      V_thresh_GMC: ["V_thresh_GMC (μM³)", "GMC division threshold"],
      V_floor_NB: ["V_floor_NB (μM³)", "NB min vol for division"],
      V_floor_GMC: ["V_floor_GMC (μM³)", "GMC min vol for division"],
      k_Neuron: ["k_Neuron (h⁻¹)", "Im→Mat neuron maturation rate"],
      g_GMC: ["g_GMC (μM³·h⁻¹)", "GMC growth rate"],
      k_star: ["k_star (h⁻¹)", "WT NB division rate @ V0"],
    },
  },
  3: {
    title: "Model 2 — sym-division–pulled NB threshold (no recovery)",
    fields: {
      tEnd: ["tEnd (h)", ""],
      nb_vol: ["nb_vol (μM³)", "initial NB volume (V0)"],
      n: ["n (–)", "sat-power exponent"],
      k_max_GMC: ["k_max_GMC (h⁻¹)", "max GMC division"],
      V_thresh_base: ["V_thresh_base (μM³)", "baseline NB threshold"],
      V_thresh_GMC: ["V_thresh_GMC (μM³)", "GMC threshold"],
      V_floor_NB: ["V_floor_NB (μM³)", "NB division floor"],
      V_floor_GMC: ["V_floor_GMC (μM³)", "GMC division floor"],
      k_Neuron: ["k_Neuron (h⁻¹)", "Im→Mat neuron maturation rate"],
      g_GMC: ["g_GMC (μM³·h⁻¹)", "GMC growth rate"],
      k_star: ["k_star (h⁻¹)", "WT NB division rate @ V0"],
      delta_thresh: ["delta_thresh (μM³)", "threshold pull per sym div"],
      V_thresh_min: ["V_thresh_min (μM³)", "lower bound"],
    },
  },
  4: {
    title: "Model 3 — volume-scaled growth (static thresholds)",
    fields: {
      tEnd: ["tEnd (h)", ""],
      nb_vol: ["nb_vol (μM³)", "V_ref = V0"],
      n: ["n (–)", "sat-power exponent"],
      k_max_GMC: ["k_max_GMC (h⁻¹)", "max GMC division"],
      V_thresh_NB: ["V_thresh_NB (μM³)", "NB threshold"],
      V_thresh_GMC: ["V_thresh_GMC (μM³)", "GMC threshold"],
      V_floor_NB: ["V_floor_NB (μM³)", "NB division floor"],
      V_floor_GMC: ["V_floor_GMC (μM³)", "GMC division floor"],
      k_Neuron: ["k_Neuron (h⁻¹)", "Im→Mat neuron maturation rate"],
      g_GMC: ["g_GMC (μM³·h⁻¹)", "GMC growth rate"],
      k_star: ["k_star (h⁻¹)", "WT NB division rate @ V0"],
      alpha: ["α (–)", "growth-volume exponent"],
    },
  },
  5: {
    title: "Model 4 — vol-scaled growth + sym-threshold pull",
    fields: {
      tEnd: ["tEnd (h)", ""],
      nb_vol: ["nb_vol (μM³)", "V_ref = V0"],
      n: ["n (–)", "sat-power exponent"],
      k_max_GMC: ["k_max_GMC (h⁻¹)", "max GMC division"],
      V_thresh_GMC: ["V_thresh_GMC (μM³)", "GMC threshold"],
      V_floor_NB: ["V_floor_NB (μM³)", "NB division floor"],
      V_floor_GMC: ["V_floor_GMC (μM³)", "GMC division floor"],
      k_Neuron: ["k_Neuron (h⁻¹)", "Im→Mat neuron maturation rate"],
      g_GMC: ["g_GMC (μM³·h⁻¹)", "GMC growth rate"],
      k_star: ["k_star (h⁻¹)", "WT NB division rate @ V0"],
      alpha: ["α (–)", "growth-volume exponent"],
      V_thresh_base: ["V_thresh_base (μM³)", "baseline NB threshold"],
      delta_thresh: ["delta_thresh (μM³)", "threshold pull per sym div"],
      V_thresh_min: ["V_thresh_min (μM³)", "lower bound"],
    },
  },
  6: {
    title: "Model 5 — NB self-repression (Hill form, counts-only)",
    fields: {
      tEnd: ["tEnd (h)", ""],
      k_Neuron: ["k_Neuron (h⁻¹)", "Im→Mat neuron maturation rate"],
      k_max_GMC: ["k_GMC (h⁻¹)", "GMC division"],
      k_star: ["k_star (h⁻¹)", "base NB div (WT @ start)"],
      K_self: ["K_self (cells)", "half-max repression scale"],
      beta: ["β (–)", "repression steepness (Hill)"],
    },
  },
};

const MODEL_INFO = {
  1: {
    title: "Base Model",
    before: `
    <p>This is a simple ODE model that tracks the counts of each cell type in the developing neuroblast lineage. This model does not track cell volume and assumes homogeneous behavior within each cell type.</p>

    <h4>Model Species</h4>
    <ul>
      <li><strong>$N_{\\text{NB}}$</strong> - Number of neuroblasts, neuroblasts are stem-like cells that can divide asymmetrically yielding one neuroblast and one GMC or symmetrically yielding two neuroblasts</li>
      <li><strong>$N_{\\text{GMC}}$</strong> - Number of GMCs, Ganglion Mother Cells are neuron precursors that divide symmetrically into two neurons</li>
      <li><strong>$N_{\\text{ImNeuron}}$</strong> - Number of immature neurons. Immature neurons are terminally differentiated brain cells that do not grow nor divide; they mature into MatNeurons</li>
      <li><strong>$N_{\\text{MatNeuron}}$</strong> - Number of mature neurons. Mature neurons are terminally differentiated brain cells that do not grow, divide, nor change state.</li>
    </ul>

    <h4>Model Parameters</h4>
    <ul>
      <li><strong>$k_{\\text{NB}}$</strong> - the rate of neuroblast divisions, in units of divisions/hour</li>
      <li><strong>$k_{\\text{GMC}}$</strong> - the rate of GMC divisions, in units of divisions/hour</li>
      <li><strong>$k_{\\text{Neuron}}$</strong> — Rate at which immature neurons mature into mature neurons (transitions/hour).</li>
      <li><strong>$\\text{sym\\_frac}$</strong> - the fraction of neuroblast divisions that are symmetrical. Unitless.
        <ul><li>Set to 0 for WT simulations and .15 for mutant simulations</li></ul>
      </li>
    </ul>

    <h4>Model Structure</h4>
    <p>The number of neuroblasts increases by 1 with each symmetric neuroblast division</p>
    $$\\frac{dN_{\\text{NB}}}{dt} = \\text{sym\\_frac} \\cdot k_{\\text{NB}} \\cdot N_{\\text{NB}}(t)$$

    <p>The number of GMCs increases by 1 with each asymmetric neuroblast division and decreases by 1 with each GMC division.</p>
    $$\\frac{dN_{\\text{GMC}}}{dt} = (1 - \\text{sym\\_frac}) \\cdot k_{\\text{NB}} \\cdot N_{\\text{NB}}(t) - k_{\\text{GMC}} \\cdot N_{\\text{GMC}}(t)$$

    <p>Immature neurons increase by 2 per GMC division and decrease as they mature:</p>
    $$
    \\frac{dN_{\\text{ImNeuron}}}{dt} = 2 \\cdot k_{\\text{GMC}} \\cdot N_{\\text{GMC}}(t) - k_{\\text{Neuron}} \\cdot N_{\\text{ImNeuron}}(t)
    $$

    <p>Mature neurons increase as immature neurons mature:</p>
    $$
    \\frac{dN_{\\text{MatNeuron}}}{dt} = k_{\\text{Neuron}} \\cdot N_{\\text{ImNeuron}}(t)
    $$

    <p>Mud mutant and nanobody simulations are identical in this model. Both are run with sym_frac set to .15 (or 15%).</p>
  `,
  },
  2: {
    title: "Model 1 — volume-activated division (static thresholds)",
    before: `
    <p>
      Model 1 extends the <em>Base Model</em> by tracking total volumes for NB, GMC, Im, and Mat cells, and
      by making division rates depend on <strong>average cell volume</strong> via a saturating power law.
      NB growth is constant (no volume-sensitive growth); division thresholds are <em>static</em>.
    </p>

    <h4>Model Species</h4>
    <ul>
      <li><strong>$N_{\\mathrm{NB}},\\;V_{\\mathrm{NB}}$</strong> — NB count and total NB volume</li>
      <li><strong>$N_{\\mathrm{GMC}},\\;V_{\\mathrm{GMC}}$</strong> — GMC count and total GMC volume</li>
      <li><strong>$N_{\\mathrm{Im}},\\;V_{\\mathrm{Im}}$</strong> — immature neuron count and total volume</li>
      <li><strong>$N_{\\mathrm{Mat}},\\;V_{\\mathrm{Mat}}$</strong> — mature neuron count and total volume</li>
    </ul>

    <h4>Division rates (sat-power with floors and thresholds)</h4>
    <p>
      Let $\\bar V_{\\mathrm{NB}} = V_{\\mathrm{NB}}/N_{\\mathrm{NB}}$ and
      $\\bar V_{\\mathrm{GMC}} = V_{\\mathrm{GMC}}/N_{\\mathrm{GMC}}$ (0 if denominator is 0).
      Division rates follow
    </p>
    $$
      k_{\\mathrm{NB}}(t)=
      \\begin{cases}
        k_{\\max}^{\\mathrm{NB}}\\,\\min\\!\\left(1,\\,\\Big(\\dfrac{\\bar V_{\\mathrm{NB}}}{V_{\\mathrm{th}}^{\\mathrm{NB}}}\\Big)^{n}\\right), & \\bar V_{\\mathrm{NB}} \\ge V_{\\min}^{\\mathrm{NB}}\\\\[6pt]
        0, & \\text{otherwise}
      \\end{cases}
    $$
    $$
      k_{\\mathrm{GMC}}(t)=
      \\begin{cases}
        k_{\\max}^{\\mathrm{GMC}}\\,\\min\\!\\left(1,\\,\\Big(\\dfrac{\\bar V_{\\mathrm{GMC}}}{V_{\\mathrm{th}}^{\\mathrm{GMC}}}\\Big)^{n}\\right), & \\bar V_{\\mathrm{GMC}} \\ge V_{\\min}^{\\mathrm{GMC}}\\\\[6pt]
        0, & \\text{otherwise}
      \\end{cases}
    $$

    <h4>Growth and transfers</h4>
    <p>
      NB volume grows at a constant per-cell rate $g_{\\mathrm{NB}}$ and GMC volume at $g_{\\mathrm{GMC}}$.
      Each asymmetric NB division transfers $0.2\\,\\bar V_{\\mathrm{NB}}$ from NBs to GMCs.
      GMC divisions transfer volume to Im neurons; Im maturation transfers to Mat.
    </p>

<h4>Calibration & Genotypes</h4>
<p>
  In this model, the <strong>division rate of neuroblasts</strong> is set indirectly through the parameter 
  <code>k_star</code>, which represents the expected division rate of a WT neuroblast at its 
  <em>initial average volume</em> (<code>nb_vol</code>).
</p>

<ul>
  <li><strong>Calibrating division rates:</strong>
  When you choose a value of <code>k_star</code>, the model sets
  $$k_{\\max}^{\\mathrm{NB}}
    = \\frac{k_{\\star}}{\\min\\!\\left(1,\\left(\\tfrac{V_0}{V_{\\mathrm{th}}^{\\mathrm{NB}}}\\right)^{n}\\right)}$$
  so that
  $$k_{\\mathrm{NB}}(\\bar V_{\\mathrm{NB}}=V_0)=k_{\\star}.$$
  The default is $k_{\\star}=1/1.5\\;\\mathrm{h}^{-1}$ (a 1.5-hour average cycle).
  Essentially, $k^{\\mathrm{NB}}_{\\mathrm{max}}$ is calculated to keep the NB volume constant in WT simulations, given the NB's initial volume, the NB's division threshold, and the user-specified intended WT division rate <code>k_star</code>.
</li>

  <li>
    <strong>Mutant genotypes:</strong>
    <ul>
      <li>WT: <code>sym_frac</code> = 0</li>
      <li>mud mutant: <code>sym_frac</code> = 0.15</li>
      <li>nanobody: <code>sym_frac</code> = 0.15</li>
      <li>Nanobody NBs have reduced growth (80 % of WT)
    </ul>
  </li>
</ul>
  `,
  },
  3: {
    title: "Model 2 — sym-division–pulled NB threshold (no recovery)",
    before: `
    <p>
      Model 2 extends <em>Model 1</em> by letting the NB division threshold
      <strong>decrease each time a symmetric NB division occurs</strong>, with no recovery back to baseline.
      NB growth remains constant (not volume-sensitive).
    </p>

    <h4>Model Species</h4>
    <ul>
      <li><strong>$N_{\\mathrm{NB}}, V_{\\mathrm{NB}}$</strong> — NB count and total NB volume</li>
      <li><strong>$N_{\\mathrm{GMC}}, V_{\\mathrm{GMC}}$</strong> — GMC count and total GMC volume</li>
      <li><strong>$N_{\\mathrm{Im}}, V_{\\mathrm{Im}}$</strong> — immature neuron count and total volume</li>
      <li><strong>$N_{\\mathrm{Mat}}, V_{\\mathrm{Mat}}$</strong> — mature neuron count and total volume</li>
      <li><strong>$V_{\\mathrm{th}}^{\\mathrm{eff}}$</strong> — effective NB division threshold (state)</li>
    </ul>

    <h4>Division & Growth</h4>
    <p>NB and GMC division rates still follow the saturating power-law of average volume (as in Model 1), with floors:</p>
    $$
      k_{\\mathrm{NB}}(t) =
      k_{\\max}^{\\mathrm{NB}}\\,\\min\\!\\left(1,\\Big(\\tfrac{\\bar V_{\\mathrm{NB}}}{V_{\\mathrm{th}}^{\\mathrm{eff}}}\\Big)^{n}\\right),
      \\quad
      k_{\\mathrm{GMC}}(t) =
      k_{\\max}^{\\mathrm{GMC}}\\,\\min\\!\\left(1,\\Big(\\tfrac{\\bar V_{\\mathrm{GMC}}}{V_{\\mathrm{th}}^{\\mathrm{GMC}}}\\Big)^{n}\\right).
    $$
    <p>NB growth rate is constant at $g_{\\mathrm{NB}}=g_{\\mathrm{NB}}^{\\mathrm{base}}$.</p>

    <h4>Sym-division threshold pull (no recovery)</h4>
    $$
      \\frac{d V_{\\mathrm{th}}^{\\mathrm{eff}}}{dt} = -\\Delta_{\\mathrm{th}}\\,\\underbrace{\\big(\\text{sym\\_frac}\\,k_{\\mathrm{NB}}\\,N_{\\mathrm{NB}}\\big)}_{\\text{symmetric NB divisions per hour}},
      \\quad V_{\\mathrm{th}}^{\\mathrm{eff}} \\ge V_{\\mathrm{th}}^{\\min}.
    $$

    <h4>Calibration & Genotypes</h4>
    <ul>
      <li><strong>$k_{\\star}$ → $k_{\\max}^{\\mathrm{NB}}$:</strong>
        $k_{\\max}^{\\mathrm{NB}}$ is calibrated so that $k_{\\mathrm{NB}}(\\bar V_{\\mathrm{NB}}=V_0)=k_{\\star}$ (WT at the start).
      </li>
      <li><strong>NB growth:</strong> WT growth is set to $g_{\\mathrm{NB}}^{\\mathrm{base}}=0.2\\,k_{\\star}V_0$; nanobody growth is scaled to 80% of WT.</li>
      <li><strong>Genotypes:</strong> WT = 0% symmetric; mud = 15%; nanobody = 15% + reduced growth.</li>
    </ul>
    `,
  },

  4: {
    title: "Model 3 — volume-scaled NB growth (static thresholds)",
    before: `
    <p>
      Model 3 keeps the <em>static</em> division thresholds but makes NB growth
      <strong>volume-sensitive</strong> relative to the initial average volume $V_0$:
    </p>
    $$
      g_{\\mathrm{NB}}^{\\mathrm{eff}}(t)
      = g_{\\mathrm{NB}}^{\\mathrm{base}}\\left(\\frac{\\bar V_{\\mathrm{NB}}}{V_0}\\right)^{\\alpha},
      \\qquad \\alpha \\ge 0.
    $$
    <p>
      Division rates remain the same sat-power forms as Model 1 (with floors). Larger $\\alpha$
      suppresses growth more strongly when NBs are small and accelerates it when they are large.
    </p>
    <h4>Calibration & Genotypes</h4>
    <ul>
      <li>$k_{\\max}^{\\mathrm{NB}}$ calibrated from $k_{\\star}$ at $V_0$ (WT start).</li>
      <li>$g_{\\mathrm{NB}}^{\\mathrm{base}} = 0.2\\,k_{\\star}V_0$; nanobody growth = 0.8× WT.</li>
    </ul>
    `,
  },

  5: {
    title: "Model 4 — volume-scaled growth + sym-pulled threshold",
    before: `
    <p>
      Model 4 combines Model 3’s volume-scaled NB growth with a <em>cumulative</em> symmetric-division pull
      on the NB division threshold (like Model 2 but written with an accumulator $S_{\\mathrm{sym}}$):
    </p>
    $$
      g_{\\mathrm{NB}}^{\\mathrm{eff}} = g_{\\mathrm{NB}}^{\\mathrm{base}}\\left(\\frac{\\bar V_{\\mathrm{NB}}}{V_0}\\right)^{\\alpha},
      \\qquad
      V_{\\mathrm{th}}^{\\mathrm{eff}}(t) = \\max\\big(V_{\\mathrm{th}}^{\\mathrm{base}} - \\Delta_{\\mathrm{th}}\\,S_{\\mathrm{sym}}(t),\\,V_{\\mathrm{th}}^{\\min}\\big),
      \\qquad
      \\frac{dS_{\\mathrm{sym}}}{dt}=\\text{sym\\_frac}\\,k_{\\mathrm{NB}}N_{\\mathrm{NB}}.
    $$
    <p>Division rates use $V_{\\mathrm{th}}^{\\mathrm{eff}}$ as in Model 2.</p>
    <h4>Calibration & Genotypes</h4>
    <ul>
      <li>$k_{\\max}^{\\mathrm{NB}}$ from $k_{\\star}$ at $V_0$ (WT start).</li>
      <li>$g_{\\mathrm{NB}}^{\\mathrm{base}} = 0.2\\,k_{\\star}V_0$; nanobody growth = 0.8× WT.</li>
    </ul>
    `,
  },

  6: {
    title: "Model 5 — NB self-repression (Hill form, counts-only)",
    before: `
    <p>
      Model 5 returns to counts only (like the Base Model) and applies <strong>negative feedback</strong> on NB division based on
      the current NB count:
    </p>
    $$
      k_{\\mathrm{NB}}^{\\mathrm{eff}}(N_{\\mathrm{NB}}) =
      k_{\\mathrm{NB}}^{\\max}\\,\\frac{K^{\\beta}}{K^{\\beta} + N_{\\mathrm{NB}}^{\\beta}},
      \\qquad \\beta \\ge 1.
    $$
    <p>
      Higher $\\beta$ produces more switch-like repression once $N_{\\mathrm{NB}}$ exceeds the scale $K$.
      GMC division and neuron maturation are as in the Base Model.
    </p>

    <p> Mudmutant simulations and nanobody simulations are identical in Model 5 (as was the case in the Base Model) </p>
    `,
  },
};

function getRowShortTitle(r) {
  // Prefer the schema title (already defined per row)
  const full = MODEL_SCHEMAS?.[r]?.title || (r === 1 ? "Base Model" : `Model ${r}`);
  // Use text before an em dash for concise headers, e.g. "Model 3 — vol-scaled growth" → "Model 3"
  const cut = full.split("—")[0].trim();
  return cut || full;
}


/* ---------------- Build per-model state from defaults ---------------- */
const state = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {} };
for (const r of [1, 2, 3, 4, 5, 6]) {
  for (const k of Object.keys(MODEL_SCHEMAS[r].fields))
    state[r][k] = DEFAULTS[k];
}

/* ---------------- IO helpers ---------------- */
/* Allow math expressions as parameter inputs */
const EXPR_CONST = { pi: Math.PI, e: Math.E };
const EXPR_FUNC = {
  abs: Math.abs,
  sqrt: Math.sqrt,
  ln: Math.log,
  log10: (x) => Math.log10(x),
  min: Math.min,
  max: Math.max,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
};
const PREC = { "+": 1, "-": 1, "*": 2, "/": 2, "^": 3 };
const RIGHT_ASSOC = { "^": true };

function tokenizeExpr(s) {
  const tokens = [];
  const re =
    /\s*([A-Za-z_][A-Za-z_0-9]*|[0-9]*\.?[0-9]+(?:e[+-]?\d+)?|[-+*/^(),%])\s*/y;
  let m,
    i = 0;
  while (i < s.length) {
    re.lastIndex = i;
    m = re.exec(s);
    if (!m) return null;
    tokens.push(m[1]);
    i = re.lastIndex;
  }
  return tokens;
}

function toRPN(tokens) {
  const out = [],
    op = [];
  let prev = null;
  for (let t of tokens) {
    if (/^[0-9.]/.test(t) || t in EXPR_CONST) {
      out.push(t);
    } else if (t in EXPR_FUNC) {
      op.push(t);
    } else if (t === ",") {
      while (op.length && op.at(-1) !== "(") out.push(op.pop());
      if (!op.length) throw new Error("Misplaced comma");
    } else if (t in PREC || t === "-" || t === "+") {
      // unary minus/plus
      if (
        (t === "-" || t === "+") &&
        (prev == null || prev in PREC || prev === "(" || prev === ",")
      ) {
        // Represent unary as function u- / u+
        const u = t === "-" ? "u-" : "u+";
        op.push(u);
      } else {
        while (op.length) {
          const top = op.at(-1);
          const topPrec = PREC[top] ?? -1,
            tPrec = PREC[t] ?? -1;
          if (
            (top in PREC || top === "u-" || top === "u+") &&
            (topPrec > tPrec || (topPrec === tPrec && !RIGHT_ASSOC[t]))
          )
            out.push(op.pop());
          else break;
        }
        op.push(t);
      }
    } else if (t === "(") {
      op.push(t);
    } else if (t === ")") {
      while (op.length && op.at(-1) !== "(") out.push(op.pop());
      if (!op.length) throw new Error("Mismatched )");
      op.pop(); // pop "("
      // if function on stack, pop it too
      if (op.length && op.at(-1) in EXPR_FUNC) out.push(op.pop());
    } else {
      // identifier not recognized
      if (/^[A-Za-z_]/.test(t)) throw new Error(`Unknown symbol: ${t}`);
      throw new Error(`Bad token: ${t}`);
    }
    prev = t;
  }
  while (op.length) {
    const t = op.pop();
    if (t === "(" || t === ")") throw new Error("Mismatched ()");
    out.push(t);
  }
  return out;
}

function evalRPN(rpn) {
  const st = [];
  for (let t of rpn) {
    if (t in EXPR_CONST) {
      st.push(EXPR_CONST[t]);
    } else if (/^[0-9.]/.test(t)) {
      st.push(parseFloat(t));
    } else if (t === "u-" || t === "u+") {
      const a = st.pop();
      if (a == null) throw new Error("Unary op error");
      st.push(t === "u-" ? -a : +a);
    } else if (t in EXPR_FUNC) {
      // all funcs here are 1- or N-ary. For min/max we treat as 2-ary (extend if you like).
      const fn = EXPR_FUNC[t];
      if (t === "min" || t === "max") {
        const b = st.pop(),
          a = st.pop();
        if (a == null || b == null) throw new Error(`${t} args`);
        st.push(fn(a, b));
      } else {
        const a = st.pop();
        if (a == null) throw new Error(`${t} arg`);
        st.push(fn(a));
      }
    } else if (t in PREC) {
      const b = st.pop(),
        a = st.pop();
      if (a == null || b == null) throw new Error("Binary op");
      switch (t) {
        case "+":
          st.push(a + b);
          break;
        case "-":
          st.push(a - b);
          break;
        case "*":
          st.push(a * b);
          break;
        case "/":
          st.push(a / b);
          break;
        case "^":
          st.push(Math.pow(a, b));
          break;
      }
    } else {
      throw new Error(`Unknown RPN token ${t}`);
    }
  }
  if (st.length !== 1) throw new Error("Bad expression");
  return st[0];
}

// Public: parse user string into a Number (supports trailing %)
function parseExpr(str) {
  const s = String(str).trim();
  if (s === "") return NaN;
  const pct = s.endsWith("%");
  const body = pct ? s.slice(0, -1) : s;
  const tokens = tokenizeExpr(body);
  if (!tokens) return NaN;
  const rpn = toRPN(tokens);
  const v = evalRPN(rpn);
  return pct ? v / 100 : v;
}

// --- Formatting: truncate to 5 decimals by default (edit DEC to taste) ---
const DEC = 5;
function fmtNum(v) {
  if (!Number.isFinite(v)) return "";
  const a = Math.abs(v);
  // Use scientific for very big/small
  if (a !== 0 && (a < 1e-4 || a >= 1e6)) return v.toExponential(DEC);
  // Truncate (not round) to DEC decimals
  const p = Math.pow(10, DEC);
  const trunc = (v >= 0 ? Math.floor(v * p) : Math.ceil(v * p)) / p;
  // Drop trailing zeros
  return String(+trunc.toFixed(DEC));
}

// Normalize one input: evaluate -> write formatted value -> update state
function normalizeInput(inp) {
  const v = parseExpr(inp.value);
  if (!Number.isFinite(v)) {
    inp.classList.add("bad");
    inp.setAttribute("aria-invalid", "true");
    return;
  }
  inp.value = fmtNum(v); // show evaluated value
  inp.classList.remove("bad");
  inp.setAttribute("aria-invalid", "false");
  const r = +inp.dataset.model;
  const k = inp.dataset.key;
  state[r][k] = v; // keep state numeric
  renderChanges?.(r); // refresh “changes” chips
}

function readModelInputs(r) {
  qsa(`input[data-model="${r}"]`).forEach((inp) => {
    const k = inp.dataset.key;
    const v = parseExpr(inp.value);
    if (Number.isFinite(v)) {
      state[r][k] = v;
      inp.value = fmtNum(v); // <— show evaluated number
      inp.classList.remove("bad");
      inp.setAttribute("aria-invalid", "false");
    } else {
      inp.classList.add("bad");
      inp.setAttribute("aria-invalid", "true");
    }
  });
}

function writeModelInputs(r) {
  qsa(`input[data-model="${r}"]`).forEach((inp) => {
    const k = inp.dataset.key;
    if (k in state[r]) inp.value = fmtNum(state[r][k]);
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
  const T = new Array(steps + 1),
    Y = new Array(steps + 1);
  let y = y0.slice(),
    t = 0;
  T[0] = 0;
  Y[0] = y.slice();
  for (let i = 1; i <= steps; i++) {
    const k1 = rhs(t, y, p);
    const yMid = new Array(d);
    for (let j = 0; j < d; j++) yMid[j] = y[j] + 0.5 * dt * k1[j];
    const k2 = rhs(t + 0.5 * dt, yMid, p);
    for (let j = 0; j < d; j++) y[j] = y[j] + dt * k2[j];
    t += dt;
    T[i] = t;
    Y[i] = y.slice();
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
// Base Model - Count-based only
function rhsMBase(t, y, p) {
  let [N_NB, N_GMC, N_Im, N_Mat] = y;
  const { k_NB, k_GMC, k_Neuron, sym_frac } = p;

  const sym = sym_frac * k_NB * N_NB;
  const asym = (1 - sym_frac) * k_NB * N_NB;

  return [
    sym, // dN_NB/dt
    asym - k_GMC * N_GMC, // dN_GMC/dt
    2 * k_GMC * N_GMC - k_Neuron * N_Im, // dN_Im/dt
    k_Neuron * N_Im, // dN_Mat/dt
  ];
}

// M1
// ==== Model 1 — volume-activated division, static thresholds, constant NB growth ====
function rhsM1_volSat(t, y, p) {
  let [N_NB, V_NB, N_GMC, V_GMC, N_Im, V_Im, N_Mat, V_Mat] = y;
  const {
    g_NB,
    g_GMC,
    k_Neuron,
    sym_frac,
    V_thresh_NB,
    V_thresh_GMC,
    k_max_NB,
    k_max_GMC,
    n,
    V_floor_NB,
    V_floor_GMC,
  } = p;

  const Vavg_NB = N_NB > 0 ? V_NB / N_NB : 0;
  const Vavg_GMC = N_GMC > 0 ? V_GMC / N_GMC : 0;
  const Vavg_Im = N_Im > 0 ? V_Im / N_Im : 0;

  // satpow_rate(v, vth, kmax, n) = kmax * min(1, (v/vth)^n)
  const k_NB =
    N_NB > 0 && Vavg_NB >= V_floor_NB
      ? satpow(Vavg_NB, V_thresh_NB, k_max_NB, n)
      : 0;
  const k_GMC =
    N_GMC > 0 && Vavg_GMC >= V_floor_GMC
      ? satpow(Vavg_GMC, V_thresh_GMC, k_max_GMC, n)
      : 0;

  const sym_divs = sym_frac * k_NB * N_NB;
  const asym_divs = (1 - sym_frac) * k_NB * N_NB;

  const dN_NB = sym_divs;
  const dV_NB = g_NB * N_NB - 0.2 * asym_divs * (Vavg_NB || 0);

  const dN_GMC = asym_divs - k_GMC * N_GMC;
  const dV_GMC =
    g_GMC * N_GMC +
    0.2 * asym_divs * (Vavg_NB || 0) -
    k_GMC * N_GMC * (Vavg_GMC || 0);

  const dN_Im = 2 * k_GMC * N_GMC - k_Neuron * N_Im;
  const dV_Im =
    k_GMC * N_GMC * (Vavg_GMC || 0) - k_Neuron * N_Im * (Vavg_Im || 0);

  const dN_Mat = k_Neuron * N_Im;
  const dV_Mat = k_Neuron * N_Im * (Vavg_Im || 0);

  return [dN_NB, dV_NB, dN_GMC, dV_GMC, dN_Im, dV_Im, dN_Mat, dV_Mat];
}

// ==== Model 2 — sym divisions pull NB threshold down; no recovery; constant NB growth ====
function rhsM2_symPull_noRecovery(t, y, p) {
  // y = [N_NB, V_NB, N_GMC, V_GMC, N_Im, V_Im, N_Mat, V_Mat, Vth_eff]
  let [N_NB, V_NB, N_GMC, V_GMC, N_Im, V_Im, N_Mat, V_Mat, Vth_eff] = y;
  const {
    g_NB_base,
    g_GMC,
    k_Neuron,
    sym_frac,
    V_thresh_base,
    V_thresh_GMC,
    k_max_NB,
    k_max_GMC,
    n,
    V_floor_NB,
    V_floor_GMC,
    delta_thresh,
    V_thresh_min,
  } = p;

  const Vavg_NB = N_NB > 0 ? V_NB / N_NB : 0;
  const Vavg_GMC = N_GMC > 0 ? V_GMC / N_GMC : 0;
  const Vavg_Im = N_Im > 0 ? V_Im / N_Im : 0;

  // Effective NB threshold is the clamped state value Vth_eff
  const Vth_used = Math.max(Vth_eff, V_thresh_min ?? -Infinity);

  const k_NB =
    N_NB > 0 && Vavg_NB >= V_floor_NB
      ? satpow(Vavg_NB, Vth_used, k_max_NB, n)
      : 0;
  const k_GMC =
    N_GMC > 0 && Vavg_GMC >= V_floor_GMC
      ? satpow(Vavg_GMC, V_thresh_GMC, k_max_GMC, n)
      : 0;

  const sym_divs = sym_frac * k_NB * N_NB;
  const asym_divs = (1 - sym_frac) * k_NB * N_NB;

  const dN_NB = sym_divs;
  const dV_NB = g_NB_base * N_NB - 0.2 * asym_divs * (Vavg_NB || 0);

  const dN_GMC = asym_divs - k_GMC * N_GMC;
  const dV_GMC =
    g_GMC * N_GMC +
    0.2 * asym_divs * (Vavg_NB || 0) -
    k_GMC * N_GMC * (Vavg_GMC || 0);

  const dN_Im = 2 * k_GMC * N_GMC - k_Neuron * N_Im;
  const dV_Im =
    k_GMC * N_GMC * (Vavg_GMC || 0) - k_Neuron * N_Im * (Vavg_Im || 0);

  const dN_Mat = k_Neuron * N_Im;
  const dV_Mat = k_Neuron * N_Im * (Vavg_Im || 0);

  // No recovery: Vth_eff is pulled down by symmetric divisions
  const dVth_eff = -delta_thresh * sym_divs;

  return [dN_NB, dV_NB, dN_GMC, dV_GMC, dN_Im, dV_Im, dN_Mat, dV_Mat, dVth_eff];
}

// M3
function rhsM3(t, y, p) {
  let [N_NB, V_NB, N_GMC, V_GMC, N_Im, V_Im, N_Mat, V_Mat] = y;
  const {
    g_NB_base,
    g_GMC,
    k_Neuron,
    sym_frac,
    V_thresh_base,
    V_thresh_GMC,
    k_max_NB,
    k_max_GMC,
    n,
    V_floor_NB,
    V_ref,
    alpha_growth,
    V_floor_GMC,
  } = p;

  const Vavg_NB = N_NB > 0 ? V_NB / N_NB : 0;
  const Vavg_GMC = N_GMC > 0 ? V_GMC / N_GMC : 0;
  const Vavg_Im = N_Im > 0 ? V_Im / N_Im : 0;

  const ratio = V_ref > 0 && Vavg_NB > 0 ? Vavg_NB / V_ref : 1.0;
  const g_NB_eff = g_NB_base * Math.pow(ratio, alpha_growth);

  const k_NB =
    N_NB > 0 && Vavg_NB >= V_floor_NB
      ? satpow(Vavg_NB, V_thresh_base, k_max_NB, n)
      : 0;
  const k_GMC =
    N_GMC > 0 && Vavg_GMC >= V_floor_GMC
      ? satpow(Vavg_GMC, V_thresh_GMC, k_max_GMC, n)
      : 0;

  const sym = sym_frac * k_NB * N_NB;
  const asym = (1 - sym_frac) * k_NB * N_NB;

  return [
    sym,
    g_NB_eff * N_NB - 0.2 * asym * (Vavg_NB || 0),
    asym - k_GMC * N_GMC,
    g_GMC * N_GMC +
      0.2 * asym * (Vavg_NB || 0) -
      k_GMC * N_GMC * (Vavg_GMC || 0),
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
    g_NB_base,
    g_GMC,
    k_Neuron,
    sym_frac,
    V_thresh_base,
    V_thresh_GMC,
    k_max_NB,
    k_max_GMC,
    n,
    V_floor_NB,
    V_ref,
    alpha_growth,
    V_floor_GMC,
    delta_thresh,
    V_thresh_min,
  } = p;

  const Vavg_NB = N_NB > 0 ? V_NB / N_NB : 0;
  const Vavg_GMC = N_GMC > 0 ? V_GMC / N_GMC : 0;
  const Vavg_Im = N_Im > 0 ? V_Im / N_Im : 0;

  const ratio = V_ref > 0 && Vavg_NB > 0 ? Vavg_NB / V_ref : 1.0;
  const g_NB_eff = g_NB_base * Math.pow(ratio, alpha_growth);

  let V_thresh_eff = V_thresh_base - delta_thresh * Math.max(S_sym, 0);
  if (V_thresh_min != null) V_thresh_eff = Math.max(V_thresh_eff, V_thresh_min);

  const k_NB =
    N_NB > 0 && Vavg_NB >= V_floor_NB
      ? satpow(Vavg_NB, V_thresh_eff, k_max_NB, n)
      : 0;
  const k_GMC =
    N_GMC > 0 && Vavg_GMC >= V_floor_GMC
      ? satpow(Vavg_GMC, V_thresh_GMC, k_max_GMC, n)
      : 0;

  const sym = sym_frac * k_NB * N_NB;
  const asym = (1 - sym_frac) * k_NB * N_NB;

  return [
    sym,
    g_NB_eff * N_NB - 0.2 * asym * (Vavg_NB || 0),
    asym - k_GMC * N_GMC,
    g_GMC * N_GMC +
      0.2 * asym * (Vavg_NB || 0) -
      k_GMC * N_GMC * (Vavg_GMC || 0),
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
  const Np = Math.max(N_NB, 0),
    Kp = Math.max(K, 1e-12),
    nn = Math.max(n_nb, 1e-12);
  const k_NB_eff =
    k_NB_max * (Math.pow(Kp, nn) / (Math.pow(Kp, nn) + Math.pow(Np, nn)));
  const symd = sym * k_NB_eff * N_NB,
    asymd = (1 - sym) * k_NB_eff * N_NB;
  return [
    symd,
    asymd - k_GMC * N_GMC,
    2 * k_GMC * N_GMC - k_Neuron * N_Im,
    k_Neuron * N_Im,
  ];
}

/* ---------------- Solve wrappers ---------------- */
function solveRow(rowIdx, geno) {
  const [, sym_frac, g_scale] = geno;
  const p = state[rowIdx];

  if (rowIdx === 1) {
    // Base model (counts only)
    const args = {
      k_NB: p.k_NB,
      k_GMC: p.k_GMC,
      k_Neuron: p.k_Neuron,
      sym_frac,
    };
    const y0 = [1, 0, 0, 0];
    return integrate(rhsMBase, y0, args, p.tEnd, p.dt || DEFAULTS.dt);
  }

  if (rowIdx === 2) {
    // Model 1 — static thresholds, constant NB growth
    const { V0, k_max_NB, g_NB_WT } = derive_kmax_gNB(p);
    const args = {
      g_NB: g_NB_WT * g_scale,
      g_GMC: p.g_GMC,
      k_Neuron: p.k_Neuron,
      sym_frac,
      V_thresh_NB: p.V_thresh_NB,
      V_thresh_GMC: p.V_thresh_GMC,
      k_max_NB,
      k_max_GMC: p.k_max_GMC,
      n: p.n,
      V_floor_NB: p.V_floor_NB,
      V_floor_GMC: p.V_floor_GMC,
    };
    const y0 = [1, V0, 0, 0, 0, 0, 0, 0];
    return integrate(rhsM1_volSat, y0, args, p.tEnd, p.dt || DEFAULTS.dt);
  }

  if (rowIdx === 3) {
    // Model 2 — sym divisions pull NB threshold; no recovery
    const { V0, k_max_NB, g_NB_WT } = derive_kmax_gNB(p);
    const args = {
      g_NB_base: g_NB_WT * g_scale,
      g_GMC: p.g_GMC,
      k_Neuron: p.k_Neuron,
      sym_frac,
      V_thresh_base: p.V_thresh_base, // NB baseline threshold
      V_thresh_GMC: p.V_thresh_GMC,
      k_max_NB,
      k_max_GMC: p.k_max_GMC,
      n: p.n,
      V_floor_NB: p.V_floor_NB,
      V_floor_GMC: p.V_floor_GMC,
      delta_thresh: p.delta_thresh,
      V_thresh_min: p.V_thresh_min,
    };
    const y0 = [1, V0, 0, 0, 0, 0, 0, 0, p.V_thresh_base]; // include Vth_eff
    return integrate(
      rhsM2_symPull_noRecovery,
      y0,
      args,
      p.tEnd,
      p.dt || DEFAULTS.dt
    );
  }

  if (rowIdx === 4) {
    // Model 3 — vol-scaled growth, static thresholds
    const { V0, k_max_NB, g_NB_WT } = derive_kmax_gNB(p);
    const args = {
      g_NB_base: g_NB_WT * g_scale,
      g_GMC: p.g_GMC,
      k_Neuron: p.k_Neuron,
      sym_frac,
      V_thresh_base: p.V_thresh_NB,
      V_thresh_GMC: p.V_thresh_GMC,
      k_max_NB,
      k_max_GMC: p.k_max_GMC,
      n: p.n,
      V_floor_NB: p.V_floor_NB,
      V_ref: V0,
      alpha_growth: p.alpha,
      V_floor_GMC: p.V_floor_GMC,
    };
    const y0 = [1, V0, 0, 0, 0, 0, 0, 0];
    return integrate(rhsM3, y0, args, p.tEnd, p.dt || DEFAULTS.dt);
  }

  if (rowIdx === 5) {
    // Model 4 — vol-scaled growth + sym-pulled threshold
    const { V0, k_max_NB, g_NB_WT } = derive_kmax_gNB(p);
    const args = {
      g_NB_base: g_NB_WT * g_scale,
      g_GMC: p.g_GMC,
      k_Neuron: p.k_Neuron,
      sym_frac,
      V_thresh_base: p.V_thresh_base,
      V_thresh_GMC: p.V_thresh_GMC,
      k_max_NB,
      k_max_GMC: p.k_max_GMC,
      n: p.n,
      V_floor_NB: p.V_floor_NB,
      V_ref: V0,
      alpha_growth: p.alpha,
      V_floor_GMC: p.V_floor_GMC,
      delta_thresh: p.delta_thresh,
      V_thresh_min: p.V_thresh_min,
    };
    const y0 = [1, V0, 0, 0, 0, 0, 0, 0, 0]; // includes S_sym
    return integrate(rhsM4, y0, args, p.tEnd, p.dt || DEFAULTS.dt);
  }

  if (rowIdx === 6) {
    // Model 5 — NB self-repression (counts only)
    const k_NB_max =
      p.k_star *
      ((Math.pow(p.K_self, p.beta) + 1) / Math.pow(p.K_self, p.beta));
    const args = {
      k_GMC: p.k_max_GMC,
      k_Neuron: p.k_Neuron,
      K: p.K_self,
      n_nb: p.beta,
      sym: sym_frac,
      k_NB_max,
    };
    const y0 = [1, 0, 0, 0];
    return integrate(rhsM5, y0, args, p.tEnd, p.dt || DEFAULTS.dt);
  }
}

/* ---------------- SVG plotting ---------------- */
function renderMathSafe(root = document.body, tries = 10) {
  if (window.renderMathInElement) {
    renderMathInElement(root, {
      // KaTeX auto-render options:
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
      ],
      throwOnError: false,
      // 👇 This prevents KaTeX from attaching MathML (and thus stops the warnings)
      output: "html",
    });
  } else if (tries > 0) {
    setTimeout(() => renderMathSafe(root, tries - 1), 50);
  }
}

function plotRow(r) {
  readModelInputs(r);
  for (let c = 1; c <= 3; c++) {
    const cell = qs(`.cell[data-row="${r}"][data-col="${c}"]`);
    const svg = qs("svg", cell);
    const gAxes = qs(".axes", svg),
      gSeries = qs(".series", svg),
      gLabels = qs(".endlabels", svg);
    gAxes.innerHTML = "";
    gSeries.innerHTML = "";
    gLabels.innerHTML = "";

    const sol = solveRow(r, GENOS[c - 1]);
    const t = sol.t;
    const NB = [],
      GMC = [],
      Im = [],
      Mat = [];
    for (let i = 0; i < t.length; i++) {
      const y = sol.y[i];
      if (r === 1 || r === 6) {
        // Base Model and Model 5: [N_NB, N_GMC, N_Im, N_Mat]
        NB.push(y[0]);
        GMC.push(y[1]);
        Im.push(y[2]);
        Mat.push(y[3]);
      } else {
        // Models 2-4: [N_NB, V_NB, N_GMC, V_GMC, N_Im, V_Im, N_Mat, V_Mat, ...]
        NB.push(y[0]);
        GMC.push(y[2]);
        Im.push(y[4]);
        Mat.push(y[6]);
      }
    }

    const W = 600,
      H = 360;
    const {
      left: padL,
      right: padR,
      top: padT,
      bottom: padB,
    } = PLOT_STYLE.pads;
    const x0 = padL,
      x1 = W - padR,
      y0 = padT,
      y1 = H - padB;
    const x = (v) => x0 + (v / state[r].tEnd) * (x1 - x0);
    const maxY = Math.max(1, ...NB, ...GMC, ...Im, ...Mat);
    const y = (v) => y1 - (v / maxY) * (y1 - y0);

    const axis = "#32405e",
      tick = "#9aa4b2",
      label = "#cbd5e1";
    const axisCol = "#32405e",
      tickCol = "#cbd5e1",
      labelCol = "#e5e7eb";

    gAxes.innerHTML = `
  <line x1="${x0}" y1="${y1}" x2="${x1}" y2="${y1}" stroke="${axisCol}" stroke-width="${
      PLOT_STYLE.axisStroke
    }"/>
  <line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1}" stroke="${axisCol}" stroke-width="${
      PLOT_STYLE.axisStroke
    }"/>

  ${[0, 12, 24, 36, 48]
    .map(
      (v) => `
    <line x1="${x(v)}" y1="${y1}" x2="${x(v)}" y2="${
        y1 + 6
      }" stroke="${axisCol}" stroke-width="${PLOT_STYLE.gridStroke}"/>
    <text x="${x(v)}" y="${y1 + 22}" fill="${tickCol}" font-size="${
        PLOT_STYLE.tickSize
      }" text-anchor="middle"
          font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial">${v}</text>
  `
    )
    .join("")}

  ${[0, Math.round(maxY * 0.33), Math.round(maxY * 0.66), Math.round(maxY)]
    .map(
      (v) => `
    <line x1="${x0 - 6}" y1="${y(v)}" x2="${x0}" y2="${y(
        v
      )}" stroke="${axisCol}" stroke-width="${PLOT_STYLE.gridStroke}"/>
    <text x="${x0 - 10}" y="${y(v) + 5}" fill="${tickCol}" font-size="${
        PLOT_STYLE.tickSize
      }" text-anchor="end"
          font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial">${v}</text>
  `
    )
    .join("")}

  <text x="${(x0 + x1) / 2}" y="${H - 16}" fill="${labelCol}" font-size="${
      PLOT_STYLE.axisLabelSize
    }" text-anchor="middle" font-weight="600"
        font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial">Time (hours)</text>
  <text x="18" y="${(y0 + y1) / 2}" fill="${labelCol}" font-size="${
      PLOT_STYLE.axisLabelSize
    }" text-anchor="middle" font-weight="600"
        font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial"
        transform="rotate(-90, 18, ${(y0 + y1) / 2})">Number of Cells</text>
`;

    const lw = PLOT_STYLE.lineWidth,
      pts = (arr) => arr.map((v, i) => `${x(t[i])},${y(v)}`).join(" ");
    gSeries.innerHTML = `
      <polyline fill="none" stroke="${
        COLORS.NB
      }"  stroke-width="${lw}" stroke-linejoin="round" points="${pts(NB)}"/>
      <polyline fill="none" stroke="${
        COLORS.GMC
      }" stroke-width="${lw}" stroke-linejoin="round" points="${pts(GMC)}"/>
      <polyline fill="none" stroke="${
        COLORS.Im
      }"  stroke-width="${lw}" stroke-linejoin="round" points="${pts(Im)}"/>
      <polyline fill="none" stroke="${
        COLORS.Mat
      }" stroke-width="${lw}" stroke-linejoin="round" points="${pts(Mat)}"/>
    `;

    const ends = [
      ["NB", Math.round(NB.at(-1))],
      ["GMC", Math.round(GMC.at(-1))],
      ["Im", Math.round(Im.at(-1))],
      ["Mat", Math.round(Mat.at(-1))],
    ].map(([name, val]) => ({
      name,
      val,
      y:
        y(
          name === "NB"
            ? NB.at(-1)
            : name === "GMC"
            ? GMC.at(-1)
            : name === "Im"
            ? Im.at(-1)
            : Mat.at(-1)
        ) - 2,
    }));

    ends.sort((a, b) => a.y - b.y);

    // Larger labels = more spacing to avoid overlap
    const boxH = PLOT_STYLE.endBox.height;
    const right = x1 - 8;
    for (let i = 1; i < ends.length; i++) {
      if (ends[i].y - ends[i - 1].y < boxH + 8) {
        ends[i].y = ends[i - 1].y + boxH + 8;
      }
    }

    gLabels.innerHTML = ends
      .map((e) => {
        const txt = String(e.val);
        const approxCharW = 9.5; // monospace-ish width
        const w = Math.max(44, 16 + approxCharW * txt.length);
        const xL = right - w,
          yT = e.y - boxH / 2,
          col = COLORS[e.name];
        return `
    <rect x="${xL}" y="${yT}" width="${w}" height="${boxH}" fill="white"
          stroke="${col}" stroke-width="${PLOT_STYLE.endBox.stroke}"
          rx="${PLOT_STYLE.endBox.rx}" ry="${PLOT_STYLE.endBox.rx}"/>
    <text x="${xL + w / 2}" y="${yT + boxH / 2 + 5}" fill="#0b1020"
          font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace"
          font-size="${PLOT_STYLE.endBox.textSize}" font-weight="700"
          text-anchor="middle">${txt}</text>
  `;
      })
      .join("");
  }
  renderChanges(r);

  // Trigger KaTeX rendering
  renderMathSafe(document.body);
}

/* ---------------- Build UI and wire events ---------------- */
function buildModels() {
  const grid = qs("#grid");
  grid.innerHTML = "";
  const intro = document.createElement("div");
  intro.className = "info full";
  intro.innerHTML = `
  <h2>Interactive Neuroblast Lineage Models</h2>
  <p>
    Adjust <strong>parameters</strong> and click <em>Run model</em> to see how lineage cell counts change.
    Inputs accept <strong>math expressions</strong> (e.g. set neuroblast division rate to one per
    1.5 hours with <code>1/1.5</code>; functions like <code>sqrt(2)</code> and constants like <code>pi</code> also work).
    Press <strong>Enter</strong> or click outside a field to evaluate—values are shown as numbers (e.g. <code>2/3</code> → <code>0.66666</code>).
  </p>
  <p> Use <em>Reset all rows to paper defaults</em> to restore parameters to values from our paper.  Use <em>Share current setup</em> to copy a link to this webpage with your adjusted parameter values.
  </p>
`;
  grid.appendChild(intro);

  const names = ["WT", "mud mutant", "nanobody"];

  for (let r = 1; r <= 6; r++) {
    // BEFORE info (full width)
    const before = document.createElement("div");
    before.className = "info full";
    before.innerHTML = `
      <h3>${MODEL_INFO[r].title} — overview</h3>
      ${MODEL_INFO[r].before}
    `;
    grid.appendChild(before);

    // Params card (full width)
    const params = document.createElement("div");
    params.className = "card full";
    params.dataset.row = r;
    params.id = `model-${r}`;
    params.className = "card full";
    params.dataset.row = r;
    const h = document.createElement("h3");
    h.textContent = `${MODEL_SCHEMAS[r].title} — parameters`;
    params.appendChild(h);

    const fields = document.createElement("div");
    fields.className = "fields";
    for (const [key, [label, help]] of Object.entries(
      MODEL_SCHEMAS[r].fields
    )) {
      const box = document.createElement("div");
      box.className = "field";
      const lab = document.createElement("label");
      lab.textContent = help ? `${label} — ${help}` : label;
      const inp = document.createElement("input");
      inp.type = "text";
      inp.inputMode = "decimal"; // mobile keyboard hint
      inp.autocomplete = "off";
      inp.step = "0.01";
      inp.value = String(state[r][key]);
      inp.dataset.model = r;
      inp.dataset.key = key;
      box.appendChild(lab);
      box.appendChild(inp);
      fields.appendChild(box);
    }
    params.appendChild(fields);

    const rowCtl = document.createElement("div");
    rowCtl.className = "inline";
    const left = document.createElement("div");
    left.className = "inline";
    left.style.gap = "8px";
    const run = document.createElement("button");
    run.textContent = "Run model";
    run.dataset.run = r;
    const share = document.createElement("button");
    share.textContent = "Share model";
    share.className = "secondary tiny";
    share.dataset.share = r;
    left.appendChild(run);
    left.appendChild(share);

    const right = document.createElement("div");
    right.className = "changes";
    right.id = `changes-${r}`;
    rowCtl.appendChild(left);
    rowCtl.appendChild(right);
    params.appendChild(rowCtl);
    grid.appendChild(params);

    // Legend/Key (full width)
    const legend = document.createElement("div");
    legend.className = "legend";
    legend.innerHTML = `
      <span class="chip" style="color:var(--nb)"><span class="dot"></span> Neuroblasts</span>
      <span class="chip" style="color:var(--gmc)"><span class="dot"></span> Ganglion Mother Cells</span>
      <span class="chip" style="color:var(--im)"><span class="dot"></span> Immature Neurons</span>
      <span class="chip" style="color:var(--mat)"><span class="dot"></span> Mature Neurons</span>
      <span class="badge">Genotypes: WT • mud • nanobody</span>
    `;
    grid.appendChild(legend);

    // Plots (3 columns)
    for (let c = 1; c <= 3; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = r;
      cell.dataset.col = c;
      const h3 = document.createElement("h3");
      const rowLabel = getRowShortTitle(r);
      h3.textContent = `${rowLabel} • ${names[c - 1]}`;
      cell.appendChild(h3);
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 600 360");
      svg.innerHTML = `<g class="axes"></g><g class="series"></g><g class="endlabels"></g>`;
      cell.appendChild(svg);
      grid.appendChild(cell);
    }
  }
}

function listChangedParams(r) {
  const diffs = [];
  for (const k of Object.keys(MODEL_SCHEMAS[r].fields)) {
    const cur = state[r][k],
      def = DEFAULTS[k];
    if (
      typeof cur === "number" &&
      typeof def === "number" &&
      Math.abs(cur - def) > 1e-12
    ) {
      diffs.push([k, cur]);
    }
  }
  return diffs;
}

function renderChanges(r) {
  const host = qs(`#changes-${r}`);
  if (!host) return;
  const diffs = listChangedParams(r);
  host.innerHTML = diffs.length
    ? diffs
        .map(([k, v]) => `<span class="chip-sm">${k}: ${String(v)}</span>`)
        .join("")
    : `<span class="tiny" style="color:var(--muted)">No changes vs defaults</span>`;
}

function summarizeRow(r) {
  const names = ["WT", "mud mutant", "nanobody"];
  const out = [];
  for (let c = 1; c <= 3; c++) {
    const sol = solveRow(r, GENOS[c - 1]);
    const t = sol.t;
    let NB, GMC, Im, Mat;
    if (r === 1 || r === 6) {
      // Base model and model 5: [N_NB, N_GMC, N_Im, N_Mat]
      const y = sol.y.at(-1);
      NB = y[0];
      GMC = y[1];
      Im = y[2];
      Mat = y[3];
    } else {
      // Models 2-4: volumes included
      const y = sol.y.at(-1);
      NB = y[0];
      GMC = y[2];
      Im = y[4];
      Mat = y[6];
    }
    out.push({ name: names[c - 1], tEnd: t.at(-1), NB, GMC, Im, Mat });
  }
  return out;
}

function shareAll() {
  const sp = new URLSearchParams();
  for (const r of [1, 2, 3, 4, 5, 6]) {
    readModelInputs(r);
    Object.entries(state[r]).forEach(([k, v]) =>
      sp.set(`m${r}_${k}`, String(v))
    );
  }
  const url = `${location.origin}${location.pathname}?${sp.toString()}`;
  navigator.clipboard?.writeText(url);
  alert("Shareable link copied to clipboard.");
}

function shareRow(r) {
  readModelInputs(r);
  const sp = new URLSearchParams();
  Object.entries(state[r]).forEach(([k, v]) => sp.set(`m${r}_${k}`, String(v)));
  sp.set("row", String(r));
  const url = `${location.origin}${location.pathname}?${sp.toString()}#model-${r}`; // 👈 add hash
  navigator.clipboard?.writeText(url);
  alert(`Link for ${r === 1 ? "Base Model" : `Model ${r-1}`} copied.`);
}

function scrollToHashIfAny() {
  if (!location.hash) return;
  const el = document.querySelector(location.hash);
  if (!el) return;
  const header = document.querySelector('header');
  const offset = (header?.offsetHeight || 0) + 8; // tiny extra padding
  const y = el.getBoundingClientRect().top + window.pageYOffset - offset;
  window.scrollTo({ top: y, behavior: 'smooth' });
}

window.addEventListener('hashchange', scrollToHashIfAny);

function loadFromURL() {
  const u = new URL(location.href);
  for (const [k, v] of u.searchParams.entries()) {
    const m = k.match(/^m([1-6])_(.+)$/);
    if (m) {
      const r = +m[1],
        key = m[2];
      const num = parseFloat(v);
      if (!Number.isNaN(num)) state[r][key] = num;
    }
  }
  for (const r of [1, 2, 3, 4, 5, 6]) writeModelInputs(r);
  for (const r of [1, 2, 3, 4, 5, 6]) plotRow(r);
  requestAnimationFrame(scrollToHashIfAny);
}

/* ---------------- Boot ---------------- */
buildModels();
loadFromURL();

/* Events */
qsa("button[data-run]").forEach((b) =>
  b.addEventListener("click", () => plotRow(+b.dataset.run))
);
qsa("button[data-share]").forEach((b) =>
  b.addEventListener("click", () => shareRow(+b.dataset.share))
);
qs("#resetAll").addEventListener("click", () => {
  for (const r of [1, 2, 3, 4, 5, 6]) {
    for (const k of Object.keys(MODEL_SCHEMAS[r].fields))
      state[r][k] = DEFAULTS[k];
    qsa(`input[data-model="${r}"]`).forEach((inp) => {
      const k = inp.dataset.key;
      inp.value = String(state[r][k]);
    });
    plotRow(r);
  }
});

document.addEventListener("input", (e) => {
  if (!(e.target instanceof HTMLInputElement)) return;
  if (!e.target.dataset.key) return;
  const v = parseExpr(e.target.value);
  e.target.classList.toggle("bad", !Number.isFinite(v));
});

document.addEventListener("keydown", (e) => {
  if (!(e.target instanceof HTMLInputElement)) return;
  if (!e.target.dataset.key) return;
  if (e.key === "Enter") {
    e.preventDefault();
    normalizeInput(e.target);
  }
});

document.addEventListener(
  "blur",
  (e) => {
    if (!(e.target instanceof HTMLInputElement)) return;
    if (!e.target.dataset.key) return;
    normalizeInput(e.target);
  },
  true
);

qs("#shareAll").addEventListener("click", shareAll);
