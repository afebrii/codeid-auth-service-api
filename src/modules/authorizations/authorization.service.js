const AuthorizationRepository = require('./authorization.repository');
const AppError = require('../../shared/utils/AppError');

const AuthorizationService = {
  async getUserAuthorizationData(userId) {
    const user = await AuthorizationRepository.getUserProfile(userId);
    if (!user) {
      throw new AppError(`User dengan ID ${userId} tidak ditemukan`, 404);
    }

    const [roles, permissions] = await Promise.all([
      AuthorizationRepository.getUserRoles(userId),
      AuthorizationRepository.getEffectivePermissions(userId)
    ]);

    return {
      user,
      grantedRoles: roles,
      effectivePermissions: permissions
    };
  },

  async getAllRoles() {
    return AuthorizationRepository.getAllRoles();
  },

  async getPermissionsByModule(userId, moduleName) {
    const user = await AuthorizationRepository.getUserProfile(userId);
    if (!user) {
      throw new AppError(`User dengan ID ${userId} tidak ditemukan`, 404);
    }

    if (!moduleName || String(moduleName).trim() === '') {
      throw new AppError('Nama modul wajib dicantumkan', 422);
    }

    return AuthorizationRepository.getPermissionsByModule(userId, moduleName.trim().toUpperCase());
  },

  async updateUserRoles(userId, roleIds) {
    const user = await AuthorizationRepository.getUserProfile(userId);
    if (!user) {
      throw new AppError(`User dengan ID ${userId} tidak ditemukan`, 404);
    }

    if (!Array.isArray(roleIds)) {
      throw new AppError('Daftar roleIds harus berupa array', 422);
    }

    await AuthorizationRepository.updateUserRoles(userId, roleIds);
    const updatedRoles = await AuthorizationRepository.getUserRoles(userId);

    return {
      user_id: userId,
      roles: updatedRoles
    };
  },

  async updateUserDirectPermissions(userId, moduleName, permissionIds, grantedBy = null) {
    const user = await AuthorizationRepository.getUserProfile(userId);
    if (!user) {
      throw new AppError(`User dengan ID ${userId} tidak ditemukan`, 404);
    }

    if (!moduleName || String(moduleName).trim() === '') {
      throw new AppError('Nama modul wajib dicantumkan', 422);
    }

    if (!Array.isArray(permissionIds)) {
      throw new AppError('Daftar permissionIds harus berupa array', 422);
    }

    await AuthorizationRepository.updateUserDirectPermissions(
      userId,
      moduleName.trim().toUpperCase(),
      permissionIds,
      grantedBy
    );

    return {
      success: true,
      message: `Direct permissions untuk modul ${moduleName} berhasil diperbarui`
    };
  }
};

module.exports = AuthorizationService;
