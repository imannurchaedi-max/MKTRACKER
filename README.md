# EMPLOYE TRACKER

Google Apps Script web app untuk access control, absensi, dan tracking area kerja berbasis Google Sheets.

## Source of Truth

Runtime aktif utama ada di [`active/HOME_PORTAL/`](./active/HOME_PORTAL).

- `active/HOME_PORTAL/`
  Shell utama, frontend aktif, dan backend domain yang dipakai user normal.
- `active/MODUL_GATE_PABRIK/`, `active/MODUL_AREA_KERJA/`, `active/MODUL_REPORT/`
  Source compatibility module. Bukan jalur UX utama, dan pada checkout ini binding `clasp` lokalnya bisa saja belum tersedia.

Folder root masih dapat berisi artefak transisi, tooling, atau file lama. Untuk audit, edit, dan deploy, utamakan `active/HOME_PORTAL/`.

## Struktur Ringkas

- `active/`
  Runtime source dan deployment GAS yang dipelihara.
- `scripts/`
  Tool audit, push/deploy, sinkronisasi, dan update `CONFIG_MODUL`.
- `docs/`
  Dokumentasi aktif untuk arsitektur, workflow, mapping runtime, deployment, dan histori.
- `Junk/`
  Arsip dokumentasi atau catatan yang tidak lagi dipakai sebagai referensi aktif.
- `_local/`
  Catatan atau helper lokal yang tidak ikut version control.

## Urutan Baca yang Disarankan

1. `README.md`
2. `docs/OPERATIONAL_WORKFLOW.md`
3. `docs/GAS_ARCHITECTURE.md`
4. `docs/NEURAL_MAPPING.md`
5. `docs/BLAST_RADIUS.md`
6. `docs/FUNCTION_MAPPING.md`
7. `docs/DEPLOYMENT_GUIDE.md`
8. `active/HOME_PORTAL/`

Yang tidak perlu dijadikan sumber kebenaran arsitektur:

- `reports/`
  Artifact audit yang boleh dihapus dan di-generate ulang.
- `Junk/`
  Arsip dokumentasi yang sudah tidak aktif.
- `scripts/`
  Tooling operasional, bukan jalur baca utama untuk memahami runtime.
- `_local/`
  Catatan kerja lokal.
- Folder environment seperti `node_modules/` dan `venv/`.

## Dokumen Aktif

| Dokumen | Isi |
|---|---|
| [OPERATIONAL_WORKFLOW.md](docs/OPERATIONAL_WORKFLOW.md) | Jalur kerja operasional, runtime aktif, dan arti output deploy |
| [GAS_ARCHITECTURE.md](docs/GAS_ARCHITECTURE.md) | Arsitektur sistem, struktur HOME_PORTAL, domain runtime, sheet dependency |
| [NEURAL_MAPPING.md](docs/NEURAL_MAPPING.md) | Neural mapping, workflow flows, input/output dependency matrix, sheet dependency map |
| [BLAST_RADIUS.md](docs/BLAST_RADIUS.md) | Analisis dampak per fungsi backend yang wajib dibaca sebelum edit kode |
| [FUNCTION_MAPPING.md](docs/FUNCTION_MAPPING.md) | Index fungsi backend dan frontend dengan lokasi file |
| [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) | Panduan deploy, verifikasi, dan smoke test |
| [PYTHON_AUDIT_TOOLING.md](docs/PYTHON_AUDIT_TOOLING.md) | Cara menjalankan audit Python dan membaca hasilnya |
| [PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) | Rekam jejak perubahan besar project |

## Workflow Singkat

1. Edit perilaku utama di `active/HOME_PORTAL/`.
2. Jika sedang merawat compatibility module, periksa `active/MODUL_*` secara sadar. Jangan anggap modul child sebagai referensi utama.
3. Jalankan audit bila perlu:
   - `python scripts/audit_project.py`
   - `python scripts/extract_functions.py`
   - `python scripts/compare_gas_runtime.py`
4. Gunakan:
   - `npm run push` untuk push code saja
   - `npm run deploy` untuk push + deploy runtime utama dan sinkronisasi `CONFIG_MODUL`
5. Jika child module tidak punya binding `clasp` lokal, `npm run deploy` akan memberi `WARN`, mempertahankan URL compatibility yang sudah ada, dan tetap melanjutkan deploy `HOME_PORTAL`.
6. Jika ingin autodeploy berbasis perubahan file runtime, jalankan `npm run watch:deploy`.
7. `scripts/deploy_home_fixed.py` dipakai hanya sebagai fallback manual jika perlu update deployment tertentu untuk `HOME_PORTAL`.
8. Jalankan `npm run verify` untuk memastikan URL deploy aktif dan binding runtime utama tetap sehat.

## Catatan Lokal

Jika report, cache, atau dokumen lama terasa menyesatkan, regenerasi artifact audit dari script resmi lalu cocokkan lagi dengan `docs/` dan `active/HOME_PORTAL/`.
