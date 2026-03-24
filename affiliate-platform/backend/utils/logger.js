/**
 * utils/logger.js — Structured logging with Winston
 */

const winston = require('winston');
const path = require('path');

const logDir = path.join(__dirname, '../../logs');

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message }) =>
          `${timestamp} [${level}] ${message}`
        )
      ),
    }),
    // In production, also write to files
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({ filename: `${logDir}/error.log`, level: 'error' }),
      new winston.transports.File({ filename: `${logDir}/combined.log` }),
    ] : []),
  ],
});

module.exports = logger;
