// Entry point for Render deployment

console.log('Starting CRMS Backend Server');
console.log('Environment:', process.env.NODE_ENV);

// Load the main server
console.log('Loading main server...');
await import('./server.js');
