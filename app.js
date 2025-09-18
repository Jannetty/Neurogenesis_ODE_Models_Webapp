/* Neuroblast interactive grid*/

/* ---------------- Fixed genotypes ---------------- */
const GENOS = [
  ["WT",         0.0, 1.0],
  ["mud mutant", 0.15, 1.0],
  ["nanobody",   0.15, 0.8],
];
const COLORS = { NB:"#1b9e77", GMC:"#d95f02", Im:"#7570b3", Mat:"#e7298a" };
const qs  = (s,root=document)=>root.querySelector(s);
const qsa = (s,root=document)=>Array.from(root.querySelectorAll(s));

/* ---------------- Per-model defaults ----------------
   Each model card will show and own exactly these fields.              */
const DEFAULTS = {
  // Shared-ish numerics
  tEnd: 48, dt: 0.1,
  // Paper constants
  nb_vol: 285.0,
  n: 3,
  k_max_GMC: 1/8,
  V_thresh_NB: 1.25*285.0,            // 356.25
  V_thresh_GMC: (285.0*1.25*0.2)*2,   // 142.5
  V_floor_NB: 0.25*285.0,             // 71.25
  V_floor_GMC: 0.25*(285.0*1.25*0.2), // 17.8125
  k_Neuron: 1/48,                      // ~0.0208333333
  g_GMC: (285.0*1.25*0.2)/9,          // 7.9166667
  k_star: 1/1.5,                      // ~0.6666666667
  V_thresh_base: 1.25*285.0,          // 356.25
  delta_thresh: 0.03*(1.25*285.0),    // 10.6875
  V_thresh_min: 0.25*285.0,           // 71.25
  K_self: 2.0,
  alpha: 3,
  beta: 4,
};

// Model-specific parameter schema (key → [label, help/units])
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
    }
  },
  2: {
    title: "Model 2 — sym pulls threshold",
    fields: {
      tEnd: ["tEnd (h)", ""], dt: ["dt (h)", ""],
      nb_vol: ["nb_vol (V0)", ""], n:["n (–)",""],
      k_max_GMC:["k_max_GMC (h⁻¹)",""], V_thresh_NB:["V_thresh_NB",""],
      V_thresh_GMC:["V_thresh_GMC",""], V_floor_NB:["V_floor_NB",""],
      V_floor_GMC:["V_floor_GMC",""], k_Neuron:["k_Neuron (h⁻¹)",""],
      g_GMC:["g_GMC (vol·h⁻¹)",""], k_star:["k_star (h⁻¹)",""],
      V_thresh_base:["V_thresh_base",""], delta_thresh:["delta_thresh (vol)","pull/Σsym"],
      V_thresh_min:["V_thresh_min (vol)","lower bound"],
    }
  },
  3: {
    title: "Model 3 — vol-scaled growth",
    fields: {
      tEnd:["tEnd (h)",""], dt:["dt (h)",""],
      nb_vol:["nb_vol (V0)","V_ref = V0"], n:["n (–)",""],
      k_max_GMC:["k_max_GMC (h⁻¹)",""], V_thresh_NB:["V_thresh_NB",""],
      V_thresh_GMC:["V_thresh_GMC",""], V_floor_NB:["V_floor_NB",""],
      V_floor_GMC:["V_floor_GMC",""], k_Neuron:["k_Neuron (h⁻¹)",""],
      g_GMC:["g_GMC (vol·h⁻¹)",""], k_star:["k_star (h⁻¹)",""],
      alpha:["α (–)","growth exponent"],
    }
  },
  4: {
    title: "Model 4 — vol-scaled + sym-threshold",
    fields: {
      tEnd:["tEnd (h)",""], dt:["dt (h)",""],
      nb_vol:["nb_vol (V0)","V_ref = V0"], n:["n (–)",""],
      k_max_GMC:["k_max_GMC (h⁻¹)",""], V_thresh_GMC:["V_thresh_GMC",""],
      V_floor_NB:["V_floor_NB",""], V_floor_GMC:["V_floor_GMC",""],
      k_Neuron:["k_Neuron (h⁻¹)",""], g_GMC:["g_GMC (vol·h⁻¹)",""],
      k_star:["k_star (h⁻¹)",""], alpha:["α (–)","growth exponent"],
      V_thresh_base:["V_thresh_base",""], delta_thresh:["delta_thresh (vol)","pull/Σsym"],
      V_thresh_min:["V_thresh_min (vol)","lower bound"],
    }
  },
  5: {
    title: "Model 5 — NB self-repression",
    fields: {
      tEnd:["tEnd (h)",""], dt:["dt (h)",""],
      k_Neuron:["k_Neuron (h⁻¹)",""], k_max_GMC:["k_GMC (h⁻¹)","GMC division"],
      k_star:["k_star (h⁻¹)","base NB division"], K_self:["K_self (cells)","repression scale"],
      beta:["β (–)","division exponent"],
    }
  }
};

// Build per-model state from defaults
const state = { 1:{}, 2:{}, 3:{}, 4:{}, 5:{} };
for (const r of [1,2,3,4,5]) {
  for (const k of Object.keys(MODEL_SCHEMAS[r].fields)) state[r][k] = DEFAULTS[k];
}

// UI — build model cards
function buildControls(){
  const host = qs('#controls');
  host.innerHTML = '';
  for (const r of [1,2,3,4,5]) {
    const card = document.createElement('div'); card.className='card';
    const h = document.createElement('h3'); h.textContent = MODEL_SCHEMAS[r].title; card.appendChild(h);

    const fields = document.createElement('div'); fields.className='fields';
    for (const [key,[label,help]] of Object.entries(MODEL_SCHEMAS[r].fields)) {
      const box = document.createElement('div'); box.className='field';
      const lab = document.createElement('label'); lab.textContent = help? `${label} — ${help}` : label;
      const inp = document.createElement('input');
      inp.type='number'; inp.step='0.0001'; inp.value = String(state[r][key]); inp.dataset.model=r; inp.dataset.key=key;
      box.appendChild(lab); box.appendChild(inp); fields.appendChild(box);
    }
    card.appendChild(fields);

    const row = document.createElement('div'); row.className='inline';
    const run = document.createElement('button'); run.textContent='Run row'; run.dataset.run=r;
    const share = document.createElement('button'); share.textContent='Share row'; share.className='secondary tiny'; share.dataset.share=r;
    row.appendChild(run); row.appendChild(share); card.appendChild(row);
    host.appendChild(card);
  }
}

// read inputs → state[r]
function readModelInputs(r){
  qsa(`input[data-model="${r}"]`).forEach(inp=>{
    const k = inp.dataset.key; const v = parseFloat(inp.value);
    if (Number.isFinite(v)) state[r][k] = v;
  });
}
function writeModelInputs(r){
  qsa(`input[data-model="${r}"]`).forEach(inp=>{
    const k = inp.dataset.key;
    if (k in state[r]) inp.value = String(state[r][k]);
  });
}

// Derived per-model (k_max_NB & g_NB_WT) where needed
function derive_kmax_gNB(modelParams){
  const V0 = modelParams.nb_vol ?? DEFAULTS.nb_vol;
  const n = modelParams.n ?? DEFAULTS.n;
  const V_thresh_NB = (modelParams.V_thresh_NB ?? DEFAULTS.V_thresh_NB);
  const k_star = modelParams.k_star ?? DEFAULTS.k_star;
  const core0 = Math.min(1, Math.pow(V0 / V_thresh_NB, n));
  const k_max_NB = k_star / core0;
  const g_NB_WT = 0.2 * k_star * V0;
  return { V0, k_max_NB, g_NB_WT };
}

/* ---------------- Integrator (RK2) ---------------- */
function integrate(rhs, y0, p, tEnd, dt){
  const steps = Math.max(1, Math.floor(tEnd/dt));
  const d = y0.length;
  const T = new Array(steps+1), Y = new Array(steps+1);
  let y = y0.slice(), t = 0;
  T[0]=0; Y[0]=y.slice();
  for(let i=1;i<=steps;i++){
    const k1 = rhs(t,y,p);
    const yMid = new Array(d);
    for(let j=0;j<d;j++) yMid[j] = y[j] + 0.5*dt*k1[j];
    const k2 = rhs(t+0.5*dt, yMid, p);
    for(let j=0;j<d;j++) y[j] = y[j] + dt*k2[j];
    t += dt; T[i]=t; Y[i]=y.slice();
  }
  return {t:T, y:Y};
}

/* ---------------- RHS definitions (ported) ---------------- */
function satpow(Vbar, Vth, kmax, n){ if(Vbar<=0||Vth<=0) return 0; const r=Math.pow(Vbar/Vth,n); return r>=1?kmax:kmax*r; }

// M1
function rhsM1(t,y,p){
  let [N_NB,V_NB,N_GMC,V_GMC,N_Im,V_Im,N_Mat,V_Mat]=y;
  const {g_NB,g_GMC,k_Neuron,sym_frac,V_thresh_NB,V_thresh_GMC,k_max_NB,k_max_GMC,n,V_floor_NB,V_floor_GMC}=p;
  const Vavg_NB  = N_NB>0?V_NB/N_NB:0, Vavg_GMC=N_GMC>0?V_GMC/N_GMC:0, Vavg_Im=N_Im>0?V_Im/N_Im:0;
  const k_NB  = (N_NB>0 && Vavg_NB>=V_floor_NB)? satpow(Vavg_NB,V_thresh_NB,k_max_NB,n):0;
  const k_GMC = (N_GMC>0 && Vavg_GMC>=V_floor_GMC)?satpow(Vavg_GMC,V_thresh_GMC,k_max_GMC,n):0;
  const sym = p.sym_frac * k_NB * N_NB, asym = (1-p.sym_frac)*k_NB*N_NB;
  return [ sym,
    g_NB*N_NB - 0.2*asym*(Vavg_NB||0),
    asym - k_GMC*N_GMC,
    g_GMC*N_GMC + 0.2*asym*(Vavg_NB||0) - k_GMC*N_GMC*(Vavg_GMC||0),
    2*k_GMC*N_GMC - k_Neuron*N_Im,
    k_GMC*N_GMC*(Vavg_GMC||0) - k_Neuron*N_Im*(Vavg_Im||0),
    k_Neuron*N_Im,
    k_Neuron*N_Im*(Vavg_Im||0)
  ];
}

// M2
function rhsM2(t,y,p){
  let [N_NB,V_NB,N_GMC,V_GMC,N_Im,V_Im,N_Mat,V_Mat,Vth_eff]=y;
  const {g_NB_base,g_GMC,k_Neuron,sym_frac,V_thresh_base,V_thresh_GMC,k_max_NB,k_max_GMC,n,V_floor_NB,V_floor_GMC,delta_thresh,V_thresh_min}=p;
  const Vavg_NB=N_NB>0?V_NB/N_NB:0, Vavg_GMC=N_GMC>0?V_GMC/N_GMC:0, Vavg_Im=N_Im>0?V_Im/N_Im:0;
  const Vth_used = Math.max(Vth_eff, V_thresh_min);
  const k_NB  = (N_NB>0 && Vavg_NB>=V_floor_NB)? satpow(Vavg_NB,Vth_used,k_max_NB,n):0;
  const k_GMC = (N_GMC>0 && Vavg_GMC>=V_floor_GMC)?satpow(Vavg_GMC,V_thresh_GMC,k_max_GMC,n):0;
  const sym = sym_frac*k_NB*N_NB, asym=(1-sym_frac)*k_NB*N_NB;
  return [ sym,
    g_NB_base*N_NB - 0.2*asym*(Vavg_NB||0),
    asym - k_GMC*N_GMC,
    g_GMC*N_GMC + 0.2*asym*(Vavg_NB||0) - k_GMC*N_GMC*(Vavg_GMC||0),
    2*k_GMC*N_GMC - k_Neuron*N_Im,
    k_GMC*N_GMC*(Vavg_GMC||0) - k_Neuron*N_Im*(Vavg_Im||0),
    k_Neuron*N_Im,
    k_Neuron*N_Im*(Vavg_Im||0),
    - delta_thresh * sym
  ];
}

// M3
function rhsM3(t,y,p){
  let [N_NB,V_NB,N_GMC,V_GMC,N_Im,V_Im,N_Mat,V_Mat]=y;
  const {g_NB_base,g_GMC,k_Neuron,sym_frac,V_thresh_base,V_thresh_GMC,k_max_NB,k_max_GMC,n,V_floor_NB,V_ref,alpha_growth,V_floor_GMC}=p;
  const Vavg_NB=N_NB>0?V_NB/N_NB:0, Vavg_GMC=N_GMC>0?V_GMC/N_GMC:0, Vavg_Im=N_Im>0?V_Im/N_Im:0;
  const ratio=(V_ref>0&&Vavg_NB>0)?(Vavg_NB/V_ref):1.0;
  const g_NB_eff = g_NB_base * Math.pow(ratio, alpha_growth);
  const k_NB  = (N_NB>0 && Vavg_NB>=V_floor_NB)? satpow(Vavg_NB,V_thresh_base,k_max_NB,n):0;
  const k_GMC = (N_GMC>0 && Vavg_GMC>=V_floor_GMC)?satpow(Vavg_GMC,V_thresh_GMC,k_max_GMC,n):0;
  const sym = sym_frac*k_NB*N_NB, asym=(1-sym_frac)*k_NB*N_NB;
  return [ sym,
    g_NB_eff*N_NB - 0.2*asym*(Vavg_NB||0),
    asym - k_GMC*N_GMC,
    g_GMC*N_GMC + 0.2*asym*(Vavg_NB||0) - k_GMC*N_GMC*(Vavg_GMC||0),
    2*k_GMC*N_GMC - k_Neuron*N_Im,
    k_GMC*N_GMC*(Vavg_GMC||0) - k_Neuron*N_Im*(Vavg_Im||0),
    k_Neuron*N_Im,
    k_Neuron*N_Im*(Vavg_Im||0)
  ];
}

// M4
function rhsM4(t,y,p){
  let [N_NB,V_NB,N_GMC,V_GMC,N_Im,V_Im,N_Mat,V_Mat,S_sym]=y;
  const {g_NB_base,g_GMC,k_Neuron,sym_frac,V_thresh_base,V_thresh_GMC,k_max_NB,k_max_GMC,n,V_floor_NB,V_ref,alpha_growth,V_floor_GMC,delta_thresh,V_thresh_min}=p;
  const Vavg_NB=N_NB>0?V_NB/N_NB:0, Vavg_GMC=N_GMC>0?V_GMC/N_GMC:0, Vavg_Im=N_Im>0?V_Im/N_Im:0;
  const ratio=(V_ref>0&&Vavg_NB>0)?(Vavg_NB/V_ref):1.0;
  const g_NB_eff = g_NB_base * Math.pow(ratio, alpha_growth);
  let V_thresh_eff = V_thresh_base - delta_thresh * Math.max(S_sym, 0);
  if (V_thresh_min!=null) V_thresh_eff = Math.max(V_thresh_eff, V_thresh_min);
  const k_NB  = (N_NB>0 && Vavg_NB>=V_floor_NB)? satpow(Vavg_NB,V_thresh_eff,k_max_NB,n):0;
  const k_GMC = (N_GMC>0 && Vavg_GMC>=V_floor_GMC)?satpow(Vavg_GMC,V_thresh_GMC,k_max_GMC,n):0;
  const sym = sym_frac*k_NB*N_NB, asym=(1-sym_frac)*k_NB*N_NB;
  return [ sym,
    g_NB_eff*N_NB - 0.2*asym*(Vavg_NB||0),
    asym - k_GMC*N_GMC,
    g_GMC*N_GMC + 0.2*asym*(Vavg_NB||0) - k_GMC*N_GMC*(Vavg_GMC||0),
    2*k_GMC*N_GMC - k_Neuron*N_Im,
    k_GMC*N_GMC*(Vavg_GMC||0) - k_Neuron*N_Im*(Vavg_Im||0),
    k_Neuron*N_Im,
    k_Neuron*N_Im*(Vavg_Im||0),
    sym
  ];
}

// M5
function rhsM5(t,y,p){
  let [N_NB,N_GMC,N_Im,N_Mat]=y;
  const {k_GMC,k_Neuron,K,n_nb,sym,k_NB_max}=p;
  const Np=Math.max(N_NB,0), Kp=Math.max(K,1e-12), nn=Math.max(n_nb,1e-12);
  const k_NB_eff = k_NB_max * (Math.pow(Kp,nn)/(Math.pow(Kp,nn)+Math.pow(Np,nn)));
  const symd=sym*k_NB_eff*N_NB, asymd=(1-sym)*k_NB_eff*N_NB;
  return [ symd, asymd - k_GMC*N_GMC, 2*k_GMC*N_GMC - k_Neuron*N_Im, k_Neuron*N_Im ];
}

/* ---------------- Solve wrappers (each uses its own model params) ---------------- */
function solveRow(rowIdx, geno){
  const [gname, sym_frac, g_scale] = geno;
  const p = state[rowIdx]; // per-model params
  if (rowIdx===1){
    const {V0,k_max_NB,g_NB_WT} = derive_kmax_gNB(p);
    const args = {
      g_NB: g_NB_WT * g_scale, g_GMC: p.g_GMC, k_Neuron: p.k_Neuron, sym_frac,
      V_thresh_NB: p.V_thresh_NB, V_thresh_GMC: p.V_thresh_GMC,
      k_max_NB, k_max_GMC: p.k_max_GMC, n: p.n, V_floor_NB: p.V_floor_NB, V_floor_GMC: p.V_floor_GMC
    };
    const y0=[1,V0, 0,0, 0,0, 0,0];
    return integrate(rhsM1,y0,args,p.tEnd,p.dt);
  }
  if (rowIdx===2){
    const {V0,k_max_NB,g_NB_WT} = derive_kmax_gNB(p);
    const args = {
      g_NB_base: g_NB_WT * g_scale, g_GMC:p.g_GMC, k_Neuron:p.k_Neuron, sym_frac,
      V_thresh_base:p.V_thresh_base, V_thresh_GMC:p.V_thresh_GMC,
      k_max_NB, k_max_GMC:p.k_max_GMC, n:p.n,
      V_floor_NB:p.V_floor_NB, V_floor_GMC:p.V_floor_GMC,
      delta_thresh:p.delta_thresh, V_thresh_min:p.V_thresh_min
    };
    const y0=[1,V0, 0,0, 0,0, 0,0, p.V_thresh_base];
    return integrate(rhsM2,y0,args,p.tEnd,p.dt);
  }
  if (rowIdx===3){
    const {V0,k_max_NB,g_NB_WT} = derive_kmax_gNB(p);
    const args = {
      g_NB_base:g_NB_WT*g_scale, g_GMC:p.g_GMC, k_Neuron:p.k_Neuron, sym_frac,
      V_thresh_base:p.V_thresh_NB, V_thresh_GMC:p.V_thresh_GMC,
      k_max_NB, k_max_GMC:p.k_max_GMC, n:p.n,
      V_floor_NB:p.V_floor_NB, V_ref:V0, alpha_growth:p.alpha, V_floor_GMC:p.V_floor_GMC
    };
    const y0=[1,V0, 0,0, 0,0, 0,0];
    return integrate(rhsM3,y0,args,p.tEnd,p.dt);
  }
  if (rowIdx===4){
    const {V0,k_max_NB,g_NB_WT} = derive_kmax_gNB(p);
    const args = {
      g_NB_base:g_NB_WT*g_scale, g_GMC:p.g_GMC, k_Neuron:p.k_Neuron, sym_frac,
      V_thresh_base:p.V_thresh_base, V_thresh_GMC:p.V_thresh_GMC,
      k_max_NB, k_max_GMC:p.k_max_GMC, n:p.n,
      V_floor_NB:p.V_floor_NB, V_ref:V0, alpha_growth:p.alpha, V_floor_GMC:p.V_floor_GMC,
      delta_thresh:p.delta_thresh, V_thresh_min:p.V_thresh_min
    };
    const y0=[1,V0, 0,0, 0,0, 0,0, 0];
    return integrate(rhsM4,y0,args,p.tEnd,p.dt);
  }
  if (rowIdx===5){
    const k_NB_max = p.k_star * ((Math.pow(p.K_self, p.beta) + 1) / Math.pow(p.K_self, p.beta));
    const args = { k_GMC:p.k_max_GMC, k_Neuron:p.k_Neuron, K:p.K_self, n_nb:p.beta, sym:sym_frac, k_NB_max };
    const y0=[1,0,0,0];
    return integrate(rhsM5,y0,args,p.tEnd,p.dt);
  }
}

/* ---------------- SVG plotting ---------------- */
function ensureGrid(){
  const grid = qs('#grid'); grid.innerHTML = '';
  const names = ["Model 1","Model 2","Model 3","Model 4","Model 5"];
  for (let r=1;r<=5;r++){
    for (let c=1;c<=3;c++){
      const cell = document.createElement('div'); cell.className='cell';
      cell.dataset.row=r; cell.dataset.col=c;
      const h = document.createElement('h3');
      h.textContent = `${names[r-1]} • ${GENOS[c-1][0]}`;
      cell.appendChild(h);
      const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
      svg.setAttribute("viewBox","0 0 600 360");
      svg.innerHTML = `<g class="axes"></g><g class="series"></g><g class="endlabels"></g>`;
      cell.appendChild(svg);
      grid.appendChild(cell);
    }
  }
}

function plotRow(r){
  // sync inputs -> state
  readModelInputs(r);
  for (let c=1;c<=3;c++){
    const cell = qs(`.cell[data-row="${r}"][data-col="${c}"]`);
    const svg = qs('svg', cell);
    const gAxes=qs('.axes',svg), gSeries=qs('.series',svg), gLabels=qs('.endlabels',svg);
    gAxes.innerHTML=''; gSeries.innerHTML=''; gLabels.innerHTML='';

    const sol = solveRow(r, GENOS[c-1]);
    const t = sol.t;
    const NB=[],GMC=[],Im=[],Mat=[];
    for (let i=0;i<t.length;i++){
      const y = sol.y[i];
      if (r===5){ NB.push(y[0]); GMC.push(y[1]); Im.push(y[2]); Mat.push(y[3]); }
      else      { NB.push(y[0]); GMC.push(y[2]); Im.push(y[4]); Mat.push(y[6]); }
    }

    // layout + scales
    const W=600,H=360, padL=48,padR=24,padT=18,padB=32;
    const x0=padL, x1=W-padR, y0=padT, y1=H-padB;
    const x = v => x0 + (v/state[r].tEnd)*(x1-x0);
    const maxY = Math.max(1, ...NB, ...GMC, ...Im, ...Mat);
    const y = v => y1 - (v/maxY)*(y1-y0);

    // axes
    const axis="#32405e", tick="#9aa4b2";
    gAxes.innerHTML = `
      <line x1="${x0}" y1="${y1}" x2="${x1}" y2="${y1}" stroke="${axis}" stroke-width="1"/>
      <line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1}" stroke="${axis}" stroke-width="1"/>
      ${[0,12,24,36,48].map(v=>`
        <line x1="${x(v)}" y1="${y1}" x2="${x(v)}" y2="${y1+5}" stroke="${axis}"/>
        <text x="${x(v)}" y="${y1+18}" fill="${tick}" font-size="11" text-anchor="middle">${v}</text>`).join('')}
      ${[0, Math.round(maxY*0.33), Math.round(maxY*0.66), Math.round(maxY)].map(v=>`
        <line x1="${x0-5}" y1="${y(v)}" x2="${x0}" y2="${y(v)}" stroke="${axis}"/>
        <text x="${x0-8}" y="${y(v)+4}" fill="${tick}" font-size="11" text-anchor="end">${v}</text>`).join('')}
    `;

    // series
    const lw=3.2;
    const pts = arr => arr.map((v,i)=>`${x(t[i])},${y(v)}`).join(' ');
    gSeries.innerHTML = `
      <polyline fill="none" stroke="${COLORS.NB}"  stroke-width="${lw}" stroke-linejoin="round" points="${pts(NB)}"/>
      <polyline fill="none" stroke="${COLORS.GMC}" stroke-width="${lw}" stroke-linejoin="round" points="${pts(GMC)}"/>
      <polyline fill="none" stroke="${COLORS.Im}"  stroke-width="${lw}" stroke-linejoin="round" points="${pts(Im)}"/>
      <polyline fill="none" stroke="${COLORS.Mat}" stroke-width="${lw}" stroke-linejoin="round" points="${pts(Mat)}"/>
    `;

    // end labels (clear color coding)
    const ends = [
      ["NB",  Math.round(NB[NB.length-1])],
      ["GMC", Math.round(GMC[GMC.length-1])],
      ["Im",  Math.round(Im[Im.length-1])],
      ["Mat", Math.round(Mat[Mat.length-1])]
    ].map(([name,val])=>({name,val, y:y(
      name==="NB"?NB[NB.length-1]: name==="GMC"?GMC[GMC.length-1]: name==="Im"?Im[Im.length-1]:Mat[Mat.length-1]
    ) - 2}));
    ends.sort((a,b)=>a.y-b.y);
    const boxH=26, boxW2=36, right=x1-6;
    for (let i=1;i<ends.length;i++){
      if (ends[i].y - ends[i-1].y < boxH+6) ends[i].y = ends[i-1].y + boxH+6;
    }
    gLabels.innerHTML = ends.map(e=>{
      const txt = String(e.val);
      const w = (txt.length<=2)? boxW2 : (12 + 10*txt.length);
      const xL = right - w, yT = e.y - boxH/2;
      const col = COLORS[e.name];
      return `
        <rect x="${xL}" y="${yT}" width="${w}" height="${boxH}" fill="white"
              stroke="${col}" stroke-width="2.4" rx="7" ry="7"/>
        <text x="${xL+w/2}" y="${yT+boxH/2+4}" fill="#0b1020"
              font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace"
              font-size="13" text-anchor="middle">${txt}</text>`;
    }).join('');
  }
}

/* ---------------- Build UI, grid, and wire events ---------------- */
function createGrid(){ // build empty grid
  const grid = qs('#grid'); grid.innerHTML='';
  const names=["Model 1","Model 2","Model 3","Model 4","Model 5"];
  for (let r=1;r<=5;r++){
    for (let c=1;c<=3;c++){
      const cell=document.createElement('div'); cell.className='cell'; cell.dataset.row=r; cell.dataset.col=c;
      const h=document.createElement('h3'); h.textContent=`${names[r-1]} • ${GENOS[c-1][0]}`; cell.appendChild(h);
      const svg=document.createElementNS("http://www.w3.org/2000/svg","svg"); svg.setAttribute("viewBox","0 0 600 360");
      svg.innerHTML=`<g class="axes"></g><g class="series"></g><g class="endlabels"></g>`;
      cell.appendChild(svg); grid.appendChild(cell);
    }
  }
}

function shareAll(){
  const sp = new URLSearchParams();
  for (const r of [1,2,3,4,5]) {
    readModelInputs(r);
    Object.entries(state[r]).forEach(([k,v])=> sp.set(`m${r}_${k}`, String(v)));
  }
  const url = `${location.origin}${location.pathname}?${sp.toString()}`;
  navigator.clipboard?.writeText(url);
  alert("Shareable link copied to clipboard.");
}
function shareRow(r){
  readModelInputs(r);
  const sp = new URLSearchParams();
  Object.entries(state[r]).forEach(([k,v])=> sp.set(`m${r}_${k}`, String(v)));
  sp.set('row', String(r));
  const url = `${location.origin}${location.pathname}?${sp.toString()}`;
  navigator.clipboard?.writeText(url);
  alert(`Link for Model ${r} copied.`);
}
function loadFromURL(){
  const u = new URL(location.href);
  for (const [k,v] of u.searchParams.entries()){
    const m = k.match(/^m([1-5])_(.+)$/);
    if (m){ const r=+m[1], key=m[2]; const num=parseFloat(v); if (!Number.isNaN(num)) state[r][key]=num; }
  }
  // write back into inputs
  for (const r of [1,2,3,4,5]) writeModelInputs(r);
  // auto-run all rows once
  for (const r of [1,2,3,4,5]) plotRow(r);
}

/* ---------------- Boot ---------------- */
buildControls();
createGrid();
for (const r of [1,2,3,4,5]) plotRow(r);

qs('#resetAll').addEventListener('click', ()=>{
  for (const r of [1,2,3,4,5]) {
    for (const k of Object.keys(MODEL_SCHEMAS[r].fields)) state[r][k] = DEFAULTS[k];
    writeModelInputs(r);
    plotRow(r);
  }
});
qsa('button[data-run]').forEach(b=> b.addEventListener('click', ()=> plotRow(+b.dataset.run)));
qsa('button[data-share]').forEach(b=> b.addEventListener('click', ()=> shareRow(+b.dataset.share)));
qs('#shareAll').addEventListener('click', shareAll);

loadFromURL();