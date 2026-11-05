/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exportação estática: a pasta out/ pode ir para qualquer hospedagem (Vercel, Netlify, S3).
  output: 'export',
  images: { unoptimized: true },
  reactStrictMode: true,
  // PREVIEW_RELATIVE=1 gera caminhos relativos, para abrir o out/ fora da raiz do domínio.
  assetPrefix: process.env.PREVIEW_RELATIVE ? '.' : undefined,
};

export default nextConfig;
