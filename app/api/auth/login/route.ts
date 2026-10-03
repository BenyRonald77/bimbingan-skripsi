import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  if (!email || !password)
    return NextResponse.json({ error: "email dan password wajib diisi" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash))
    return NextResponse.json({ error: "email atau password salah" }, { status: 401 });

  setSessionCookie({ id: user.id, role: user.role, name: user.name });
  return NextResponse.json({
    id: user.id, name: user.name, email: user.email, role: user.role, identifier: user.identifier,
  });
}
