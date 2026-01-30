/**
 * Read NEXT_PUBLIC_* from .env.local so layout can inject them into the page.
 * Use this instead of process.env when the server render context doesn't have env.
 */
import path from 'path'
import fs from 'fs'

let cached: { url: string; anonKey: string } | null = null

export function getPublicSupabaseEnv(): { url: string; anonKey: string } {
  if (cached) return cached

  const envPath = path.join(process.cwd(), '.env.local')
  const fallback = { url: '', anonKey: '' }

  try {
    if (!fs.existsSync(envPath)) return fallback
    const content = fs.readFileSync(envPath, 'utf8')
    const parsed: Record<string, string> = {}
    content.split('\n').forEach((line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return
      const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (m) {
        let value = m[2].trim()
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        parsed[m[1].trim()] = value
      }
    })

    cached = {
      url: (parsed.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
      anonKey: (parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim(),
    }
    return cached
  } catch {
    return fallback
  }
}
