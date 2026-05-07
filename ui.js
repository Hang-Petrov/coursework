// UI: обробники подій, рендер таблиці компонентів, Гантт-діаграми та графіків (SVG).

const $ = id => document.getElementById(id);

// перемикання вкладок
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    $("tab-" + btn.dataset.tab).classList.add("active");
  });
});

let currentInstance = null;
let lastExperimentResult = null;       // потрібен для експорту CSV

// Таблиця компонентів

function renderComponentsTable(n, t = null, u = null) {
  const tbody = document.querySelector("#components-table tbody");
  tbody.innerHTML = "";
  for (let i = 1; i <= n; i++) {
    const tr = document.createElement("tr");
    const tVal = (t && t[i] !== undefined) ? t[i] : 1;
    const uVal = (u && u[i] !== undefined) ? u[i] : 1;
    tr.innerHTML = `
      <td>C${i}</td>
      <td><input type="number" min="1" data-row="${i}" data-col="t" value="${tVal}" /></td>
      <td><input type="number" min="1" data-row="${i}" data-col="u" value="${uVal}" /></td>
    `;
    tbody.appendChild(tr);
  }
}

function readComponentsTable() {
  const n = parseInt($("inp-n").value, 10);
  const t = [0], u = [0];
  for (let i = 1; i <= n; i++) {
    const tInp = document.querySelector(`#components-table input[data-row="${i}"][data-col="t"]`);
    const uInp = document.querySelector(`#components-table input[data-row="${i}"][data-col="u"]`);
    t.push(tInp ? parseInt(tInp.value, 10) || 1 : 1);
    u.push(uInp ? parseInt(uInp.value, 10) || 1 : 1);
  }
  return { t, u };
}

// "1→3, 2→4\n3→5" → [[1,3],[2,4],[3,5]]
function parseDependencies(text, n) {
  if (!text) return [];
  const parts = text.split(/[,\n]/).map(s => s.trim()).filter(s => s.length > 0);
  const P = [];
  for (const p of parts) {
    const m = p.match(/^(\d+)\s*[->→]+\s*(\d+)$/);
    if (!m) throw new Error(`Не вдалося розпізнати пару: «${p}» (формат: i→j)`);
    const i = parseInt(m[1], 10), j = parseInt(m[2], 10);
    if (i < 1 || i > n || j < 1 || j > n) throw new Error(`Індекс поза [1, ${n}] у парі «${p}»`);
    if (i === j) throw new Error(`Петля заборонена: «${p}»`);
    P.push([i, j]);
  }
  if (!isAcyclic(n, P)) throw new Error("Множина P містить замкнену послідовність передувань!");
  return P;
}

function formatDependencies(P) {
  return P.map(([i, j]) => `${i}→${j}`).join(", ");
}

function readCurrentInstance() {
  const n = parseInt($("inp-n").value, 10);
  const m = parseInt($("inp-m").value, 10);
  const { t, u } = readComponentsTable();
  const P = parseDependencies($("inp-dependencies").value, n);
  return { n, m, t, u, P };
}

function setCurrentInstance(inst) {
  currentInstance = inst;
  $("inp-n").value = inst.n;
  $("inp-m").value = inst.m;
  renderComponentsTable(inst.n, inst.t, inst.u);
  $("inp-dependencies").value = formatDependencies(inst.P);
}

// Кнопки на вкладці «Індивідуальна задача»

$("inp-n").addEventListener("change", () => {
  const n = parseInt($("inp-n").value, 10);
  if (n >= 1) renderComponentsTable(n);
});

$("btn-generate").addEventListener("click", () => {
  try {
    const n = parseInt($("inp-n").value, 10);
    const m = parseInt($("inp-m").value, 10);
    const D = parseFloat($("inp-d").value);
    const inst = generateInstance(n, m, [1, 10], [1, 10], D);
    setCurrentInstance(inst);
    $("results-area").innerHTML = '<p class="hint">ІЗ згенеровано. Натисніть «Розв\'язати».</p>';
  } catch (e) { alert("Помилка генерації: " + e.message); }
});

$("btn-load-example").addEventListener("click", () => {
  // приклад з п. 2.4 курсової (n=6) — для перевірки що ЖА видає Z=159
  const inst = {
    n: 6, m: 2,
    t: [0, 3, 2, 6, 1, 4, 2],
    u: [0, 4, 9, 2, 7, 5, 8],
    P: [[1, 3], [2, 5], [4, 6], [5, 6]]
  };
  setCurrentInstance(inst);
  $("results-area").innerHTML = '<p class="hint">Приклад завантажено. Натисніть «Розв\'язати».</p>';
});

$("btn-save-json").addEventListener("click", () => {
  try {
    const inst = readCurrentInstance();
    const blob = new Blob([JSON.stringify(inst, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `instance_n${inst.n}.json`;
    a.click();
  } catch (e) { alert("Помилка збереження: " + e.message); }
});

$("inp-load-json").addEventListener("change", evt => {
  const file = evt.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const inst = JSON.parse(e.target.result);
      setCurrentInstance(inst);
      $("results-area").innerHTML = '<p class="hint">ІЗ завантажено. Натисніть «Розв\'язати».</p>';
    } catch (err) { alert("Помилка завантаження JSON: " + err.message); }
  };
  reader.readAsText(file);
});

$("btn-solve-greedy").addEventListener("click", () => solveAndShow("greedy"));
$("btn-solve-stochastic").addEventListener("click", () => solveAndShow("stochastic"));
$("btn-solve-both").addEventListener("click", () => solveAndShow("both"));

function solveAndShow(mode) {
  try {
    const inst = readCurrentInstance();
    const beta = parseFloat($("inp-beta").value);
    const N = parseInt($("inp-runs").value, 10);
    const html = [];

    if (mode === "greedy" || mode === "both") {
      html.push(renderSolution("Жадібний алгоритм (ЖА)", greedyAlgorithm(inst), inst));
    }
    if (mode === "stochastic" || mode === "both") {
      const res = stochasticGreedyAlgorithm(inst, beta, N);
      html.push(renderSolution(`Алгоритм СЖВ (β = ${beta}, N = ${N})`, res, inst));
    }

    $("results-area").innerHTML = html.join("");
  } catch (e) { alert("Помилка розв'язання: " + e.message); }
}

function renderSolution(title, res, inst) {
  const lines = res.S.map((Sj, j) => {
    const items = Sj.map(([c, B, T]) => `(C${c}, ${B}, ${T})`).join(", ");
    return `<div>S<sub>${j + 1}</sub> = ${items || "—"}</div>`;
  }).join("");

  return `
    <div class="solution">
      <h3>${title}</h3>
      <div><b>Z</b> = ${res.Z}</div>
      <div><b>τ</b> = ${res.timeMs.toFixed(3)} мс</div>
      <div class="schedule-text">${lines}</div>
      <div class="gantt">${renderGantt(res.S, inst)}</div>
    </div>
  `;
}

// Гантт-діаграма (SVG)
function renderGantt(S, inst) {
  const m = S.length;
  const totalT = Math.max(1, ...S.flatMap(Sj => Sj.map(([, , T]) => T)));
  const W = 760, H = 60 + 50 * m, padL = 70, padR = 20, padT = 30;
  const xScale = (W - padL - padR) / totalT;
  const rowH = 32, rowGap = 14;

  const rects = [];
  const palette = ["#4F8EF7", "#66BB6A", "#FFA726", "#AB47BC", "#EF5350", "#26A69A"];

  for (let j = 0; j < m; j++) {
    const y = padT + j * (rowH + rowGap);
    rects.push(`<rect x="${padL}" y="${y}" width="${W - padL - padR}" height="${rowH}" fill="#f7f7f7" stroke="#ddd"/>`);
    rects.push(`<text x="${padL - 8}" y="${y + rowH / 2 + 4}" text-anchor="end" font-size="13">Викон. ${j + 1}</text>`);
    for (const [c, B, T] of S[j]) {
      const x = padL + B * xScale;
      const w = (T - B) * xScale;
      const color = palette[(c - 1) % palette.length];
      rects.push(`<rect x="${x}" y="${y + 2}" width="${w}" height="${rowH - 4}" fill="${color}" stroke="#333" rx="3"/>`);
      rects.push(`<text x="${x + w / 2}" y="${y + rowH / 2 + 4}" text-anchor="middle" font-size="12" fill="white">C${c}</text>`);
    }
  }

  // вісь часу
  const yAxis = padT + m * (rowH + rowGap) + 6;
  rects.push(`<line x1="${padL}" y1="${yAxis}" x2="${W - padR}" y2="${yAxis}" stroke="#333"/>`);
  const step = Math.max(1, Math.ceil(totalT / 15));
  for (let t = 0; t <= totalT; t += step) {
    const x = padL + t * xScale;
    rects.push(`<line x1="${x}" y1="${yAxis}" x2="${x}" y2="${yAxis + 4}" stroke="#333"/>`);
    rects.push(`<text x="${x}" y="${yAxis + 16}" text-anchor="middle" font-size="11">${t}</text>`);
  }
  rects.push(`<text x="${W - padR}" y="${yAxis + 28}" text-anchor="end" font-size="11" font-style="italic">час</text>`);

  return `<svg viewBox="0 0 ${W} ${H + 25}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;">${rects.join("")}</svg>`;
}

// Вкладка «Експерименти»

$("sel-experiment").addEventListener("change", () => {
  const t = $("sel-experiment").value;
  if (t === "N") $("exp-values").value = "10, 20, 50, 100, 200, 500, 1000";
  else if (t === "beta") $("exp-values").value = "0, 0.5, 1, 2, 3, 5, 10";
  else $("exp-values").value = "10, 20, 30, 50, 75, 100";
});

$("btn-run-experiment").addEventListener("click", () => {
  const type = $("sel-experiment").value;
  const cfg = {
    n: parseInt($("exp-n").value, 10),
    m: parseInt($("exp-m").value, 10),
    beta: parseFloat($("exp-beta").value),
    N: parseInt($("exp-N").value, 10),
    D: parseFloat($("exp-d").value),
    K: parseInt($("exp-k").value, 10),
  };
  const values = $("exp-values").value.split(",").map(s => parseFloat(s.trim())).filter(v => !isNaN(v));

  $("exp-progress").textContent = "Виконується експеримент… (це може зайняти кілька секунд)";

  // через setTimeout щоб встиг відмалюватись текст про прогрес
  setTimeout(() => {
    let result;
    try {
      if (type === "N") result = runExperimentN({ ...cfg, Nset: values.map(v => Math.round(v)) });
      else if (type === "beta") result = runExperimentBeta({ ...cfg, betaSet: values });
      else if (type === "dim_acc") result = runExperimentDimAccuracy({ ...cfg, nSet: values.map(v => Math.round(v)) });
      else if (type === "dim_time") result = runExperimentDimTime({ ...cfg, nSet: values.map(v => Math.round(v)) });

      lastExperimentResult = result;
      $("btn-export-csv").disabled = false;
      $("exp-progress").textContent = "";
      renderExperimentResult(result);
    } catch (e) {
      $("exp-progress").textContent = "";
      alert("Помилка: " + e.message);
    }
  }, 50);
});

function renderExperimentResult(res) {
  const tableHtml = `
    <h3>${res.title}</h3>
    <table class="results-table">
      <thead><tr>${res.header.map(h => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${res.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
  `;
  let chart1 = "", chart2 = "";
  if (res.chartData) chart1 = `<div class="chart">${renderLineChart(res.chartData)}</div>`;
  if (res.chartData2) chart2 = `<div class="chart">${renderLineChart(res.chartData2)}</div>`;
  $("exp-results-area").innerHTML = tableHtml + chart1 + chart2;
}

// Лінійний графік (SVG)
function renderLineChart(data) {
  const W = 700, H = 320, padL = 60, padR = 20, padT = 30, padB = 50;
  const series = data.series ? data.series : [{ name: data.yLabel, points: data.points }];
  const allPoints = series.flatMap(s => s.points);
  if (allPoints.length === 0) return "";

  const xs = allPoints.map(p => p.x);
  const ys = allPoints.map(p => p.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(0, ...ys), yMax = Math.max(...ys);
  const xR = xMax - xMin || 1, yR = yMax - yMin || 1;

  const sx = x => padL + ((x - xMin) / xR) * (W - padL - padR);
  const sy = y => H - padB - ((y - yMin) / yR) * (H - padT - padB);

  const palette = ["#4F8EF7", "#EF5350", "#66BB6A", "#FFA726"];
  const elements = [];

  elements.push(`<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="#333"/>`);
  elements.push(`<line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="#333"/>`);

  elements.push(`<text x="${(W - padL - padR) / 2 + padL}" y="${H - 10}" text-anchor="middle" font-size="13">${data.xLabel}</text>`);
  elements.push(`<text x="15" y="${(H - padT - padB) / 2 + padT}" text-anchor="middle" font-size="13" transform="rotate(-90, 15, ${(H - padT - padB) / 2 + padT})">${data.yLabel}</text>`);

  for (const p of allPoints.filter((p, i, a) => a.findIndex(q => q.x === p.x) === i)) {
    const x = sx(p.x);
    elements.push(`<line x1="${x}" y1="${H - padB}" x2="${x}" y2="${H - padB + 4}" stroke="#333"/>`);
    elements.push(`<text x="${x}" y="${H - padB + 18}" text-anchor="middle" font-size="11">${p.x}</text>`);
  }

  for (let k = 0; k <= 5; k++) {
    const y = padT + (1 - k / 5) * (H - padT - padB);
    const v = yMin + (k / 5) * yR;
    elements.push(`<line x1="${padL - 4}" y1="${y}" x2="${padL}" y2="${y}" stroke="#333"/>`);
    elements.push(`<text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="11">${v.toFixed(yR > 10 ? 0 : 2)}</text>`);
    elements.push(`<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#eee"/>`);
  }

  series.forEach((s, idx) => {
    const color = palette[idx % palette.length];
    const path = s.points.map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.x)} ${sy(p.y)}`).join(" ");
    elements.push(`<path d="${path}" fill="none" stroke="${color}" stroke-width="2"/>`);
    for (const p of s.points) elements.push(`<circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="3.5" fill="${color}"/>`);
  });

  if (series.length > 1) {
    series.forEach((s, idx) => {
      const color = palette[idx % palette.length];
      const lx = W - padR - 80, ly = padT + 16 + idx * 18;
      elements.push(`<rect x="${lx}" y="${ly - 9}" width="14" height="10" fill="${color}"/>`);
      elements.push(`<text x="${lx + 18}" y="${ly}" font-size="12">${s.name}</text>`);
    });
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;">${elements.join("")}</svg>`;
}

$("btn-export-csv").addEventListener("click", () => {
  if (!lastExperimentResult) return;
  const sep = ";";
  const lines = [];
  lines.push(lastExperimentResult.header.join(sep));
  for (const row of lastExperimentResult.rows) lines.push(row.join(sep));
  // BOM \uFEFF — щоб Excel правильно показував кирилицю
  const csv = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `experiment_${lastExperimentResult.type}.csv`;
  a.click();
});

renderComponentsTable(parseInt($("inp-n").value, 10));
