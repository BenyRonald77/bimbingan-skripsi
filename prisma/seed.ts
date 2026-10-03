import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { hashPassword } from "../lib/auth";

const prisma = new PrismaClient();
const PW = "password123";

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

function dummyPdf(name: string): Buffer {
  return Buffer.from(
    `%PDF-1.4\n%Dummy PDF untuk ${name}\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF`,
    "utf8"
  );
}

// Simpan file dummy ke storage/ dan kembalikan filePath
function saveDummy(skripsiId: number, bab: number, version: number, fileName: string): string {
  const dir = join(process.cwd(), "storage", "drafts", String(skripsiId), String(bab));
  mkdirSync(dir, { recursive: true });
  const safe = `v${version}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  writeFileSync(join(dir, safe), dummyPdf(fileName));
  return `drafts/${skripsiId}/${bab}/${safe}`;
}

async function main() {
  const n = await prisma.user.count();
  if (n > 0) {
    console.log("seed dilewati (sudah ada data)");
    return;
  }

  const prodi = await prisma.user.create({
    data: { name: "Prodi Informatika", email: "prodi@kampus.ac.id", passwordHash: hashPassword(PW), role: "prodi", identifier: "PRODI-001" },
  });
  const dosenA = await prisma.user.create({
    data: { name: "Dr. Ahmad Hidayat", email: "ahmad@kampus.ac.id", passwordHash: hashPassword(PW), role: "dosen", identifier: "NIDN-1001" },
  });
  const dosenB = await prisma.user.create({
    data: { name: "Dr. Siti Rahma", email: "siti@kampus.ac.id", passwordHash: hashPassword(PW), role: "dosen", identifier: "NIDN-1002" },
  });

  // (a) Budi — aktif: proposal approved, seminar submitted
  const budi = await prisma.user.create({
    data: { name: "Budi Santoso", email: "budi@student.ac.id", passwordHash: hashPassword(PW), role: "mahasiswa", identifier: "NIM-2021001" },
  });
  const skripsiA = await prisma.skripsi.create({
    data: {
      mahasiswaId: budi.id,
      dosenId: dosenA.id,
      judul: "Sistem Rekomendasi Tugas Akhir Berbasis Collaborative Filtering",
      stage: "seminar",
      stageStatus: "submitted",
    },
  });
  await prisma.stageApproval.create({
    data: { skripsiId: skripsiA.id, stage: "proposal", status: "approved", approverId: dosenA.id, note: "Proposal layak, lanjut seminar.", createdAt: daysAgo(10) },
  });
  await prisma.guidanceLog.create({
    data: { skripsiId: skripsiA.id, actorId: dosenA.id, action: "approve_stage", note: "Proposal disetujui", createdAt: daysAgo(10) },
  });
  const draftA1v1 = await prisma.draft.create({
    data: { skripsiId: skripsiA.id, bab: 1, version: 1, filePath: saveDummy(skripsiA.id, 1, 1, "bab1.pdf"), fileName: "bab1.pdf", uploadedAt: daysAgo(15) },
  });
  await prisma.guidanceLog.create({
    data: { skripsiId: skripsiA.id, actorId: budi.id, action: "upload", note: "Upload Bab 1 versi 1", createdAt: daysAgo(15) },
  });
  await prisma.revisionNote.create({
    data: { draftId: draftA1v1.id, dosenId: dosenA.id, note: "Latar belakang diperkuat dengan data terbaru.", pageRef: "hlm 3", createdAt: daysAgo(13) },
  });
  await prisma.guidanceLog.create({
    data: { skripsiId: skripsiA.id, actorId: dosenA.id, action: "revision", note: "Catatan revisi Bab 1 v1", createdAt: daysAgo(13) },
  });
  const draftA1v2 = await prisma.draft.create({
    data: { skripsiId: skripsiA.id, bab: 1, version: 2, filePath: saveDummy(skripsiA.id, 1, 2, "bab1.pdf"), fileName: "bab1.pdf", uploadedAt: daysAgo(11) },
  });
  await prisma.guidanceLog.create({
    data: { skripsiId: skripsiA.id, actorId: budi.id, action: "upload", note: "Upload Bab 1 versi 2", createdAt: daysAgo(11) },
  });
  await prisma.draft.create({
    data: { skripsiId: skripsiA.id, bab: 2, version: 1, filePath: saveDummy(skripsiA.id, 2, 1, "bab2.pdf"), fileName: "bab2.pdf", uploadedAt: daysAgo(6) },
  });
  await prisma.guidanceLog.create({
    data: { skripsiId: skripsiA.id, actorId: budi.id, action: "upload", note: "Upload Bab 2 versi 1", createdAt: daysAgo(6) },
  });
  await prisma.guidanceLog.create({
    data: { skripsiId: skripsiA.id, actorId: budi.id, action: "submit_stage", note: "Mengajukan tahap seminar", createdAt: daysAgo(2) },
  });

  // (b) Citra — 20 hari tanpa aktivitas (demo threshold)
  const citra = await prisma.user.create({
    data: { name: "Citra Lestari", email: "citra@student.ac.id", passwordHash: hashPassword(PW), role: "mahasiswa", identifier: "NIM-2021002" },
  });
  const skripsiB = await prisma.skripsi.create({
    data: {
      mahasiswaId: citra.id,
      dosenId: dosenB.id,
      judul: "Analisis Sentimen Ulasan Marketplace dengan Naive Bayes",
      stage: "proposal",
      stageStatus: "submitted",
    },
  });
  await prisma.draft.create({
    data: { skripsiId: skripsiB.id, bab: 1, version: 1, filePath: saveDummy(skripsiB.id, 1, 1, "bab1.pdf"), fileName: "bab1.pdf", uploadedAt: daysAgo(20) },
  });
  await prisma.guidanceLog.create({
    data: { skripsiId: skripsiB.id, actorId: citra.id, action: "upload", note: "Upload Bab 1 versi 1", createdAt: daysAgo(20) },
  });
  await prisma.guidanceLog.create({
    data: { skripsiId: skripsiB.id, actorId: citra.id, action: "submit_stage", note: "Mengajukan tahap proposal", createdAt: daysAgo(20) },
  });

  // (c) Dedi — baru, proposal masih draft
  const dedi = await prisma.user.create({
    data: { name: "Dedi Prasetyo", email: "dedi@student.ac.id", passwordHash: hashPassword(PW), role: "mahasiswa", identifier: "NIM-2021003" },
  });
  const skripsiC = await prisma.skripsi.create({
    data: {
      mahasiswaId: dedi.id,
      dosenId: dosenA.id,
      judul: "Penerapan Algoritma A* pada Perencanaan Rute Pengiriman",
      stage: "proposal",
      stageStatus: "draft",
    },
  });
  await prisma.guidanceLog.create({
    data: { skripsiId: skripsiC.id, actorId: dedi.id, action: "note", note: "Skripsi dibuat", createdAt: daysAgo(1) },
  });

  console.log(`seed selesai: prodi=${prodi.email}, dosen=2, mahasiswa=3`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
