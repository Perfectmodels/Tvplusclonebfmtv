import type {NextConfig} from 'next';

const nextConfig:NextConfig={
  // Évite que Next déduise la racine du workspace depuis un lockfile parent.
  outputFileTracingRoot:__dirname,
  experimental:{
    optimizePackageImports:['lucide-react'],
    // LWS shared hosting: reduce peak memory during production builds.
    cpus:1,
    webpackMemoryOptimizations:true,
  },
};

export default nextConfig;
