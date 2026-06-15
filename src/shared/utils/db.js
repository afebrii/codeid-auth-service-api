const oracledb = require('oracledb');
const dbConfig = require('../../../config')


// Gunakan Oracle Thin mode — agar tidak perlu install Oracle Client
oracledb.initOracleClient();

let pool;

const connectDB = async () => {
  try {
    pool = await oracledb.createPool({
      user: dbConfig.db.user,
      password: dbConfig.db.password,
      connectString: dbConfig.db.connectString,
      poolMin: dbConfig.db.pool.min,
      poolMax: dbConfig.db.pool.max,
      poolIncrement: dbConfig.db.pool.increment,
    });

    console.log(`Oracle DB pool created — ${dbConfig.db.connectString}`);
  } catch (err) {
    console.error('Failed to create Oracle DB pool:', err.message);
    process.exit(1);
  }
};

/**
 * Execute query, auto-release koneksi ke pool.
 * @param {string} sql
 * @param {object|Array} binds
 * @param {object} opts
 */
const query = async (sql, binds = {}, opts = {}) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      autoCommit: true,
      ...opts,
    });
    return result;
  } finally {
    if (connection) {
      await connection.close();
    }
  }
};

/**
 * Execute Multi query using 1 connection pool
 * @param {function} txFunction - nama function contoh : createOtp()
 */
const transaction = async (txFunction) => {
  let connection;
  try {
    connection = await pool.getConnection();
    // Jalankan semua query di dalam function ini bawa objek connection-nya
    const result = await txFunction(connection);

    // Jika sukses semua function di commit
    await connection.commit();
    return result;
  } catch (err) {
    // Jika ada satu saja yang gagal, rollback!
    if (connection) {
      await connection.rollback();
    }
    throw err;
  } finally {
    if (connection) {
      await connection.close();
    }
  }
};


const closeDB = async () => {
  if (pool) {
    await pool.close(10);
    console.log('Oracle DB pool closed.');
  }
};

module.exports = { connectDB, query, closeDB };
