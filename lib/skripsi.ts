import { prisma } from "./prisma";
import { requireUser } from "./auth";

type RoleFilter = { role: string; id: number };

// Boleh akses skripsi jika: prodi, mahasiswa pemilik, atau dosen pembimbing.
export async function getSkripsiFor(id: number, r: RoleFilter) {
  const skripsi = await prisma.skripsi.findUnique({
    where: { id },
    include: {
      mahasiswa: { select: { id: true, name: true, email: true, identifier: true } },
      dosen: { select: { id: true, name: true, identifier: true } },
    },
  });
  if (!skripsi) return { error: 404 as const, message: "Skripsi tidak ditemukan" };
  if (r.role === "prodi") return { skripsi };
  if (r.role === "mahasiswa" && skripsi.mahasiswaId === r.id) return { skripsi };
  if (r.role === "dosen" && skripsi.dosenId === r.id) return { skripsi };
  return { error: 403 as const, message: "Akses ditolak" };
}

export async function listSkripsiFor(r: RoleFilter) {
  if (r.role === "prodi") return prisma.skripsi.findMany({ orderBy: { id: "asc" } });
  if (r.role === "dosen")
    return prisma.skripsi.findMany({ where: { dosenId: r.id }, orderBy: { id: "asc" } });
  return prisma.skripsi.findMany({ where: { mahasiswaId: r.id }, orderBy: { id: "asc" } });
}

export { requireUser };
