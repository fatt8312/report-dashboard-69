/**
 * Main Application Logic for Hospital Revenue Dashboard Web App
 * Updated for:
 * 1. Robust Left Sub-Tab Chart Type detection: Donut Chart for Funds/Services, Line Chart ONLY for true Monthly Time-Series.
 * 2. Stacked Multi-Tables rendering for combined sub-tabs (e.g. OPD & IPD, SSO Claim & SSO Revenue, Foreign & No Card)
 * 3. Manual Refresh only (no auto-timer).
 * 4. Executive Overview Page with Revenue vs Expenses vs Profit/Loss & 3 Stacked Charts.
 * 5. Filtered data rows & exact Total Footer calculation (no double counting).
 */

let activeMainTab = 'overview';
let activeCat = null;
let activeSubTabId = '1348229664';
let chartInstances = {};

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
    refreshData();
  });
}

async function refreshData() {
  const loadingElem = document.getElementById('loading-state');
  const refreshIcon = document.getElementById('refresh-icon');

  if (refreshIcon) refreshIcon.classList.add('animate-spin');
  if (loadingElem) loadingElem.classList.remove('hidden');

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
   1. OVERVIEW TAB LOGIC (Matching Image 2 Mockup!)
   ========================================================================== */
function renderOverviewTab() {
  const kpis = window.sheetsService.getExecutiveKPIs();
  if (!kpis) return;

  // 1. Revenue Card
  document.getElementById('kpi-est-revenue').textContent = formatCurrency(kpis.estRevenue2569) + ' ฿';
  let revGrowth = 0;
  if (kpis.revenue2568 > 0) revGrowth = ((kpis.estRevenue2569 - kpis.revenue2568) / kpis.revenue2568 * 100).toFixed(1);
  document.getElementById('kpi-growth-tag').textContent = `เทียบปี 68 (${revGrowth >= 0 ? '+' : ''}${revGrowth}%)`;

  // 2. Expenses Card
  document.getElementById('kpi-est-expenses').textContent = formatCurrency(kpis.estExpenses2569) + ' ฿';
  let expGrowth = 0;
  if (kpis.expenses2568 > 0) expGrowth = ((kpis.estExpenses2569 - kpis.expenses2568) / kpis.expenses2568 * 100).toFixed(1);
  document.getElementById('kpi-exp-growth').textContent = `เทียบปี 68 (${expGrowth >= 0 ? '+' : ''}${expGrowth}%)`;

  // 3. Profit / Loss Card
  const plElem = document.getElementById('kpi-profit-loss');
  const plTagElem = document.getElementById('kpi-profit-tag');

  if (kpis.profitLoss >= 0) {
    plElem.textContent = '+' + formatCurrency(kpis.profitLoss) + ' ฿';
    plElem.className = 'text-2xl font-bold text-emerald-600';
    plTagElem.textContent = '(กำไร)';
    plTagElem.className = 'text-[11px] font-bold text-emerald-600';
  } else {
    plElem.textContent = formatCurrency(kpis.profitLoss) + ' ฿';
    plElem.className = 'text-2xl font-bold text-rose-600';
    plTagElem.textContent = '(ขาดทุน)';
    plTagElem.className = 'text-[11px] font-bold text-rose-600';
  }

  // Render Overview Charts (3 Charts)
  renderChart1_CompareBar();
  renderChart2_ServiceTrendsLine();
  renderChart3_IpdServiceTrendsLine();
}

function renderChart1_CompareBar() {
  const ctx = document.getElementById('chart-compare-bar');
  if (!ctx) return;

  const compareSheet = window.sheetsService.cache['compare_rev_exp'] || window.sheetsService.cache['เปรียบเทียบรายรับรายจ่ายปี69'];
  const compareData = compareSheet?.processed;

  const labels = [];
  const revenueVals = [];
  const expenseVals = [];

  if (compareData && compareData.data) {
    compareData.data.forEach(r => {
      let name = String(r[0] || '').trim();
      let rev = window.sheetsService.parseNumber(r[1]);
      let exp = window.sheetsService.parseNumber(r[2]);
      if (name && !name.includes('รวม') && (rev > 0 || exp > 0)) {
        labels.push(name);
        revenueVals.push(rev);
        expenseVals.push(exp);
      }
    });
  }

  // Fallback defaults if data is loading
  if (labels.length === 0) {
    labels.push('UC สปสช.', 'ประกันสังคม', 'เบิกได้', 'เงินสด', 'ประกันต่างด้าว', 'พรบ.');
    revenueVals.push(40400407.66, 1071465.11, 5117619.65, 1632242.00, 238765.00, 594151.00);
    expenseVals.push(42128062.26, 1829584.50, 5412783.00, 3906137.00, 228931.00, 626826.00);
  }

  if (chartInstances['chart1']) chartInstances['chart1'].destroy();

  chartInstances['chart1'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'รายรับ (บาท)',
          data: revenueVals,
          backgroundColor: '#0284c7', // Sky Blue
          borderRadius: 6,
          barPercentage: 0.7,
          categoryPercentage: 0.6
        },
        {
          label: 'รายจ่าย (บาท)',
          data: expenseVals,
          backgroundColor: '#f43f5e', // Rose Red
          borderRadius: 6,
          barPercentage: 0.7,
          categoryPercentage: 0.6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, font: { size: 12, family: 'Sarabun' } } },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              if (context.parsed.y !== null) {
                label += new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(context.parsed.y);
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          ticks: {
            callback: function(value) {
              if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
              if (value >= 1e3) return (value / 1e3).toFixed(0) + 'k';
              return value;
            }
          },
          grid: { color: '#f1f5f9' }
        }
      }
    }
  });
}

function renderChart2_ServiceTrendsLine() {
  const ctx = document.getElementById('chart-service-trends');
  if (!ctx) return;

  const statData = window.sheetsService.cache['stats_combined']?.multiTables?.[0]?.processed || window.sheetsService.cache['1642437840']?.processed;
  if (!statData || !statData.data) return;

  const monthLabels = [];
  const opdVisits = [];
  const opdPatients = [];

  statData.data.slice(0, 9).forEach(r => {
    if (r[0]) {
      monthLabels.push(r[0].replace(' 2568', '-68').replace(' 2569', '-69'));
      opdPatients.push(window.sheetsService.parseNumber(r[1]));
      opdVisits.push(window.sheetsService.parseNumber(r[2]));
    }
  });

  if (chartInstances['chart2']) chartInstances['chart2'].destroy();

  chartInstances['chart2'] = new Chart(ctx, {
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

function renderChart3_IpdServiceTrendsLine() {
  const ctx = document.getElementById('chart-ipd-service-trends');
  if (!ctx) return;

  const ipdData = window.sheetsService.cache['stats_combined']?.multiTables?.[1]?.processed || window.sheetsService.cache['ข้อมูลผู้ป่วยใน']?.processed;
  if (!ipdData || !ipdData.data) return;

  const monthLabels = [];
  const ipdAdmits = [];
  const ipdStayDays = [];

  ipdData.data.forEach(r => {
    if (r[0]) {
      monthLabels.push(r[0].replace(' 2568', '-68').replace(' 2569', '-69'));
      ipdAdmits.push(window.sheetsService.parseNumber(r[1]));
      ipdStayDays.push(window.sheetsService.parseNumber(r[7]));
    }
  });

  if (chartInstances['chart3']) chartInstances['chart3'].destroy();

  chartInstances['chart3'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: monthLabels,
      datasets: [
        {
          label: 'จำนวนวันนอนรวม (วัน)',
          data: ipdStayDays,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: true,
          tension: 0.3
        },
        {
          label: 'จำนวนผู้ป่วยใน Admit (คน)',
          data: ipdAdmits,
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
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
   2. SUB-TAB CATEGORY VIEWER & STACKED TABLES LOGIC
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

  // Header & Info
  document.getElementById('sub-tab-code').textContent = cfg.gid ? `แท็บข้อมูล [GID: ${cfg.gid}]` : `แท็บข้อมูลผสม [COMBINED]`;
  document.getElementById('sub-tab-title').textContent = cfg.label;
  document.getElementById('sub-tab-desc').textContent = `ข้อมูลสดล่าสุดจาก Google Sheets [${cfg.name}]`;

  // Determine Comparison Columns (Col 1 vs Col 2)
  const colsToUse = getComparisonColumns(processed);
  const col1Idx = colsToUse[0] !== undefined ? colsToUse[0] : 1;
  const col2Idx = colsToUse[1] !== undefined ? colsToUse[1] : 2;

  // 1. Calculate Top Comparison Metric Cards
  renderTopComparisonCards(processed, col1Idx, col2Idx);

  // 2. Render Left Sub-Tab Chart (ROBUST detection: Donut for funds/services, Line ONLY for true monthly series)
  renderLeftSubChart(processed, col2Idx !== undefined ? col2Idx : col1Idx);

  // 3. Render Right Bar Comparison Chart
  renderSubChart(processed, colsToUse);

  // 4. Render Dynamic Stacked Tables
  renderTablesWrapper(currentSheet);
}

function getComparisonColumns(processed) {
  if (!processed.headers || processed.headers.length <= 1) return [1];

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

  if (numericColIndices.length === 0) return [1];

  const col68 = numericColIndices.find(c => {
    let h = String(processed.headers[c] || '');
    return (h.includes('2568') || h.endsWith('68')) && !h.includes('-68') && !h.includes('.');
  });

  const col69 = numericColIndices.find(c => {
    let h = String(processed.headers[c] || '');
    return (h.includes('2569') || h.endsWith('69')) && !h.includes('-69') && !h.includes('.');
  });

  if (col68 !== undefined && col69 !== undefined) {
    return [col68, col69];
  }

  const colPay = numericColIndices.find(c => String(processed.headers[c]).includes('ตามจ่าย'));
  const colNoPay = numericColIndices.find(c => String(processed.headers[c]).includes('ไม่ตามจ่าย'));

  if (colPay !== undefined && colNoPay !== undefined) {
    return [colPay, colNoPay];
  }

  const colClaim = numericColIndices.find(c => String(processed.headers[c]).includes('เรียกเก็บ'));
  const colPaid = numericColIndices.find(c => String(processed.headers[c]).includes('ชดเชย') || String(processed.headers[c]).includes('ชำระ'));

  if (colClaim !== undefined && colPaid !== undefined) {
    return [colClaim, colPaid];
  }

  return numericColIndices.slice(0, 2);
}

function renderTopComparisonCards(processed, col1Idx, col2Idx) {
  const kpi1TitleElem = document.getElementById('sub-kpi1-title');
  const kpi1ValueElem = document.getElementById('sub-kpi1-value');
  const kpi1SubElem = document.getElementById('sub-kpi1-sub');

  const kpi2TitleElem = document.getElementById('sub-kpi2-title');
  const kpi2ValueElem = document.getElementById('sub-kpi2-value');
  const kpi2SubElem = document.getElementById('sub-kpi2-sub');

  const title1 = processed.headers[col1Idx] || 'ปีงบประมาณ 2568';
  const title2 = processed.headers[col2Idx] || 'ปีงบประมาณ 2569';

  let sum1 = 0;
  let sum2 = 0;
  let max1Val = 0;
  let max1Name = '';

  let max2Val = 0;
  let max2Name = '';

  processed.data.forEach(row => {
    let name = String(row[0] || row[1] || 'รายการ').trim();
    let v1 = window.sheetsService.parseNumber(row[col1Idx]);
    let v2 = window.sheetsService.parseNumber(row[col2Idx]);

    if (v1 > 0) {
      sum1 += v1;
      if (v1 > max1Val) { max1Val = v1; max1Name = name; }
    }

    if (v2 > 0) {
      sum2 += v2;
      if (v2 > max2Val) { max2Val = v2; max2Name = name; }
    }
  });

  kpi1TitleElem.textContent = title1;
  kpi1ValueElem.textContent = title1.includes('คน') || title1.includes('visit') || title1.includes('ครั้ง') ? `${formatInteger(sum1)}` : `${formatCurrency(sum1)} ฿`;
  kpi1SubElem.textContent = max1Name ? `สูงสุด: ${formatCurrency(max1Val)} (${max1Name})` : `รวมทุกรายการในคอลัมน์`;

  kpi2TitleElem.textContent = title2;
  kpi2ValueElem.textContent = title2.includes('คน') || title2.includes('visit') || title2.includes('ครั้ง') ? `${formatInteger(sum2)}` : `${formatCurrency(sum2)} ฿`;
  kpi2SubElem.textContent = max2Name ? `สูงสุด: ${formatCurrency(max2Val)} (${max2Name})` : `รวมทุกรายการในคอลัมน์`;
}

// ROBUST Left Sub-Tab Chart: Donut Chart for Categories/Funds, Line Chart ONLY for true Monthly Time-Series
function renderLeftSubChart(processed, targetColIdx) {
  const ctx = document.getElementById('chart-subtab-left');
  if (!ctx) return;

  if (chartInstances['subtabLeft']) chartInstances['subtabLeft'].destroy();

  if (!processed.data || processed.data.length === 0) return;

  const labels = [];
  const values = [];

  // Check if Column 0 is TRULY a monthly time series (e.g. >= 3 rows starting with month names like 'ตุลาคม 2568', '2568-10', etc.)
  const monthList = ['ตุลาคม', 'พฤศจิกายน', 'ธันวาคม', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', '2568-', '2569-'];
  
  let monthMatchCount = 0;
  processed.data.forEach(r => {
    let cellStr = String(r[0] || '').trim();
    if (monthList.some(m => cellStr.startsWith(m) || cellStr.startsWith('ต.ค') || cellStr.startsWith('พ.ย') || cellStr.startsWith('ธ.ค') || cellStr.startsWith('ม.ค') || cellStr.startsWith('ก.พ') || cellStr.startsWith('มี.ค') || cellStr.startsWith('เม.ย') || cellStr.startsWith('พ.ค') || cellStr.startsWith('มิ.ย') || cellStr.startsWith('ก.ค') || cellStr.startsWith('ส.ค') || cellStr.startsWith('ก.ย'))) {
      monthMatchCount++;
    }
  });

  const isMonthOrTime = monthMatchCount >= 3 && (monthMatchCount / processed.data.length) >= 0.4;

  processed.data.forEach(row => {
    let lbl = String(row[0] || row[1] || 'รายการ').trim();
    let val = window.sheetsService.parseNumber(row[targetColIdx]);
    if (lbl && !lbl.startsWith('#') && val > 0) {
      labels.push(lbl.length > 20 ? lbl.substring(0, 20) + '...' : lbl);
      values.push(val);
    }
  });

  const colors = ['#0284c7', '#0d9488', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', '#10b981', '#f43f5e', '#a855f7', '#06b6d4'];

  if (isMonthOrTime) {
    // Render LINE CHART for monthly time series (e.g. สถิติผู้ป่วย OPD & IPD)
    chartInstances['subtabLeft'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: processed.headers[targetColIdx] || 'แนวโน้มรายเดือน',
          data: values,
          borderColor: '#0284c7',
          backgroundColor: 'rgba(2, 132, 199, 0.15)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#0284c7'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: '#f1f5f9' } }
        },
        plugins: {
          legend: { display: true, position: 'top', labels: { boxWidth: 10, font: { size: 10, family: 'Sarabun' } } }
        }
      }
    });
  } else {
    // Render DONUT CHART for funds/services breakdown (e.g. รายงานโอนงบ สปสช., ประกันสังคม, etc.)
    chartInstances['subtabLeft'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.slice(0, 10),
        datasets: [{
          data: values.slice(0, 10),
          backgroundColor: colors.slice(0, Math.min(10, values.length))
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10, family: 'Sarabun' } } }
        }
      }
    });
  }
}

// Right Bar Chart: Comparison Chart
function renderSubChart(processed, colsToUse) {
  const ctx = document.getElementById('chart-subtab');
  if (!ctx) return;

  if (chartInstances['subtab']) chartInstances['subtab'].destroy();

  if (!processed.data || processed.data.length === 0) return;

  const labels = [];
  processed.data.slice(0, 15).forEach(row => {
    let lbl = String(row[0] || row[1] || 'รายการ').trim();
    if (lbl && !lbl.startsWith('#')) {
      labels.push(lbl.length > 25 ? lbl.substring(0, 25) + '...' : lbl);
    }
  });

  const colors = ['#0284c7', '#0d9488', '#f59e0b', '#8b5cf6'];

  const datasets = colsToUse.map((colIdx, idx) => {
    const headerName = processed.headers[colIdx] || `คอลัมน์ ${colIdx + 1}`;
    const values = [];
    processed.data.slice(0, 15).forEach(row => {
      let lbl = String(row[0] || row[1] || 'รายการ').trim();
      if (lbl && !lbl.startsWith('#')) {
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

/* ==========================================================================
   DYNAMIC STACKED TABLES RENDERER
   ========================================================================== */
function renderTablesWrapper(currentSheet) {
  const wrapper = document.getElementById('tables-wrapper');
  if (!wrapper) return;
  wrapper.innerHTML = '';

  if (currentSheet.multiTables && currentSheet.multiTables.length > 0) {
    currentSheet.multiTables.forEach((tbl, idx) => {
      const card = createTableCard(tbl.title, tbl.processed, `tbl-${idx}`);
      wrapper.appendChild(card);
    });
  } else {
    const card = createTableCard('ตารางข้อมูลฉบับเต็ม (Interactive Table)', currentSheet.processed, 'tbl-single');
    wrapper.appendChild(card);
  }
}

function createTableCard(title, processed, tableId) {
  const card = document.createElement('div');
  card.className = 'bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden';

  const headerDiv = document.createElement('div');
  headerDiv.className = 'p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3';

  headerDiv.innerHTML = `
    <div class="flex items-center gap-2">
      <i class="fa-solid fa-table text-sky-600 text-sm"></i>
      <h3 class="text-sm font-bold text-slate-800">${title}</h3>
    </div>
    <div class="flex items-center gap-3 w-full sm:w-auto">
      <div class="relative w-full sm:w-64">
        <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
        <input type="text" id="search-${tableId}" placeholder="ค้นหาในตาราง..." class="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent">
      </div>
    </div>
  `;

  const containerDiv = document.createElement('div');
  containerDiv.className = 'custom-table-container max-h-[500px]';

  const table = document.createElement('table');
  table.className = 'custom-table';
  table.id = `table-${tableId}`;

  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  tbody.id = `tbody-${tableId}`;
  const tfoot = document.createElement('tfoot');
  tfoot.className = 'bg-slate-100 font-bold border-t-2 border-slate-300';

  if (processed.headers) {
    const trHead = document.createElement('tr');
    processed.headers.forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
  }

  const colTotals = new Array(processed.headers.length).fill(0);
  const isColNumeric = new Array(processed.headers.length).fill(false);

  if (processed.data) {
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
      tbody.appendChild(tr);
    });
  }

  if (processed.headers) {
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
    tfoot.appendChild(trFoot);
  }

  table.appendChild(thead);
  table.appendChild(tbody);
  table.appendChild(tfoot);
  containerDiv.appendChild(table);

  card.appendChild(headerDiv);
  card.appendChild(containerDiv);

  setTimeout(() => {
    const searchInput = document.getElementById(`search-${tableId}`);
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const q = String(e.target.value).toLowerCase().trim();
        const rows = document.querySelectorAll(`#tbody-${tableId} tr`);
        rows.forEach(r => {
          if (r.textContent.toLowerCase().includes(q)) {
            r.style.display = '';
          } else {
            r.style.display = 'none';
          }
        });
      });
    }
  }, 50);

  return card;
}
