import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, STAGES } from "@/lib/auth";
import { listSkripsiFor } from "@/lib/skripsi";

export async function GET() {
  const r = await requireUser();
  if ("error" in r) return NextResponse.json({ error: r.message }, { status: r.error });
  const rows = await listSkripsiFor({ role: r.session.role, id: r.user.id });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const r = await requireUser(["mahasiswa"]);
  if ("error" in r) return NextResponse.json({ error: r.message }, { status: r.error });
  const body = await req.json().catch(() => null);
  const judul = String(body?.judul ?? "").trim();
  const dosenId = body?.dosenId != null ? Number(body.dosenId) : null;

  if (!judul) return NextResponse.json({ error: "judul wajib diisi" }, { status: 400 });

  const existing = await prisma.skripsi.findUnique({ where: { mahasiswaId: r.user.id } });
  if (existing)
    return NextResponse.json({ error: "Mahasiswa hanya boleh memiliki 1 skripsi" }, { status: 409 });

  if (dosenId != null) {
    const dosen = await prisma.user.findUnique({ where: { id: dosenId } });
    if (!dosen || dosen.role !== "dosen")
      return NextResponse.json({ error: "dosenId tidak valid" }, { status: 400 });
  }

  const created = await prisma.skripsi.create({
    data: {
      mahasiswaId: r.user.id,
      dosenId,
      judul,
      stage: STAGES[0],
      stageStatus: "draft",
    },
  });
  await prisma.guidanceLog.create({
    data: { skripsiId: created.id, actorId: r.user.id, action: "note", note: "Skripsi dibuat" },
  });
  return NextResponse.json(created, { status: 201 });
}
