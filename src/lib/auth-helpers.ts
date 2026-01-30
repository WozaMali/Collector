import { createBrowserClient, createServerClient } from '@supabase/ssr'

export function createSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createBrowserClient(url, key)
}

export function createSupabaseServer(cookies: { get: (n: string) => { value?: string } | undefined; set: (name: string, value: string, opts: any) => void; }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || 'localhost'
  return createServerClient(url, key, {
    cookies: {
      get: (name: string) => cookies.get(name)?.value,
      set: (name: string, value: string, options: any) => cookies.set(name, value, { ...options, domain }),
      remove: (name: string, options: any) => cookies.set(name, '', { ...options, maxAge: 0, domain }),
    },
  })
}


