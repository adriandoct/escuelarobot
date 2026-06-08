import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn("Supabase environment variables are missing. Using mock Supabase client.");
    // Return a dummy client to avoid crashes
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error("Supabase keys not configured") }),
        signUp: async () => ({ data: { user: null, session: null }, error: new Error("Supabase keys not configured") }),
        signOut: async () => ({ error: null }),
      },
      from: () => {
        const queryBuilder = new Proxy({} as any, {
          get(target, prop) {
            if (prop === "then") {
              return (resolve: any) => resolve({ data: [], error: null });
            }
            return () => queryBuilder;
          }
        });
        return queryBuilder;
      },
    } as any;
  }

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
