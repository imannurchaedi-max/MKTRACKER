# Operational Workflow

Dokumen ini adalah jalur kerja operasional paling singkat untuk repo ini.

## 1. Runtime Aktif

- Runtime utama user-facing adalah `active/HOME_PORTAL/`.
- URL aktif user harus mengikuti hasil `npm run verify` atau `scripts/module-config.json`.
- `active/MODUL_GATE_PABRIK/`, `active/MODUL_AREA_KERJA/`, dan `active/MODUL_REPORT/` adalah compatibility source, bukan titik baca utama.

## 2. Jalur Edit

Untuk perubahan perilaku utama, edit hanya di `active/HOME_PORTAL/`:

- Gate masuk/keluar: `GateFunctions.gs`
- Scan area: `AreaFunctions.gs`
- Report dan recap: `ReportFunctions.gs`
- Utility, auth, sheet access: `SharedLib.gs`
- Struktur halaman: `Index.html`
- Runtime frontend: `app.html`
- Styling: `style.html`

## 3. Jalur Deploy

Urutan normal:

1. Edit code di `active/HOME_PORTAL/`.
2. Jalankan audit bila perubahan cukup besar:
   - `python scripts/audit_project.py`
3. Deploy:
   - `npm run deploy`
4. Verifikasi:
   - `npm run verify`

## 4. Arti Output Deploy

- `OK HOME_PORTAL` berarti runtime utama berhasil ter-push dan ter-deploy.
- `WARN MODUL_* binding clasp tidak ditemukan` berarti child module tidak bisa dipush dari checkout ini, tetapi itu tidak memblokir runtime utama.
- `CONFIG_MODUL berhasil diupdate` berarti registry URL di spreadsheet sudah sinkron.

## 5. Jika User Masih Membuka URL Lama

Gejala:

- Perubahan tidak terlihat.
- UI masih versi lama.
- Error lama muncul lagi walau code sudah diperbaiki.

Tindakan:

1. Ambil URL `HOME_PORTAL` dari output `npm run verify`.
2. Pastikan user membuka URL itu, bukan deployment lama yang pernah dibagikan.

## 6. Prinsip Bersih Repo

- Perlakukan `HOME_PORTAL` sebagai source of truth.
- Anggap child module sebagai compatibility code sampai binding `clasp` mereka ditemukan kembali.
- Jangan tulis `CONFIG_MODUL` manual dari GAS editor.
- Jangan jadikan artifact di `reports/` sebagai arsitektur aktif tanpa regenerasi ulang.
