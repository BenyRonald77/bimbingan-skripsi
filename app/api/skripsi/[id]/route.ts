import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getSkripsiFor } from "@/lib/skripsi";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const r = await requireUser();
  if ("error" in r) return NextResponse.json({ error: r.message }, { status: r.error });
  const g = await getSkripsiFor(Number(params.id), { role: r.session.role, id: r.user.id });
  if ("error" in g) return NextResponse.json({ error: g.message }, { status: g.error });
  return NextResponse.json(g.skripsi);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await requireUser();
  if ("error" in r) return NextResponse.json({ error: r.message }, { status: r.error });
  const g = await getSkripsiFor(Number(params.id), { role: r.session.role, id: r.user.id });
  if ("error" in g) return NextResponse.json({ error: g.message }, { status: g.error });

  const body = await req.json().catch(() => null);
  const data: { judul?: string; dosenId?: number | null } = {};

  if (body?.judul !== undefined) {
    const judul = String(body.judul).trim();
    if (!judul) return NextResponse.json({ error: "judul tidak boleh kosong" }, { status: 400 });
    // Hanya mahasiswa pemilik / prodi yang boleh ubah judul
    if (r.session.role !== "mahasiswa" && r.session.role !== "prodi")
      return NextResponse.json({ error: "hanya mahasiswa/prodi yang boleh ubah judul" }, { status: 403 });
    data.judul = judul;
  }
  if (body?.dosenId !== undefined) {
    // Hanya prodi yang boleh ganti pembimbing
    if (r.session.role !== "prodi")
      return NextResponse.json({ error: "hanya prodi yang boleh ganti dosen pembimbing" }, { status: 403 });
    const dosenId = body.dosenId == null ? null : Number(body.dosenId);
    if (dosenId != null) {
      const dosen = await prisma.user.findUnique({ where: { id: dosenId } });
      if (!dosen || dosen.role !== "dosen")
        return NextResponse.json({ error: "dosenId tidak valid" }, { status: 400 });
    }
    data.dosenId = dosenId;
  }

  const updated = await prisma.skripsi.update({ where: { id: g.skripsi.id }, data });
  return NextResponse.json(updated);
}
