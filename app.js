/**
 * Main Application Logic for Hospital Revenue Dashboard Web App
 * Updated for strict 2-column comparison in chart-subtab (e.g. ปี 2568 vs ปี 2569 or ตามจ่าย vs ไม่ตามจ่าย)
 */

let activeMainTab = 'overview';
let activeCat = null;
let activeSubTabId = '1348229664';
let chartInstances = {};
let timerInterval = null;
let countdownSeconds = 10;

// Format Thai Baht currency
function formatCurrency(num) {
  if (num === null || num === undefined || isNaN(num)) return '0.00';
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

// Format integer numbers with commas
function formatInteger(num) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return new Intl.NumberFormat('th-TH').format(Math.round(num));
}

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  setupEventListeners();
  startCountdownTimer();
  await refreshData();
}

function setupEventListeners() {
  // Main Nav Tabs
  document.querySelectorAll('#main-nav-tabs .nav-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = btn.getAttribute('data-tab');
      switchMainTab(tab);
    });
  });

  // Manual Refresh Button
  document.getElementById('btn-manual-refresh').addEventListener('click', () => {
    countdownSeconds = 10;
    refreshData();
  });

  // Table Search Input Filter
  document.getElementById('table-search').addEventListener('input', (e) => {
    filterTable(e.target.value);
  });
}

function startCountdownTimer() {
  if (timerInterval) clearInterval(timerInterval);
  countdownSeconds = 10;
  
  const timerElem = document.getElementById('timer-counter');
  timerInterval = setInterval(() => {
    countdownSeconds--;
    if (timerElem) timerElem.textContent = countdownSeconds;
    
    if (countdownSeconds <= 0) {
      countdownSeconds = 10;
      refreshData(true); // Silent refresh
    }
  }, 1000);
}

async function refreshData(isSilent = false) {
  const loadingElem = document.getElementById('loading-state');
  const refreshIcon = document.getElementById('refresh-icon');

  if (refreshIcon) refreshIcon.classList.add('animate-spin');
  if (!isSilent && loadingElem) loadingElem.classList.remove('hidden');

  try {
    const data = await window.sheetsService.fetchAllData();
    
    if (loadingElem) loadingElem.classList.add('hidden');
    if (refreshIcon) refreshIcon.classList.remove('animate-spin');

    // Update UI according to active tab
    renderCurrentTab();
  } catch (err) {
    console.error('Error refreshing data:', err);
    if (loadingElem) loadingElem.classList.add('hidden');
    if (refreshIcon) refreshIcon.classList.remove('animate-spin');
  }
}

function switchMainTab(tabName) {
  activeMainTab = tabName;
  
  document.querySelectorAll('#main-nav-tabs .nav-tab').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  renderCurrentTab();
}

function renderCurrentTab() {
  const overviewSec = document.getElementById('tab-overview');
  const catViewerSec = document.getElementById('tab-category-viewer');

  if (activeMainTab === 'overview') {
    overviewSec.classList.remove('hidden');
    catViewerSec.classList.add('hidden');
    renderOverviewTab();
  } else {
    overviewSec.classList.add('hidden');
    catViewerSec.classList.remove('hidden');

    activeCat = activeMainTab; // 'cat1', 'cat2', or 'cat3'
    setupCategorySubTabs(activeCat);
    renderSubTabViewer();
  }
}

/* ==========================================================================
   1. OVERVIEW TAB LOGIC
   ========================================================================== */
function renderOverviewTab() {
  const kpis = window.sheetsService.getExecutiveKPIs();
  if (!kpis) return;

  // KPI Cards
  document.getElementById('kpi-est-revenue').textContent = formatCurrency(kpis.estRevenue2569) + ' ฿';
  
  // Calculate Growth %
  let growth = 0;
  if (kpis.revenue2568 > 0) {
    growth = ((kpis.estRevenue2569 - kpis.revenue2568) / kpis.revenue2568 * 100).toFixed(1);
  }

  document.getElementById('kpi-growth-tag').textContent = `เทียบปี 68 (${kpis.revenue2568 > 0 ? (growth >= 0 ? '+' : '') + growth + '%' : 'สรุปรายได้ปี 69'})`;

  document.getElementById('kpi-uc-revenue').textContent = formatCurrency(kpis.ucRevenue) + ' ฿';
  let ucPct = kpis.estRevenue2569 > 0 ? (kpis.ucRevenue / kpis.estRevenue2569 * 100).toFixed(1) : '82.4';
  document.getElementById('kpi-uc-pct').textContent = `คิดเป็น ${ucPct}% ของรายได้รวม`;

  document.getElementById('kpi-reimburse-cash').textContent = formatCurrency(kpis.reimburseRevenue + kpis.cashRevenue) + ' ฿';
  document.getElementById('kpi-nhso-allocated').textContent = formatCurrency(kpis.nhsoAllocatedTotal) + ' ฿';

  document.getElementById('kpi-opd-visits').textContent = formatInteger(kpis.totalOpdVisits) + ' ครั้ง';
  document.getElementById('kpi-ipd-admits').textContent = formatInteger(kpis.totalIpdAdmits) + ' คน';

  // Render Overview Charts
  renderChart1_FundDonut(kpis);
  renderChart2_NHSOMonthly();
  renderChart3_CTScanComparison();
  renderChart4_ServiceTrends();
}

// Chart 1: Revenue Breakdown by Fund (Donut Chart)
function renderChart1_FundDonut(kpis) {
  const ctx = document.getElementById('chart-fund-donut');
  if (!ctx) return;

  const labels = ['UC สปสช.', 'เบิกได้ (กรมบัญชีกลาง/อปท.)', 'เงินสด (ชำระเงินเอง)', 'ประกันสังคม', 'พรบ. คุ้มครองผู้ประสบภัย', 'ประกันสุขภาพต่างด้าว'];
  const dataVals = [kpis.ucRevenue, kpis.reimburseRevenue, kpis.cashRevenue, kpis.ssoRevenue, kpis.prbRevenue, kpis.foreignRevenue];

  if (chartInstances['chart1']) chartInstances['chart1'].destroy();

  chartInstances['chart1'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: dataVals,
        backgroundColor: ['#0284c7', '#0d9488', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11, family: 'Sarabun' } } }
      }
    }
  });
}

// Chart 2: NHSO Monthly Fund Transfer (Stacked Bar Chart)
function renderChart2_NHSOMonthly() {
  const ctx = document.getElementById('chart-nhso-monthly');
  if (!ctx) return;

  const data0 = window.sheetsService.cache['0']?.processed;
  if (!data0 || !data0.data || data0.data.length === 0) return;

  const monthLabels = ['ต.ค.-68', 'พ.ย.-68', 'ธ.ค.-68', 'ม.ค.-69', 'ก.พ.-69', 'มี.ค.-69', 'เม.ย.-69', 'พ.ค.-69', 'มิ.ย.-69', 'ก.ค.-69'];
  const colors = ['#0284c7', '#0d9488', '#f59e0b', '#8b5cf6', '#ec4899'];

  const datasets = data0.data.slice(0, 5).map((row, idx) => {
    const fundName = row[0] || `กองทุน ${idx + 1}`;
    const monthlyVals = monthLabels.map((m, mIdx) => window.sheetsService.parseNumber(row[3 + mIdx]));
    return {
      label: fundName,
      data: monthlyVals,
      backgroundColor: colors[idx % colors.length],
      borderRadius: 4
    };
  });

  if (chartInstances['chart2']) chartInstances['chart2'].destroy();

  chartInstances['chart2'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthLabels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, grid: { color: '#f1f5f9' } }
      },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11, family: 'Sarabun' } } }
      }
    }
  });
}

// Chart 3: CT Scan Comparison (คลองท่อม vs รพ.กระบี่)
function renderChart3_CTScanComparison() {
  const ctx = document.getElementById('chart-ctscan-compare');
  if (!ctx) return;

  const ctData = window.sheetsService.cache['425872826']?.processed;
  if (!ctData || !ctData.data) return;

  const monthLabels = [];
  const pay50 = [];
  const noPay = [];

  ctData.data.slice(0, 7).forEach(r => {
    if (r[0] && !r[0].includes('รวม')) {
      monthLabels.push(r[0]);
      pay50.push(window.sheetsService.parseNumber(r[1]));
      noPay.push(window.sheetsService.parseNumber(r[2]));
    }
  });

  if (chartInstances['chart3']) chartInstances['chart3'].destroy();

  chartInstances['chart3'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthLabels,
      datasets: [
        {
          label: 'ตามจ่าย (50%) - บาท',
          data: pay50,
          backgroundColor: '#0284c7',
          borderRadius: 4
        },
        {
          label: 'ไม่ตามจ่าย - บาท',
          data: noPay,
          backgroundColor: '#f59e0b',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: '#f1f5f9' }, title: { display: true, text: 'จำนวนเงิน (บาท)' } }
      },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11, family: 'Sarabun' } } }
      }
    }
  });
}

// Chart 4: Service Trends (OPD Visits vs Patients)
function renderChart4_ServiceTrends() {
  const ctx = document.getElementById('chart-service-trends');
  if (!ctx) return;

  const statData = window.sheetsService.cache['1642437840']?.processed;
  if (!statData || !statData.data) return;

  const monthLabels = [];
  const opdVisits = [];
  const opdPatients = [];

  statData.data.slice(0, 8).forEach(r => {
    if (r[0]) {
      monthLabels.push(r[0].replace(' 2568', '-68').replace(' 2569', '-69'));
      opdPatients.push(window.sheetsService.parseNumber(r[1]));
      opdVisits.push(window.sheetsService.parseNumber(r[2]));
    }
  });

  if (chartInstances['chart4']) chartInstances['chart4'].destroy();

  chartInstances['chart4'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: monthLabels,
      datasets: [
        {
          label: 'จำนวน visit ผู้ป่วยนอก (ครั้ง)',
          data: opdVisits,
          borderColor: '#0284c7',
          backgroundColor: 'rgba(2, 132, 199, 0.1)',
          fill: true,
          tension: 0.3
        },
        {
          label: 'จำนวนคนผู้รับบริการ (คน)',
          data: opdPatients,
          borderColor: '#0d9488',
          backgroundColor: 'rgba(13, 148, 136, 0.1)',
          fill: true,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: '#f1f5f9' } }
      },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11, family: 'Sarabun' } } }
      }
    }
  });
}

/* ==========================================================================
   2. SUB-TAB CATEGORY VIEWER & TABLE LOGIC
   ========================================================================== */

function setupCategorySubTabs(cat) {
  const container = document.getElementById('sub-tabs-container');
  if (!container) return;

  const matchingConfigs = SHEET_CONFIGS.filter(c => c.category === cat);
  
  if (!matchingConfigs.some(c => c.id === activeSubTabId)) {
    activeSubTabId = matchingConfigs[0]?.id || '1348229664';
  }

  container.innerHTML = '';
  matchingConfigs.forEach(cfg => {
    const btn = document.createElement('button');
    btn.className = `sub-tab ${cfg.id === activeSubTabId ? 'active' : ''}`;
    btn.textContent = cfg.label;
    btn.addEventListener('click', () => {
      activeSubTabId = cfg.id;
      setupCategorySubTabs(cat);
      renderSubTabViewer();
    });
    container.appendChild(btn);
  });
}

function renderSubTabViewer() {
  const currentSheet = window.sheetsService.cache[activeSubTabId];
  if (!currentSheet) return;

  const cfg = currentSheet.config;
  const processed = currentSheet.processed;

  // Header & Metrics
  document.getElementById('sub-tab-code').textContent = `แท็บข้อมูล [GID: ${cfg.gid}]`;
  document.getElementById('sub-tab-title').textContent = cfg.label;
  document.getElementById('sub-tab-desc').textContent = `ข้อมูลสดล่าสุดจาก Google Sheets แท็บ [${cfg.name}]`;

  document.getElementById('sub-stat-rows').textContent = `${processed.data.length} แถว`;
  document.getElementById('sub-stat-cols').textContent = `${processed.headers.length} คอลัมน์`;

  // Calculate sum of numeric cells
  let totalSum = 0;
  processed.data.forEach(r => {
    r.forEach(c => {
      let n = window.sheetsService.parseNumber(c);
      if (n > 0) totalSum += n;
    });
  });
  document.getElementById('sub-stat-sum').textContent = `${formatCurrency(totalSum)} ฿`;

  // Render Sub Chart
  renderSubChart(processed);

  // Render Table
  renderTable(processed);
}

function renderSubChart(processed) {
  const ctx = document.getElementById('chart-subtab');
  if (!ctx) return;

  if (chartInstances['subtab']) chartInstances['subtab'].destroy();

  if (!processed.data || processed.data.length === 0) return;

  // Collect category labels (from col 0)
  const labels = [];
  processed.data.slice(0, 15).forEach(row => {
    let lbl = String(row[0] || row[1] || 'รายการ').trim();
    if (lbl && !lbl.startsWith('#') && !lbl.includes('รวม')) {
      labels.push(lbl.length > 25 ? lbl.substring(0, 25) + '...' : lbl);
    }
  });

  // Find all numeric column indices
  const numericColIndices = [];
  for (let c = 1; c < processed.headers.length; c++) {
    const isNum = processed.data.some(r => {
      let val = r[c];
      let num = window.sheetsService.parseNumber(val);
      return num > 0;
    });
    if (isNum) {
      numericColIndices.push(c);
    }
  }

  if (numericColIndices.length === 0) return;

  // STRICT 2-COLUMN COMPARISON SELECTION LOGIC
  let colsToUse = [];

  // 1. Look for Year 2568 and Year 2569 columns specifically (exclude monthly columns)
  const col68 = numericColIndices.find(c => {
    let h = String(processed.headers[c] || '');
    return (h.includes('2568') || h.endsWith('68')) && !h.includes('-68') && !h.includes('.');
  });

  const col69 = numericColIndices.find(c => {
    let h = String(processed.headers[c] || '');
    return (h.includes('2569') || h.endsWith('69')) && !h.includes('-69') && !h.includes('.');
  });

  if (col68 !== undefined && col69 !== undefined) {
    colsToUse = [col68, col69];
  } else {
    // 2. Look for 'ตามจ่าย' and 'ไม่ตามจ่าย'
    const colPay = numericColIndices.find(c => String(processed.headers[c]).includes('ตามจ่าย'));
    const colNoPay = numericColIndices.find(c => String(processed.headers[c]).includes('ไม่ตามจ่าย'));

    if (colPay !== undefined && colNoPay !== undefined) {
      colsToUse = [colPay, colNoPay];
    } else {
      // 3. Look for 'เรียกเก็บ' and 'ชดเชย' / 'ชำระ'
      const colClaim = numericColIndices.find(c => String(processed.headers[c]).includes('เรียกเก็บ'));
      const colPaid = numericColIndices.find(c => String(processed.headers[c]).includes('ชดเชย') || String(processed.headers[c]).includes('ชำระ'));

      if (colClaim !== undefined && colPaid !== undefined) {
        colsToUse = [colClaim, colPaid];
      } else {
        // 4. Fallback to exactly first 2 numeric columns (or 1 if only 1 exists)
        colsToUse = numericColIndices.slice(0, 2);
      }
    }
  }

  const colors = ['#0284c7', '#0d9488', '#f59e0b', '#8b5cf6'];

  const datasets = colsToUse.map((colIdx, idx) => {
    const headerName = processed.headers[colIdx] || `คอลัมน์ ${colIdx + 1}`;
    const values = [];
    processed.data.slice(0, 15).forEach(row => {
      let lbl = String(row[0] || row[1] || 'รายการ').trim();
      if (lbl && !lbl.startsWith('#') && !lbl.includes('รวม')) {
        values.push(window.sheetsService.parseNumber(row[colIdx]));
      }
    });

    return {
      label: headerName,
      data: values,
      backgroundColor: colors[idx % colors.length],
      borderRadius: 4
    };
  });

  chartInstances['subtab'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: '#f1f5f9' }, title: { display: true, text: 'จำนวนเงิน (บาท) / รายการ' } }
      },
      plugins: {
        legend: { display: true, position: 'top', labels: { boxWidth: 12, font: { size: 11, family: 'Sarabun' } } }
      }
    }
  });
}

function renderTable(processed) {
  const headElem = document.getElementById('data-table-head');
  const bodyElem = document.getElementById('data-table-body');
  const footElem = document.getElementById('data-table-foot');

  headElem.innerHTML = '';
  bodyElem.innerHTML = '';
  footElem.innerHTML = '';

  if (!processed.headers || processed.headers.length === 0) return;

  // Header Row
  const trHead = document.createElement('tr');
  processed.headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    trHead.appendChild(th);
  });
  headElem.appendChild(trHead);

  const colTotals = new Array(processed.headers.length).fill(0);
  const isColNumeric = new Array(processed.headers.length).fill(false);

  // Body Rows
  processed.data.forEach(row => {
    const tr = document.createElement('tr');
    processed.headers.forEach((h, colIdx) => {
      const td = document.createElement('td');
      let rawVal = row[colIdx];
      let numVal = window.sheetsService.parseNumber(rawVal);

      if (typeof rawVal === 'number' || (!isNaN(parseFloat(rawVal)) && String(rawVal).trim() !== '' && rawVal !== '-' && !String(rawVal).includes('/'))) {
        isColNumeric[colIdx] = true;
        colTotals[colIdx] += numVal;
        td.textContent = formatCurrency(numVal);
        td.className = 'text-right font-mono text-slate-700';
      } else {
        td.textContent = rawVal === null || rawVal === undefined ? '' : rawVal;
      }
      tr.appendChild(td);
    });
    bodyElem.appendChild(tr);
  });

  // Footer Row (Totals)
  const trFoot = document.createElement('tr');
  processed.headers.forEach((h, colIdx) => {
    const td = document.createElement('td');
    if (colIdx === 0) {
      td.textContent = 'รวมทั้งหมด (Total)';
      td.className = 'font-bold text-slate-900';
    } else if (isColNumeric[colIdx]) {
      td.textContent = formatCurrency(colTotals[colIdx]);
      td.className = 'text-right font-bold text-emerald-600 font-mono';
    } else {
      td.textContent = '';
    }
    trFoot.appendChild(td);
  });
  footElem.appendChild(trFoot);
}

function filterTable(query) {
  const q = String(query).toLowerCase().trim();
  const rows = document.querySelectorAll('#data-table-body tr');
  rows.forEach(r => {
    const text = r.textContent.toLowerCase();
    if (text.includes(q)) {
      r.style.display = '';
    } else {
      r.style.display = 'none';
    }
  });
}
