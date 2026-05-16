function runExperimentN(cfg) {
  const { n, m, beta, D, K, Nset } = cfg;
  const rows = [];

  const instances = [];
  for (let r = 0; r < K; r++) {
    instances.push(generateInstance(n, m, [1, 10], [1, 10], D));
  }

  for (const N of Nset) {
    let sumZ = 0, sumTau = 0;
    for (const inst of instances) {
      const res = stochasticGreedyAlgorithm(inst, beta, N);
      sumZ += res.Z;
      sumTau += res.timeMs;
    }
    rows.push([N, (sumZ / K).toFixed(2), (sumTau / K).toFixed(3)]);
  }

  return {
    type: "N",
    title: "Експеримент 3.3.2 — вплив параметра N на середнє Z та τ",
    header: ["N", "Zсер", "τсер, мс"],
    rows,
    chartData: {
      xLabel: "N", yLabel: "Zсер",
      points: rows.map(r => ({ x: r[0], y: parseFloat(r[1]) }))
    },
    chartData2: {
      xLabel: "N", yLabel: "τсер, мс",
      points: rows.map(r => ({ x: r[0], y: parseFloat(r[2]) }))
    }
  };
}

function runExperimentBeta(cfg) {
  const { n, m, N, D, K, betaSet } = cfg;
  const rows = [];

  const instances = [];
  for (let r = 0; r < K; r++) {
    instances.push(generateInstance(n, m, [1, 10], [1, 10], D));
  }

  for (const beta of betaSet) {
    let sumZ = 0, sumTau = 0;
    for (const inst of instances) {
      const res = stochasticGreedyAlgorithm(inst, beta, N);
      sumZ += res.Z;
      sumTau += res.timeMs;
    }
    rows.push([beta, (sumZ / K).toFixed(2), (sumTau / K).toFixed(3)]);
  }

  return {
    type: "beta",
    title: "Експеримент 3.3.3 — вплив параметра β на середнє Z",
    header: ["β", "Zсер", "τсер, мс"],
    rows,
    chartData: {
      xLabel: "β", yLabel: "Zсер",
      points: rows.map(r => ({ x: r[0], y: parseFloat(r[1]) }))
    }
  };
}

function runExperimentDimAccuracy(cfg) {
  const { m, beta, N, D, K, nSet } = cfg;
  const rows = [];

  for (const n of nSet) {
    let sumZG = 0, sumZS = 0;
    for (let r = 0; r < K; r++) {
      const inst = generateInstance(n, m, [1, 10], [1, 10], D);
      sumZG += greedyAlgorithm(inst).Z;
      sumZS += stochasticGreedyAlgorithm(inst, beta, N).Z;
    }
    const avgZG = sumZG / K;
    const avgZS = sumZS / K;
    const gap = avgZG > 0 ? ((avgZG - avgZS) / avgZG) * 100 : 0;
    rows.push([n, avgZG.toFixed(2), avgZS.toFixed(2), gap.toFixed(2)]);
  }

  return {
    type: "dim_acc",
    title: "Експеримент 3.3.4а — вплив n на точність",
    header: ["n", "Zсер ЖА", "Zсер СЖВ", "gap, %"],
    rows,
    chartData: {
      xLabel: "n", yLabel: "Zсер",
      series: [
        { name: "ЖА", points: rows.map(r => ({ x: r[0], y: parseFloat(r[1]) })) },
        { name: "СЖВ", points: rows.map(r => ({ x: r[0], y: parseFloat(r[2]) })) }
      ]
    },
    chartData2: {
      xLabel: "n", yLabel: "gap, %",
      points: rows.map(r => ({ x: r[0], y: parseFloat(r[3]) }))
    }
  };
}

function runExperimentDimTime(cfg) {
  const { m, beta, N, D, K, nSet } = cfg;
  const rows = [];

  for (const n of nSet) {
    let sumTG = 0, sumTS = 0;
    for (let r = 0; r < K; r++) {
      const inst = generateInstance(n, m, [1, 10], [1, 10], D);
      sumTG += greedyAlgorithm(inst).timeMs;
      sumTS += stochasticGreedyAlgorithm(inst, beta, N).timeMs;
    }
    rows.push([n, (sumTG / K).toFixed(3), (sumTS / K).toFixed(3)]);
  }

  return {
    type: "dim_time",
    title: "Експеримент 3.3.4б — вплив n на час роботи",
    header: ["n", "τсер ЖА, мс", "τсер СЖВ, мс"],
    rows,
    chartData: {
      xLabel: "n", yLabel: "τсер, мс",
      series: [
        { name: "ЖА", points: rows.map(r => ({ x: r[0], y: parseFloat(r[1]) })) },
        { name: "СЖВ", points: rows.map(r => ({ x: r[0], y: parseFloat(r[2]) })) }
      ]
    }
  };
}

function runExperimentM(cfg) {
  const { n, beta, N, D, K, mSet } = cfg;
  const rows = [];

  for (const m of mSet) {
    let sumZG = 0, sumZS = 0, sumTS = 0;
    for (let r = 0; r < K; r++) {
      const inst = generateInstance(n, m, [1, 10], [1, 10], D);
      sumZG += greedyAlgorithm(inst).Z;
      const s = stochasticGreedyAlgorithm(inst, beta, N);
      sumZS += s.Z;
      sumTS += s.timeMs;
    }
    const avgZG = sumZG / K;
    const avgZS = sumZS / K;
    const gap = avgZG > 0 ? ((avgZG - avgZS) / avgZG) * 100 : 0;
    rows.push([m, avgZG.toFixed(2), avgZS.toFixed(2), gap.toFixed(2), (sumTS / K).toFixed(3)]);
  }

  return {
    type: "m",
    title: "Експеримент — вплив кількості виконавців m",
    header: ["m", "Zсер ЖА", "Zсер СЖВ", "gap, %", "τсер СЖВ, мс"],
    rows,
    chartData: {
      xLabel: "m", yLabel: "Zсер",
      series: [
        { name: "ЖА", points: rows.map(r => ({ x: r[0], y: parseFloat(r[1]) })) },
        { name: "СЖВ", points: rows.map(r => ({ x: r[0], y: parseFloat(r[2]) })) }
      ]
    },
    chartData2: {
      xLabel: "m", yLabel: "gap, %",
      points: rows.map(r => ({ x: r[0], y: parseFloat(r[3]) }))
    }
  };
}