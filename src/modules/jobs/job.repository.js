const oracledb = require('oracledb');
const { query } = require('../../shared/utils/db');

const JobRepository = {
  async findAll({ search, page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    
    let sql = `SELECT job_id, job_title, min_salary, max_salary 
               FROM jobs 
               WHERE 1=1`;
    const binds = {};
    
    if (search) {
      sql += ` AND LOWER(job_title) LIKE :search`;
      binds.search = `%${search.toLowerCase()}%`;
    }
    
    // pagination count
    const countSql = `SELECT COUNT(*) AS total FROM (${sql})`;
    const countResult = await query(countSql, binds);
    const total = countResult.rows[0].TOTAL;
    
    sql += ` ORDER BY job_id DESC`;
    sql = `SELECT * FROM (
             SELECT a.*, ROWNUM rnum FROM (${sql}) a WHERE ROWNUM <= :maxRow
           ) WHERE rnum > :minRow`;
           
    binds.maxRow = offset + limit;
    binds.minRow = offset;
    
    const result = await query(sql, binds);
    return {
      rows: result.rows,
      total
    };
  },

  async findById(jobId) {
    const result = await query(
      `SELECT job_id, job_title, min_salary, max_salary 
       FROM jobs 
       WHERE job_id = :jobId`,
      { jobId }
    );
    return result.rows[0] || null;
  },

  async create({ job_title, min_salary, max_salary }) {
    const result = await query(
      `INSERT INTO jobs (job_id, job_title, min_salary, max_salary)
       VALUES (jobs_seq.NEXTVAL, :job_title, :min_salary, :max_salary)
       RETURNING job_id INTO :out_id`,
      {
        job_title,
        min_salary: min_salary !== undefined ? min_salary : null,
        max_salary: max_salary !== undefined ? max_salary : null,
        out_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );
    return result.outBinds.out_id[0];
  },

  async update(jobId, { job_title, min_salary, max_salary }) {
    await query(
      `UPDATE jobs
       SET job_title = :job_title,
           min_salary = :min_salary,
           max_salary = :max_salary
       WHERE job_id = :jobId`,
      {
        jobId,
        job_title,
        min_salary: min_salary !== undefined ? min_salary : null,
        max_salary: max_salary !== undefined ? max_salary : null
      }
    );
  },

  async delete(jobId) {
    await query(
      `DELETE FROM jobs WHERE job_id = :jobId`,
      { jobId }
    );
  }
};

module.exports = JobRepository;
