/* Neuroblast interactive grid — with global params + per-row controls + share links */

/* ---------- Default (paper) params ---------- */
const DEFAULTS = {
  // time
  tEnd: 48, dt: 0.1,
  // core volumes / exponents
  nb_vol: 285.0, n: 3,
  // GMC / thresholds / floors
  k_max_GMC: 1/8,
  V_thresh_NB: 1.25*285.0,              // 356.25
  V_thresh_GMC: (285.0*1.25*0.2)*2,     // 142.5
  V_floor_NB: 0.25*285.0,               // 71.25
  V_floor_GMC: 0.25*(285.0*1.25*0.2),   // 17.8125
  // rates
  k_Neuron: 1/48,                       // ~0.0208333
  g_GMC: (285.0*1.25*0.2)/9,            // 7.9166667
  // WT calibration
  k_star: 1/1.5,
  // Model 2/4
  V_thresh_base: 1.25*285.0,            // default same as V_thresh_NB
  delta_thresh: 0.03*(1.25*285.0),      // 10.6875
  V_thresh_min: 0.25*285.0,             // 71.25
  // Model 5
  K_self: 2.0,
  beta_default: 4,
  // Model 3/4 row params
  m3_alpha: 3,
  m4_alpha: 3,
  m5_beta: 4
};

// genotypes (fixed; you can expose if you ever want)
const GENOS = [
  ["WT", 0.0, 1.0],
  ["mud mutant", 0.15, 1.0],
  ["nanobody", 0.15, 0.8]
];

const COLORS = { NB:"#1b9e77", GMC:"#d95f02", Im:"#7570b3", Mat:"#e7298a" };

/* ---------- DOM helpers ---------- */
const qs  = (s,root=document)=>root.querySelector(s);
const qsa = (s,root=document)=>Array.from(root.querySelectorAll(s));

/* ---------- State ---------- */
const state = { ...DEFAULTS };

function readInputsIntoState(){
  qsa('[data-key]').forEach(inp=>{
    const k = inp.dataset.key;
    const v = parseFloat(inp.value);
    state[k] = Number.isFinite(v) ? v : state[k];
  });
}

function writeStateToInputs(){
  qsa('[data-key]').forEach(inp=>{
    const k = inp.dataset.key;
    if (k in state) inp.value = String(state[k]);
  });
}

/* ---------- Derived from globals ---------- */
function derived(){
  const V0 = state.nb_vol;
  const core0 = Math.min(1, Math.pow(V0 / state.V_thresh_NB, state.n));
  const k_max_NB = state.k_star / core0;
  const g_NB_WT  = 0.2 * state.k_star * V0;
  return { V0, k_max_NB, g_NB_WT };
}

/* ---------- Integrator (RK2) ---------- */
function integrate(rhs, y0, p){
  const tEnd = state.tEnd, dt = state.dt;
  const steps = Math.floor(tEnd/dt);
  const d = y0.length;
  const Y = new Array(steps+1); const T = new Array(steps+1);
  let y = y0.slice(), t = 0;
  Y[0]=y.slice(); T[0]=0;
  for(let i=1;i<=steps;i++){
    const k1 = rhs(t,y,p);
    const yMid = new Array(d);
    for(let j=0;j<d;j++) yMid[j] = y[j] + 0.5*dt*k1[j];
    const k2 = rhs(t+0.5*dt, yMid, p);
    for(let j=0;j<d;j++) y[j] = y[j] + dt*k2[j];
    t += dt; Y[i]=y.slice(); T[i]=t;
  }
  return {t:T, y:Y};
}

/* ---------- Model RHS (ported) ---------- */
function satpow(Vbar, Vth, kmax, n){
  if (Vbar<=0 || Vth<=0) return 0;
  const r = Math.pow(Vbar/Vth, n);
  return (r>=1)? kmax : kmax*r;
}

// M1
function rhsM1(t,y,p){
  let [N_NB,V_NB,N_GMC,V_GMC,N_Im,V_Im,N_Mat,V_Mat] = y;
  const {g_NB,g_GMC,k_Neuron,sym_frac,V_thresh_NB,V_thresh_GMC,k_max_NB,k_max_GMC,n,V_floor_NB,V_floor_GMC} = p;
  const Vavg_NB  = N_NB>0? V_NB/N_NB : 0;
  const Vavg_GMC = N_GMC>0? V_GMC/N_GMC : 0;
  const Vavg_Im  = N_Im>0 ? V_Im/N_Im  : 0;

  const k_NB  = (N_NB>0 && Vavg_NB>=V_floor_NB)?  satpow(Vavg_NB,V_thresh_NB,k_max_NB,n) : 0;
  const k_GMC = (N_GMC>0 && Vavg_GMC>=V_floor_GMC)?satpow(Vavg_GMC,V_thresh_GMC,k_max_GMC,n) : 0;

  const sym = p.sym_frac * k_NB * N_NB;
  const asym= (1-p.sym_frac) * k_NB * N_NB;

  return [
    sym,
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
  let [N_NB,V_NB,N_GMC,V_GMC,N_Im,V_Im,N_Mat,V_Mat,Vth_eff] = y;
  const {g_NB_base,g_GMC,k_Neuron,sym_frac,V_thresh_base,V_thresh_GMC,k_max_NB,k_max_GMC,n,V_floor_NB,V_floor_GMC,delta_thresh,V_thresh_min} = p;
  const Vavg_NB  = N_NB>0? V_NB/N_NB : 0;
  const Vavg_GMC = N_GMC>0? V_GMC/N_GMC : 0;
  const Vavg_Im  = N_Im>0 ? V_Im/N_Im  : 0;

  const Vth_used = Math.max(Vth_eff, V_thresh_min);
  const k_NB  = (N_NB>0 && Vavg_NB>=V_floor_NB)?  satpow(Vavg_NB,Vth_used,k_max_NB,n) : 0;
  const k_GMC = (N_GMC>0 && Vavg_GMC>=V_floor_GMC)?satpow(Vavg_GMC,V_thresh_GMC,k_max_GMC,n) : 0;

  const sym = sym_frac * k_NB * N_NB;
  const asym= (1-sym_frac) * k_NB * N_NB;

  return [
    sym,
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
  let [N_NB,V_NB,N_GMC,V_GMC,N_Im,V_Im,N_Mat,V_Mat] = y;
  const {g_NB_base,g_GMC,k_Neuron,sym_frac,V_thresh_base,V_thresh_GMC,k_max_NB,k_max_GMC,n,V_floor_NB,V_ref,alpha_growth,V_floor_GMC} = p;
  const Vavg_NB  = N_NB>0? V_NB/N_NB : 0;
  const Vavg_GMC = N_GMC>0? V_GMC/N_GMC : 0;
  const Vavg_Im  = N_Im>0 ? V_Im/N_Im  : 0;

  const ratio    = (V_ref>0 && Vavg_NB>0)? (Vavg_NB/V_ref) : 1.0;
  const g_NB_eff = g_NB_base * Math.pow(ratio, alpha_growth);

  const k_NB  = (N_NB>0 && Vavg_NB>=V_floor_NB)?  satpow(Vavg_NB,V_thresh_base,k_max_NB,n) : 0;
  const k_GMC = (N_GMC>0 && Vavg_GMC>=V_floor_GMC)?satpow(Vavg_GMC,V_thresh_GMC,k_max_GMC,n) : 0;

  const sym = sym_frac * k_NB * N_NB;
  const asym= (1-sym_frac) * k_NB * N_NB;

  return [
    sym,
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
  let [N_NB,V_NB,N_GMC,V_GMC,N_Im,V_Im,N_Mat,V_Mat,S_sym] = y;
  const {g_NB_base,g_GMC,k_Neuron,sym_frac,V_thresh_base,V_thresh_GMC,k_max_NB,k_max_GMC,n,V_floor_NB,V_ref,alpha_growth,V_floor_GMC,delta_thresh,V_thresh_min} = p;

  const Vavg_NB  = N_NB>0? V_NB/N_NB : 0;
  const Vavg_GMC = N_GMC>0? V_GMC/N_GMC : 0;
  const Vavg_Im  = N_Im>0 ? V_Im/N_Im  : 0;

  const ratio    = (V_ref>0 && Vavg_NB>0)? (Vavg_NB/V_ref) : 1.0;
  const g_NB_eff = g_NB_base * Math.pow(ratio, alpha_growth);

  let V_thresh_eff = V_thresh_base - delta_thresh * Math.max(S_sym, 0);
  if (V_thresh_min != null) V_thresh_eff = Math.max(V_thresh_eff, V_thresh_min);

  const k_NB  = (N_NB>0 && Vavg_NB>=V_floor_NB)?  satpow(Vavg_NB,V_thresh_eff,k_max_NB,n) : 0;
  const k_GMC = (N_GMC>0 && Vavg_GMC>=V_floor_GMC)?satpow(Vavg_GMC,V_thresh_GMC,k_max_GMC,n) : 0;

  const sym = sym_frac * k_NB * N_NB;
  const asym= (1-sym_frac) * k_NB * N_NB;

  return [
    sym,
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
  let [N_NB,N_GMC,N_Im,N_Mat] = y;
  const {k_GMC,k_Neuron,K,n_nb,sym,k_NB_max} = p;
  const Np = Math.max(N_NB,0);
  const Kp = Math.max(K,1e-12);
  const nn = Math.max(n_nb,1e-12);
  const k_NB_eff = k_NB_max * (Math.pow(Kp,nn)/(Math.pow(Kp,nn)+Math.pow(Np,nn)));
  const symd  = sym * k_NB_eff * N_NB;
  const asymd = (1 - sym) * k_NB_eff * N_NB;
  return [
    symd,
    asymd - k_GMC*N_GMC,
    2*k_GMC*N_GMC - k_Neuron*N_Im,
    k_Neuron*N_Im
  ];
}

/* ---------- Solve wrappers (use GLOBALS) ---------- */
function solveModel1({sym_frac, g_scale}){
  const {V0,k_max_NB,g_NB_WT} = derived();
  const p = {
    g_NB: g_NB_WT * g_scale,
    g_GMC: state.g_GMC, k_Neuron: state.k_Neuron, sym_frac,
    V_thresh_NB: state.V_thresh_NB, V_thresh_GMC: state.V_thresh_GMC,
    k_max_NB, k_max_GMC: state.k_max_GMC, n: state.n,
    V_floor_NB: state.V_floor_NB, V_floor_GMC: state.V_floor_GMC
  };
  const y0 = [1,V0, 0,0, 0,0, 0,0];
  return integrate(rhsM1, y0, p);
}

function solveModel2({sym_frac, g_scale}){
  const {V0,k_max_NB,g_NB_WT} = derived();
  const p = {
    g_NB_base: g_NB_WT * g_scale,
    g_GMC: state.g_GMC, k_Neuron: state.k_Neuron, sym_frac,
    V_thresh_base: state.V_thresh_base, V_thresh_GMC: state.V_thresh_GMC,
    k_max_NB, k_max_GMC: state.k_max_GMC, n: state.n,
    V_floor_NB: state.V_floor_NB, V_floor_GMC: state.V_floor_GMC,
    delta_thresh: state.delta_thresh, V_thresh_min: state.V_thresh_min
  };
  const y0 = [1,V0, 0,0, 0,0, 0,0, state.V_thresh_base];
  return integrate(rhsM2, y0, p);
}

function solveModel3({alpha, sym_frac, g_scale}){
  const {V0,k_max_NB,g_NB_WT} = derived();
  const p = {
    g_NB_base: g_NB_WT * g_scale,
    g_GMC: state.g_GMC, k_Neuron: state.k_Neuron, sym_frac,
    V_thresh_base: state.V_thresh_NB, V_thresh_GMC: state.V_thresh_GMC,
    k_max_NB, k_max_GMC: state.k_max_GMC, n: state.n,
    V_floor_NB: state.V_floor_NB, V_ref: V0, alpha_growth: alpha, V_floor_GMC: state.V_floor_GMC
  };
  const y0 = [1,V0, 0,0, 0,0, 0,0];
  return integrate(rhsM3, y0, p);
}

function solveModel4({alpha, sym_frac, g_scale}){
  const {V0,k_max_NB,g_NB_WT} = derived();
  const p = {
    g_NB_base: g_NB_WT * g_scale,
    g_GMC: state.g_GMC, k_Neuron: state.k_Neuron, sym_frac,
    V_thresh_base: state.V_thresh_base, V_thresh_GMC: state.V_thresh_GMC,
    k_max_NB, k_max_GMC: state.k_max_GMC, n: state.n,
    V_floor_NB: state.V_floor_NB, V_ref: V0, alpha_growth: alpha, V_floor_GMC: state.V_floor_GMC,
    delta_thresh: state.delta_thresh, V_thresh_min: state.V_thresh_min
  };
  const y0 = [1,V0, 0,0, 0,0, 0,0, 0]; // S_sym=0
  return integrate(rhsM4, y0, p);
}

function solveModel5({beta, sym_frac}){
  const {k_max_NB} = derived(); // not used; keep pattern
  const k_NB_max = state.k_star * ((Math.pow(state.K_self, beta) + 1) / Math.pow(state.K_self, beta));
  const p = {
    k_GMC: state.k_max_GMC, k_Neuron: state.k_Neuron, K: state.K_self, n_nb: beta, sym: sym_frac,
    k_NB_max
  };
  const y0 = [1,0,0,0];
  return integrate(rhsM5, y0, p);
}

/* ---------- SVG plotting ---------- */
function createGrid(){
  const grid = qs("#grid"); grid.innerHTML = "";
  const rowNames = ["Model 1","Model 2","Model 3","Model 4","Model 5"];
  for(let r=0;r<5;r++){
    for(let c=0;c<3;c++){
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = r+1; cell.dataset.col = c+1;
      const h = document.createElement("h3");
      h.textContent = rowNames[r] + (c===0 ? " • "+GENOS[c][0] : "");
      cell.appendChild(h);
      const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
      svg.setAttribute("viewBox","0 0 600 360");
      svg.innerHTML = `<rect x="0" y="0" width="600" height="360" fill="transparent"/>
        <g class="axes"></g><g class="series"></g><g class="endlabels"></g>`;
      cell.appendChild(svg);
      grid.appendChild(cell);
    }
  }
}

function plotRow(rowIdx){
  readInputsIntoState();
  const alpha3 = state.m3_alpha, alpha4 = state.m4_alpha, beta5 = state.m5_beta;
  for(let c=0;c<3;c++){
    const cell = qs(`.cell[data-row="${rowIdx}"][data-col="${c+1}"]`);
    const svg = qs("svg", cell);
    const gAxes = qs(".axes", svg);
    const gSeries = qs(".series", svg);
    const gLabels = qs(".endlabels", svg);
    gAxes.innerHTML = ""; gSeries.innerHTML = ""; gLabels.innerHTML = "";

    const [, sym, scale] = GENOS[c];
    let sol;
    if (rowIdx===1) sol = solveModel1({sym_frac:sym, g_scale:scale});
    if (rowIdx===2) sol = solveModel2({sym_frac:sym, g_scale:scale});
    if (rowIdx===3) sol = solveModel3({alpha:alpha3, sym_frac:sym, g_scale:scale});
    if (rowIdx===4) sol = solveModel4({alpha:alpha4, sym_frac:sym, g_scale:scale});
    if (rowIdx===5) sol = solveModel5({beta:beta5, sym_frac:sym});

    const t = sol.t;
    const NB=[], GMC=[], Im=[], Mat=[];
    for(let i=0;i<t.length;i++){
      const y = sol.y[i];
      if (rowIdx===5){ NB.push(y[0]); GMC.push(y[1]); Im.push(y[2]); Mat.push(y[3]); }
      else           { NB.push(y[0]); GMC.push(y[2]); Im.push(y[4]); Mat.push(y[6]); }
    }

    // scales
    const W=600,H=360, padL=48,padR=20,padT=20,padB=36;
    const x0=padL, x1=W-padR, y0=padT, y1=H-padB;
    const tx = (x)=> x0 + (x/state.tEnd)*(x1-x0);
    const maxY = Math.max(1, ...NB, ...GMC, ...Im, ...Mat);
    const ty = (y)=> y1 - (y/maxY)*(y1-y0);

    // axes
    const axisCol = "#32405e";
    const tickCol = "#9aa4b2";
    const xAxis = `<line x1="${x0}" y1="${y1}" x2="${x1}" y2="${y1}" stroke="${axisCol}" stroke-width="1"/>`;
    const yAxis = `<line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1}" stroke="${axisCol}" stroke-width="1"/>`;
    const xTicks = [0,12,24,36,48].map(v=>{
      const x=tx(v); return `
      <line x1="${x}" y1="${y1}" x2="${x}" y2="${y1+5}" stroke="${axisCol}"/>
      <text x="${x}" y="${y1+18}" fill="${tickCol}" font-size="11" text-anchor="middle">${v}</text>`;
    }).join("");
    const yTicks = [0, Math.round(maxY*0.33), Math.round(maxY*0.66), Math.round(maxY)].map(v=>{
      const y=ty(v); return `
      <line x1="${x0-5}" y1="${y}" x2="${x0}" y2="${y}" stroke="${axisCol}"/>
      <text x="${x0-8}" y="${y+4}" fill="${tickCol}" font-size="11" text-anchor="end">${v}</text>`;
    }).join("");
    gAxes.innerHTML = xAxis + yAxis + xTicks + yTicks;

    // series (polyline) — thicker lines
    const lw = 2.8;
    const sw = (arr)=> arr.map((v,i)=>`${tx(t[i])},${ty(v)}`).join(" ");
    gSeries.innerHTML = `
      <polyline fill="none" stroke="${COLORS.NB}"  stroke-width="${lw}" stroke-linejoin="round" points="${sw(NB)}"/>
      <polyline fill="none" stroke="${COLORS.GMC}" stroke-width="${lw}" stroke-linejoin="round" points="${sw(GMC)}"/>
      <polyline fill="none" stroke="${COLORS.Im}"  stroke-width="${lw}" stroke-linejoin="round" points="${sw(Im)}"/>
      <polyline fill="none" stroke="${COLORS.Mat}" stroke-width="${lw}" stroke-linejoin="round" points="${sw(Mat)}"/>
    `;

    // end labels — thicker, more visible strokes
    const labels = [
      ["NB",  Math.round(NB[NB.length-1])],
      ["GMC", Math.round(GMC[GMC.length-1])],
      ["Im",  Math.round(Im[Im.length-1])],
      ["Mat", Math.round(Mat[Mat.length-1])]
    ];
    const desired = labels.map(([name,_],i)=>({
      name,
      y: ty((name==="NB"?NB: name==="GMC"?GMC: name==="Im"?Im:Mat)[t.length-1]) - 2
    })).sort((a,b)=>a.y-b.y);

    const h = 24; const w2 = 34; // canonical for ≤2 digits
    for(let i=1;i<desired.length;i++){
      if (desired[i].y - desired[i-1].y < h+6) desired[i].y = desired[i-1].y + h+6;
    }
    const xr = x1 - 6;
    const labelEls = desired.map(d=>{
      const val = labels.find(L=>L[0]===d.name)[1];
      const s = String(val);
      const w = (s.length<=2)? w2 : (10 + 10*s.length);
      const x = xr - w; const y = d.y - h/2;
      const color = COLORS[d.name];
      // stroke thicker + subtle tinted background for visibility
      return `
        <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white" stroke="${color}"
              stroke-width="2.2" rx="6" ry="6"/>
        <text x="${x+w/2}" y="${y+h/2+4}" fill="#0b1020"
              font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace"
              font-size="13" text-anchor="middle">${s}</text>`;
    }).join("");
    gLabels.innerHTML = labelEls;
  }
}

/* ---------- Grid + buttons + sharing ---------- */
function createGrid(){
  const grid = qs("#grid"); grid.innerHTML = "";
  const rowNames = ["Model 1","Model 2","Model 3","Model 4","Model 5"];
  for(let r=0;r<5;r++){
    for(let c=0;c<3;c++){
      const cell = document.createElement("div");
      cell.className="cell"; cell.dataset.row=r+1; cell.dataset.col=c+1;
      const h = document.createElement("h3");
      h.textContent = rowNames[r] + (c===0? " • "+GENOS[c][0] : "");
      cell.appendChild(h);
      const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
      svg.setAttribute("viewBox","0 0 600 360");
      svg.innerHTML = `<rect x="0" y="0" width="600" height="360" fill="transparent"/>
        <g class="axes"></g><g class="series"></g><g class="endlabels"></g>`;
      cell.appendChild(svg);
      grid.appendChild(cell);
    }
  }
}

/* Share helpers */
function shareAll(){
  readInputsIntoState();
  const params = new URLSearchParams();
  Object.entries(state).forEach(([k,v])=> params.set(k, String(v)));
  const url = `${location.origin}${location.pathname}?${params.toString()}`;
  navigator.clipboard?.writeText(url);
  alert("Shareable link copied to clipboard.");
}

function shareRow(r){
  readInputsIntoState();
  const params = new URLSearchParams();
  // include ALL globals (so the row reproduces the same numerics)
  Object.entries(state).forEach(([k,v])=> params.set(k, String(v)));
  params.set('row', String(r));
  const url = `${location.origin}${location.pathname}?${params.toString()}`;
  navigator.clipboard?.writeText(url);
  alert(`Shareable link for Model ${r} copied.`);
}

function loadFromURL(){
  const u = new URL(location.href);
  u.searchParams.forEach((v,k)=>{ if (k in state) state[k] = parseFloat(v); });
  writeStateToInputs();
  for (let r=1;r<=5;r++) plotRow(r);
}

/* ---------- Boot ---------- */
createGrid();
writeStateToInputs();
loadFromURL();

qs('#reset').addEventListener('click', ()=>{
  Object.assign(state, { ...DEFAULTS });
  writeStateToInputs();
  for (let r=1;r<=5;r++) plotRow(r);
});
qsa('[data-run]').forEach(b=> b.addEventListener('click', ()=> plotRow(+b.dataset.run)));
qsa('[data-share]').forEach(b=> b.addEventListener('click', ()=> shareRow(+b.dataset.share)));
qs('#shareAll').addEventListener('click', shareAll);