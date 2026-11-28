const apiOrigin = process.env.API_ORIGIN;
if (!apiOrigin || !/^https:\/\/[^/]+$/.test(apiOrigin)) {
  throw new Error('Configure API_ORIGIN com a origem HTTPS do projeto Express.');
}

export const config = {
  rewrites: [
    { source: '/api/v1/:path*', destination: `${apiOrigin}/api/v1/:path*` },
    { source: '/(.*)', destination: '/index.html' },
  ],
  headers: [
    {
      source: '/env.js',
      headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
    },
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      ],
    },
  ],
};
