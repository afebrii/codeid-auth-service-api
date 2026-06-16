const oracledb = require('oracledb');
const { query } = require('../../shared/utils/db');

const JobRepository = {
  async findAll() {
    const sql = `
      SELECT job_id, job_title, min_salary, max_salary
      FROM   jobs
      ORDER  BY job_id
    `;
    const result = await query(sql);
    return result.rows;
  },

  async findById(id) {
    const sql = `
      SELECT job_id, job_title, min_salary, max_salary
      FROM   jobs
      WHERE  job_id = :id
    `;
    const result = await query(sql, { id });
    return result.rows[0] || null;
  },

  async create(data) {
    const sql = `
      INSERT INTO jobs (job_id, job_title, min_salary, max_salary)
      VALUES (:job_id, :job_title, :min_salary, :max_salary)
    `;
    const binds = {
      job_id:     data.job_id.toUpperCase().trim(),
      job_title:  data.job_title.trim(),
      min_salary: data.min_salary !== undefined && data.min_salary !== null ? data.min_salary : null,
      max_salary: data.max_salary !== undefined && data.max_salary !== null ? data.max_salary : null
    };
    await query(sql, binds);
    return this.findById(data.job_id);
  },

  async update(id, data) {
    const sql = `
      UPDATE jobs
      SET    job_title  = :job_title,
             min_salary = :min_salary,
             max_salary = :max_salary
      WHERE  job_id     = :id
    `;
    const result = await query(sql, {
      job_title:  data.job_title.trim(),
      min_salary: data.min_salary !== undefined && data.min_salary !== null ? data.min_salary : null,
      max_salary: data.max_salary !== undefined && data.max_salary !== null ? data.max_salary : null,
      id,
    });
    if (result.rowsAffected === 0) return null;
    return this.findById(id);
  },

  async remove(id) {
    const sql = `
      DELETE FROM jobs
      WHERE  job_id = :id
    `;
    const result = await query(sql, { id });
    return result.rowsAffected > 0;
  },
};

module.exports = JobRepository;
