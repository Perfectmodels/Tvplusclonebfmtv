import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Seules la URL et la clé publishable sont exposées au navigateur.
  // La clé secrète reste strictement côté serveur.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
