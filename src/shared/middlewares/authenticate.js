const tokenHelper = require('../utils/tokenHelper');
const AppError    = require('../utils/AppError');
const { query }   = require('../utils/db');

/**
 * authenticate — verifikasi JWT access token
 * Set req.user = { sub, username, email, roles[], permissions[], jti }
 */
const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer '))
      throw new AppError('Token tidak ditemukan', 401);

    const token   = header.split(' ')[1];
    const decoded = tokenHelper.verifyAccess(token);

    // Cek apakah JTI sudah di-revoke (logout / password change)
    const revoked = await query(
      `SELECT COUNT(*) AS CNT
       FROM   user_tokens
       WHERE  token_value = :jti
         AND  token_type  = 'ACCESS_JWT'
         AND  is_revoked  = 1`,
      { jti: decoded.jti }
    );

    if (revoked.rows[0].CNT > 0)
      throw new AppError('Token sudah tidak valid, silakan login ulang', 401);

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return next(new AppError('Token sudah expired', 401));
    if (err.name === 'JsonWebTokenError')
      return next(new AppError('Token tidak valid', 401));
    next(err);
  }
};

module.exports = authenticate;
