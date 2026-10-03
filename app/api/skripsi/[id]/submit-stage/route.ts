import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, STAGES } from "@/lib/auth";
import { getSkripsiFor } from "@/lib/skripsi";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await requireUser(["mahasiswa"]);
  if ("error" in r) return NextResponse.json({ error: r.message }, { status: r.error });
  const g = await getSkripsiFor(Number(params.id), { role: r.session.role, id: r.user.id });
  if ("error" in g) return NextResponse.json({ error: g.message }, { status: g.error });
  const skripsi = g.skripsi;

  const body = await req.json().catch(() => null);
  const requestedStage = body?.stage ? String(body.stage) : skripsi.stage;

  if (!STAGES.includes(requestedStage as (typeof STAGES)[number]))
    return NextResponse.json({ error: "tahap tidak valid" }, { status: 400 });

  // Tahap yang diminta harus sama dengan tahap berjalan; tahap berikutnya
  // baru bisa diajukan setelah tahap sekarang disetujui (tahapan terkunci).
  if (requestedStage !== skripsi.stage) {
    const prev = STAGES[STAGES.indexOf(requestedStage as (typeof STAGES)[number]) - 1];
    return NextResponse.json(
      { error: `tahap ${requestedStage} belum bisa diajukan: tahap ${prev} belum disetujui` },
      { status: 422 }
    );
  }
  if (skripsi.stage === "lulus")
    return NextResponse.json({ error: "skripsi sudah lulus" }, { status: 422 });
  if (skripsi.stageStatus === "submitted")
    return NextResponse.json({ error: "tahap sudah diajukan, menunggu keputusan dosen" }, { status: 409 });
  if (skripsi.stageStatus !== "draft" && skripsi.stageStatus !== "revision")
    return NextResponse.json({ error: "tahap tidak dalam status yang bisa diajukan" }, { status: 422 });

  const updated = await prisma.skripsi.update({
    where: { id: skripsi.id },
    data: { stageStatus: "submitted" },
  });
  await prisma.guidanceLog.create({
    data: {
      skripsiId: skripsi.id,
      actorId: r.user.id,
      action: "submit_stage",
      note: `Mengajukan tahap ${requestedStage}`,
    },
  });
  return NextResponse.json(updated);
}
