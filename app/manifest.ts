import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dr Ria's",
    short_name: "Dr Ria's",
    description: "Dr Ria's Skincare & Haircare, Made with Care in India",
    start_url: '/',
    display: 'standalone',
    background_color: '#FBF6EE',
    theme_color: '#5C3D1E',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
