import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Bee’s Reader',
    short_name: 'Bee’s Reader',
    description: 'Your own reading nook for manga, manhwa and manhua.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#FFFDF7',
    theme_color: '#111318',
    orientation: 'any',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Discover stories', url: '/discover' },
      { name: 'Your library', url: '/library' },
    ],
  };
}
