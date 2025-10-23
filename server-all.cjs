const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting EchoDay All-in-One Server...');
console.log('📡 This will start:');
console.log('   - Frontend Dev Server (Vite)');
console.log('   - Mail Server (IMAP/POP3/SMTP)');
console.log('   - Webhook Server (Zapier Proxy)');

// Server configurations
const servers = [
  {
    name: 'Frontend',
    command: 'npm',
    args: ['run', 'dev'],
    color: '\x1b[36m', // Cyan
    prefix: '[FRONTEND]'
  },
  {
    name: 'Mail Server',
    command: 'node',
    args: [path.join(__dirname, 'server', 'mail-server.cjs')],
    color: '\x1b[32m', // Green
    prefix: '[MAIL-SERVER]'
  },
  {
    name: 'Webhook Server',
    command: 'node',
    args: [path.join(__dirname, 'server.cjs')],
    color: '\x1b[35m', // Magenta
    prefix: '[WEBHOOK-SERVER]'
  }
];

// Function to spawn a server process
function startServer(config) {
  const child = spawn(config.command, config.args, {
    stdio: 'pipe',
    shell: true
  });

  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      console.log(`${config.color}${config.prefix}\x1b[0m ${line}`);
    });
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      console.log(`${config.color}${config.prefix} [ERROR]\x1b[0m ${line}`);
    });
  });

  child.on('error', (error) => {
    console.error(`${config.color}${config.prefix} [FATAL ERROR]\x1b[0m Failed to start:`, error.message);
  });

  child.on('close', (code) => {
    if (code !== 0) {
      console.error(`${config.color}${config.prefix} [EXITED]\x1b[0m Process exited with code ${code}`);
    } else {
      console.log(`${config.color}${config.prefix} [EXITED]\x1b[0m Process exited successfully`);
    }
  });

  return child;
}

// Start all servers
const processes = [];
let startedCount = 0;

console.log('\n🔄 Starting servers...\n');

servers.forEach((config, index) => {
  setTimeout(() => {
    console.log(`${config.color}🚀 Starting ${config.name}...\x1b[0m`);
    const process = startServer(config);
    processes.push({ name: config.name, process });
    startedCount++;

    if (startedCount === servers.length) {
      console.log('\n✅ All servers started!');
      console.log('\n📋 Server URLs:');
      console.log('   🌐 Frontend: http://localhost:5173');
      console.log('   📧 Mail Server: http://localhost:5123');
      console.log('   🪝 Webhook Server: http://localhost:5001');
      console.log('\n💡 Press Ctrl+C to stop all servers\n');
    }
  }, index * 1000); // Stagger startup by 1 second
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down all servers...\n');
  
  processes.forEach(({ name, process }) => {
    console.log(`🔄 Stopping ${name}...`);
    process.kill('SIGTERM');
  });

  setTimeout(() => {
    console.log('✅ All servers stopped. Goodbye!');
    process.exit(0);
  }, 2000);
});

// Handle unexpected errors
process.on('uncaughtException', (error) => {
  console.error('\n❌ Uncaught Exception:', error);
  processes.forEach(({ process }) => {
    process.kill('SIGTERM');
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ Unhandled Rejection at:', promise, 'reason:', reason);
});