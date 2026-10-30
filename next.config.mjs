/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exportación estática: genera la carpeta "out" lista para Netlify.
  output: 'export',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
