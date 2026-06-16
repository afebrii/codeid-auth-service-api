const JobService = require('./job.service');
const response = require('../../shared/utils/response');

const JobController = {
  async getAll(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      
      const data = await JobService.getAllJobs({ search, page, limit });
      response.paginate(res, data.jobs, data.pagination, 'Data jobs berhasil diambil');
    } catch (e) { next(e); }
  },

  async getById(req, res, next) {
    try {
      const jobId = parseInt(req.params.id);
      const data = await JobService.getJobById(jobId);
      response.success(res, data, 'Data job berhasil diambil');
    } catch (e) { next(e); }
  },

  async create(req, res, next) {
    try {
      const { job_title, min_salary, max_salary } = req.body;
      const data = await JobService.createJob({ job_title, min_salary, max_salary });
      response.success(res, data, 'Job berhasil ditambahkan', 201);
    } catch (e) { next(e); }
  },

  async update(req, res, next) {
    try {
      const jobId = parseInt(req.params.id);
      const { job_title, min_salary, max_salary } = req.body;
      const data = await JobService.updateJob(jobId, { job_title, min_salary, max_salary });
      response.success(res, data, 'Job berhasil diperbarui');
    } catch (e) { next(e); }
  },

  async delete(req, res, next) {
    try {
      const jobId = parseInt(req.params.id);
      const data = await JobService.deleteJob(jobId);
      response.success(res, data, 'Job berhasil dihapus');
    } catch (e) { next(e); }
  }
};

module.exports = JobController;
