function computePredecessors(n, P) {
  const preds = Array.from({ length: n + 1 }, () => []);
  for (const [i, j] of P) preds[j].push(i);
  return preds;
}

// готові — ще не виконані компоненти, у яких всі предки вже completed
function computeReady(n, preds, completed) {
  const ready = [];
  for (let i = 1; i <= n; i++) {
    if (completed[i]) continue;
    let ok = true;
    for (const k of preds[i]) {
      if (!completed[k]) { ok = false; break; }
    }
    if (ok) ready.push(i);
  }
  return ready;
}

function computeObjective(schedule, u) {
  let Z = 0;
  for (const Sj of schedule) {
    for (const [c, , T] of Sj) Z += u[c] * T;
  }
  return Z;
}

function greedyAlgorithm(instance) {
  const t0 = performance.now();
  const { n, m, t, u, P } = instance;
  const preds = computePredecessors(n, P);
  const completed = Array(n + 1).fill(false);

  const free = Array(m).fill(0);                      // free[j] — момент звільнення виконавця j
  const S = Array.from({ length: m }, () => []);
  const Tend = Array(n + 1).fill(0);                  // Tend[i] — момент завершення компонента i

  let assigned = 0;
  while (assigned < n) {
    const ready = computeReady(n, preds, completed);
    if (ready.length === 0) break;                    // deadlock не повинен виникнути

    let jMin = 0;
    for (let j = 1; j < m; j++) if (free[j] < free[jMin]) jMin = j;
    const tCurr = free[jMin];

    let bestIdx = -1, bestVal = Infinity;
    for (const i of ready) {
      const val = t[i] / u[i];
      if (val < bestVal) { bestVal = val; bestIdx = i; }
    }
    const i = bestIdx;

    let B = tCurr;
    for (const k of preds[i]) if (Tend[k] > B) B = Tend[k];
    const T = B + t[i];

    S[jMin].push([i, B, T]);
    free[jMin] = T;
    Tend[i] = T;
    completed[i] = true;
    assigned++;
  }

  const Z = computeObjective(S, u);
  return { S, Z, timeMs: performance.now() - t0 };
}

function stochasticGreedyOnce(instance, beta) {
  const { n, m, t, u, P } = instance;
  const preds = computePredecessors(n, P);
  const completed = Array(n + 1).fill(false);
  const free = Array(m).fill(0);
  const S = Array.from({ length: m }, () => []);
  const Tend = Array(n + 1).fill(0);

  let assigned = 0;
  while (assigned < n) {
    const ready = computeReady(n, preds, completed);
    if (ready.length === 0) break;

    let jMin = 0;
    for (let j = 1; j < m; j++) if (free[j] < free[jMin]) jMin = j;
    const tCurr = free[jMin];

    const weights = ready.map(i => Math.pow(u[i] / t[i], beta));
    const sumW = weights.reduce((a, b) => a + b, 0);
    let i;
    if (sumW === 0 || !isFinite(sumW)) {
      i = ready[Math.floor(Math.random() * ready.length)];
    } else {
      const r = Math.random() * sumW;
      let acc = 0;
      i = ready[ready.length - 1];
      for (let k = 0; k < ready.length; k++) {
        acc += weights[k];
        if (r <= acc) { i = ready[k]; break; }
      }
    }

    let B = tCurr;
    for (const k of preds[i]) if (Tend[k] > B) B = Tend[k];
    const T = B + t[i];

    S[jMin].push([i, B, T]);
    free[jMin] = T;
    Tend[i] = T;
    completed[i] = true;
    assigned++;
  }

  return { S, Z: computeObjective(S, u) };
}

function stochasticGreedyAlgorithm(instance, beta = 1, N = 100) {
  const t0 = performance.now();
  let best = null;
  for (let r = 0; r < N; r++) {
    const cur = stochasticGreedyOnce(instance, beta);
    if (best === null || cur.Z < best.Z) best = cur;
  }
  return { S: best.S, Z: best.Z, timeMs: performance.now() - t0 };
}