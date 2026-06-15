require('dotenv').config();

const app    = require('./src/app');
const appConfig    = require('./config');
const { connectDB, closeDB } = require('./src/shared/utils/db');


let server;

// ── Start Server ───────────────────────────────────────────
const startServer = async () => {
  try {
    console.log('Connecting to Oracle Database...');

    // connectDB() membuat pool. Test koneksi dengan query ringan.
    await connectDB();


    const PORT = appConfig.app.port || 3000;
    server = app.listen(PORT, () => {
      console.log('');
      console.log('        AUTH SERVICE — RUNNING            ');
      console.log('══════════════════════════════════════════════');
      console.log(`Port    : ${PORT}`);
      console.log(`Env     : ${appConfig.app.env.padEnd(32)}`);
      console.log(`Prefix  : ${appConfig.app.prefix.padEnd(32)}`);
      console.log(`Swagger : http://localhost:${PORT}/api-docs`);
      console.log('');
    });

  } catch (error) {
    console.error('Error db:', error.message);
    process.exit(1);
  }
};

// ── Graceful Shutdown ───────────────────────────────────────
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      console.log('Express server closed. No longer accepting new requests.');
      await shutdownDependencies();
    });
  } else {
    // Server belum sempat MATI tapi DB sudah terkoneksi
    shutdownDependencies();
  }
};

// ── Close DB Pool ─────────────────────────────────────────
const shutdownDependencies = async () => {
  try {
    console.log('Closing Oracle database connection pool...');

    if (typeof closeDB === 'function') {
      await closeDB();
      console.log('Oracle database pool closed successfully.');
    } else {
      console.log('CloseDB function not found in db.js');
    }

    console.log('Graceful shutdown complete. Exiting process.');
    process.exit(0);
  } catch (error) {
    console.error('Error during database pool closure:', error.message);
    process.exit(1);
  }
};

// ── Force exit jika shutdown menggantung dalam 10s ─────────────────────
const setupTimeout = () => {
  setTimeout(() => {
    console.error('Forcefully shutting down due to timeout');
    process.exit(1);
  }, 10000);
};

// ── Signal listeners ──────────────────────────────────────
process.on('SIGINT', () => {
  setupTimeout();
  gracefulShutdown('SIGINT');
});

process.on('SIGTERM', () => {
  setupTimeout();
  gracefulShutdown('SIGTERM');
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  setupTimeout();
  gracefulShutdown('UNHANDLED_REJECTION');
});

// ── Running server ────────────────────────────────────────
startServer();