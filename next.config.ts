import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Disable canvas and encoding for pdfjs
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    
    // Ignore pdfjs worker on server side
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'pdfjs-dist/build/pdf.worker.min.js': 'pdfjs-dist/build/pdf.worker.min.js',
      });
    }
    
    return config;
  },
};

export default nextConfig;
