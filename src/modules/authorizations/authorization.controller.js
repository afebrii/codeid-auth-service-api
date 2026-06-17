const AuthorizationService = require('./authorization.service');
const response = require('../../shared/utils/response');

const AuthorizationController = {
  async getUserAuthProfile(req, res, next) {
    try {
      const userId = Number(req.params.id);
      const data = await AuthorizationService.getUserAuthorizationData(userId);
      return response.success(res, data, 'Data profil otorisasi user berhasil diambil');
    } catch (err) {
      next(err);
    }
  },

  async getRoles(req, res, next) {
    try {
      const data = await AuthorizationService.getAllRoles();
      return response.success(res, data, 'Daftar role berhasil diambil');
    } catch (err) {
      next(err);
    }
  },

  async updateRoles(req, res, next) {
    try {
      const userId = Number(req.params.id);
      const { roles } = req.body;
      const data = await AuthorizationService.updateUserRoles(userId, roles);
      return response.success(res, data, 'Role user berhasil diperbarui');
    } catch (err) {
      next(err);
    }
  },

  async getPermissionsByModule(req, res, next) {
    try {
      const userId = Number(req.params.id);
      const moduleName = req.query.module;
      const data = await AuthorizationService.getPermissionsByModule(userId, moduleName);
      return response.success(res, data, `Data permission modul ${moduleName} berhasil diambil`);
    } catch (err) {
      next(err);
    }
  },

  async updateDirectPermissions(req, res, next) {
    try {
      const userId = Number(req.params.id);
      const { module, permissionIds } = req.body;
      const grantedBy = req.user ? req.user.sub : null;
      
      const data = await AuthorizationService.updateUserDirectPermissions(
        userId,
        module,
        permissionIds,
        grantedBy
      );
      
      return response.success(res, data, `Direct permissions untuk modul ${module} berhasil diperbarui`);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = AuthorizationController;
