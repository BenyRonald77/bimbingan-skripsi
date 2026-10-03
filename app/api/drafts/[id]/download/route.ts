import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getSkripsiFor } from "@/lib/skripsi";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const STORAGE = join(process.cwd(), "storage");
const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const r = await requireUser();
  if ("error" in r) return NextResponse.json({ error: r.message }, { status: r.error });

  const draft = await prisma.draft.findUnique({
    where: { id: Number(params.id) },
    include: { skripsi: true },
  });
  if (!draft) return NextResponse.json({ error: "Draf tidak ditemukan" }, { status: 404 });

  const g = await getSkripsiFor(draft.skripsiId, { role: r.session.role, id: r.user.id });
  if ("error" in g) return NextResponse.json({ error: g.message }, { status: g.error });

  const abs = join(STORAGE, draft.filePath);
  if (!abs.startsWith(STORAGE) || !existsSync(abs))
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });

  const ext = "." + (draft.fileName.split(".").pop() ?? "").toLowerCase();
  return new NextResponse(readFileSync(abs), {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${draft.fileName.replace(/"/g, "")}"`,
    },
  });
}
