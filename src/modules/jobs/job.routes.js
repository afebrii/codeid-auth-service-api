const express       = require('express');
const JobController = require('./job.controller');
const authenticate  = require('../../shared/middlewares/authenticate');
const authorize     = require('../../shared/middlewares/authorize');

const router = express.Router();

router.get('/',       authenticate, JobController.index);
router.get('/:id',    authenticate, JobController.show);
router.post('/',      authenticate, authorize.roles('SUPER_ADMIN', 'ADMIN', 'MANAGER'), JobController.create);
router.put('/:id',    authenticate, authorize.roles('SUPER_ADMIN', 'ADMIN', 'MANAGER'), JobController.update);
router.delete('/:id', authenticate, authorize.roles('SUPER_ADMIN', 'ADMIN'), JobController.delete);

module.exports = router;
