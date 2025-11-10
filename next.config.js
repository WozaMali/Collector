/** @type {import('next').NextConfig} */
const path = require('path');
const nextConfig = {
	// Production optimizations
	eslint: {
		ignoreDuringBuilds: true,
	},
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
		}
		
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
	
	// Environment variables
	env: {
		CUSTOM_KEY: process.env.CUSTOM_KEY,
	},
	
	// Output configuration for Vercel
	output: 'standalone',
	
	// Experimental features
	experimental: {
		optimizeCss: false,
	},
};

module.exports = nextConfig;


