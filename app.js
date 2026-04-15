const SAMPLE_RATE = 128;
const DURATION = 2;
const N = SAMPLE_RATE * DURATION;

const state = {
  module: 'single',
  single: { amp: 1, freq: 5, phase: 0 },
  multi: {
    s1: { amp: 1.0, freq: 3, phase: 0 },
    s2: { amp: 0.8, freq: 8, phase: 0 },
    s3: { amp: 0.6, freq: 14, phase: 0 }
  },
  filter: {
    lowAmp: 1.0,
    lowFreq: 3,
    highAmp: 0.8,
    highFreq: 18,
    cutoff: 8,
    type: 'lowpass'
  }
};

const timeCanvas = document.getElementById('timeCanvas');
const freqCanvas = document.getElementById('freqCanvas');
const timeCtx = timeCanvas.getContext('2d');
const freqCtx = freqCanvas.getContext('2d');
const filterTimeBeforeCanvas = document.getElementById('filterTimeBeforeCanvas');
const filterTimeAfterCanvas = document.getElementById('filterTimeAfterCanvas');
const filterFreqBeforeCanvas = document.getElementById('filterFreqBeforeCanvas');
const filterFreqAfterCanvas = document.getElementById('filterFreqAfterCanvas');
const filterTimeBeforeCtx = filterTimeBeforeCanvas.getContext('2d');
const filterTimeAfterCtx = filterTimeAfterCanvas.getContext('2d');
const filterFreqBeforeCtx = filterFreqBeforeCanvas.getContext('2d');
const filterFreqAfterCtx = filterFreqAfterCanvas.getContext('2d');
const standardPlots = document.getElementById('standard-plots');
const filterPlots = document.getElementById('filter-plots');
const explanationText = document.getElementById('explanationText');

init();

function init() {
  buildControlPanels();
  bindModuleSwitch();
  togglePlotLayout();
  updateAll();
}

function buildControlPanels() {
  const singleBox = document.getElementById('controls-single');
  singleBox.innerHTML = [
    sliderRow('single-amp', '幅值 A', 0, 2, 0.01, state.single.amp, 'single.amp'),
    sliderRow('single-freq', '频率 f (Hz)', 1, 30, 1, state.single.freq, 'single.freq'),
    sliderRow('single-phase', '相位 φ (°)', -180, 180, 1, state.single.phase, 'single.phase')
  ].join('');

  const multiBox = document.getElementById('controls-multi');
  multiBox.innerHTML = [
    groupTitle('正弦 1'),
    sliderRow('m1-amp', 'A1', 0, 2, 0.01, state.multi.s1.amp, 'multi.s1.amp'),
    sliderRow('m1-freq', 'f1 (Hz)', 1, 30, 1, state.multi.s1.freq, 'multi.s1.freq'),
    sliderRow('m1-phase', 'φ1 (°)', -180, 180, 1, state.multi.s1.phase, 'multi.s1.phase'),
    groupTitle('正弦 2'),
    sliderRow('m2-amp', 'A2', 0, 2, 0.01, state.multi.s2.amp, 'multi.s2.amp'),
    sliderRow('m2-freq', 'f2 (Hz)', 1, 30, 1, state.multi.s2.freq, 'multi.s2.freq'),
    sliderRow('m2-phase', 'φ2 (°)', -180, 180, 1, state.multi.s2.phase, 'multi.s2.phase'),
    groupTitle('正弦 3'),
    sliderRow('m3-amp', 'A3', 0, 2, 0.01, state.multi.s3.amp, 'multi.s3.amp'),
    sliderRow('m3-freq', 'f3 (Hz)', 1, 30, 1, state.multi.s3.freq, 'multi.s3.freq'),
    sliderRow('m3-phase', 'φ3 (°)', -180, 180, 1, state.multi.s3.phase, 'multi.s3.phase')
  ].join('');

  const filterBox = document.getElementById('controls-filter');
  filterBox.innerHTML = [
    groupTitle('输入信号分量'),
    sliderRow('fl-amp', '低频分量幅值', 0, 2, 0.01, state.filter.lowAmp, 'filter.lowAmp'),
    sliderRow('fl-freq', '低频分量频率 (Hz)', 1, 15, 1, state.filter.lowFreq, 'filter.lowFreq'),
    sliderRow('fh-amp', '高频分量幅值', 0, 2, 0.01, state.filter.highAmp, 'filter.highAmp'),
    sliderRow('fh-freq', '高频分量频率 (Hz)', 8, 40, 1, state.filter.highFreq, 'filter.highFreq'),
    groupTitle('滤波器参数'),
    sliderRow('cutoff', '截止频率 fc (Hz)', 1, 40, 1, state.filter.cutoff, 'filter.cutoff'),
    `<div class="control-item">
      <label for="filter-type">滤波器类型</label>
      <select id="filter-type" data-bind="filter.type">
        <option value="lowpass" ${state.filter.type === 'lowpass' ? 'selected' : ''}>低通滤波</option>
        <option value="highpass" ${state.filter.type === 'highpass' ? 'selected' : ''}>高通滤波</option>
      </select>
    </div>`
  ].join('');

  bindControlEvents();
}

function bindModuleSwitch() {
  document.querySelectorAll('input[name="module"]').forEach(el => {
    el.addEventListener('change', (e) => {
      state.module = e.target.value;
      document.querySelectorAll('.module-controls').forEach(box => box.classList.add('hidden'));
      document.getElementById(`controls-${state.module}`).classList.remove('hidden');
      togglePlotLayout();
      updateAll();
    });
  });
}

function togglePlotLayout() {
  const isFilter = state.module === 'filter';
  standardPlots.classList.toggle('hidden', isFilter);
  filterPlots.classList.toggle('hidden', !isFilter);
}

function bindControlEvents() {
  document.querySelectorAll('[data-bind]').forEach(input => {
    input.addEventListener('input', () => {
      const path = input.dataset.bind.split('.');
      setByPath(state, path, input.type === 'range' ? Number(input.value) : input.value);
      const valueEl = document.getElementById(`${input.id}-value`);
      if (valueEl) valueEl.textContent = formatValue(input.value, input.step);
      updateAll();
    });
  });
}

function updateAll() {
  if (state.module === 'single') {
    const x = synthSingle(state.single);
    const spec = dftMagnitude(x);
    drawTimePlot(timeCtx, timeCanvas, [x], ['#2358d8'], { yMin: -2.5, yMax: 2.5 });
    // 单正弦模块固定频谱纵轴，便于观察 A 改变时谱峰高度的真实变化
    drawFreqPlot(freqCtx, freqCanvas, [spec], ['#18a27a'], { yMin: 0, yMax: 1.2 });
    setExplanation(singleExplanation());
  } else if (state.module === 'multi') {
    const x = synthMulti(state.multi);
    const spec = dftMagnitude(x);
    const maxAbs = state.multi.s1.amp + state.multi.s2.amp + state.multi.s3.amp;
    drawTimePlot(timeCtx, timeCanvas, [x], ['#2358d8'], { yMin: -Math.max(1, maxAbs) * 1.2, yMax: Math.max(1, maxAbs) * 1.2 });
    drawFreqPlot(freqCtx, freqCanvas, [spec], ['#18a27a']);
    setExplanation(multiExplanation());
  } else {
    const { origin, filtered, originSpec, filteredSpec } = runFilterDemo(state.filter);
    const maxAbs = state.filter.lowAmp + state.filter.highAmp;
    const timeRange = { yMin: -Math.max(1, maxAbs) * 1.2, yMax: Math.max(1, maxAbs) * 1.2 };
    const freqRange = { yMin: 0, yMax: Math.max(1.2, maxAbs * 0.8) };
    drawTimePlot(filterTimeBeforeCtx, filterTimeBeforeCanvas, [origin], ['#7d3cff'], timeRange);
    drawTimePlot(filterTimeAfterCtx, filterTimeAfterCanvas, [filtered], ['#d83c3c'], timeRange);
    drawFreqPlot(filterFreqBeforeCtx, filterFreqBeforeCanvas, [originSpec], ['#9d83ff'], freqRange);
    drawFreqPlot(filterFreqAfterCtx, filterFreqAfterCanvas, [filteredSpec], ['#ff7a7a'], freqRange);
    setExplanation(filterExplanation(state.filter));
  }
}

function synthSingle(p) {
  const phase = degToRad(p.phase);
  return buildSignal((t) => p.amp * Math.sin(2 * Math.PI * p.freq * t + phase));
}

function synthMulti(p) {
  const c1 = degToRad(p.s1.phase);
  const c2 = degToRad(p.s2.phase);
  const c3 = degToRad(p.s3.phase);
  return buildSignal((t) =>
    p.s1.amp * Math.sin(2 * Math.PI * p.s1.freq * t + c1) +
    p.s2.amp * Math.sin(2 * Math.PI * p.s2.freq * t + c2) +
    p.s3.amp * Math.sin(2 * Math.PI * p.s3.freq * t + c3)
  );
}

function runFilterDemo(p) {
  const origin = buildSignal((t) =>
    p.lowAmp * Math.sin(2 * Math.PI * p.lowFreq * t) +
    p.highAmp * Math.sin(2 * Math.PI * p.highFreq * t)
  );

  const freq = dftComplex(origin);
  const filteredFreq = freq.map((bin, k) => {
    const fk = k <= N / 2 ? k * SAMPLE_RATE / N : (N - k) * SAMPLE_RATE / N;
    const keep = p.type === 'lowpass' ? fk <= p.cutoff : fk >= p.cutoff;
    return keep ? bin : { re: 0, im: 0 };
  });

  const filtered = idftReal(filteredFreq);
  return {
    origin,
    filtered,
    originSpec: complexToMagnitude(freq),
    filteredSpec: complexToMagnitude(filteredFreq)
  };
}

function buildSignal(generator) {
  const arr = new Array(N);
  for (let n = 0; n < N; n++) {
    arr[n] = generator(n / SAMPLE_RATE);
  }
  return arr;
}

function dftComplex(signal) {
  const out = new Array(N);
  for (let k = 0; k < N; k++) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < N; n++) {
      const a = -2 * Math.PI * k * n / N;
      re += signal[n] * Math.cos(a);
      im += signal[n] * Math.sin(a);
    }
    out[k] = { re, im };
  }
  return out;
}

function idftReal(freq) {
  const out = new Array(N);
  for (let n = 0; n < N; n++) {
    let sum = 0;
    for (let k = 0; k < N; k++) {
      const a = 2 * Math.PI * k * n / N;
      sum += freq[k].re * Math.cos(a) - freq[k].im * Math.sin(a);
    }
    out[n] = sum / N;
  }
  return out;
}

function dftMagnitude(signal) {
  return complexToMagnitude(dftComplex(signal));
}

function complexToMagnitude(cpx) {
  const half = N / 2;
  const mag = new Array(half + 1);
  for (let k = 0; k <= half; k++) {
    mag[k] = Math.hypot(cpx[k].re, cpx[k].im) / N;
  }
  return mag;
}

function drawTimePlot(ctx, canvas, seriesList, colors, options = {}) {
  clearCanvas(ctx, canvas);
  drawAxes(ctx, canvas, 't (s)', 'x(t)');

  const all = seriesList.flat();
  const autoY = Math.max(1e-6, ...all.map(v => Math.abs(v))) * 1.2;
  const yMin = Number.isFinite(options.yMin) ? options.yMin : -autoY;
  const yMax = Number.isFinite(options.yMax) ? options.yMax : autoY;

  seriesList.forEach((series, i) => {
    ctx.beginPath();
    ctx.strokeStyle = colors[i];
    ctx.lineWidth = 2;
    for (let n = 0; n < N; n++) {
      const x = mapX(n / (N - 1), canvas.width);
      const y = mapY(series[n], yMin, yMax, canvas.height);
      if (n === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });
}

function drawFreqPlot(ctx, canvas, specList, colors, options = {}) {
  clearCanvas(ctx, canvas);
  drawAxes(ctx, canvas, 'f (Hz)', '|X(f)|');

  const bins = specList[0].length;
  const fMax = SAMPLE_RATE / 2;
  const autoY = Math.max(1e-6, ...specList.flat()) * 1.2;
  const yMin = Number.isFinite(options.yMin) ? options.yMin : 0;
  const yMax = Number.isFinite(options.yMax) ? options.yMax : autoY;

  specList.forEach((spec, i) => {
    ctx.beginPath();
    ctx.strokeStyle = colors[i];
    ctx.lineWidth = 2;
    for (let k = 0; k < bins; k++) {
      const x = mapX(k / (bins - 1), canvas.width);
      const y = mapY(spec[k], yMin, yMax, canvas.height);
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });

  ctx.fillStyle = '#4b5d7a';
  ctx.font = '12px sans-serif';
  for (let f = 0; f <= fMax; f += 8) {
    const x = mapX(f / fMax, canvas.width);
    ctx.fillText(String(f), x - 6, canvas.height - 18);
  }
}

function drawAxes(ctx, canvas, xLabel, yLabel) {
  const w = canvas.width;
  const h = canvas.height;
  const left = 48;
  const right = w - 18;
  const top = 16;
  const bottom = h - 34;

  ctx.strokeStyle = '#9fb1cc';
  ctx.lineWidth = 1;
  ctx.strokeRect(left, top, right - left, bottom - top);

  for (let i = 1; i < 5; i++) {
    const y = top + i * (bottom - top) / 5;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.strokeStyle = '#edf2fa';
    ctx.stroke();
  }

  ctx.fillStyle = '#4b5d7a';
  ctx.font = '13px sans-serif';
  ctx.fillText(xLabel, w - 44, h - 10);
  ctx.fillText(yLabel, 8, 16);
}

function clearCanvas(ctx, canvas) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function mapX(norm, width) {
  const left = 48;
  const right = width - 18;
  return left + norm * (right - left);
}

function mapY(v, vMin, vMax, height) {
  const top = 16;
  const bottom = height - 34;
  if (vMax === vMin) return (top + bottom) / 2;
  const norm = (v - vMin) / (vMax - vMin);
  return bottom - norm * (bottom - top);
}

function sliderRow(id, label, min, max, step, value, bind) {
  return `<div class="control-item">
    <label for="${id}">${label}：<span id="${id}-value" class="value">${formatValue(value, step)}</span></label>
    <input id="${id}" data-bind="${bind}" type="range" min="${min}" max="${max}" step="${step}" value="${value}">
  </div>`;
}

function groupTitle(t) {
  return `<div class="group-title">${t}</div>`;
}

function setByPath(obj, path, value) {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
  cur[path[path.length - 1]] = value;
}

function formatValue(value, step) {
  const s = Number(step);
  return s >= 1 ? String(Math.round(Number(value))) : Number(value).toFixed(2);
}

function degToRad(deg) {
  return deg * Math.PI / 180;
}

function setExplanation(html) {
  explanationText.innerHTML = html;
}

function singleExplanation() {
  return `
    <p class="note"><strong>单正弦结论：</strong>时域里是一个正弦波，频域里会在对应频率位置出现明显谱峰。调大幅值 A，谱峰高度同步增大；改变相位 φ，主要影响时域平移，幅度谱位置基本不变。</p>
    <p class="note">建议学生观察：当频率从 5Hz 提高到 15Hz 时，时域振荡变密，频域谱峰向右移动，这就是“频率成分位置变化”的可视化体现。</p>
  `;
}

function multiExplanation() {
  return `
    <p class="note"><strong>叠加思想：</strong>任意复杂周期信号可以看作多个正弦（不同幅值/频率/相位）的线性组合。时域波形可能复杂，但频域会把它拆解成多个清晰谱峰。</p>
    <p class="note">建议课堂提问：如果把 A2 调为 0，频域中对应 f2 的谱峰会如何变化？学生可立即看到该峰消失，从而理解“某个频率分量被移除”。</p>
  `;
}

function filterExplanation(filterState) {
  const typeText = filterState.type === 'lowpass' ? '低通' : '高通';
  const suppressText = filterState.type === 'lowpass' ? '高频分量被抑制' : '低频分量被抑制';
  const remainText = filterState.type === 'lowpass' ? '低频成分' : '高频成分';
  return `
    <p class="note"><strong>${typeText}滤波教学解读：</strong>当前输入信号包含 ${filterState.lowFreq} Hz 和 ${filterState.highFreq} Hz 两个主要频率分量。截止频率为 ${filterState.cutoff} Hz，采用${typeText}滤波后，${suppressText}，因此输出信号主要保留${remainText}。</p>
    <p class="note">建议按“左上→右上→左下→右下”顺序观察四图：先比较时域前后差异，再在频域中验证对应频率峰值是否被保留或削弱。</p>
  `;
}
