const JobsModel = require('../../../model-generator/output/jobModel');
const AppError = require('../../shared/utils/AppError');

const validateJob = (req, res, next) => {
  const { valid, errors } = JobsModel.validate(req.body);
  if (!valid) {
    return next(new AppError('Validasi gagal', 422, errors));
  }
  next();
};

module.exports = {
  validateJob
};
