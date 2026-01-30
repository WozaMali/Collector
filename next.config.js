/** @type {import('next').NextConfig} */
const path = require('path');
const fs = require('fs');
const webpack = require('webpack');

// Explicitly load .env.local so NEXT_PUBLIC_* are available for client bundle inlining
function loadEnvLocal() {
  const envPath = path.join(__dirname, '.env.local');
  try {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const parsed = {};
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
    console.warn('next.config.js: could not read .env.local', e.message);
  }
  return {};
}
const envLocal = loadEnvLocal();

const nextConfig = {
    // Production optimizations
    // ESLint configuration is no longer supported directly here
    // eslint: {
    //  ignoreDuringBuilds: true,
    // },
	typescript: {
		ignoreBuildErrors: true,
	},
  
  // Ensure correct monorepo root for resolving plugins and tracing
  outputFileTracingRoot: path.join(__dirname, '..'),
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
	
	// Webpack configuration
	webpack: (config, { isServer, dev }) => {
		if (!isServer) {
			config.resolve.fallback = {
				...config.resolve.fallback,
				fs: false,
				net: false,
				tls: false,
				crypto: false,
				stream: false,
				util: false,
				url: false,
				assert: false,
				http: false,
				https: false,
				os: false,
				buffer: false,
			};
			
			// Explicitly define NEXT_PUBLIC_* env vars for client bundle
			config.plugins.push(
				new webpack.DefinePlugin({
					'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(
						envLocal.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
					),
					'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(
						envLocal.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
					),
				})
			);
		}
		
		// Ensure plugins array exists
		config.plugins = config.plugins || [];
		
		// Handle @capacitor/core as optional dependency
		// This prevents build failures if module resolution fails
		// The module is only needed at runtime for native platforms
		config.resolve.alias = {
			...config.resolve.alias,
		};
		
		// Add module rules to handle optional dependencies gracefully
		config.module = config.module || {};
		config.module.rules = config.module.rules || [];
		
		// Production optimizations
		if (!dev) {
			config.optimization = {
				...config.optimization,
				splitChunks: {
					chunks: 'all',
					cacheGroups: {
						vendor: {
							test: /[\\/]node_modules[\\/]/,
							name: 'vendors',
							chunks: 'all',
						},
					},
				},
			};
		}
		
		return config;
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
};

module.exports = nextConfig;


