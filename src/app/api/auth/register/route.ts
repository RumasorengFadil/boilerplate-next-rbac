import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { registerSchema } from "@/features/auth/schema";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Data pendaftaran tidak valid." }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  if (await db.user.findUnique({ where: { email } })) return NextResponse.json({ error: "Email sudah digunakan." }, { status: 409 });
  const user = await db.user.create({ data: { name: parsed.data.name, email, passwordHash: await hash(parsed.data.password, 12) } });
  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } }, { status: 201 });
}
