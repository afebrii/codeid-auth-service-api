const express = require('express');
const authRoutes = require('./modules/auths/auth.routes')
const jobsRoutes = require('./modules/jobs/job.routes')
const departmentRoutes = require('./modules/departments/department.routes')
const authorizationRoutes = require('./modules/authorizations/authorization.routes')
const documentRoutes = require('./modules/document/document.routes')
// tambah route lain di sini, contoh:
//const employeesRoutes   = require('./employeesRoutes');


const router = express.Router();

router.use('/auth', authRoutes);
router.use('/jobs', jobsRoutes);
router.use('/departments', departmentRoutes);
router.use('/authorizations', authorizationRoutes);
router.use('/documents', documentRoutes);

module.exports = router;
