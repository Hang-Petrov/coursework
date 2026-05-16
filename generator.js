function randInt(a, b) {
  return a + Math.floor(Math.random() * (b - a + 1));
}

function generateInstance(n, m, tRange = [1, 10], uRange = [1, 10], p = 0.3) {
  const [tmin, tmax] = tRange;
  const [umin, umax] = uRange;

  const t = [0];                          // 1-індексовані
  const u = [0];
  for (let i = 1; i <= n; i++) {
    t.push(randInt(tmin, tmax));
    u.push(randInt(umin, umax));
  }

  const P = [];
  for (let i = 1; i < n; i++) {
    for (let j = i + 1; j <= n; j++) {
      if (Math.random() < p) P.push([i, j]);
    }
  }

  return { n, m, t, u, P };
}

function isAcyclic(n, P) {
  const succ = Array.from({ length: n + 1 }, () => []);
  const indeg = Array(n + 1).fill(0);
  for (const [i, j] of P) {
    succ[i].push(j);
    indeg[j]++;
  }
  const q = [];
  for (let i = 1; i <= n; i++) if (indeg[i] === 0) q.push(i);
  let visited = 0;
  while (q.length) {
    const v = q.shift();
    visited++;
    for (const w of succ[v]) {
      indeg[w]--;
      if (indeg[w] === 0) q.push(w);
    }
  }
  return visited === n;
}