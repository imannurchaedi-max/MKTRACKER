// ============================================================
//  NFC DAM ACCESS CONTROL — GATE PABRIK FUNCTIONS
//  PT Daya Anugrah Mulya
//  Domain: Binding kartu MK, absen masuk/keluar pabrik
//  Dependencies: SharedLib.gs
// ============================================================

// ── Recap Absen Engine ────────────────────────────────────
function updateRecapAbsen(tanggal, nik, nama, dept, jabatan, jamMasuk, jamKeluar, noKartuMK, noLoker) {
  const eventType = jamMasuk ? 'masuk' : (jamKeluar ? 'keluar' : '');
  const timeValue = jamMasuk || jamKeluar || '';
  const affectedDates = buildFactoryAffectedDates_(tanggal, nik, timeValue, eventType);
  return refreshFactoryRecapForNik_(nik, affectedDates);
}

function safeUpdateRecapAbsen(tanggal, nik, nama, dept, jabatan, jamMasuk, jamKeluar, noKartuMK, noLoker) {
  try {
    updateRecapAbsen(tanggal, nik, nama, dept, jabatan, jamMasuk, jamKeluar, noKartuMK, noLoker);
  } catch(e) {
    Logger.log('Gagal update recap ABSEN IN OUT MK: ' + e.message);
  }
}

function rebuildRecapAbsenInOutMKNow_() {
  return withDocumentLock(function() {
    try {
      const report = rebuildHistoricalRecapDataset_({
        repairLogs: false,
        syncBindings: true
      });
      const msg = formatHistoricalRepairSummary_(report, 'Rekap ABSEN IN OUT MK berhasil digenerate ulang.');
      showSpreadsheetAlert_(msg);
      appendRepairLog_('rebuildRecapAbsenInOutMK', { ok: true, msg: msg, report: report });
      return { ok: true, msg: msg, report: report };
    } catch(e) {
      const msg = 'Gagal generate ulang recap: ' + e.message;
      showSpreadsheetAlert_(msg);
      appendRepairLog_('rebuildRecapAbsenInOutMK', { ok: false, msg: msg });
      return { ok: false, msg: msg };
    }
  });
}

function rebuildRecapAbsenInOutMK() {
  showRepairProgressDialog_(
    'rebuild_recap',
    'Generate Ulang Recap Absen',
    'Sistem akan membangun ulang recap dari log masuk dan keluar pabrik secara bertahap, lalu menutup binding yang sudah tidak aktif.'
  );
}

// ── Binding Status ────────────────────────────────────────
function getBindingStatus(noKartuMK) {
  try {
    const sheet = getSheet(SHEET_BINDING);
    const data  = sheet.getDataRange().getValues();
    const no    = assertCard(noKartuMK);

    for (let i = data.length - 1; i >= 1; i--) {
      if (normalizeCard(data[i][0]) === no) {
        const waktuBind = parseSheetDateTime(data[i][5]);
        const waktuRelease = parseSheetDateTime(data[i][7]);
        return {
          ok: true,
          noKartuMK: normalizeCard(data[i][0]),
          nik:         asText(data[i][1]),
          nama:        asText(data[i][2]),
          dept:        asText(data[i][3]),
          jabatan:     asText(data[i][4]),
          waktuBind:   waktuBind ? formatDateTime(waktuBind) : asText(data[i][5]),
          status:      asText(data[i][6]) || 'FREE',
          waktuRelease:waktuRelease ? formatDateTime(waktuRelease) : asText(data[i][7]),
          row:         i + 1
        };
      }
    }
    return { ok: true, status: 'FREE', noKartuMK: no };
  } catch(e) {
    return { ok: false, msg: e.message };
  }
}

// ── Bind Kartu (Masuk Pabrik) ─────────────────────────────
function bindKartu(noKartuMK, nik, loker) {
  return withDocumentLock(function() {
    try {
      const no  = assertCard(noKartuMK);
      const kar = getKaryawanByNIK(nik);
      if (!kar) return { ok: false, msg: 'NIK tidak ditemukan: ' + nik };

      const now = nowWIB();
      const tanggalValue = makeSheetDateValue(now);
      const tanggal = formatDate(now);
      const jam = formatTime(now);
      const workContext = resolveFactoryEventContext(tanggal, kar.nik, jam, 'masuk');
      const factoryStatus = getFactoryFlowStatusFromLogs_(kar.nik, workContext.tanggal || tanggal);

      if (factoryStatus === 'DI DALAM') return { ok: false, msg: `${kar.nama} sudah tercatat masuk dan belum keluar.` };
      if (factoryStatus === 'SELESAI')  return { ok: false, msg: `${kar.nama} sudah menyelesaikan absen hari ini.` };
      if (no === kar.nik) return { ok: false, msg: 'Masuk pabrik wajib scan kartu MK fisik, bukan NIK / KTP.' };

      const existing = getBindingStatus(no);
      if (!existing.ok) return existing;
      if (existing.status === 'BOUND') {
        return {
          ok: false,
          msg: `Kartu ${no} sudah terikat dengan ${existing.nama}.`,
          htmlMsg: `❌ Kartu <strong>${escHtml(no)}</strong> masih terikat!<br>
                    <div style="margin-top:8px;padding:8px;background:rgba(255,255,255,0.7);border-radius:4px;color:#333;font-size:13px;text-align:left;border-left:3px solid #dc3545;">
                      <strong>${escHtml(existing.nama)}</strong> (${escHtml(existing.nik)})<br>
                      ${escHtml(existing.dept||'-')} · ${escHtml(existing.jabatan||'-')}<br>
                      <span style="font-size:11px;color:#666;">Sejak: ${escHtml(existing.waktuBind||'-')}</span>
                    </div>
                    <div style="margin-top:8px;font-size:12px;color:#dc3545;">Harap datang ke <strong>Security</strong> untuk release binding.</div>`,
          requiresSecurityRelease: true, boundCardNo: no
        };
      }

      const sheetB = getSheet(SHEET_BINDING);
      const dataB  = sheetB.getDataRange().getValues();
      for (let i = 1; i < dataB.length; i++) {
        if (asText(dataB[i][1]).trim() === asText(nik).trim() && asText(dataB[i][6]) === 'BOUND') {
          const oldKartu = asText(dataB[i][0]);
          return {
            ok: false, msg: `NIK ${nik} sudah terikat di kartu ${oldKartu}.`,
            htmlMsg: `❌ NIK <strong>${escHtml(nik)}</strong> masih terikat di kartu <strong>${escHtml(oldKartu)}</strong>.<br>
                      <div style="margin-top:8px;padding:8px;background:rgba(255,255,255,0.7);border-radius:4px;color:#333;font-size:13px;border-left:3px solid #dc3545;">
                        Harap ke Security untuk lepas binding kartu lama.
                      </div>`,
            requiresSecurityRelease: true, boundCardNo: oldKartu
          };
        }
      }

      const waktuValue = makeSheetDateTimeValue(now);
      const waktu = formatDateTime(now);
      sheetB.appendRow([no, kar.nik, kar.nama, kar.dept, kar.jabatan, waktuValue, 'BOUND']);
      applyNumberFormatToCell_(sheetB, sheetB.getLastRow(), 6, 'dd/MM/yyyy HH:mm:ss');

      const sheetMasuk = getSheet(SHEET_MASUK_PABRIK);
      sheetMasuk.appendRow([no, kar.nik, kar.nama, tanggalValue, jam, detectShift(now, 'masuk'), loker || '']);
      applyNumberFormatToCell_(sheetMasuk, sheetMasuk.getLastRow(), 4, 'dd/MM/yyyy');
      safeUpdateRecapAbsen(tanggal, kar.nik, kar.nama, kar.dept, kar.jabatan, jam, '', no, loker || '');
      return { ok: true, msg: `Kartu ${no} berhasil diikat ke ${kar.nama}`, karyawan: kar, noKartuMK: no, waktu, shift: detectShift(now, 'masuk') };
    } catch(e) {
      return { ok: false, msg: e.message };
    }
  });
}

// ── Release Kartu (Keluar Pabrik) ─────────────────────────
function releaseKartu(noKartuMK, loker) {
  return withDocumentLock(function() {
    try {
      const no = assertCard(noKartuMK);
      if (asText(loker).trim().toUpperCase() === 'FORCE_RELEASE') {
        return { ok: false, msg: 'Release paksa mandiri dinonaktifkan. Datang ke Security.' };
      }

      const binding = getBindingStatus(no);
      if (!binding.ok) return binding;
      if (binding.status !== 'BOUND') return { ok: false, msg: `Kartu / ID ${no} tidak dalam status terikat.` };

      const now = nowWIB();
      const waktuValue = makeSheetDateTimeValue(now);
      const waktu = formatDateTime(now);
      const tanggalValue = makeSheetDateValue(now);
      const tanggal = formatDate(now);
      const workContext = resolveFactoryEventContext(tanggal, binding.nik, formatTime(now), 'keluar');
      const factoryStatus = getFactoryFlowStatusFromLogs_(binding.nik, workContext.tanggal || tanggal);
      if (factoryStatus === 'SELESAI') return { ok: false, msg: `${binding.nama} sudah tercatat keluar hari ini.` };
      if (factoryStatus !== 'DI DALAM') return { ok: false, msg: `${binding.nama} belum tercatat berada di dalam pabrik hari ini.` };

      const sheetB = getSheet(SHEET_BINDING);
      sheetB.getRange(binding.row, 7).setValue('FREE');
      const releaseCol = getHeaderIndex(sheetB, 'WAKTU_RELEASE');
      if (releaseCol > 0) {
        sheetB.getRange(binding.row, releaseCol).setValue(waktuValue);
        applyNumberFormatToCell_(sheetB, binding.row, releaseCol, 'dd/MM/yyyy HH:mm:ss');
      }

      const jam = formatTime(now);
      const sheetKeluar = getSheet(SHEET_KELUAR_PABRIK);
      sheetKeluar.appendRow([no, binding.nik, binding.nama, tanggalValue, jam, detectShift(now, 'keluar'), loker || '']);
      applyNumberFormatToCell_(sheetKeluar, sheetKeluar.getLastRow(), 4, 'dd/MM/yyyy');
      safeUpdateRecapAbsen(tanggal, binding.nik, binding.nama, binding.dept, binding.jabatan, '', jam, no, loker || '');
      return {
        ok: true, msg: `Kartu ${no} berhasil dilepas dari ${binding.nama}`,
        karyawan: { nik: binding.nik, nama: binding.nama, dept: binding.dept, jabatan: binding.jabatan },
        noKartuMK: no, waktu
      };
    } catch(e) {
      return { ok: false, msg: e.message };
    }
  });
}

function getRecentFactoryGateLogs(limit) {
  try {
    const maxItems = Math.max(1, Math.min(parseInt(limit, 10) || 20, 100));
    const events = [];

    function collectRecentRows_(sheetName, eventCode, eventLabel, timeHeader) {
      const sheet = getSheet(sheetName);
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) return;

      const lastCol = sheet.getLastColumn();
      const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
      const displays = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

      for (let i = values.length - 1; i >= 0 && events.length < maxItems * 4; i--) {
        const tanggalDisplay = asText(displays[i][3]).trim() || formatDate(values[i][3]);
        const jamDisplay = asText(displays[i][4]).trim() || asText(values[i][4]).trim();
        const sortDate = formatDateForSort(values[i][3]) || formatDateForSort(tanggalDisplay);
        const sortTime = jamDisplay.replace(/[^0-9]/g, '').padEnd(6, '0').slice(0, 6);

        events.push({
          sortKey: sortDate + '|' + sortTime,
          type: eventCode,
          label: eventLabel,
          noKartuMK: normalizeCard(values[i][0]),
          nik: asText(values[i][1]),
          nama: asText(values[i][2]),
          tanggal: tanggalDisplay,
          jam: jamDisplay,
          shift: asText(values[i][5]),
          noLoker: asText(values[i][6]),
          sourceSheet: sheetName,
          timeHeader: timeHeader
        });
      }
    }

    collectRecentRows_(SHEET_MASUK_PABRIK, 'IN', 'Masuk Pabrik', 'JAM MASUK');
    collectRecentRows_(SHEET_KELUAR_PABRIK, 'OUT', 'Keluar Pabrik', 'JAM KELUAR');

    events.sort(function(a, b) {
      return b.sortKey.localeCompare(a.sortKey);
    });

    return {
      ok: true,
      data: events.slice(0, maxItems).map(function(item) {
        delete item.sortKey;
        return item;
      })
    };
  } catch (e) {
    return { ok: false, msg: e.message };
  }
}
