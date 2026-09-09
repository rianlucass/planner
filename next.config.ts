import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite o HMR ao acessar o servidor de desenvolvimento pela rede local.
  allowedDevOrigins: ["192.168.1.107"],
};

export default nextConfig;
