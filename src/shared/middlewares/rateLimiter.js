const AppError = require('../utils/AppError');

// Simple in-memory rate limiter
// Untuk production: ganti dengan Redis sliding window
const store = new Map();

const createLimiter = ({ windowMs, max, message }) => {
  return (req, res, next) => {
    const key = req.ip + req.path;
    const now = Date.now();

    if (!store.has(key)) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    const record = store.get(key);

    // Reset window jika sudah expired
    if (now > record.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    // Increment counter
    record.count += 1;

    if (record.count > max) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return next(new AppError(message || 'Terlalu banyak request. Coba lagi nanti.', 429));
    }

    next();
  };
};

// Cleanup expired entries tiap 5 menit
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (now > record.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

module.exports = {
  // 5 percobaan login per 15 menit per IP
  loginLimiter: createLimiter({
    windowMs: 15 * 60 * 1000,
    max:      5,
    message:  'Terlalu banyak percobaan login. Coba lagi 15 menit.',
  }),

  // 3 kali kirim OTP per 10 menit per IP
  otpLimiter: createLimiter({
    windowMs: 10 * 60 * 1000,
    max:      3,
    message:  'Terlalu banyak permintaan OTP. Coba lagi 10 menit.',
  }),

  // General API limiter — 100 req per menit
  generalLimiter: createLimiter({
    windowMs: 60 * 1000,
    max:      100,
    message:  'Rate limit tercapai. Coba lagi sebentar.',
  }),
};
