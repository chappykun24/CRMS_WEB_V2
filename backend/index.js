// Entry point for Render deployment
// Always use the full server for production deployments

console.log('Starting full server (production mode)');
console.log('Environment:', process.env.NODE_ENV);
console.log('USE_SIMPLE_SERVER:', process.env.USE_SIMPLE_SERVER);

// Force use of the real server in production
if (process.env.NODE_ENV === 'production') {
  console.log('Production environment detected - using full server');
  await import('./server.js');
} else if (process.env.USE_SIMPLE_SERVER === 'true') {
  console.log('Development mode with simple server requested');
  await import('./server-simple.js');
} else {
  console.log('Starting full server');
  await import('./server.js');
}
