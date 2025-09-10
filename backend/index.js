// Entry point for Render deployment
// Use simple working server to avoid startup issues

console.log('Starting simple working server');
console.log('Environment:', process.env.NODE_ENV);

// Use the simple working server for now
console.log('Loading simple working server...');
await import('./server-simple-working.js');
