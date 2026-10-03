# PRD — Monitoring Bimbingan Skripsi

Aplikasi web untuk memonitor proses bimbingan skripsi: mahasiswa mengunggah
draf per bab, dosen memberi catatan revisi pada versi draf tertentu,
tahapan bimbingan (proposal → seminar → sidang → lulus) dikunci secara
berurutan, dan prodi memantau mahasiswa yang lama tidak bimbingan.

## Stack

- Next.js 14 (App Router) + TypeScript + Prisma 5.22 + SQLite + Tailwind CSS
- Auth: session cookie httpOnly (HMAC-signed, tanpa JWT library)
- Password: PBKDF2 (crypto bawaan Node)
- File draf: disimpan di `storage/` (gitignored), dilayani lewat route API proteksi

## Model Data

- **User** { id, name, email unique, passwordHash, role: `mahasiswa`|`dosen`|`prodi`,
  identifier (NIM/NIDN) }
- **Skripsi** { id, mahasiswaId unique, dosenId nullable, judul,
  stage: `proposal`|`seminar`|`sidang`|`lulus`,
  stageStatus: `draft`|`submitted`|`approved`|`revision` }
- **Draft** { id, skripsiId, bab: 1..5, version, filePath, fileName, uploadedAt,
  @@unique([skripsiId, bab, version]) }
  - bab: 1=Pendahuluan, 2=Tinjauan Pustaka, 3=Metodologi, 4=Hasil, 5=Penutup
  - version auto-increment per (skripsi, bab)
- **RevisionNote** { id, draftId, dosenId, note, pageRef nullable, createdAt }
  - selalu menunjuk ke `draftId` versi TERTENTU (bisa versi lama)
- **GuidanceLog** { id, skripsiId, actorId, action, note nullable, createdAt }
  - action: `upload`|`revision`|`submit_stage`|`approve_stage`|`reject_stage`|`note`
- **StageApproval** { id, skripsiId, stage, status: `approved`|`rejected`,
  approverId, note nullable, createdAt }

## Fungsionalitas

- **F0** — Scaffold: PRD.md, schema Prisma, seed, konfigurasi dasar.
- **F1** — Auth: register/login/logout (role mahasiswa/dosen/prodi),
  session cookie httpOnly; CRUD skripsi (mahasiswa: hanya 1 skripsi miliknya;
  dosen: daftar mahasiswa bimbingannya; prodi: semua skripsi).
- **F2** — Upload draf per bab (file di `storage/`), version auto-increment per
  (skripsi, bab); validasi tipe file pdf/doc/docx + batas ukuran 10 MB;
  download versi tertentu lewat route proteksi.
- **F3** — Dosen memberi catatan revisi pada versi draf tertentu
  (RevisionNote → draftId + pageRef opsional); setiap upload/revisi/keputusan
  dicatat di GuidanceLog; riwayat bimbingan kronologis per skripsi.
- **F4** — Tahapan terkunci: proposal → seminar → sidang → lulus.
  Mahasiswa submit tahap (stageStatus=`submitted`); dosen approve → stage naik
  + StageApproval tercatat; dosen reject → stageStatus=`revision` + catatan.
  Aturan: tidak bisa submit/approve tahap N+1 sebelum tahap N `approved`
  (422); hanya dosen pembimbing yang bisa memutuskan (403 untuk dosen lain).
- **F5** — Dashboard prodi: tabel semua mahasiswa + dosen pembimbing + stage +
  "hari sejak aktivitas bimbingan terakhir" (dari max GuidanceLog.createdAt);
  query param `threshold` (default 14): sorot yang melebihi threshold sebagai
  "lama tidak bimbingan".
- **UI (Bahasa Indonesia)**:
  - `/` — redirect sesuai role setelah login
  - `/login`, `/register`
  - `/mhs` — skripsiku: upload draf per bab, daftar versi + unduh, lihat
    catatan revisi, status tahap + tombol submit tahap
  - `/dosen` — daftar mahasiswa bimbingan: lihat draf tiap bab, beri catatan
    revisi pada versi tertentu, approve/reject tahap
  - `/prodi` — dashboard monitoring semua mahasiswa + filter threshold

## Aturan Bisnis Utama

1. Satu mahasiswa hanya boleh memiliki 1 skripsi.
2. Version draf auto-increment per (skripsi, bab) via conditional update aman.
3. RevisionNote menunjuk versi draf spesifik, bukan selalu yang terbaru.
4. Submit tahap N+1 ditolak (422) jika tahap N belum `approved`.
5. Keputusan tahap hanya oleh dosen pembimbing (403 untuk dosen lain).
6. Approve tahap terakhir (sidang) → stage=`lulus`, stageStatus=`approved`.
7. Semua aksi penting tercatat di GuidanceLog.

## API

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`,
  `GET /api/auth/me`
- `GET /api/skripsi`, `POST /api/skripsi`, `GET /api/skripsi/[id]`,
  `PATCH /api/skripsi/[id]`
- `POST /api/skripsi/[id]/drafts` (multipart: bab, file),
  `GET /api/skripsi/[id]/drafts`
- `GET /api/drafts/[id]/download`
- `POST /api/drafts/[id]/revisions` (dosen)
- `GET /api/skripsi/[id]/history`
- `POST /api/skripsi/[id]/submit-stage`
- `POST /api/skripsi/[id]/stage-decision` (dosen: approve|reject)
- `GET /api/prodi/dashboard?threshold=14`

## Seed

- 1 prodi, 2 dosen, 3 mahasiswa:
  - (a) **Budi** — aktif: proposal approved, seminar submitted
  - (b) **Citra** — 20 hari tanpa aktivitas bimbingan (untuk demo threshold)
  - (c) **Dedi** — baru, proposal masih draft
- Contoh draf per bab (file dummy), catatan revisi dosen, GuidanceLog contoh.
- Password seed: `password123` untuk semua akun.

## Testing

- `npm run build` harus lolos.
- curl: upload bab 1 → version 1; upload lagi → version 2; revisi menunjuk
  draftId versi 1 → tersimpan benar; submit seminar sebelum proposal approved
  → 422; approve oleh dosen lain → 403, oleh pembimbing → 200 → seminar bisa
  disubmit; dashboard prodi: mahasiswa (b) muncul > 14 hari, (a) tidak;
  download versi lama → 200.
