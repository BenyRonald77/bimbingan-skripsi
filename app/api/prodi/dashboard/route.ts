import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const r = await requireUser(["prodi"]);
  if ("error" in r) return NextResponse.json({ error: r.message }, { status: r.error });

  const thresholdParam = req.nextUrl.searchParams.get("threshold");
  const threshold = thresholdParam != null && !isNaN(Number(thresholdParam)) ? Number(thresholdParam) : 14;

  const skripsis = await prisma.skripsi.findMany({
    orderBy: { id: "asc" },
    include: {
      mahasiswa: { select: { id: true, name: true, email: true, identifier: true } },
      dosen: { select: { id: true, name: true, identifier: true } },
    },
  });

  const rows = await Promise.all(
    skripsis.map(async (s) => {
      const last = await prisma.guidanceLog.findFirst({
        where: { skripsiId: s.id },
        orderBy: { createdAt: "desc" },
      });
      const daysSince = last
        ? Math.floor((Date.now() - new Date(last.createdAt).getTime()) / 86400000)
        : null;
      return {
        skripsiId: s.id,
        mahasiswa: s.mahasiswa.name,
        nim: s.mahasiswa.identifier,
        email: s.mahasiswa.email,
        dosen: s.dosen?.name ?? "-",
        judul: s.judul,
        stage: s.stage,
        stageStatus: s.stageStatus,
        lastActivity: last ? last.createdAt : null,
        lastActivityNote: last ? `${last.action}${last.note ? ": " + last.note : ""}` : null,
        daysSince,
        lama: daysSince == null ? true : daysSince > threshold,
      };
    })
  );

  return NextResponse.json({ threshold, rows });
}
