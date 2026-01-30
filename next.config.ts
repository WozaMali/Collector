import type { NextConfig } from "next";
import path from "path";
import fs from "fs";

// Explicitly load .env.local so NEXT_PUBLIC_* are available for client bundle inlining
function loadEnvLocal() {
  const envPath = path.join(__dirname, '.env.local');
  try {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const parsed: Record<string, string> = {};
      content.split('\n').forEach((line) => {
        // Skip comments and empty lines
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        
        // Match KEY=VALUE (handles quoted and unquoted values)
        const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (m) {
          let value = m[2].trim();
          // Remove surrounding quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          parsed[m[1].trim()] = value;
        }
      });
      
      // Set process.env so Next.js can read them
      Object.keys(parsed).forEach(key => {
        if (!process.env[key]) {
          process.env[key] = parsed[key];
        }
      });
      
      console.log('✅ Loaded .env.local - Supabase URL:', parsed.NEXT_PUBLIC_SUPABASE_URL ? 'Found' : 'Missing');
      return parsed;
    }
  } catch (e) {
    console.warn('next.config.ts: could not read .env.local', (e as Error).message);
  }
  return {};
}
const envLocal = loadEnvLocal();

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
    unoptimized: false, // Enable optimization for production
  },
  
  // Headers for security and PWA
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Environment variables: use explicitly loaded .env.local so client bundle gets real values
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    NEXT_PUBLIC_SUPABASE_URL: envLocal.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: envLocal.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
  
  // Output configuration for Vercel
  output: 'standalone',
  
  // Experimental features
  experimental: {
    optimizeCss: false,
  },
  
  // Turbopack configuration (Next.js 16+ uses Turbopack by default)
  turbopack: {},
};

export default nextConfig;
