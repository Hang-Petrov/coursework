// Реалізація ЖА і СЖВ.
// instance = { n, m, t, u, P }: t, u — 1-індексовані (t[1]..t[n]), P — масив пар [i, j].
// Результат: { S, Z, timeMs }, де S[j] — список (компонент, B, T) для j-го виконавця.

// для кожного j ∈ P збирає масив його предків i
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

// Z = Σ uᵢ·Tᵢ
function computeObjective(schedule, u) {
  let Z = 0;
  for (const Sj of schedule) {
    for (const [c, , T] of Sj) Z += u[c] * T;
  }
  return Z;
}

// Жадібний алгоритм. На кожному кроці серед Ready обираємо компонент
// з найменшим tᵢ/uᵢ (=найбільшим uᵢ/tᵢ) і призначаємо його виконавцю,
// що першим звільнився.
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

    // виконавець, що першим звільниться
    let jMin = 0;
    for (let j = 1; j < m; j++) if (free[j] < free[jMin]) jMin = j;
    const tCurr = free[jMin];

    // argmin tᵢ/uᵢ серед ready
    let bestIdx = -1, bestVal = Infinity;
    for (const i of ready) {
      const val = t[i] / u[i];
      if (val < bestVal) { bestVal = val; bestIdx = i; }
    }
    const i = bestIdx;

    // початок не раніше моменту звільнення виконавця і не раніше завершення предків
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

// Один запуск СЖВ: компонент із Ready обирається випадково
// з імовірністю pᵢ = (uᵢ/tᵢ)^β / Σ_{z∈Ready}(uz/tz)^β.
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

    // ваги (uᵢ/tᵢ)^β
    const weights = ready.map(i => Math.pow(u[i] / t[i], beta));
    const sumW = weights.reduce((a, b) => a + b, 0);
    let i;
    if (sumW === 0 || !isFinite(sumW)) {
      // запасний варіант (якщо ваги вибухли чи щось типу такого або всі = 0) — рівноімовірний вибір
      i = ready[Math.floor(Math.random() * ready.length)];
    } else {
      // roulette wheel: r ∈ [0, sumW), накопичуємо ваги і дивимось у який інтервал потрапили
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

// СЖВ: N незалежних запусків, повертаємо найкращий (з мінімальним Z)
function stochasticGreedyAlgorithm(instance, beta = 1, N = 100) {
  const t0 = performance.now();
  let best = null;
  for (let r = 0; r < N; r++) {
    const cur = stochasticGreedyOnce(instance, beta);
    if (best === null || cur.Z < best.Z) best = cur;
  }
  return { S: best.S, Z: best.Z, timeMs: performance.now() - t0 };
}
