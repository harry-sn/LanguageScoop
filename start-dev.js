const { MongoMemoryServer } = require('mongodb-memory-server');
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

async function main() {
  console.log('Starting MongoDB Memory Server...');
  // Spin up an in-memory MongoDB instance
  const mongod = await MongoMemoryServer.create({
    instance: {
      dbName: 'classeflow'
    }
  });

  const uri = mongod.getUri();
  console.log(`MongoDB Memory Server started at: ${uri}`);

  // Write to .env.local
  const envContent = `MONGO_URL=${uri}
DB_NAME=classeflow
JWT_SECRET=dev-secret
`;
  fs.writeFileSync(path.join(__dirname, '.env.local'), envContent);
  console.log('.env.local file created/updated with MONGO_URL.');

  console.log('Starting Next.js dev server...');
  
  // Next.js dev command
  // Since we are on Windows, we run npx next dev
  // Let's spawn "npx" with args
  const devServer = spawn('npx', ['next', 'dev', '--port', '3000'], {
    stdio: 'inherit',
    shell: true
  });

  // Handle process termination to clean up MongoDB
  const cleanup = async () => {
    console.log('\nStopping dev server and MongoDB...');
    devServer.kill();
    await mongod.stop();
    console.log('MongoDB Memory Server stopped.');
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch(err => {
  console.error('Failed to start:', err);
});
