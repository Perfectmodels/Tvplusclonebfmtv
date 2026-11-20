import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Seules la URL et la clé publishable sont exposées au navigateur.
  // La clé secrète reste strictement côté serveur.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
    // URL HLS du direct (facultative). Tant qu'elle est absente, le lecteur
    // affiche un état explicite au lieu de simuler une diffusion.
    NEXT_PUBLIC_LIVE_STREAM_URL: process.env.NEXT_PUBLIC_LIVE_STREAM_URL ?? process.env.LIVE_STREAM_URL,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
