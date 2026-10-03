import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const role = String(body?.role ?? "");
  const identifier = body?.identifier ? String(body.identifier).trim() : null;

  if (!name || !email || !password || !role)
    return NextResponse.json({ error: "nama, email, password, dan role wajib diisi" }, { status: 400 });
  if (!["mahasiswa", "dosen", "prodi"].includes(role))
    return NextResponse.json({ error: "role tidak valid" }, { status: 400 });
  if (password.length < 6)
    return NextResponse.json({ error: "password minimal 6 karakter" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    return NextResponse.json({ error: "email sudah terdaftar" }, { status: 409 });

  const user = await prisma.user.create({
    data: { name, email, passwordHash: hashPassword(password), role, identifier },
  });
  setSessionCookie({ id: user.id, role: user.role, name: user.name });
  return NextResponse.json(
    { id: user.id, name: user.name, email: user.email, role: user.role, identifier: user.identifier },
    { status: 201 }
  );
}
