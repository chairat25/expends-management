import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();

    const store = await cookies();
    store.delete("admin_session");

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
