import { Server } from 'http';
import mongoose from 'mongoose';
import app from './app';
import config from './config';

let server: Server;

/**
 * Function to gracefully shut down the server
 * @param {Error | null} err - Error object (if any)
 * @param {string} source - Source of shutdown (e.g., "Unhandled Rejection")
 */
const shutdownGracefully = (err: Error | null, source: string) => {
  console.error(`😈 ${source} detected. Shutting down gracefully...`, err || '');
  if (server) {
    server.close(() => {
      console.log('Server closed.');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

/**
 * Main function to establish MongoDB connection and start the server
 */
const main = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(config.database_url as string);
    console.log('✅ MongoDB connected successfully.');

    server = app.listen(config.port, () => {
      console.log(`🚀 Server is running on port ${config.port}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err);
    process.exit(1); // Exit the process if the connection fails
  }
};

main();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  shutdownGracefully(err as Error, 'Unhandled Rejection');
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  shutdownGracefully(err, 'Uncaught Exception');
});

// Handle SIGTERM for graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  if (server) {
    server.close(() => {
      console.log('Process terminated.');
    });
  }
});
