import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";

async function handleSignOut(req: NextRequest) {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.auth.signOut();
    }
  } catch (err) {
    console.warn("Supabase sign out error:", err);
  }

  // Clear local bypass/role cookies
  const cookieStore = await cookies();
  cookieStore.delete("dojoia_role");
  cookieStore.delete("dojoia_email");
  cookieStore.delete("dojoia_name");

  revalidatePath("/", "layout");

  // Determine host and protocol behind reverse proxies (like Render)
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const cleanProto = proto.split(",")[0].trim();
  const baseUrl = `${cleanProto}://${host}`;

  return NextResponse.redirect(new URL("/", baseUrl), {
    status: 302,
  });
}

export async function POST(req: NextRequest) {
  return handleSignOut(req);
}

export async function GET(req: NextRequest) {
  return handleSignOut(req);
}
