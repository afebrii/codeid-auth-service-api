const express = require('express');
const JobController = require('./job.controller');
const { validateJob } = require('./job.validator');
const authenticate = require('../../shared/middlewares/authenticate');
const authorize = require('../../shared/middlewares/authorize');

const router = express.Router();

// Semua route Jobs memerlukan token JWT valid
router.use(authenticate);

// ── GET ROUTES (Semua role terautentikasi bisa akses) ─────────────────────
router.get('/', JobController.getAll);
router.get('/:id', JobController.getById);

// ── WRITE/DELETE ROUTES (Memerlukan Otorisasi Role) ───────────────────────
// Create & Update: SUPER_ADMIN, ADMIN, MANAGER
router.post('/', authorize.roles('SUPER_ADMIN', 'ADMIN', 'MANAGER'), validateJob, JobController.create);
router.put('/:id', authorize.roles('SUPER_ADMIN', 'ADMIN', 'MANAGER'), validateJob, JobController.update);

// Delete: Hanya SUPER_ADMIN, ADMIN
router.delete('/:id', authorize.roles('SUPER_ADMIN', 'ADMIN'), JobController.delete);

module.exports = router;
