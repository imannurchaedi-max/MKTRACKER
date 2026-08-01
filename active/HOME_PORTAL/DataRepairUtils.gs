// ============================================================
//  DATA REPAIR UTILITIES - NFC DAM ACCESS CONTROL SYSTEM
//  PT Daya Anugrah Mulya
//  Domain: Spreadsheet repair and ordered historical rebuild
//  Dependencies: SharedLib.gs, GateFunctions.gs
// ============================================================

function showSpreadsheetAlert_(message) {
  try {
    SpreadsheetApp.getUi().alert(message);
  } catch (_) {}
}

function stringifyRepairSamples_(samples) {
  return (samples || []).map(function(sample) {
    return [
      sample.sheetName || '',
      'row ' + sample.rowNumber,
      sample.nik || '-',
      sample.tanggal || '-',
      sample.jam || '-',
      (sample.beforeShift || '-') + ' -> ' + (sample.afterShift || '-')
    ].join(' | ');
  });
}

function appendRepairLog_(actionName, payload) {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName('LOG');
    if (!sheet) {
      sheet = ss.insertSheet('LOG');
    }

    const headers = ['WAKTU', 'ACTION', 'STATUS', 'RINGKASAN', 'DETAIL'];
    ensureHeader(sheet, headers);

    const detail = JSON.stringify(payload || {});
    sheet.appendRow([
      formatDateTime(nowWIB()),
      asText(actionName),
      asText(payload && payload.ok ? 'OK' : 'FAIL'),
      asText(payload && payload.msg),
      detail
    ]);
  } catch (e) {
    Logger.log('appendRepairLog_ failed: ' + e.message);
  }
}

function normalizeSheetDateValue_(value) {
  const parsed = parseSheetDate(value);
  if (parsed) return formatDate(parsed);
  return asText(value).trim();
}

function normalizeDisplayedTimeValue_(rawValue, displayValue) {
  const displayNormalized = normalizeTimeValue(displayValue) || asText(displayValue).trim();
  if (displayNormalized) return displayNormalized;
  return normalizeTimeValue(rawValue);
}

function uniqueTextList_(values) {
  const seen = {};
  const result = [];
  (values || []).forEach(function(value) {
    const text = asText(value).trim();
    if (!text || seen[text]) return;
    seen[text] = true;
    result.push(text);
  });
  return result;
}

function sortFactoryRecapRows_(rows) {
  return (rows || []).slice().sort(function(a, b) {
    const dateA = parseSheetDate(a[0]);
    const dateB = parseSheetDate(b[0]);
    const timeA = dateA ? dateA.getTime() : 0;
    const timeB = dateB ? dateB.getTime() : 0;
    if (timeA !== timeB) return timeA - timeB;

    const nikA = asText(a[1]).trim();
    const nikB = asText(b[1]).trim();
    if (nikA !== nikB) return nikA.localeCompare(nikB);

    const masukA = normalizeTimeValue(a[5]);
    const masukB = normalizeTimeValue(b[5]);
    if (masukA !== masukB) return compareTimeValues(masukA, masukB);

    const keluarA = normalizeTimeValue(a[6]);
    const keluarB = normalizeTimeValue(b[6]);
    return compareTimeValues(keluarA, keluarB);
  });
}

function formatHistoricalRepairSummary_(report, title) {
  const heading = title || 'Pembersihan & pemulihan data sukses!';
  const renamedTabsCount = Array.isArray(report.renamedTabs) ? report.renamedTabs.length : (report.renamedTabs || 0);
  return heading + '\n' +
    '- Sheet diperbarui/di-rename: ' + renamedTabsCount + '\n' +
    '- NIK dibersihkan (.0): ' + (report.cleanedNiks || 0) + '\n' +
    '- Label Shift Masuk Dikoreksi: ' + (report.fixedMasukShifts || 0) + '\n' +
    '- Label Shift Keluar Dikoreksi: ' + (report.fixedKeluarShifts || 0) + '\n' +
    '- Rekap Dipasangkan (SELESAI): ' + (report.pairedSelesai || 0) + '\n' +
    '- Rekap Masuk Aktif (DI DALAM): ' + (report.activeDiDalam || 0) + '\n' +
    '- Rekap Keluar Tanpa Masuk: ' + (report.keluarTanpaMasuk || 0) + '\n' +
    '- Binding Terbuka (FREE): ' + (report.fixedBindings || 0) + '\n' +
    '- Total Baris Rekap Baru: ' + (report.repairedRecaps || 0);
}

function ensureFactoryHeaderSheets_() {
  const issues = [];
  Object.keys(SHEET_HEADERS).forEach(function(sheetName) {
    try {
      getSheet(sheetName);
    } catch (e) {
      issues.push(sheetName + ': ' + e.message);
    }
  });
  if (issues.length) {
    throw new Error('Header sheet bermasalah. Perbaiki dulu:\n- ' + issues.join('\n- '));
  }
}

function sanitizeSheetNikColumn_(sheetName, nikColIndex) {
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;

  const range = sheet.getRange(2, nikColIndex, lastRow - 1, 1);
  const values = range.getValues();
  let changed = false;
  let cleanedCount = 0;

  for (let i = 0; i < values.length; i++) {
    const rawValue = asText(values[i][0]).trim();
    const cleanValue = rawValue.replace(/\.0$/, '');
    if (rawValue !== cleanValue) {
      values[i][0] = cleanValue;
      changed = true;
      cleanedCount++;
    }
  }

  if (changed) {
    range.setValues(values);
  }
  return cleanedCount;
}

function buildFactoryAffectedDates_(tanggal, nik, timeValue, eventType) {
  const baseDate = normalizeSheetDateValue_(tanggal);
  const context = resolveFactoryWorkDate(baseDate, timeValue, eventType);
  return uniqueTextList_([baseDate, context && context.tanggal]);
}

function repairFactoryShiftColumn_(sheetName, eventType, shiftColIndex) {
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { fixedShiftCount: 0, cleanedNikCount: 0, sampleFixes: [] };
  }

  const range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
  const data = range.getValues();
  const displayData = range.getDisplayValues();
  let fixedShiftCount = 0;
  let cleanedNikCount = 0;
  let changed = false;
  const sampleFixes = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const displayRow = displayData[i] || [];

    const rawNik = asText(row[1]).trim();
    const nik = rawNik.replace(/\.0$/, '');
    if (nik && nik !== rawNik) {
      row[1] = nik;
      cleanedNikCount++;
      changed = true;
    }

    const tanggal = normalizeSheetDateValue_(displayRow[3]) || normalizeSheetDateValue_(row[3]);
    const jamStr = normalizeDisplayedTimeValue_(row[4], displayRow[4]);
    if (!tanggal || !jamStr) continue;

    const currentShift = asText(row[shiftColIndex - 1]).trim();
    const correctShift = detectShift(jamStr, eventType);
    if (correctShift && currentShift !== correctShift) {
      row[shiftColIndex - 1] = correctShift;
      fixedShiftCount++;
      changed = true;

      if (sampleFixes.length < 10) {
        sampleFixes.push({
          sheetName: sheetName,
          rowNumber: i + 2,
          nik: nik,
          tanggal: tanggal,
          jam: jamStr,
          beforeShift: currentShift,
          afterShift: correctShift
        });
      }
    }
  }

  if (changed) {
    range.setValues(data);
    SpreadsheetApp.flush();
  }

  return {
    fixedShiftCount: fixedShiftCount,
    cleanedNikCount: cleanedNikCount,
    sampleFixes: sampleFixes
  };
}

function collectFactoryLogEvents_(sheetName, eventType, options) {
  const config = options || {};
  const shiftColIndex = config.shiftColIndex || 6;
  const repairSheet = config.repairSheet === true;
  const nikFilter = asText(config.nikFilter).trim();
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { events: [], fixedShiftCount: 0, cleanedNikCount: 0 };
  }

  const range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
  const data = range.getValues();
  const displayData = range.getDisplayValues();
  const events = [];
  let fixedShiftCount = 0;
  let cleanedNikCount = 0;
  let changed = false;
  const sampleFixes = [];

  const karyawanMap = config.karyawanMap || getKaryawanMapByNIK();

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const displayRow = displayData[i] || [];
    const rawNik = asText(row[1]).trim();
    const nik = rawNik.replace(/\.0$/, '');
    const tanggal = normalizeSheetDateValue_(displayRow[3]) || normalizeSheetDateValue_(row[3]);
    const parsedDate = parseSheetDate(row[3]);
    const jamStr = normalizeDisplayedTimeValue_(row[4], displayRow[4]);

    if (repairSheet && nik && nik !== rawNik) {
      row[1] = nik;
      cleanedNikCount++;
      changed = true;
    }

    if (repairSheet) {
      const correctShift = jamStr ? detectShift(jamStr, eventType) : '';
      const currentShift = asText(row[shiftColIndex - 1]).trim();
      if (correctShift && correctShift !== currentShift) {
        row[shiftColIndex - 1] = correctShift;
        fixedShiftCount++;
        changed = true;
        if (sampleFixes.length < 10) {
          sampleFixes.push({
            sheetName: sheetName,
            rowNumber: i + 2,
            nik: nik,
            tanggal: tanggal,
            jam: jamStr,
            beforeShift: currentShift,
            afterShift: correctShift
          });
        }
      }
    }

    if (nikFilter && nik !== nikFilter) continue;
    if (!nik || !tanggal || !parsedDate || !jamStr) continue;

    const master = karyawanMap[nik] || {};
    const workContext = resolveFactoryWorkDate(tanggal, jamStr, eventType);
    const recapDate = asText(workContext.tanggal).trim() || tanggal;
    events.push({
      nik: nik,
      nama: asText(row[2]) || asText(master.nama),
      dept: asText(master.dept),
      jabatan: asText(master.jabatan),
      card: normalizeCard(row[0]),
      loker: asText(row[6] || ''),
      jamStr: jamStr,
      eventDate: tanggal,
      recapDate: recapDate,
      shift: asText(workContext.shiftLabel).trim() || detectShift(jamStr, eventType),
      timeMs: parsedDate.getTime() + (timeStrToMinutes(jamStr) || 0) * 60000,
      used: false
    });
  }

  if (changed) {
    range.setValues(data);
  }

  return {
    events: events,
    fixedShiftCount: fixedShiftCount,
    cleanedNikCount: cleanedNikCount,
    sampleFixes: sampleFixes
  };
}

function buildFactoryRecapRowsFromEvents_(masukEvents, keluarEvents) {
  const grouped = {};
  const rows = [];
  const stats = {
    pairedSelesai: 0,
    activeDiDalam: 0,
    keluarTanpaMasuk: 0
  };

  function ensureGroup(event) {
    const key = event.nik + '|' + event.recapDate;
    if (!grouped[key]) {
      grouped[key] = {
        tanggal: event.recapDate,
        nik: event.nik,
        nama: event.nama,
        dept: event.dept,
        jabatan: event.jabatan,
        firstMasuk: null,
        lastKeluar: null
      };
    }
    const group = grouped[key];
    if (!group.nama && event.nama) group.nama = event.nama;
    if (!group.dept && event.dept) group.dept = event.dept;
    if (!group.jabatan && event.jabatan) group.jabatan = event.jabatan;
    return group;
  }

  (masukEvents || []).forEach(function(event) {
    const group = ensureGroup(event);
    if (!group.firstMasuk || event.timeMs < group.firstMasuk.timeMs) {
      group.firstMasuk = event;
    }
  });

  (keluarEvents || []).forEach(function(event) {
    const group = ensureGroup(event);
    if (!group.lastKeluar || event.timeMs > group.lastKeluar.timeMs) {
      group.lastKeluar = event;
    }
  });

  Object.keys(grouped).forEach(function(key) {
    const group = grouped[key];
    const masukEvent = group.firstMasuk;
    const keluarEvent = group.lastKeluar;
    const jamMasuk = masukEvent ? masukEvent.jamStr : '';
    const jamKeluar = keluarEvent ? keluarEvent.jamStr : '';
    const status = getRecapStatus(jamMasuk, jamKeluar);

    rows.push([
      group.tanggal,
      group.nik,
      group.nama,
      group.dept,
      group.jabatan,
      jamMasuk,
      jamKeluar,
      status,
      masukEvent ? masukEvent.card : (keluarEvent ? keluarEvent.card : ''),
      masukEvent ? masukEvent.loker : (keluarEvent ? keluarEvent.loker : '')
    ]);

    if (status === 'SELESAI') {
      stats.pairedSelesai++;
    } else if (status === 'DI DALAM') {
      stats.activeDiDalam++;
    } else if (status === 'KELUAR TANPA MASUK') {
      stats.keluarTanpaMasuk++;
    }
  });

  return {
    rows: sortFactoryRecapRows_(rows),
    stats: stats
  };
}

function rewriteFactoryRecapSheet_(rows, options) {
  const config = options || {};
  const sheetRecap = getSheet(SHEET_RECAP_ABSEN);
  const recapWidth = SHEET_HEADERS[SHEET_RECAP_ABSEN].length;
  const recapLastRow = sheetRecap.getLastRow();
  const existingRows = recapLastRow > 1
    ? sheetRecap.getRange(2, 1, recapLastRow - 1, recapWidth).getValues()
    : [];
  let finalRows;

  if (config.nikFilter) {
    const targetNik = asText(config.nikFilter).trim();
    const affectedDates = uniqueTextList_(config.affectedDates || rows.map(function(row) { return row[0]; }));
    const affectedMap = {};
    affectedDates.forEach(function(dateText) {
      affectedMap[dateText] = true;
    });

    const keptRows = existingRows.filter(function(row) {
      const rowNik = asText(row[1]).trim();
      const rowDate = normalizeSheetDateValue_(row[0]);
      return !(rowNik === targetNik && affectedMap[rowDate]);
    });

    const replacementRows = rows.filter(function(row) {
      return affectedMap[normalizeSheetDateValue_(row[0])];
    });

    finalRows = sortFactoryRecapRows_(keptRows.concat(replacementRows));
  } else {
    finalRows = sortFactoryRecapRows_(rows);
  }

  if (recapLastRow > 1) {
    sheetRecap.getRange(2, 1, recapLastRow - 1, recapWidth).clearContent();
  }
  if (finalRows.length > 0) {
    sheetRecap.getRange(2, 1, finalRows.length, recapWidth).setValues(finalRows);
    sheetRecap.getRange(2, 6, finalRows.length, 2).setNumberFormat('@');
  }
  return finalRows.length;
}

function buildFactoryRecapRowsForNik_(nik) {
  const targetNik = asText(nik).trim().replace(/\.0$/, '');
  const karyawanMap = getKaryawanMapByNIK();
  const masukResult = collectFactoryLogEvents_(SHEET_MASUK_PABRIK, 'masuk', {
    nikFilter: targetNik,
    repairSheet: false,
    karyawanMap: karyawanMap
  });
  const keluarResult = collectFactoryLogEvents_(SHEET_KELUAR_PABRIK, 'keluar', {
    nikFilter: targetNik,
    repairSheet: false,
    karyawanMap: karyawanMap
  });
  return buildFactoryRecapRowsFromEvents_(masukResult.events, keluarResult.events);
}

function refreshFactoryRecapForNik_(nik, affectedDates) {
  const targetNik = asText(nik).trim().replace(/\.0$/, '');
  if (!targetNik) return { recapRows: 0, rows: [], stats: {} };

  const recapBuild = buildFactoryRecapRowsForNik_(targetNik);
  const dates = uniqueTextList_(affectedDates || recapBuild.rows.map(function(row) { return row[0]; }));
  const recapRows = rewriteFactoryRecapSheet_(recapBuild.rows, {
    nikFilter: targetNik,
    affectedDates: dates
  });

  try {
    CacheService.getScriptCache().removeAll(['absen:*']);
  } catch (_) {}

  return {
    recapRows: recapRows,
    rows: recapBuild.rows,
    affectedDates: dates,
    stats: recapBuild.stats
  };
}

function getFactoryFlowStatusFromLogs_(nik, tanggal) {
  const targetNik = asText(nik).trim().replace(/\.0$/, '');
  const targetDate = normalizeSheetDateValue_(tanggal);
  if (!targetNik || !targetDate) return '';

  const recapBuild = buildFactoryRecapRowsForNik_(targetNik);
  for (let i = 0; i < recapBuild.rows.length; i++) {
    const row = recapBuild.rows[i];
    if (asText(row[1]).trim() === targetNik && normalizeSheetDateValue_(row[0]) === targetDate) {
      return asText(row[7]).trim();
    }
  }
  return '';
}

function repairFactoryMasukLog_() {
  return repairFactoryShiftColumn_(SHEET_MASUK_PABRIK, 'masuk', 6);
}

function repairFactoryKeluarLog_() {
  return repairFactoryShiftColumn_(SHEET_KELUAR_PABRIK, 'keluar', 6);
}

function repairFactoryMasukLog() {
  return withDocumentLock(function() {
    try {
      ensureFactoryHeaderSheets_();
      const result = repairFactoryMasukLog_();
      const sampleLines = stringifyRepairSamples_(result.sampleFixes);
      const msg = 'Perbaikan log masuk selesai.\n' +
        '- NIK dibersihkan (.0): ' + result.cleanedNikCount + '\n' +
        '- Shift masuk dikoreksi: ' + result.fixedShiftCount +
        (sampleLines.length ? '\n\nContoh koreksi:\n- ' + sampleLines.slice(0, 5).join('\n- ') : '\n\nTidak ada baris yang perlu dikoreksi.');
      showSpreadsheetAlert_(msg);
      appendRepairLog_('repairFactoryMasukLog', { ok: true, msg: msg, report: result });
      return { ok: true, msg: msg, report: result };
    } catch (e) {
      const msg = 'Gagal perbaiki log masuk: ' + e.message;
      showSpreadsheetAlert_(msg);
      appendRepairLog_('repairFactoryMasukLog', { ok: false, msg: msg });
      return { ok: false, msg: msg };
    }
  });
}

function repairFactoryKeluarLog() {
  return withDocumentLock(function() {
    try {
      ensureFactoryHeaderSheets_();
      const result = repairFactoryKeluarLog_();
      const sampleLines = stringifyRepairSamples_(result.sampleFixes);
      const msg = 'Perbaikan log keluar selesai.\n' +
        '- NIK dibersihkan (.0): ' + result.cleanedNikCount + '\n' +
        '- Shift keluar dikoreksi: ' + result.fixedShiftCount +
        (sampleLines.length ? '\n\nContoh koreksi:\n- ' + sampleLines.slice(0, 5).join('\n- ') : '\n\nTidak ada baris yang perlu dikoreksi.');
      showSpreadsheetAlert_(msg);
      appendRepairLog_('repairFactoryKeluarLog', { ok: true, msg: msg, report: result });
      return { ok: true, msg: msg, report: result };
    } catch (e) {
      const msg = 'Gagal perbaiki log keluar: ' + e.message;
      showSpreadsheetAlert_(msg);
      appendRepairLog_('repairFactoryKeluarLog', { ok: false, msg: msg });
      return { ok: false, msg: msg };
    }
  });
}

function rebuildHistoricalRecapDataset_(options) {
  const config = options || {};
  const karyawanMap = getKaryawanMapByNIK();
  const masukResult = collectFactoryLogEvents_(SHEET_MASUK_PABRIK, 'masuk', {
    shiftColIndex: 6,
    repairSheet: config.repairLogs === true,
    karyawanMap: karyawanMap
  });
  const keluarResult = collectFactoryLogEvents_(SHEET_KELUAR_PABRIK, 'keluar', {
    shiftColIndex: 6,
    repairSheet: config.repairLogs === true,
    karyawanMap: karyawanMap
  });

  const recapBuild = buildFactoryRecapRowsFromEvents_(masukResult.events, keluarResult.events);
  const recapRows = rewriteFactoryRecapSheet_(recapBuild.rows);
  const report = {
    fixedMasukShifts: masukResult.fixedShiftCount,
    fixedKeluarShifts: keluarResult.fixedShiftCount,
    cleanedNiks: masukResult.cleanedNikCount + keluarResult.cleanedNikCount,
    repairedRecaps: recapRows,
    fixedBindings: 0,
    pairedSelesai: recapBuild.stats.pairedSelesai,
    activeDiDalam: recapBuild.stats.activeDiDalam,
    keluarTanpaMasuk: recapBuild.stats.keluarTanpaMasuk
  };

  if (config.syncBindings !== false) {
    const sheetBinding = getSheet(SHEET_BINDING);
    const dataBinding = sheetBinding.getDataRange().getValues();
    const activeDiDalamNiks = {};

    recapBuild.rows.forEach(function(row) {
      if (row[7] === 'DI DALAM') {
        activeDiDalamNiks[asText(row[1]).trim()] = true;
      }
    });

    for (let i = 1; i < dataBinding.length; i++) {
      const status = asText(dataBinding[i][6]).toUpperCase();
      const nik = asText(dataBinding[i][1]).trim();
      if (status === 'BOUND' && !activeDiDalamNiks[nik]) {
        sheetBinding.getRange(i + 1, 7).setValue('FREE');
        report.fixedBindings++;
      }
    }
  }

  try {
    CacheService.getScriptCache().removeAll(['absen:*']);
  } catch (_) {}

  return report;
}

function fixAllSpreadsheetErrors() {
  return withDocumentLock(function() {
    try {
      const ss = getSpreadsheet();
      const report = {
        renamedTabs: [],
        cleanedNiks: 0,
        fixedMasukShifts: 0,
        fixedKeluarShifts: 0,
        repairedRecaps: 0,
        fixedBindings: 0,
        pairedSelesai: 0,
        activeDiDalam: 0,
        keluarTanpaMasuk: 0,
        msg: ''
      };

      const sheetAreaTruncated = ss.getSheetByName('REGISTRASI MASUK KELUAR AREA KE');
      if (sheetAreaTruncated && !ss.getSheetByName(SHEET_AREA_KERJA)) {
        sheetAreaTruncated.setName(SHEET_AREA_KERJA);
        report.renamedTabs.push('REGISTRASI MASUK KELUAR AREA KE -> ' + SHEET_AREA_KERJA);
      }

      ensureFactoryHeaderSheets_();

      report.cleanedNiks += sanitizeSheetNikColumn_(SHEET_KARYAWAN, 1);
      report.cleanedNiks += sanitizeSheetNikColumn_(SHEET_BINDING, 2);
      report.cleanedNiks += sanitizeSheetNikColumn_(SHEET_AREA_KERJA, 5);
      report.cleanedNiks += sanitizeSheetNikColumn_(SHEET_RECAP_ABSEN, 2);
      report.cleanedNiks += sanitizeSheetNikColumn_(SHEET_JADWAL, 1);

      const masukRepair = repairFactoryMasukLog_();
      const keluarRepair = repairFactoryKeluarLog_();
      report.cleanedNiks += (masukRepair.cleanedNikCount || 0) + (keluarRepair.cleanedNikCount || 0);
      report.fixedMasukShifts = masukRepair.fixedShiftCount || 0;
      report.fixedKeluarShifts = keluarRepair.fixedShiftCount || 0;

      const rebuildReport = rebuildHistoricalRecapDataset_({
        repairLogs: false,
        syncBindings: true
      });
      report.repairedRecaps = rebuildReport.repairedRecaps || 0;
      report.fixedBindings = rebuildReport.fixedBindings || 0;
      report.pairedSelesai = rebuildReport.pairedSelesai || 0;
      report.activeDiDalam = rebuildReport.activeDiDalam || 0;
      report.keluarTanpaMasuk = rebuildReport.keluarTanpaMasuk || 0;

      report.msg = formatHistoricalRepairSummary_(report, 'Pembersihan & pemulihan data sukses!');
      Logger.log(report.msg);
      showSpreadsheetAlert_(report.msg);
      appendRepairLog_('fixAllSpreadsheetErrors', { ok: true, msg: report.msg, report: report });
      return { ok: true, report: report };
    } catch (e) {
      const msg = 'Gagal perbaiki data: ' + e.message;
      Logger.log('fixAllSpreadsheetErrors failed: ' + e.message);
      showSpreadsheetAlert_(msg);
      appendRepairLog_('fixAllSpreadsheetErrors', { ok: false, msg: msg });
      return { ok: false, msg: msg };
    }
  });
}
