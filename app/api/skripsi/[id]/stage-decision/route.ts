import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, STAGES } from "@/lib/auth";
import { getSkripsiFor } from "@/lib/skripsi";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await requireUser(["dosen"]);
  if ("error" in r) return NextResponse.json({ error: r.message }, { status: r.error });
  const g = await getSkripsiFor(Number(params.id), { role: r.session.role, id: r.user.id });
  if ("error" in g) return NextResponse.json({ error: g.message }, { status: g.error });
  const skripsi = g.skripsi;

  // Hanya dosen pembimbing (getSkripsiFor sudah menolak dosen lain → 403)
  const body = await req.json().catch(() => null);
  const decision = String(body?.decision ?? "");
  const note = body?.note ? String(body.note).trim() : null;
  if (!["approve", "reject"].includes(decision))
    return NextResponse.json({ error: "decision harus approve atau reject" }, { status: 400 });
  if (skripsi.stageStatus !== "submitted")
    return NextResponse.json({ error: "tidak ada pengajuan tahap yang menunggu keputusan" }, { status: 422 });

  if (decision === "reject") {
    if (!note) return NextResponse.json({ error: "catatan wajib diisi saat menolak" }, { status: 400 });
    await prisma.stageApproval.create({
      data: { skripsiId: skripsi.id, stage: skripsi.stage, status: "rejected", approverId: r.user.id, note },
    });
    const updated = await prisma.skripsi.update({
      where: { id: skripsi.id },
      data: { stageStatus: "revision" },
    });
    await prisma.guidanceLog.create({
      data: { skripsiId: skripsi.id, actorId: r.user.id, action: "reject_stage", note: `Tahap ${skripsi.stage} ditolak: ${note}` },
    });
    return NextResponse.json(updated);
  }

  // approve
  await prisma.stageApproval.create({
    data: { skripsiId: skripsi.id, stage: skripsi.stage, status: "approved", approverId: r.user.id, note },
  });
  const idx = STAGES.indexOf(skripsi.stage as (typeof STAGES)[number]);
  const nextStage = idx < STAGES.length - 1 ? STAGES[idx + 1] : "lulus";
  const updated = await prisma.skripsi.update({
    where: { id: skripsi.id },
    data: nextStage === "lulus" ? { stage: "lulus", stageStatus: "approved" } : { stage: nextStage, stageStatus: "draft" },
  });
  await prisma.guidanceLog.create({
    data: {
      skripsiId: skripsi.id,
      actorId: r.user.id,
      action: "approve_stage",
      note: `Tahap ${skripsi.stage} disetujui${nextStage === "lulus" ? "; skripsi lulus" : `; lanjut tahap ${nextStage}`}`,
    },
  });
  return NextResponse.json(updated);
}
