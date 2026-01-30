/**
 * Read NEXT_PUBLIC_* from .env.local so layout can inject them into the page.
 * Use this instead of process.env when the server render context doesn't have env.
 */
import path from 'path'
import fs from 'fs'

let cached: { url: string; anonKey: string } | null = null

export function getPublicSupabaseEnv(): { url: string; anonKey: string } {
  // First, try to use Next.js process.env (most reliable)
  const urlFromProcess = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
  const anonKeyFromProcess = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ''
  
  if (urlFromProcess && anonKeyFromProcess) {
    console.log('✅ Using Supabase env from process.env')
    return { url: urlFromProcess, anonKey: anonKeyFromProcess }
  }

  // Fallback: read from .env.local file directly
  // Clear cache in development to allow hot reloading of env vars
  if (process.env.NODE_ENV === 'development') {
    cached = null
  } else if (cached) {
    return cached
  }

  const envPath = path.join(process.cwd(), '.env.local')
  const fallback = { url: '', anonKey: '' }

  try {
    if (!fs.existsSync(envPath)) {
      console.error('❌ .env.local file not found at:', envPath)
      return fallback
    }
    
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

    const url = (parsed.NEXT_PUBLIC_SUPABASE_URL || '').trim()
    const anonKey = (parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

    if (!url || !anonKey) {
      console.error('❌ Missing Supabase env vars. URL:', url ? 'found' : 'missing', 'Key:', anonKey ? 'found' : 'missing')
      console.error('Available keys:', Object.keys(parsed))
    } else {
      console.log('✅ Loaded Supabase env vars from .env.local file')
    }

    cached = { url, anonKey }
    return cached
  } catch (error) {
    console.error('❌ Error reading .env.local:', error)
    return fallback
  }
}
