import type {NextConfig} from 'next';

const nextConfig:NextConfig={
  // Évite que Next déduise la racine du workspace depuis un lockfile parent.
  outputFileTracingRoot:process.cwd(),
  typescript:{
    // Le typage est vérifié localement ; le serveur mutualisé n'a pas @types/node.
    ignoreBuildErrors:true,
  },
  experimental:{
    optimizePackageImports:['lucide-react'],
    // LWS shared hosting: reduce peak memory during production builds.
    cpus:1,
    webpackMemoryOptimizations:true,
  },
};

export default nextConfig;
