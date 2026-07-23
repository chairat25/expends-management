import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    const expectedEmail = process.env.ADMIN_EMAIL || "Pondkub1324@gmail.com";
    const expectedPassword = process.env.ADMIN_PASSWORD || "Pondkub254425-";

    // 1. Check against Admin environment variables / fixed credentials
    const isEnvAdminMatch =
      email?.toLowerCase() === expectedEmail.toLowerCase() &&
      password === expectedPassword;

    // 2. Also attempt Supabase Auth sign-in
    const supabase = await createClient();
    const { data, error: supaError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (data?.session || isEnvAdminMatch) {
      const store = await cookies();
      store.set("admin_session", "authenticated_admin", {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: "lax",
      });

      return NextResponse.json({
        success: true,
        user: data?.user || { email: expectedEmail },
      });
    }

    return NextResponse.json(
      { error: "อีเมลหรือรหัสผ่านผู้ดูแลระบบไม่ถูกต้อง" },
      { status: 401 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" },
      { status: 500 },
    );
  }
}
