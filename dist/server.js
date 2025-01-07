"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const app_1 = __importDefault(require("./app"));
const config_1 = __importDefault(require("./config"));
let server;
/**
 * Function to gracefully shut down the server
 * @param {Error | null} err - Error object (if any)
 * @param {string} source - Source of shutdown (e.g., "Unhandled Rejection")
 */
const shutdownGracefully = (err, source) => {
    console.error(`😈 ${source} detected. Shutting down gracefully...`, err || '');
    if (server) {
        server.close(() => {
            console.log('Server closed.');
            process.exit(1);
        });
    }
    else {
        process.exit(1);
    }
};
/**
 * Main function to establish MongoDB connection and start the server
 */
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🔄 Connecting to MongoDB...');
        yield mongoose_1.default.connect(config_1.default.database_url);
        console.log('✅ MongoDB connected successfully.');
        server = app_1.default.listen(config_1.default.port, () => {
            console.log(`🚀 Server is running on port ${config_1.default.port}`);
        });
    }
    catch (err) {
        console.error('❌ Failed to connect to MongoDB:', err);
        process.exit(1); // Exit the process if the connection fails
    }
});
main();
// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    shutdownGracefully(err, 'Unhandled Rejection');
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
