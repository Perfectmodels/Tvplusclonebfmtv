import type {NextConfig} from 'next';

const nextConfig:NextConfig={
  experimental:{
    optimizePackageImports:['lucide-react'],
    // LWS shared hosting: reduce peak memory during production builds.
    cpus:1,
    webpackMemoryOptimizations:true,
  },
};

export default nextConfig;
