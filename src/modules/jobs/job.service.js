const JobRepository = require('./job.repository');
const AppError = require('../../shared/utils/AppError');

const JobService = {
  async getAllJobs({ search, page, limit }) {
    const { rows, total } = await JobRepository.findAll({ search, page, limit });
    return {
      jobs: rows.map(row => ({
        job_id: row.JOB_ID,
        job_title: row.JOB_TITLE,
        min_salary: row.MIN_SALARY,
        max_salary: row.MAX_SALARY
      })),
      pagination: {
        page,
        limit,
        total
      }
    };
  },

  async getJobById(jobId) {
    const row = await JobRepository.findById(jobId);
    if (!row) throw new AppError('Job tidak ditemukan', 404);
    return {
      job_id: row.JOB_ID,
      job_title: row.JOB_TITLE,
      min_salary: row.MIN_SALARY,
      max_salary: row.MAX_SALARY
    };
  },

  async createJob({ job_title, min_salary, max_salary }) {
    const jobId = await JobRepository.create({ job_title, min_salary, max_salary });
    return {
      job_id: jobId,
      job_title,
      min_salary,
      max_salary
    };
  },

  async updateJob(jobId, { job_title, min_salary, max_salary }) {
    const exist = await JobRepository.findById(jobId);
    if (!exist) throw new AppError('Job tidak ditemukan', 404);
    
    await JobRepository.update(jobId, { job_title, min_salary, max_salary });
    return {
      job_id: jobId,
      job_title,
      min_salary,
      max_salary
    };
  },

  async deleteJob(jobId) {
    const exist = await JobRepository.findById(jobId);
    if (!exist) throw new AppError('Job tidak ditemukan', 404);
    
    await JobRepository.delete(jobId);
    return { message: 'Job berhasil dihapus' };
  }
};

module.exports = JobService;
