# Monitoring Bimbingan Skripsi

Aplikasi web untuk memonitor proses bimbingan skripsi: mahasiswa mengunggah
draf per bab, dosen memberi catatan revisi pada versi draf tertentu,
tahapan (proposal → seminar → sidang → lulus) dikunci berurutan, dan prodi
memantau mahasiswa yang lama tidak bimbingan.

Stack: Next.js 14 + TypeScript + Prisma 5.22 + SQLite + Tailwind CSS.

## Cara Menjalankan

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

Akun seed (password: `password123`):
- prodi@kampus.ac.id (prodi)
- ahmad@kampus.ac.id, siti@kampus.ac.id (dosen)
- budi@student.ac.id, citra@student.ac.id, dedi@student.ac.id (mahasiswa)

## Halaman

- `/` — redirect sesuai peran setelah login
- `/login`, `/register`
- `/mhs` — skripsiku: upload draf per bab (auto versioning), lihat catatan
  revisi dosen, ajukan tahap, riwayat bimbingan
- `/dosen` — daftar mahasiswa bimbingan: lihat draf tiap versi, beri catatan
  revisi pada versi tertentu, setujui/tolak tahap
- `/prodi` — dashboard monitoring: semua mahasiswa + pembimbing + tahap +
  hari sejak aktivitas terakhir, sorot yang melewati threshold (default 14 hari)

## API

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET/POST /api/skripsi`, `GET/PATCH /api/skripsi/[id]`
- `GET/POST /api/skripsi/[id]/drafts`, `GET /api/drafts/[id]/download`
- `POST /api/drafts/[id]/revisions` (dosen pembimbing)
- `GET /api/skripsi/[id]/history`
- `POST /api/skripsi/[id]/submit-stage` (mahasiswa)
- `POST /api/skripsi/[id]/stage-decision` (dosen pembimbing: approve/reject)
- `GET /api/prodi/dashboard?threshold=14`
