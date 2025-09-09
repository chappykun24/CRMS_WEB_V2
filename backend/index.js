// Entry point for Render deployment
// Use real server by default; fall back to simple stub if explicitly requested

if (process.env.USE_SIMPLE_SERVER === 'true') {
  console.log('Starting simple stub server (USE_SIMPLE_SERVER=true)');
  await import('./server-simple.js');
} else {
  console.log('Starting full server');
  await import('./server.js');
}
