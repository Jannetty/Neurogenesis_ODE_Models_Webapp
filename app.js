/* Neuroblast interactive grid — client-side solver + plotting
   No dependencies. Saves state to URL (?m3_alpha=3&m4_sym=0,0.15,0.15&...)
*/

/* ---------- Constants from your paper/notebook ---------- */
const CONST = {
  tEnd: 48, dt: 0.1,
  nb_vol: 285.0,
  n: 3,
  k_max_GMC: 1/8,
  k_Neuron: 1/48,
  V_thresh_NB_mul: 1.25,
  GMC_vol_frac: 0.2,
  GMC_growth_div: 9.0,
  V_floor_NB_frac: 0.25,
  V_floor_GMC_frac: 0.25,
  delta_thresh_frac: 0.03, // of V_thresh_base
  K_self: 2.0,
  p_beta_default: 4.0
};

// derived “paper defaults”
const V0 = CONST.nb_vol;
const V_thresh_NB = CONST.V_thresh_NB_mul * CONST.nb_vol;
const V_thresh_GMC = (CONST.nb_vol * CONST.V_thresh_NB_mul * CONST.GMC_vol_frac) * 2;
const V_floor_NB = CONST.V_floor_NB_frac * CONST.nb_vol;
const V_floor_GMC = CONST.V_floor_GMC_frac * (CONST.nb_vol * CONST.V_thresh_NB_mul * CONST.GMC_vol_frac);
const g_GMC = (CONST.nb_vol * CONST.V_thresh_NB_mul * CONST.GMC_vol_frac) / CONST.GMC_growth_div;

// WT calibration
const k_star = 1/1.5; // target CCD=1.5 h
const core0  = Math.min(1, Math.pow(V0 / V_thresh_NB, CONST.n));
const k_max_NB = k_star / core0;
const g_NB_WT  = 0.2 * k_star * V0;

// Model 2 extras
const V_thresh_base = V_thresh_NB;
const delta_thresh = CONST.delta_thresh_frac * V_thresh_base;
const V_thresh_min = V_floor_NB;

// GENOTYPES (label, sym, nb_base_scale)
const GENOS = [
  ["WT", 0.0, 1.0],
  ["mud mutant", 0.15, 1.0],
  ["nanobody", 0.15, 0.8]
];

// Plot colors
const COLORS = {
  NB:  "#1b9e77",
  GMC: "#d95f02",
  Im:  "#7570b3",
  Mat: "#e7298a"
};

/* ---------- Utilities ---------- */
function parseTriple(s, fallback=[0,0.15,0.15]) {
  try {
    const a = s.split(",").map(x => parseFloat(x.trim()));
    if (a.length !== 3 || a.some(v => Number.isNaN(v))) return fallback.slice();
    return a;
  } catch { return fallback.slice(); }
}

function qs(sel, root=document){ return root.querySelector(sel); }
function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

function lerp(a,b,t){ return a + (b-a)*t; }

/* ---------- Simple integrator (RK2 midpoint) ---------- */
function integrate(rhs, y0, p, tEnd=CONST.tEnd, dt=CONST.dt){
  const steps = Math.floor(tEnd/dt);
  const d = y0.length;
  const Y = new Array(steps+1); const T = new Array(steps+1);
  let y = y0.slice();
  let t = 0;
  Y[0] = y.slice(); T[0] = 0;
  for(let i=1;i<=steps;i++){
    const k1 = rhs(t, y, p);
    const yMid = new Array(d);
    for(let j=0;j<d;j++) yMid[j] = y[j] + 0.5*dt*k1[j];
    const k2 = rhs(t+0.5*dt, yMid, p);
    for(let j=0;j<d;j++) y[j] = y[j] + dt*k2[j];
    t += dt;
    Y[i] = y.slice(); T[i] = t;
  }
  return {t:T, y:Y};
}

/* ---------- RHS (ported from your Python) ---------- */
// Helpers
function satpow(Vbar, Vth, kmax, n){
  if (Vbar <= 0 || Vth <= 0) return 0;
  const r = Math.pow(Vbar/Vth, n);
  return (r >= 1) ? kmax : kmax * r;
}

// Model 1: volumes, static thresholds
function rhsM1(t, y, p){
  let [N_NB,V_NB,N_GMC,V_GMC,N_Im,V_Im,N_Mat,V_Mat] = y;
  const {g_NB,g_GMC,k_Neuron,sym_frac,V_thresh_NB,V_thresh_GMC,k_max_NB,k_max_GMC,n,V_floor_NB,V_floor_GMC} = p;
  const Vavg_NB  = (N_NB>0)? V_NB/N_NB : 0;
  const Vavg_GMC = (N_GMC>0)? V_GMC/N_GMC : 0;
  const Vavg_Im  = (N_Im>0)?  V_Im/N_Im  : 0;

  const k_NB  = (N_NB>0 && Vavg_NB>=V_floor_NB)?  satpow(Vavg_NB,V_thresh_NB,k_max_NB,n) : 0;
  const k_GMC = (N_GMC>0 && Vavg_GMC>=V_floor_GMC)?satpow(Vavg_GMC,V_thresh_GMC,k_max_GMC,n) : 0;

  const sym = sym_frac * k_NB * N_NB;
  const asym= (1 - sym_frac) * k_NB * N_NB;

  const dN_NB = sym;
  const dV_NB = g_NB*N_NB - 0.2*asym*(Vavg_NB||0);
  const dN_GMC= asym - k_GMC*N_GMC;
  const dV_GMC= g_GMC*N_GMC + 0.2*asym*(Vavg_NB||0) - k_GMC*N_GMC*(Vavg_GMC||0);
  const dN_Im = 2*k_GMC*N_GMC - k_Neuron*N_Im;
  const dV_Im = k_GMC*N_GMC*(Vavg_GMC||0) - k_Neuron*N_Im*(Vavg_Im||0);
  const dN_Mat= k_Neuron*N_Im;
  const dV_Mat= k_Neuron*N_Im*(Vavg_Im||0);
  return [dN_NB,dV_NB,dN_GMC,dV_GMC,dN_Im,dV_Im,dN_Mat,dV_Mat];
}

// Model 2: dynamic NB threshold pulled by sym; state y has Vth_eff
function rhsM2(t, y, p){
  let [N_NB,V_NB,N_GMC,V_GMC,N_Im,V_Im,N_Mat,V_Mat,Vth_eff] = y;
  const {g_NB_base,g_GMC,k_Neuron,sym_frac,V_thresh_base,V_thresh_GMC,k_max_NB,k_max_GMC,n,V_floor_NB,V_floor_GMC,delta_thresh,V_thresh_min} = p;

  const Vavg_NB  = (N_NB>0)? V_NB/N_NB : 0;
  const Vavg_GMC = (N_GMC>0)? V_GMC/N_GMC : 0;
  const Vavg_Im  = (N_Im>0)?  V_Im/N_Im  : 0;

  const Vth_used = Math.max(Vth_eff, V_thresh_min);
  const k_NB  = (N_NB>0 && Vavg_NB>=V_floor_NB)?  satpow(Vavg_NB,Vth_used,k_max_NB,n) : 0;
  const k_GMC = (N_GMC>0 && Vavg_GMC>=V_floor_GMC)?satpow(Vavg_GMC,V_thresh_GMC,k_max_GMC,n) : 0;

  const sym = sym_frac * k_NB * N_NB;
  const asym= (1 - sym_frac) * k_NB * N_NB;

  const dN_NB = sym;
  const dV_NB = g_NB_base*N_NB - 0.2*asym*(Vavg_NB||0);
  const dN_GMC= asym - k_GMC*N_GMC;
  const dV_GMC= g_GMC*N_GMC + 0.2*asym*(Vavg_NB||0) - k_GMC*N_GMC*(Vavg_GMC||0);
  const dN_Im = 2*k_GMC*N_GMC - k_Neuron*N_Im;
  const dV_Im = k_GMC*N_GMC*(Vavg_GMC||0) - k_Neuron*N_Im*(Vavg_Im||0);
  const dN_Mat= k_Neuron*N_Im;
  const dV_Mat= k_Neuron*N_Im*(Vavg_Im||0);
  const dVth  = - delta_thresh * sym; // no recovery
  return [dN_NB,dV_NB,dN_GMC,dV_GMC,dN_Im,dV_Im,dN_Mat,dV_Mat,dVth];
}

// Model 3: vol-scaled NB growth only
function rhsM3(t, y, p){
  let [N_NB,V_NB,N_GMC,V_GMC,N_Im,V_Im,N_Mat,V_Mat] = y;
  const {g_NB_base,g_GMC,k_Neuron,sym_frac,V_thresh_base,V_thresh_GMC,k_max_NB,k_max_GMC,n,V_floor_NB,V_ref,alpha_growth,V_floor_GMC} = p;

  const Vavg_NB  = (N_NB>0)? V_NB/N_NB : 0;
  const Vavg_GMC = (N_GMC>0)? V_GMC/N_GMC : 0;
  const Vavg_Im  = (N_Im>0)?  V_Im/N_Im  : 0;

  const ratio    = (V_ref>0 && Vavg_NB>0)? (Vavg_NB/V_ref) : 1.0;
  const g_NB_eff = g_NB_base * Math.pow(ratio, alpha_growth);

  const k_NB  = (N_NB>0 && Vavg_NB>=V_floor_NB)?  satpow(Vavg_NB,V_thresh_base,k_max_NB,n) : 0;
  const k_GMC = (N_GMC>0 && Vavg_GMC>=V_floor_GMC)?satpow(Vavg_GMC,V_thresh_GMC,k_max_GMC,n) : 0;

  const sym = sym_frac * k_NB * N_NB;
  const asym= (1 - sym_frac) * k_NB * N_NB;

  const dN_NB = sym;
  const dV_NB = g_NB_eff*N_NB - 0.2*asym*(Vavg_NB||0);
  const dN_GMC= asym - k_GMC*N_GMC;
  const dV_GMC= g_GMC*N_GMC + 0.2*asym*(Vavg_NB||0) - k_GMC*N_GMC*(Vavg_GMC||0);
  const dN_Im = 2*k_GMC*N_GMC - k_Neuron*N_Im;
  const dV_Im = k_GMC*N_GMC*(Vavg_GMC||0) - k_Neuron*N_Im*(Vavg_Im||0);
  const dN_Mat= k_Neuron*N_Im;
  const dV_Mat= k_Neuron*N_Im*(Vavg_Im||0);
  return [dN_NB,dV_NB,dN_GMC,dV_GMC,dN_Im,dV_Im,dN_Mat,dV_Mat];
}

// Model 4: vol-scaled + dynamic threshold via cumulative symmetric divisions
function rhsM4(t, y, p){
  let [N_NB,V_NB,N_GMC,V_GMC,N_Im,V_Im,N_Mat,V_Mat,S_sym] = y;
  const {g_NB_base,g_GMC,k_Neuron,sym_frac,V_thresh_base,V_thresh_GMC,k_max_NB,k_max_GMC,n,V_floor_NB,V_ref,alpha_growth,V_floor_GMC,delta_thresh,V_thresh_min} = p;

  const Vavg_NB  = (N_NB>0)? V_NB/N_NB : 0;
  const Vavg_GMC = (N_GMC>0)? V_GMC/N_GMC : 0;
  const Vavg_Im  = (N_Im>0)?  V_Im/N_Im  : 0;

  const ratio    = (V_ref>0 && Vavg_NB>0)? (Vavg_NB/V_ref) : 1.0;
  const g_NB_eff = g_NB_base * Math.pow(ratio, alpha_growth);

  let V_thresh_eff = V_thresh_base - delta_thresh * Math.max(S_sym, 0);
  if (V_thresh_min != null) V_thresh_eff = Math.max(V_thresh_eff, V_thresh_min);

  const k_NB  = (N_NB>0 && Vavg_NB>=V_floor_NB)?  satpow(Vavg_NB,V_thresh_eff,k_max_NB,n) : 0;
  const k_GMC = (N_GMC>0 && Vavg_GMC>=V_floor_GMC)?satpow(Vavg_GMC,V_thresh_GMC,k_max_GMC,n) : 0;

  const sym = sym_frac * k_NB * N_NB;
  const asym= (1 - sym_frac) * k_NB * N_NB;

  const dN_NB = sym;
  const dV_NB = g_NB_eff*N_NB - 0.2*asym*(Vavg_NB||0);
  const dN_GMC= asym - k_GMC*N_GMC;
  const dV_GMC= g_GMC*N_GMC + 0.2*asym*(Vavg_NB||0) - k_GMC*N_GMC*(Vavg_GMC||0);
  const dN_Im = 2*k_GMC*N_GMC - k_Neuron*N_Im;
  const dV_Im = k_GMC*N_GMC*(Vavg_GMC||0) - k_Neuron*N_Im*(Vavg_Im||0);
  const dN_Mat= k_Neuron*N_Im;
  const dV_Mat= k_Neuron*N_Im*(Vavg_Im||0);
  const dS    = sym;

  return [dN_NB,dV_NB,dN_GMC,dV_GMC,dN_Im,dV_Im,dN_Mat,dV_Mat,dS];
}

// Model 5: NB self-repression
function rhsM5(t, y, p){
  let [N_NB,N_GMC,N_Im,N_Mat] = y;
  const {k_GMC,k_Neuron,K,n_nb,sym,k_NB_max} = p;
  const Np = Math.max(N_NB,0);
  const Kp = Math.max(K,1e-12);
  const nn = Math.max(n_nb,1e-12);
  const k_NB_eff = k_NB_max * (Math.pow(Kp,nn)/(Math.pow(Kp,nn)+Math.pow(Np,nn)));
  const symd  = sym * k_NB_eff * N_NB;
  const asymd = (1 - sym) * k_NB_eff * N_NB;
  const dN_NB  = symd;
  const dN_GMC = asymd - k_GMC*N_GMC;
  const dN_Im  = 2*k_GMC*N_GMC - k_Neuron*N_Im;
  const dN_Mat = k_Neuron*N_Im;
  return [dN_NB,dN_GMC,dN_Im,dN_Mat];
}

/* ---------- Solve wrappers (mirror your Python signatures) ---------- */
function solveModel1({sym_frac, g_scale}){
  const y0 = [1,V0, 0,0, 0,0, 0,0];
  const p = {
    g_NB: g_NB_WT * g_scale, g_GMC, k_Neuron: CONST.k_Neuron, sym_frac,
    V_thresh_NB, V_thresh_GMC, k_max_NB, k_max_GMC: CONST.k_max_GMC, n: CONST.n,
    V_floor_NB, V_floor_GMC
  };
  return integrate(rhsM1, y0, p);
}
function solveModel2({sym_frac, g_scale}){
  const y0 = [1,V0, 0,0, 0,0, 0,0, V_thresh_base];
  const p = {
    g_NB_base: g_NB_WT * g_scale, g_GMC, k_Neuron: CONST.k_Neuron, sym_frac,
    V_thresh_base, V_thresh_GMC, k_max_NB, k_max_GMC: CONST.k_max_GMC, n: CONST.n,
    V_floor_NB, V_floor_GMC, delta_thresh, V_thresh_min
  };
  return integrate(rhsM2, y0, p);
}
function solveModel3({alpha, sym_frac, g_scale}){
  const y0 = [1,V0, 0,0, 0,0, 0,0];
  const p = {
    g_NB_base: g_NB_WT * g_scale, g_GMC, k_Neuron: CONST.k_Neuron, sym_frac,
    V_thresh_base: V_thresh_NB, V_thresh_GMC, k_max_NB, k_max_GMC: CONST.k_max_GMC, n: CONST.n,
    V_floor_NB, V_ref: V0, alpha_growth: alpha, V_floor_GMC
  };
  return integrate(rhsM3, y0, p);
}
function solveModel4({alpha, sym_frac, g_scale}){
  const y0 = [1,V0, 0,0, 0,0, 0,0, 0]; // S_sym=0
  const p = {
    g_NB_base: g_NB_WT * g_scale, g_GMC, k_Neuron: CONST.k_Neuron, sym_frac,
    V_thresh_base: V_thresh_NB, V_thresh_GMC, k_max_NB, k_max_GMC: CONST.k_max_GMC, n: CONST.n,
    V_floor_NB, V_ref: V0, alpha_growth: alpha, V_floor_GMC,
    delta_thresh, V_thresh_min
  };
  return integrate(rhsM4, y0, p);
}
function solveModel5({beta, sym_frac}){
  const y0 = [1,0,0,0];
  const k_NB_max = k_star * ((Math.pow(CONST.K_self, beta) + 1) / Math.pow(CONST.K_self, beta));
  const p = {
    k_GMC: CONST.k_max_GMC, k_Neuron: CONST.k_Neuron, K: CONST.K_self, n_nb: beta, sym: sym_frac,
    k_NB_max
  };
  return integrate(rhsM5, y0, p);
}

/* ---------- Small plotting util (SVG) ---------- */
function createGrid(){
  const grid = qs("#grid");
  grid.innerHTML = ""; // 5 rows x 3 columns
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
      svg.innerHTML = `
        <rect x="0" y="0" width="600" height="360" fill="transparent"/>
        <g class="axes"></g>
        <g class="series"></g>
        <g class="endlabels"></g>
      `;
      cell.appendChild(svg);
      grid.appendChild(cell);
    }
  }
}

function plotRow(rowIdx, solverArgs){
  // rowIdx: 1..5
  for(let c=0;c<3;c++){
    const cell = qs(`.cell[data-row="${rowIdx}"][data-col="${c+1}"]`);
    const svg = qs("svg", cell);
    const gAxes = qs(".axes", svg);
    const gSeries = qs(".series", svg);
    const gLabels = qs(".endlabels", svg);

    // clear
    gAxes.innerHTML = ""; gSeries.innerHTML = ""; gLabels.innerHTML = "";

    // compute
    const [_, sym, scale] = GENOS[c];
    let sol;
    if (rowIdx===1) sol = solveModel1({sym_frac: pickSym(solverArgs.m1_sym,c), g_scale: pickScale(solverArgs.m1_scale,c)});
    if (rowIdx===2) sol = solveModel2({sym_frac: pickSym(solverArgs.m2_sym,c), g_scale: pickScale(solverArgs.m2_scale,c)});
    if (rowIdx===3) sol = solveModel3({alpha: +solverArgs.m3_alpha, sym_frac: pickSym(solverArgs.m3_sym,c), g_scale: pickScale(solverArgs.m3_scale,c)});
    if (rowIdx===4) sol = solveModel4({alpha: +solverArgs.m4_alpha, sym_frac: pickSym(solverArgs.m4_sym,c), g_scale: pickScale(solverArgs.m4_scale,c)});
    if (rowIdx===5) sol = solveModel5({beta: +solverArgs.m5_beta, sym_frac: pickSym(solverArgs.m5_sym,c)});

    const t = sol.t;
    // extract (t, NB, GMC, Im, Mat) from Y matrix depending on model
    const NB=[], GMC=[], Im=[], Mat=[];
    for(let i=0;i<t.length;i++){
      const y = sol.y[i];
      if (rowIdx===5){ NB.push(y[0]); GMC.push(y[1]); Im.push(y[2]); Mat.push(y[3]); }
      else           { NB.push(y[0]); GMC.push(y[2]); Im.push(y[4]); Mat.push(y[6]); }
    }

    // scales
    const W=600,H=360, padL=48,padR=20,padT=20,padB=36;
    const x0=padL, x1=W-padR, y0=padT, y1=H-padB;
    const tx = (x)=> x0 + (x/CONST.tEnd)*(x1-x0);
    const maxY = Math.max(1, ...NB, ...GMC, ...Im, ...Mat);
    const ty = (y)=> y1 - (y/maxY)*(y1-y0);

    // axes
    const xAxis = `<line x1="${x0}" y1="${y1}" x2="${x1}" y2="${y1}" stroke="#32405e" stroke-width="1"/>`;
    const yAxis = `<line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1}" stroke="#32405e" stroke-width="1"/>`;
    const xTicks = [0,12,24,36,48].map(v=>{
      const x=tx(v); return `
        <line x1="${x}" y1="${y1}" x2="${x}" y2="${y1+5}" stroke="#32405e"/>
        <text x="${x}" y="${y1+18}" fill="#9aa4b2" font-size="11" text-anchor="middle">${v}</text>`;
    }).join("");
    const yTicks = [0, Math.round(maxY*0.33), Math.round(maxY*0.66), Math.round(maxY)].map(v=>{
      const y=ty(v); return `
        <line x1="${x0-5}" y1="${y}" x2="${x0}" y2="${y}" stroke="#32405e"/>
        <text x="${x0-8}" y="${y+4}" fill="#9aa4b2" font-size="11" text-anchor="end">${v}</text>`;
    }).join("");
    gAxes.innerHTML = xAxis+yAxis+xTicks+yTicks;

    // series (polyline)
    function linePath(arr){ return arr.map((v,i)=>`${tx(t[i])},${ty(v)}`).join(" "); }
    gSeries.innerHTML = `
      <polyline fill="none" stroke="${COLORS.NB}"  stroke-width="2" points="${linePath(NB)}"/>
      <polyline fill="none" stroke="${COLORS.GMC}" stroke-width="2" points="${linePath(GMC)}"/>
      <polyline fill="none" stroke="${COLORS.Im}"  stroke-width="2" points="${linePath(Im)}"/>
      <polyline fill="none" stroke="${COLORS.Mat}" stroke-width="2" points="${linePath(Mat)}"/>
    `;

    // end labels (right-aligned boxes, equal size for 2-digits)
    const labels = [
      ["NB",  Math.round(NB[NB.length-1])],
      ["GMC", Math.round(GMC[GMC.length-1])],
      ["Im",  Math.round(Im[Im.length-1])],
      ["Mat", Math.round(Mat[Mat.length-1])]
    ];
    // compute desired Y (slightly above line)
    const desired = labels.map(([name,val],i)=>({
      name, val, y: ty((name==="NB"?NB: name==="GMC"?GMC: name==="Im"?Im:Mat)[t.length-1]) - 2
    })).sort((a,b)=>a.y-b.y);

    // prevent overlaps with minimal spacing
    const h = 22, w2 = 30; // canonical box size for 2 digits
    for(let i=1;i<desired.length;i++){
      if (desired[i].y - desired[i-1].y < h+4) desired[i].y = desired[i-1].y + h+4;
    }
    const xr = x1 - 6; // right pad
    const labelEls = desired.map(d=>{
      const s = String(d.val);
      const w = (s.length<=2)? (w2) : (8 + 9*s.length);
      const x = xr - w;
      const y = d.y - h/2;
      const color = COLORS[d.name];
      return `
        <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white" stroke="${color}" rx="5" ry="5"/>
        <text x="${x+w/2}" y="${y+h/2+4}" fill="#0b1020" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace"
              font-size="13" text-anchor="middle">${s}</text>`;
    }).join("");
    gLabels.innerHTML = labelEls;
  }
}

function pickSym(arrOrStr, idx){
  const arr = Array.isArray(arrOrStr) ? arrOrStr : parseTriple(arrOrStr);
  return arr[idx];
}
function pickScale(arrOrStr, idx){
  const arr = Array.isArray(arrOrStr) ? arrOrStr : parseTriple(arrOrStr, [1,1,0.8]);
  return arr[idx];
}

/* ---------- State / Controls / Sharing ---------- */
const state = {
  m1_sym:"0,0.15,0.15", m1_scale:"1,1,0.8",
  m2_sym:"0,0.15,0.15", m2_scale:"1,1,0.8",
  m3_alpha:3, m3_sym:"0,0.15,0.15", m3_scale:"1,1,0.8",
  m4_alpha:3, m4_sym:"0,0.15,0.15", m4_scale:"1,1,0.8",
  m5_beta:4, m5_sym:"0,0.15,0.15"
};

function readInputsIntoState(){
  qsa('[data-key]').forEach(inp=>{
    const k = inp.dataset.key;
    state[k] = inp.type === 'number' ? (inp.valueAsNumber || parseFloat(inp.value) || 0) : inp.value;
  });
}

function writeStateToInputs(){
  qsa('[data-key]').forEach(inp=>{
    const k = inp.dataset.key;
    if (inp.type === 'number') inp.value = state[k];
    else inp.value = state[k];
  });
}

function runRow(r){
  readInputsIntoState();
  plotRow(r, state);
}

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
  const keysByRow = {
    1:["m1_sym","m1_scale"],
    2:["m2_sym","m2_scale"],
    3:["m3_alpha","m3_sym","m3_scale"],
    4:["m4_alpha","m4_sym","m4_scale"],
    5:["m5_beta","m5_sym"]
  };
  const params = new URLSearchParams();
  keysByRow[r].forEach(k=> params.set(k, String(state[k])));
  // include row= to hint which to look at first
  params.set('row', String(r));
  const url = `${location.origin}${location.pathname}?${params.toString()}`;
  navigator.clipboard?.writeText(url);
  alert(`Shareable link for Model ${r} copied.`);
}

function loadFromURL(){
  const u = new URL(location.href);
  const params = u.searchParams;
  let changed = false;
  params.forEach((v,k)=>{ if (k in state){ state[k] = v; changed = true; }});
  writeStateToInputs();
  if (changed){
    // if a specific row is indicated, run it; else run all once
    const row = +(params.get('row')||0);
    if (row>=1 && row<=5) runRow(row);
    else for (let r=1;r<=5;r++) runRow(r);
  } else {
    for (let r=1;r<=5;r++) runRow(r);
  }
}

/* ---------- Boot ---------- */
createGrid();
writeStateToInputs();
loadFromURL();

// hook up buttons
qs('#reset').addEventListener('click', ()=>{
  Object.assign(state, {
    m1_sym:"0,0.15,0.15", m1_scale:"1,1,0.8",
    m2_sym:"0,0.15,0.15", m2_scale:"1,1,0.8",
    m3_alpha:3, m3_sym:"0,0.15,0.15", m3_scale:"1,1,0.8",
    m4_alpha:3, m4_sym:"0,0.15,0.15", m4_scale:"1,1,0.8",
    m5_beta:4, m5_sym:"0,0.15,0.15"
  });
  writeStateToInputs();
  for (let r=1;r<=5;r++) runRow(r);
});
qs('#shareAll').addEventListener('click', shareAll);
qsa('[data-run]').forEach(b=> b.addEventListener('click', ()=> runRow(+b.dataset.run)));
qsa('[data-share]').forEach(b=> b.addEventListener('click', ()=> shareRow(+b.dataset.share)));