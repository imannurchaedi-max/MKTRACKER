# Runtime Truth Audit - 2026-08-01

## Ringkasan Eksekutif

- Workbook lokal `EMPLOYEE DATA.xlsx` sekarang bisa dibaca konsisten tab-per-tab dan recap sudah dinormalkan ke string tanggal serta sheet area kerja canonical.
- Flow yang benar adalah satu arah: log masuk/keluar pabrik sebagai sumber primer, log area sebagai sumber primer area, lalu `ABSEN IN OUT MK` hanya recap turunan.
- Masalah utama bukan seluruh aturan shift, melainkan recap historis yang sebelumnya tidak sinkron dengan log primer, format tanggal campur, nama sheet area terpotong, dan alat audit lama yang memakai aturan shift usang.
- `JADWAL_SHIFT` kosong, jadi semua logika expected shift berbasis jadwal saat ini praktis tidak berperan.

## Fakta Workbook

- Total sheet: 27
- Sheet area kerja aktual: `REGISTRASI MASUK KELUAR AREA KERJA`
- Master karyawan: 872 NIK
- Log masuk pabrik: 2170 baris
- Log keluar pabrik: 2133 baris
- Recap absen: 2338 baris
- Log area kerja: 1434 baris
- Jadwal shift: 0 baris
- Status binding: {'FREE': 2140, 'BOUND': 21}
- Status recap: {'DI DALAM': 344, 'SELESAI': 1726, 'KELUAR TANPA MASUK': 268}
- Duplicate key recap `(tanggal|nik)`: 0
- Baris recap bertanggal setelah 2026-08-01: 363

### Sebaran Recap per Bulan

- 2026-01: 113 baris
- 2026-02: 77 baris
- 2026-03: 78 baris
- 2026-04: 58 baris
- 2026-05: 125 baris
- 2026-06: 591 baris
- 2026-07: 933 baris
- 2026-08: 76 baris
- 2026-09: 75 baris
- 2026-10: 82 baris
- 2026-11: 67 baris
- 2026-12: 63 baris

## One-Direction Multipath Flow

1. Karyawan datang ke pabrik -> `bindKartu()` memvalidasi NIK dan kartu, menulis log ke `REGISTRASI SAAT MASUK PABRIK`, lalu memperbarui state binding.
2. Setelah log masuk tercatat, recap `ABSEN IN OUT MK` dibangun dari log primer, bukan dari input manual terpisah.
3. Selama di area kerja -> `scanAreaKerja()` hanya menulis log IN/OUT area ke `REGISTRASI MASUK KELUAR AREA KERJA` berdasarkan status binding dan status pabrik dari log.
4. Karyawan keluar pabrik -> `releaseKartu()` menulis log ke `REGISTRASI SAAT KELUAR PABRIK`, melepas binding, lalu rebuild recap lagi.
5. Dashboard dan report hanya membaca data turunan atau read model: recap pabrik, log area, master karyawan, dan jadwal jika suatu saat diisi.

## Dependency Map Kritis

### Masuk Pabrik
- Frontend caller: confirmMasuk() -> google.script.run.bindKartu()
- Backend chain: bindKartu(), getKaryawanByNIK(), getBindingStatus(), detectShift(), safeUpdateRecapAbsen(), rebuildHistoricalRecapDataset_()
- Read sheet: KARYAWAN, BINDING_KARTU_MK
- Write sheet: REGISTRASI SAAT MASUK PABRIK, BINDING_KARTU_MK, ABSEN IN OUT MK

### Keluar Pabrik
- Frontend caller: confirmKeluar() -> google.script.run.releaseKartu()
- Backend chain: releaseKartu(), getBindingStatus(), resolveFactoryWorkDate(), detectShift(), safeUpdateRecapAbsen(), rebuildHistoricalRecapDataset_()
- Read sheet: BINDING_KARTU_MK, KARYAWAN
- Write sheet: REGISTRASI SAAT KELUAR PABRIK, BINDING_KARTU_MK, ABSEN IN OUT MK

### Scan Area Kerja
- Frontend caller: handleSecurityScan()/onSerialScanned() -> google.script.run.scanAreaKerja()
- Backend chain: scanAreaKerja(), getBindingStatus(), getFactoryFlowStatusFromLogs_()
- Read sheet: BINDING_KARTU_MK, ABSEN IN OUT MK, KARYAWAN
- Write sheet: REGISTRASI MASUK KELUAR AREA KERJA

### Laporan Absen
- Frontend caller: processAbsenReport() -> google.script.run.getAbsenReport()
- Backend chain: getAbsenReport(), getAbsenReportFullData_(), buildPaginationMeta_()
- Read sheet: ABSEN IN OUT MK
- Write sheet: -

### Laporan Area
- Frontend caller: processAreaReport() -> google.script.run.getAreaActivityReport()
- Backend chain: getAreaActivityReport(), getAreaActivityReportFullData_(), buildPaginationMeta_()
- Read sheet: REGISTRASI MASUK KELUAR AREA KERJA, KARYAWAN
- Write sheet: -

### Perbaikan Spreadsheet
- Frontend caller: Spreadsheet menu -> fixAllSpreadsheetErrors()
- Backend chain: fixAllSpreadsheetErrors(), repairFactoryMasukLog_(), repairFactoryKeluarLog_(), rebuildHistoricalRecapDataset_(), buildFactoryRecapRowsFromEvents_()
- Read sheet: REGISTRASI SAAT MASUK PABRIK, REGISTRASI SAAT KELUAR PABRIK, KARYAWAN, ABSEN IN OUT MK, BINDING_KARTU_MK, JADWAL_SHIFT
- Write sheet: ABSEN IN OUT MK, BINDING_KARTU_MK, REGISTRASI SAAT MASUK PABRIK, REGISTRASI SAAT KELUAR PABRIK

## Graphify dan GitNexus

- Graphify artifact tersedia di `graphify-out/graph.json` dengan 17 node yang berasal dari `active/HOME_PORTAL/`.
- File HOME_PORTAL yang terlihat di graphify: active/HOME_PORTAL/Code.js, active/HOME_PORTAL/Index.html, active/HOME_PORTAL/app.html, active/HOME_PORTAL/appsscript.json, active/HOME_PORTAL/style.html
- Simbol penting terdeteksi: {'bindKartu()': False, 'releaseKartu()': False, 'scanAreaKerja()': False, 'getAbsenReport()': False, 'getAreaActivityReport()': False, 'fixAllSpreadsheetErrors()': False}
- GitNexus graph tersedia dan bisa dipakai untuk context/doctor, tetapi FTS index di mesin ini masih degradasi sehingga query teks bebas tidak selalu bisa dipercaya.

## Temuan Arsitektur

- `ABSEN IN OUT MK` tidak boleh lagi menjadi sumber keputusan operasional primer. Ia harus diperlakukan sebagai materialized view yang selalu bisa dibangun ulang dari log masuk dan log keluar.
- `REGISTRASI MASUK KELUAR AREA KERJA` tidak boleh menentukan status pabrik. Ia hanya merekam pergerakan area setelah status di pabrik valid.
- `JADWAL_SHIFT` saat ini kosong, jadi semua evaluasi shift masih murni berdasar jam scan dan `SHIFT_CONFIG` runtime.
- Workbook mengandung data masa depan terhadap tanggal audit 2026-08-01. Ini perlu dipastikan apakah memang data operasional yang sah atau hasil input/ekspor lintas periode.

## Urutan Perbaikan yang Disarankan

1. Kunci model data primer: log masuk, log keluar, binding, area log, master karyawan.
2. Satukan semua alat audit/perbaikan ke helper aturan runtime aktif.
3. Ubah backend report supaya semua tabel besar memakai pagination server-side dan tidak mengirim payload besar ke HTML.
4. Audit semua fungsi yang masih membaca recap lama sebagai sumber status, lalu ganti ke pembacaan dari log primer atau hasil rebuild yang baru.
5. Setelah runtime stabil, baru rapikan UX dashboard per role: Security Personel, Area Owner, HR Supervisor, HR Manager.
