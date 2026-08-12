"use server";

import { headers } from "next/headers";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

function parseTutorField(tutorField: string) {
  const match = tutorField?.match(/(.*)\s+\[credentials:(.*?):(.*?)]/);
  if (match) {
    return {
      tutor: match[1].trim(),
      email: match[2],
      password: match[3]
    };
  }
  return {
    tutor: tutorField || "",
    email: "",
    password: ""
  };
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  const emailVal = formData.get("email") as string;
  const passwordVal = formData.get("password") as string;

  const cookieStore = await cookies();

  const email = (emailVal || "").trim().toLowerCase();
  const password = (passwordVal || "").trim();

  const isMockSupabase = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                         !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                         String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).includes("reemplázala") ||
                         !String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).startsWith("eyJ");

  // FIXED ADMIN SENSEI BYPASS
  const isAdminEmail = email === "admin@admin.com";
  const isAdminPassword = 
    password.toLowerCase() === "12345678cecyte" ||
    password.toLowerCase() === "12345678cecy" ||
    password === "12345678";

  if (isAdminEmail && isAdminPassword) {
    if (!isMockSupabase) {
      try {
        const authPassword = password.toLowerCase() === "12345678cecyte" ? passwordVal : "12345678Cecyte";
        // Attempt standard auth login to create an active Supabase session
        const { error: signInError } = await supabase.auth.signInWithPassword({ 
          email: "admin@admin.com", 
          password: authPassword 
        });
        if (signInError) {
          // If sign in fails (e.g. user does not exist), register the user first
          const { error: signUpError } = await supabase.auth.signUp({
            email: "admin@admin.com",
            password: "12345678Cecyte",
            options: {
              data: {
                full_name: "Director Maker",
                role: "sensei",
              },
            },
          });
          if (!signUpError) {
            await supabase.auth.signInWithPassword({ 
              email: "admin@admin.com", 
              password: "12345678Cecyte" 
            });
          }
        }
      } catch (authErr) {
        console.warn("Supabase auth integration failed during admin bypass, continuing with cookie session:", authErr);
      }
    }
    cookieStore.set("dojoia_role", "sensei", { path: "/" });
    cookieStore.set("dojoia_email", "admin@admin.com", { path: "/" });
    cookieStore.set("dojoia_name", "Director Maker", { path: "/" });
    return redirect("/dashboard");
  }

  // CHECK DYNAMIC KARATEKA TABLE FOR STUDENT CREDENTIALS
  if (!isMockSupabase) {
    try {
      const { data: students, error: studentError } = await supabase
        .from("karatekas")
        .select("nombre, tutor, activo")
        .ilike("tutor", "%[credentials:%");

      if (students && !studentError) {
        const matched = students.find((s: any) => {
          const creds = parseTutorField(s.tutor);
          if (creds.email.toLowerCase() !== email) return false;
          
          const enteredLower = password.toLowerCase();
          const storedLower = creds.password.trim().toLowerCase();
          
          return enteredLower === storedLower || 
                 enteredLower === storedLower + "cecy" || 
                 enteredLower === storedLower + "cecyte" ||
                 storedLower === enteredLower + "cecy" ||
                 storedLower === enteredLower + "cecyte";
        });

        if (matched) {
          if (matched.activo === false) {
            return redirect("/pago-requerido");
          }
          cookieStore.set("dojoia_role", "karateka", { path: "/" });
          cookieStore.set("dojoia_email", email, { path: "/" });
          cookieStore.set("dojoia_name", matched.nombre, { path: "/" });
          return redirect("/dashboard");
        }
      }
    } catch (dbErr) {
      console.warn("Dynamic karateka check failed or skipped", dbErr);
    }
  }

  // STANDARD AUTH
  let authError = null;
  let userMetadata = null;

  if (!isMockSupabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      authError = error;
      if (!error && data?.user) {
        userMetadata = data.user.user_metadata;
      }
    } catch (err) {
      console.error("Supabase auth signInWithPassword failed", err);
      authError = err;
    }
  }

  if (isMockSupabase || authError) {
    // If Supabase credentials fail or we are offline/no-keys, check and allow a mock login
    if (isMockSupabase && email && password) {
      const isStudent = email.includes("student") || email.includes("alumno") || password === "123456";
      const role = isStudent ? "karateka" : "sensei";
      const name = isStudent ? "Mateo García López" : "Director Maker";
      
      cookieStore.set("dojoia_role", role, { path: "/" });
      cookieStore.set("dojoia_email", email, { path: "/" });
      cookieStore.set("dojoia_name", name, { path: "/" });
      return redirect("/dashboard");
    }
    return redirect("/login?error=Credenciales inválidas. Por favor intenta de nuevo.");
  }

  // Read metadata role if Supabase is connected
  const role = userMetadata?.role || "karateka";
  const name = userMetadata?.full_name || "Karateka";

  cookieStore.set("dojoia_role", role, { path: "/" });
  cookieStore.set("dojoia_email", email, { path: "/" });
  cookieStore.set("dojoia_name", name, { path: "/" });

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const role = formData.get("role") as string || "karateka";
  const plan = formData.get("plan") as string || "Mensualidad Regular";
  const paymentStatus = formData.get("paymentStatus") as string || "no_pagado";

  const cookieStore = await cookies();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role, // 'sensei' or 'karateka'
        plan: plan,
        payment_status: paymentStatus,
      },
    },
  });

  if (error) {
    // Fallback for offline signup demo
    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                   !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                   String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).includes("reemplázala") ||
                   !String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).startsWith("eyJ");

    if (isMock) {
      cookieStore.set("dojoia_role", role, { path: "/" });
      cookieStore.set("dojoia_email", email, { path: "/" });
      cookieStore.set("dojoia_name", fullName, { path: "/" });
      cookieStore.set("dojoia_plan", plan, { path: "/" });
      cookieStore.set("dojoia_payment_status", paymentStatus, { path: "/" });
      return redirect("/dashboard?welcome=true");
    }
    return redirect("/register?error=" + encodeURIComponent(error.message));
  }

  // Auto-insert student profile to 'karatekas' table if role is student
  if (role === "karateka") {
    try {
      const { data: existing } = await supabase
        .from("karatekas")
        .select("id")
        .like("tutor", `%[credentials:${email.toLowerCase()}:%`)
        .limit(1);

      if (!existing || existing.length === 0) {
        const randomNum = Math.floor(100 + Math.random() * 900);
        const matricula = `KA-2026-${randomNum}`;
        
        const dbPayload = {
          matricula: matricula,
          nombre: fullName.trim(),
          cinturon: "blanco",
          grado: "10° Kyu",
          tutor: `${fullName.trim()} [credentials:${email.trim().toLowerCase()}:${password.trim()}]`,
          telefono: "+5215500000000",
          foto_url: "https://images.unsplash.com/photo-1542435503-956c469947f6?auto=format&fit=crop&q=80&w=200",
          activo: true
        };

        await supabase.from("karatekas").insert(dbPayload);
      }
    } catch (e) {
      console.warn("Could not insert student to database during signup:", e);
    }
  }

  cookieStore.set("dojoia_role", role, { path: "/" });
  cookieStore.set("dojoia_email", email, { path: "/" });
  cookieStore.set("dojoia_name", fullName, { path: "/" });
  cookieStore.set("dojoia_plan", plan, { path: "/" });
  cookieStore.set("dojoia_payment_status", paymentStatus, { path: "/" });

  revalidatePath("/", "layout");
  redirect("/dashboard?welcome=true");
}

