import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getSkripsiFor } from "@/lib/skripsi";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await requireUser(["dosen"]);
  if ("error" in r) return NextResponse.json({ error: r.message }, { status: r.error });

  const draft = await prisma.draft.findUnique({
    where: { id: Number(params.id) },
    include: { skripsi: true },
  });
  if (!draft) return NextResponse.json({ error: "Draf tidak ditemukan" }, { status: 404 });

  // Hanya dosen pembimbing yang boleh memberi revisi
  const g = await getSkripsiFor(draft.skripsiId, { role: r.session.role, id: r.user.id });
  if ("error" in g) return NextResponse.json({ error: g.message }, { status: g.error });

  const body = await req.json().catch(() => null);
  const note = String(body?.note ?? "").trim();
  const pageRef = body?.pageRef ? String(body.pageRef).trim() : null;
  if (!note) return NextResponse.json({ error: "catatan revisi wajib diisi" }, { status: 400 });

  const created = await prisma.revisionNote.create({
    data: { draftId: draft.id, dosenId: r.user.id, note, pageRef },
  });
  await prisma.guidanceLog.create({
    data: {
      skripsiId: draft.skripsiId,
      actorId: r.user.id,
      action: "revision",
      note: `Catatan revisi Bab ${draft.bab} versi ${draft.version}${pageRef ? ` (${pageRef})` : ""}`,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
