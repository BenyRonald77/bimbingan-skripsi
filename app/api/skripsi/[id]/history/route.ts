import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getSkripsiFor } from "@/lib/skripsi";

type TimelineItem = {
  type: "log" | "revision" | "approval";
  createdAt: Date;
  payload: unknown;
};

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const r = await requireUser();
  if ("error" in r) return NextResponse.json({ error: r.message }, { status: r.error });
  const g = await getSkripsiFor(Number(params.id), { role: r.session.role, id: r.user.id });
  if ("error" in g) return NextResponse.json({ error: g.message }, { status: g.error });

  const skripsiId = g.skripsi.id;
  const [logs, revisions, approvals] = await Promise.all([
    prisma.guidanceLog.findMany({
      where: { skripsiId },
      orderBy: { createdAt: "asc" },
      include: { actor: { select: { name: true, role: true } } },
    }),
    prisma.revisionNote.findMany({
      where: { draft: { skripsiId } },
      orderBy: { createdAt: "asc" },
      include: {
        dosen: { select: { name: true } },
        draft: { select: { bab: true, version: true, fileName: true } },
      },
    }),
    prisma.stageApproval.findMany({
      where: { skripsiId },
      orderBy: { createdAt: "asc" },
      include: { approver: { select: { name: true } } },
    }),
  ]);

  const timeline: TimelineItem[] = [
    ...logs.map((l) => ({ type: "log" as const, createdAt: l.createdAt, payload: l })),
    ...revisions.map((x) => ({ type: "revision" as const, createdAt: x.createdAt, payload: x })),
    ...approvals.map((a) => ({ type: "approval" as const, createdAt: a.createdAt, payload: a })),
  ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return NextResponse.json({ skripsi: g.skripsi, timeline });
}
