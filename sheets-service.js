/**
 * SheetsService: Service to fetch, parse, and process Google Sheets data
 * Google Sheet ID: 1yBSnSi38E2TN2kqxDU8y11--1xfFR0z41ye6Pc9KPnE
 * Supports multi-table fetching for combined sub-tabs.
 */

const SPREADSHEET_ID = '1yBSnSi38E2TN2kqxDU8y11--1xfFR0z41ye6Pc9KPnE';

const SHEET_CONFIGS = [
  // Group 1: สรุปรายรับ & กองทุนหลัก
  { id: 'compare_rev_exp', sheetName: 'เปรียบเทียบรายรับรายจ่ายปี69', category: 'cat1', name: 'เปรียบเทียบรายรับรายจ่ายปี69', label: 'เปรียบเทียบรายรับรายจ่ายปี 2569' },
  { id: '1348229664', gid: '1348229664', sheetName: 'รายรับทุกกองทุน', category: 'cat1', name: 'รายรับทุกกองทุน', label: '1. สรุปรายรับรวมทุกกองทุน (2568 vs 2569)' },
  { id: '636309133', gid: '636309133', sheetName: 'รายจ่ายทุกกองทุน', category: 'cat1', name: 'รายจ่ายทุกกองทุน', label: '2. สรุปรายจ่ายรวมทุกกองทุน (2568 vs 2569)' },
  { id: '0', gid: '0', sheetName: 'การโอนงบกองทุน สปสช.', category: 'cat1', name: 'การโอนเงินงบกองทุน สปสช.', label: '3. รายงานโอนงบกองทุน สปสช.' },
  //{ id: '1522372515', gid: '1522372515', sheetName: 'OPD - ตารางสรุปผลงานการเรียกเก็บรายได้ค่าบริการทางการแพทย์ 2569', category: 'cat1', name: 'สรุปรายได้ OPD 2569', label: '4. สรุปผลงานเรียกเก็บ OPD 2569' },
  //{ id: '336478031', gid: '336478031', sheetName: 'IPD - ตารางสรุปผลงานการเรียกเก็บรายได้ค่าบริการทางการแพทย์ 2569 จำนวน', category: 'cat1', name: 'สรุปรายได้ IPD 2569', label: '5. สรุปผลงานเรียกเก็บ IPD 2569' },

  // Group 2: สิทธิการรักษา & ลูกหนี้ค่ารักษา
  { 
    id: 'sso_combined', 
    category: 'cat2', 
    name: 'ประกันสังคม (OPD/IPD)', 
    label: '4. ประกันสังคม (OPD/IPD)',
    tables: [
      { name: 'ประกันสังคมเรียกเก็บ', title: 'ตารางรายงานสรุปประกันสังคมเรียกเก็บ' },
      { name: 'ประกันสังคมรายรับ', title: 'ตารางรายงานสรุปประกันสังคมรายรับ' }
    ]
  },
  { id: '392164043', gid: '392164043', sheetName: 'เบิกได้', category: 'cat2', name: 'เบิกต้นสังกัด (กรมบัญชีกลาง/อปท.)', label: '5. เบิกต้นสังกัด' },
  { id: '730847763', gid: '730847763', sheetName: 'เงินสด', category: 'cat2', name: 'ชำระเงินเอง (เงินสด)', label: '6. ชำระเงินเอง (เงินสด)' },
  { 
    id: 'foreign_combined', 
    category: 'cat2', 
    name: 'กองทุนประกันต่างด้าว', 
    label: '7. กองทุนประกันต่างด้าว',
    tables: [
      { name: 'ประกันสุขภาพต่างด้าว', title: 'ตารางรายงานสรุปกองทุนประกันสุขภาพต่างด้าว' },
      { name: 'ไม่มีบัตรประกัน', title: 'ตารางรายงานสรุปไม่มีบัตรประกัน' }
    ]
  },
  { id: '709303789', gid: '709303789', sheetName: 'พรบ.', category: 'cat2', name: 'สิทธิ พรบ.', label: '8. พ.ร.บ. คุ้มครองผู้ประสบภัย' },
  //{ id: '854828792', gid: '854828792', sheetName: 'ลูกหนี้ค่ารักษา', category: 'cat2', name: 'ลูกหนี้ค่ารักษาพยาบาล', label: '11. ลูกหนี้ค่ารักษาพยาบาล' },
  //{ id: '1754212297', gid: '1754212297', sheetName: 'บุคคลไร้สถานะและสิทธิ์', category: 'cat2', name: 'ลูกหนี้บุคคลไร้สถานะ', label: '12. ลูกหนี้บุคคลไร้สถานะ' },

  // Group 3: บริการเฉพาะทาง, CT Scan & สถิติ
  //{ id: '425872826', gid: '425872826', sheetName: 'CT scan-คลองท่อม', category: 'cat3', name: 'CT scan คลองท่อม', label: '13. CT Scan รพ.คลองท่อม' },
  //{ id: '1775364745', gid: '1775364745', sheetName: 'CT scan-กระบี่', category: 'cat3', name: 'CT scan รพ.กระบี่', label: '14. CT Scan รพ.กระบี่ (OPD)' },
  //{ id: '1018261975', gid: '1018261975', sheetName: 'PP Fs รายหน่วยบริการ', category: 'cat3', name: 'PP Fee Schedule', label: '15. PP Fee Schedule (สร้างเสริมสุขภาพ)' },
  //{ id: '1882338852', gid: '1882338852', sheetName: 'PP Fee schedule 69 จำนวน', category: 'cat3', name: 'PP Fee Schedule 69', label: '16. PP Fee Schedule 2569' },
  //{ id: '1237475376', gid: '1237475376', sheetName: 'บริการวัคซีน', category: 'cat3', name: 'บริการวัคซีน', label: '17. วัคซีนสร้างเสริมภูมิคุ้มกัน' },
  //{ id: '1877989780', gid: '1877989780', sheetName: 'EMS', category: 'cat3', name: 'EMS สพฉ.', label: '18. แพทย์ฉุกเฉิน (EMS สพฉ.)' },
  //{ id: '1076853556', gid: '1076853556', sheetName: 'Palliative Care', category: 'cat3', name: 'Palliative Care', label: '19. Palliative Care (ดูแลระยะสุดท้าย)' },
  //{ id: '301771837', gid: '301771837', sheetName: 'อุปกรณ์เทียม/บำบัด', category: 'cat3', name: 'อุปกรณ์เทียม/บำบัด', label: '20. อุปกรณ์เทียม & กายบำบัด' },
  //{ id: '1482513277', gid: '1482513277', sheetName: 'Seamless for DMIS', category: 'cat3', name: 'Seamless for DMIS', label: '21. Seamless for DMIS' },
  //{ id: '705249107', gid: '705249107', sheetName: 'สังคมสงเคราะห์', category: 'cat3', name: 'สังคมสงเคราะห์', label: '22. สังคมสงเคราะห์' },
  { 
    id: 'stats_combined', 
    category: 'cat3', 
    name: 'สถิติผู้ป่วย OPD & IPD', 
    label: '9. สถิติผู้ป่วย OPD & IPD',
    tables: [
      { name: 'ข้อมูลผู้ป่วยนอก', title: 'ตารางรายงานสรุปยอดบริการผู้ป่วยนอก (OPD)' },
      { name: 'ข้อมูลผู้ป่วยใน', title: 'ตารางรายงานสรุปยอดบริการผู้ป่วยใน (IPD)' }
    ]
  },
  //{ id: '326088154', gid: '326088154', sheetName: 'รายการทันตกรรม', category: 'cat3', name: 'รายการทันตกรรม', label: '24. รายการทันตกรรม' }
];

class SheetsService {
  constructor() {
    this.cache = {};
    this.isFetching = false;
  }

  getGVizUrlBySheetName(sheetName) {
    const encoded = encodeURIComponent(sheetName);
    return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encoded}`;
  }

  getGVizUrlByGid(gid) {
    return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
  }

  parseNumber(val) {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    let clean = String(val).replace(/,/g, '').trim();
    if (clean === '-' || clean === '' || clean === '#VALUE!' || clean === '#N/A') return 0;
    let n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  }

  async fetchSingleSheet(sheetName, gid) {
    let url = gid ? this.getGVizUrlByGid(gid) : this.getGVizUrlBySheetName(sheetName);
    try {
      let response = await fetch(url);
      if (!response.ok && sheetName) {
        url = this.getGVizUrlBySheetName(sheetName);
        response = await fetch(url);
      }
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const csvText = await response.text();
      
      return new Promise((resolve) => {
        Papa.parse(csvText, {
          header: false,
          skipEmptyLines: true,
          complete: (results) => {
            resolve(results.data);
          }
        });
      });
    } catch (err) {
      console.warn(`Error fetching sheet [${sheetName} / GID ${gid}]:`, err);
      return null;
    }
  }

  async fetchAllData() {
    if (this.isFetching) return this.cache;
    this.isFetching = true;

    const results = {};
    const fetchPromises = SHEET_CONFIGS.map(async (cfg) => {
      if (cfg.tables) {
        // Multi-table config
        const subTableResults = [];
        for (let tbl of cfg.tables) {
          const rows = await this.fetchSingleSheet(tbl.name);
          if (rows) {
            subTableResults.push({
              title: tbl.title,
              name: tbl.name,
              rawRows: rows,
              processed: this.processSheetData(tbl.name, rows)
            });
          }
        }
        results[cfg.id] = {
          config: cfg,
          multiTables: subTableResults,
          processed: subTableResults[0]?.processed || { headers: [], data: [] }
        };
      } else {
        // Single table config
        const rows = await this.fetchSingleSheet(cfg.sheetName, cfg.gid);
        if (rows) {
          results[cfg.id] = {
            config: cfg,
            rawRows: rows,
            processed: this.processSheetData(cfg.id, rows)
          };
        }
      }
    });

    await Promise.all(fetchPromises);
    this.cache = results;
    this.isFetching = false;
    return results;
  }

  // Enhanced Total/Summary Row Detector (filters out 'รวม', 'ยอดสะสม', 'Total')
  isTotalRow(row) {
    if (!row || !row.some(c => c !== null && c !== '')) return false;
    const cell0 = String(row[0] || '').trim().toLowerCase();
    const cell1 = String(row[1] || '').trim().toLowerCase();
    const combined = (cell0 + ' ' + cell1).trim();

    return cell0 === 'รวม' || 
           cell0 === 'total' || 
           cell0.includes('ยอดสะสม') ||
           cell0.includes('สะสม') ||
           cell0.startsWith('รวมทั้งสิ้น') || 
           cell0.startsWith('ยอดรวม') || 
           cell0.startsWith('รวมทั้งสองกลุ่ม') ||
           cell0 === 'รวมทั้งหมด' ||
           combined === 'รวม' ||
           combined.includes('ยอดสะสม') ||
           combined.startsWith('รวม');
  }

  processSheetData(sheetIdOrName, rows) {
    if (!rows || rows.length === 0) return { headers: [], data: [] };

    // Custom parsing per sheet layout
    if (sheetIdOrName === 'compare_rev_exp' || sheetIdOrName === 'เปรียบเทียบรายรับรายจ่ายปี69') {
      const dataRows = rows.slice(1).filter(r => {
        if (!r[0] || String(r[0]).trim() === '') return false;
        return !this.isTotalRow(r);
      });
      return {
        headers: ['กองทุน', 'รายรับ', 'รายจ่าย'],
        data: dataRows
      };
    }

    if (sheetIdOrName === '1348229664' || sheetIdOrName === '636309133' || sheetIdOrName === 'รายรับทุกกองทุน' || sheetIdOrName === 'รายจ่ายทุกกองทุน') {
      const dataRows = rows.slice(2).filter(r => {
        if (!r[0] || String(r[0]).trim() === '') return false;
        return !this.isTotalRow(r);
      });
      return {
        headers: [rows[0]?.[0] || 'กองทุน/สิทธิ', 'ปีงบประมาณ 2568 (บาท)', 'ปีงบประมาณ 2569 (บาท)'],
        data: dataRows
      };
    }

    if (sheetIdOrName === 'ข้อมูลผู้ป่วยนอก') {
      const dataRows = rows.slice(1).filter(r => {
        if (!r[0] || String(r[0]).trim() === '') return false;
        return !this.isTotalRow(r);
      });
      return {
        headers: ['เดือน', 'ผู้รับบริการ (คน)', 'จำนวนครั้ง (Visits)', 'เฉลี่ย/วัน', 'UCS', 'OFC', 'LGO', 'ประกันสังคม', 'พรบ.', 'ต่างด้าว', 'อื่นๆ'],
        data: dataRows
      };
    }

    if (sheetIdOrName === 'ข้อมูลผู้ป่วยใน') {
      const dataRows = rows.slice(1).filter(r => {
        if (!r[0] || String(r[0]).trim() === '') return false;
        return !this.isTotalRow(r);
      });
      return {
        headers: ['เดือน', 'Admit', 'UC', 'OFC', 'LGO', 'SSS', 'อื่นๆ', 'วันนอนรวม', 'วันนอน UC', 'วันนอน OFC', 'วันนอน LGO', 'วันนอน SSS', 'วันนอน อื่นๆ', 'อัตราครองเตียง (%)'],
        data: dataRows
      };
    }

    // Default header detection
    let headerIdx = 0;
    while (headerIdx < rows.length && (!rows[headerIdx] || rows[headerIdx].filter(c => c !== null && c !== '').length < 2)) {
      headerIdx++;
    }
    
    if (headerIdx >= rows.length) headerIdx = 0;

    const headers = rows[headerIdx].map(h => String(h || '').trim());
    const data = rows.slice(headerIdx + 1).filter(r => {
      if (!r || !r.some(c => c !== null && c !== '')) return false;
      return !this.isTotalRow(r);
    });

    return { headers, data };
  }

  getExecutiveKPIs() {
    if (!this.cache) return null;

    let estRevenue2569 = 0;
    let revenue2568 = 0;
    let ucRevenue = 0;
    let reimburseRevenue = 0;
    let cashRevenue = 0;
    let ssoRevenue = 0;
    let foreignRevenue = 0;
    let prbRevenue = 0;

    let estExpenses2569 = 0;
    let expenses2568 = 0;

    let nhsoAllocatedTotal = 0;
    let totalOpdVisits = 0;
    let totalIpdAdmits = 0;

    // 1. Revenue from Sheet 1348229664
    if (this.cache['1348229664']) {
      const parsed = this.cache['1348229664'].processed;
      if (parsed && parsed.data) {
        parsed.data.forEach(row => {
          let name = String(row[0] || '').trim();
          let v69 = this.parseNumber(row[2]);

          if (name.includes('UC') || name.includes('สปสช')) ucRevenue += v69;
          else if (name.includes('เบิกได้')) reimburseRevenue += v69;
          else if (name.includes('เงินสด')) cashRevenue += v69;
          else if (name.includes('ประกันสังคม')) ssoRevenue += v69;
          else if (name.includes('ต่างด้าว')) foreignRevenue += v69;
          else if (name.includes('พรบ')) prbRevenue += v69;
        });
      }

      const raw = this.cache['1348229664'].rawRows;
      if (raw) {
        raw.forEach(r => {
          if (r[0] && String(r[0]).trim() === 'รวม') {
            revenue2568 = this.parseNumber(r[1]);
            estRevenue2569 = this.parseNumber(r[2]);
          }
        });
      }
    }

    if (estRevenue2569 === 0) {
      estRevenue2569 = ucRevenue + reimburseRevenue + cashRevenue + ssoRevenue + foreignRevenue + prbRevenue;
    }

    // 2. Expenses from Sheet 636309133
    if (this.cache['636309133']) {
      const rawExp = this.cache['636309133'].rawRows;
      if (rawExp) {
        rawExp.forEach(r => {
          if (r[0] && String(r[0]).trim() === 'รวม') {
            expenses2568 = this.parseNumber(r[1]);
            estExpenses2569 = this.parseNumber(r[2]);
          }
        });
      }

      if (estExpenses2569 === 0 && this.cache['636309133'].processed?.data) {
        this.cache['636309133'].processed.data.forEach(row => {
          estExpenses2569 += this.parseNumber(row[2]);
        });
      }
    }

    const profitLoss = estRevenue2569 - estExpenses2569;

    // 3. OPD/IPD Stats from stats_combined
    if (this.cache['stats_combined']?.multiTables) {
      const opdTable = this.cache['stats_combined'].multiTables[0]?.processed;
      if (opdTable && opdTable.data) {
        opdTable.data.forEach(row => {
          totalOpdVisits += this.parseNumber(row[2]);
        });
      }
      const ipdTable = this.cache['stats_combined'].multiTables[1]?.processed;
      if (ipdTable && ipdTable.data) {
        ipdTable.data.forEach(row => {
          totalIpdAdmits += this.parseNumber(row[1]);
        });
      }
    }

    return {
      estRevenue2569,
      revenue2568,
      estExpenses2569,
      expenses2568,
      profitLoss,
      ucRevenue,
      reimburseRevenue,
      cashRevenue,
      ssoRevenue,
      foreignRevenue,
      prbRevenue,
      totalOpdVisits,
      totalIpdAdmits
    };
  }
}

// Global Singleton Instance
window.sheetsService = new SheetsService();
