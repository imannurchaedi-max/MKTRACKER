# GAS Runtime Audit

## Summary

- Scanned files: 163
- GAS backend functions: 138
- Frontend functions: 374
- Frontend `google.script.run` calls: 57 unique 18
- Sheet constants: 25
- Sheet dependencies: 69

## Critical Issues

- No missing GAS runtime dependencies were detected by static scan.

## Missing Functions

| Frontend Server Call | Frontend Location | Status |
| --- | --- | --- |
| _None_ |  |  |

## Broken Dependencies

| Dependency | Location | Issue |
| --- | --- | --- |
| `sheetName` | `active/HOME_PORTAL/DataRepairUtils.gs:117` | sheet dependency references a non-constant name |
| `sheetName` | `active/HOME_PORTAL/DataRepairUtils.gs:128` | sheet dependency references a non-constant name |
| `sheetName` | `active/HOME_PORTAL/DataRepairUtils.gs:180` | sheet dependency references a non-constant name |
| `sheetName` | `active/HOME_PORTAL/DataRepairUtils.gs:256` | sheet dependency references a non-constant name |
| `sheetName` | `active/HOME_PORTAL/DataRepairUtils.gs:331` | sheet dependency references a non-constant name |
| `sheetName` | `active/HOME_PORTAL/GateFunctions.gs:193` | sheet dependency references a non-constant name |
| `sheetName` | `active/MODUL_GATE_PABRIK/Code.js:116` | sheet dependency references a non-constant name |

## Active Runtime Mapping

| Frontend GAS Call | Backend Function | Frontend Caller | Sheet Dependency | Runtime Risk |
| --- | --- | --- | --- | --- |
| `bindKartu` | `bindKartu` | `active/HOME_PORTAL/app.html:894`, `active/MODUL_AREA_KERJA/app.html:665`, `active/MODUL_GATE_PABRIK/app.html:726`, `active/MODUL_REPORT/app.html:579` | sheet-backed | covered |
| `deleteJadwalShift` | `deleteJadwalShift` | `active/HOME_PORTAL/app.html:2281` | sheet-backed | covered |
| `exportAbsenReportCsv` | `exportAbsenReportCsv` | `active/HOME_PORTAL/app.html:2530` | sheet-backed | covered |
| `getAbsenReport` | `getAbsenReport` | `active/HOME_PORTAL/app.html:2425`, `active/MODUL_REPORT/app.html:840` | sheet-backed | covered |
| `getAreaActivityReport` | `getAreaActivityReport` | `active/HOME_PORTAL/app.html:2600`, `active/MODUL_AREA_KERJA/app.html:1083`, `active/MODUL_GATE_PABRIK/app.html:1177`, `active/MODUL_REPORT/app.html:1009` | sheet-backed | covered |
| `getBindingStatus` | `getBindingStatus` | `active/HOME_PORTAL/app.html:791`, `active/MODUL_AREA_KERJA/app.html:563`, `active/MODUL_GATE_PABRIK/app.html:615`, `active/MODUL_REPORT/app.html:481` | sheet-backed | covered |
| `getDashboardData` | `getDashboardData` | `active/MODUL_AREA_KERJA/app.html:830`, `active/MODUL_GATE_PABRIK/app.html:924`, `active/MODUL_REPORT/app.html:744` | sheet-backed | covered |
| `getJadwalShift` | `getJadwalShift` | `active/HOME_PORTAL/app.html:2187` | sheet-backed | covered |
| `getKehadiranDashboard` | `getKehadiranDashboard` | `active/HOME_PORTAL/app.html:1884` | sheet-backed | covered |
| `getModuleUrls` | `getModuleUrls` | `active/MODUL_AREA_KERJA/app.html:934`, `active/MODUL_GATE_PABRIK/app.html:1028` | sheet-backed | covered |
| `getRecentAreaLogs` | `getRecentAreaLogs` | `active/HOME_PORTAL/app.html:1304`, `active/HOME_PORTAL/app.html:2153`, `active/MODUL_AREA_KERJA/app.html:862`, `active/MODUL_GATE_PABRIK/app.html:956`, `active/MODUL_REPORT/app.html:776` | sheet-backed | covered |
| `getRecentFactoryGateLogs` | `getRecentFactoryGateLogs` | `active/HOME_PORTAL/app.html:1296` | sheet-backed | covered |
| `releaseKartu` | `releaseKartu` | `active/HOME_PORTAL/app.html:915`, `active/HOME_PORTAL/app.html:1028`, `active/MODUL_AREA_KERJA/app.html:766`, `active/MODUL_GATE_PABRIK/app.html:747`, `active/MODUL_GATE_PABRIK/app.html:860`, `active/MODUL_REPORT/app.html:680` | sheet-backed | covered |
| `saveJadwalShift` | `saveJadwalShift` | `active/HOME_PORTAL/app.html:2266` | sheet-backed | covered |
| `scanAreaKerja` | `scanAreaKerja` | `active/HOME_PORTAL/app.html:813`, `active/MODUL_AREA_KERJA/app.html:588`, `active/MODUL_GATE_PABRIK/app.html:637`, `active/MODUL_REPORT/app.html:502` | sheet-backed | covered |
| `searchKaryawan` | `searchKaryawan` | `active/HOME_PORTAL/app.html:623`, `active/HOME_PORTAL/app.html:2301`, `active/MODUL_AREA_KERJA/app.html:457`, `active/MODUL_AREA_KERJA/app.html:457`, `active/MODUL_GATE_PABRIK/app.html:447`, `active/MODUL_GATE_PABRIK/app.html:447`, `active/MODUL_REPORT/app.html:379`, `active/MODUL_REPORT/app.html:379` | sheet-backed | covered |
| `verifyLogin` | `verifyLogin` | `active/HOME_PORTAL/app.html:558`, `active/MODUL_AREA_KERJA/app.html:360`, `active/MODUL_GATE_PABRIK/app.html:352`, `active/MODUL_REPORT/app.html:295` | sheet-backed | covered |
| `verifySession` | `verifySession` | `active/HOME_PORTAL/app.html:397`, `active/HOME_PORTAL/app.html:424`, `active/MODUL_AREA_KERJA/app.html:251`, `active/MODUL_GATE_PABRIK/app.html:241`, `active/MODUL_REPORT/app.html:186` | sheet-backed | covered |

## Sheet Dependencies

| Sheet Constant | Spreadsheet Sheet | Status |
| --- | --- | --- |
| `SHEET_AREA_KERJA` | REGISTRASI MASUK KELUAR AREA KERJA | used by GAS runtime |
| `SHEET_BINDING` | BINDING_KARTU_MK | used by GAS runtime |
| `SHEET_JADWAL` | JADWAL_SHIFT | used by GAS runtime |
| `SHEET_KARYAWAN` | KARYAWAN | used by GAS runtime |
| `SHEET_KELUAR_PABRIK` | REGISTRASI SAAT KELUAR PABRIK | used by GAS runtime |
| `SHEET_MASUK_PABRIK` | REGISTRASI SAAT MASUK PABRIK | used by GAS runtime |
| `SHEET_RECAP_ABSEN` | ABSEN IN OUT MK | used by GAS runtime |

## Recommended Fix Order

1. Keep active `google.script.run` calls aligned with real GAS backend function names.
2. Prioritise runtime-critical flows: login, masuk, keluar, security scan, dashboard, and reports.
3. Validate sheet headers whenever spreadsheet structure changes.
4. Review legacy frontend code paths that are no longer rendered by `Index.html`.
5. Re-run the Python audit scripts after every structural frontend/backend update.

## Generated Artifacts

- `reports/project_scan.json` from `scripts/audit_project.py`
- `reports/function_inventory.md` from `scripts/extract_functions.py`
- `reports/gas_runtime_comparison.json` from `scripts/compare_gas_runtime.py`