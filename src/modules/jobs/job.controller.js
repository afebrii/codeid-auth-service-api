const JobService = require('./job.service');
const response   = require('../../shared/utils/response');

const JobController = {
  async index(req, res, next) {
    try {
      const data = await JobService.getAll();
      return response.success(res, data, 'Daftar job berhasil diambil');
    } catch (err) {
      next(err);
    }
  },

  async show(req, res, next) {
    try {
      const data = await JobService.getById(req.params.id);
      return response.success(res, data, 'Detail job berhasil diambil');
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const data = await JobService.create(req.body);
      return response.success(res, data, 'Job berhasil dibuat', 201);
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const data = await JobService.update(req.params.id, req.body);
      return response.success(res, data, 'Job berhasil diperbarui');
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const data = await JobService.remove(req.params.id);
      return response.success(res, data, 'Job berhasil dihapus');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = JobController;
