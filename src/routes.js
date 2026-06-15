const express = require('express');
const authRoutes = require('./modules/auths/auth.routes')
// tambah route lain di sini, contoh:
//const employeesRoutes   = require('./employeesRoutes');


const router = express.Router();

router.use('/auth', authRoutes);

module.exports = router;
