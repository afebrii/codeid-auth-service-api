const express = require('express');
const AuthorizationController = require('./authorization.controller');
const authenticate = require('../../shared/middlewares/authenticate');
const authorize = require('../../shared/middlewares/authorize');

const router = express.Router();

// Semua rute otorisasi dilindungi dan hanya dapat diakses oleh SUPER_ADMIN atau ADMIN
router.use(authenticate);
router.use(authorize.roles('SUPER_ADMIN', 'ADMIN'));

/**
 * @route  GET /api/authorizations/roles
 * @desc   Ambil semua daftar master role
 * @access Private (SUPER_ADMIN, ADMIN)
 */
router.get('/roles', AuthorizationController.getRoles);

/**
 * @route  GET /api/authorizations/users/:id
 * @desc   Ambil data otorisasi user (profil, role grants, effective permissions)
 * @access Private (SUPER_ADMIN, ADMIN)
 */
router.get('/users/:id', AuthorizationController.getUserAuthProfile);

/**
 * @route  PUT /api/authorizations/users/:id/roles
 * @desc   Simpan perubahan role yang di-grant ke user
 * @access Private (SUPER_ADMIN, ADMIN)
 */
router.put('/users/:id/roles', AuthorizationController.updateRoles);

/**
 * @route  GET /api/authorizations/users/:id/permissions
 * @desc   Ambil pembagian aksi/permission (Actions vs Permissions) per modul untuk user
 * @access Private (SUPER_ADMIN, ADMIN)
 * @query  ?module=DEPARTMENT
 */
router.get('/users/:id/permissions', AuthorizationController.getPermissionsByModule);

/**
 * @route  PUT /api/authorizations/users/:id/permissions
 * @desc   Simpan perubahan direct permission user untuk modul tertentu
 * @access Private (SUPER_ADMIN, ADMIN)
 */
router.put('/users/:id/permissions', AuthorizationController.updateDirectPermissions);

module.exports = router;
