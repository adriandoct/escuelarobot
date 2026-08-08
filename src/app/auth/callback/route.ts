import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Roles que tienen acceso por Google OAuth
const ALLOWED_ROLES = ["sensei", "sempai"];

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("No se recibió código de autenticación de Google.")}`
    );
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // ignorar si se llama desde Server Component
          }
        },
      },
    }
  );

  // Intercambiar código OAuth por sesión de Supabase
  const { data: sessionData, error: sessionError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (sessionError || !sessionData?.user) {
    console.error("OAuth session exchange error:", sessionError);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Error al iniciar sesión con Google. Inténtalo de nuevo.")}`
    );
  }

  const user = sessionData.user;
  const userEmail = user.email ?? "";

  // Verificar que el usuario exista en la tabla profiles con rol permitido
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("email", userEmail.toLowerCase())
    .in("role", ALLOWED_ROLES)
    .single();

  if (profileError || !profile) {
    // Cerrar sesión de Supabase para limpiar el estado OAuth
    await supabase.auth.signOut();

    console.warn(
      `Acceso denegado para ${userEmail}: no encontrado en profiles con rol permitido.`
    );

    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(
        "Acceso denegado. Solo Maestros y Administradores pueden iniciar sesión con Google. Contacta al administrador."
      )}`
    );
  }

  // ✅ Acceso permitido — establecer cookies de sesión personales
  cookieStore.set("dojoia_role", profile.role, { path: "/" });
  cookieStore.set("dojoia_email", userEmail, { path: "/" });
  cookieStore.set("dojoia_name", profile.full_name, { path: "/" });
  cookieStore.set("dojoia_auth_provider", "google", { path: "/" });

  return NextResponse.redirect(`${origin}${next}`);
}
