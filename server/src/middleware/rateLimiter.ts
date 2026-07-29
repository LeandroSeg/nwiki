// SPDX-License-Identifier: GPL-3.0-or-later
import rateLimit from 'express-rate-limit'

export const RATE_LIMITS = {
  auth: rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { error: 'Too many auth requests, try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  }),
  write: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    message: { error: 'Too many write requests, try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  }),
  read: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { error: 'Too many requests, try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  }),
}
