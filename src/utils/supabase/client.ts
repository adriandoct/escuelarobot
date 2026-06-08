import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn("Supabase environment variables are missing in browser. Using mock Supabase client.");
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
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

  return createBrowserClient(url, key);
}
