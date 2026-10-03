import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getSkripsiFor } from "@/lib/skripsi";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const STORAGE = join(process.cwd(), "storage");
const ALLOWED_EXT = [".pdf", ".doc", ".docx"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const r = await requireUser();
  if ("error" in r) return NextResponse.json({ error: r.message }, { status: r.error });
  const g = await getSkripsiFor(Number(params.id), { role: r.session.role, id: r.user.id });
  if ("error" in g) return NextResponse.json({ error: g.message }, { status: g.error });

  const drafts = await prisma.draft.findMany({
    where: { skripsiId: g.skripsi.id },
    orderBy: [{ bab: "asc" }, { version: "asc" }],
    include: {
      revisionNotes: {
        orderBy: { createdAt: "asc" },
        include: { dosen: { select: { name: true } } },
      },
    },
  });
  return NextResponse.json(drafts);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await requireUser(["mahasiswa"]);
  if ("error" in r) return NextResponse.json({ error: r.message }, { status: r.error });
  const g = await getSkripsiFor(Number(params.id), { role: r.session.role, id: r.user.id });
  if ("error" in g) return NextResponse.json({ error: g.message }, { status: g.error });

  const form = await req.formData().catch(() => null);
  const bab = Number(form?.get("bab"));
  const file = form?.get("file");

  if (![1, 2, 3, 4, 5].includes(bab))
    return NextResponse.json({ error: "bab harus 1..5" }, { status: 400 });
  if (!file || typeof file !== "object" || !("arrayBuffer" in file))
    return NextResponse.json({ error: "file wajib diunggah" }, { status: 400 });

  const f = file as File;
  const ext = "." + (f.name.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_EXT.includes(ext))
    return NextResponse.json({ error: "tipe file tidak didukung (pdf/doc/docx)" }, { status: 400 });
  if (f.size > MAX_SIZE)
    return NextResponse.json({ error: "ukuran file maksimal 10 MB" }, { status: 400 });

  const buf = Buffer.from(await f.arrayBuffer());
  const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const dir = join(STORAGE, "drafts", String(g.skripsi.id), String(bab));
  mkdirSync(dir, { recursive: true });

  // Version auto-increment per (skripsi, bab); ulangi bila bentrok unik (race)
  let version = 0;
  let draft = null;
  for (let attempt = 0; attempt < 5 && !draft; attempt++) {
    const max = await prisma.draft.aggregate({
      where: { skripsiId: g.skripsi.id, bab },
      _max: { version: true },
    });
    version = (max._max.version ?? 0) + 1;
    const relPath = `drafts/${g.skripsi.id}/${bab}/v${version}_${safeName}`;
    try {
      draft = await prisma.draft.create({
        data: {
          skripsiId: g.skripsi.id,
          bab,
          version,
          filePath: relPath,
          fileName: f.name,
        },
      });
      writeFileSync(join(STORAGE, relPath), buf);
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code !== "P2002") throw e; // bukan bentrok unik -> lempar
      draft = null;
    }
  }
  if (!draft) return NextResponse.json({ error: "gagal menyimpan draf, coba lagi" }, { status: 500 });

  await prisma.guidanceLog.create({
    data: {
      skripsiId: g.skripsi.id,
      actorId: r.user.id,
      action: "upload",
      note: `Upload ${"Bab " + bab} versi ${version} (${f.name})`,
    },
  });
  return NextResponse.json(draft, { status: 201 });
}
