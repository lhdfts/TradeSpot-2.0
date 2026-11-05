/** @type {import('next').NextConfig} */

// Rota pública da LP dentro do domínio do sistema (ver scripts/build-landing.mjs na raiz).
export const BASE_PATH = '/testedelpdasilva';

const nextConfig = {
  // Exportação estática: out/ é copiada para dist/testedelpdasilva/ no build do sistema.
  output: 'export',
  basePath: BASE_PATH,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
