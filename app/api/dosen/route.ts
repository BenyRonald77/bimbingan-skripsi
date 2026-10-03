import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const r = await requireUser();
  if ("error" in r) return NextResponse.json({ error: r.message }, { status: r.error });
  const dosens = await prisma.user.findMany({
    where: { role: "dosen" },
    select: { id: true, name: true, identifier: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(dosens);
}
