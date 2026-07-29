// SPDX-License-Identifier: GPL-3.0-or-later
import winston from 'winston'

export const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'security.log', level: 'info' }),
  ],
})
