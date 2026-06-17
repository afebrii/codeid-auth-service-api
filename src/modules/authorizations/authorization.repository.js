const { query } = require('../../shared/utils/db');

const AuthorizationRepository = {
  async getUserProfile(userId) {
    const sql = `
      SELECT user_id, username, email, full_name
      FROM   users
      WHERE  user_id = :userId
        AND  deleted_at IS NULL
    `;
    const result = await query(sql, { userId });
    return result.rows[0] || null;
  },

  async getUserRoles(userId) {
    const sql = `
      SELECT r.role_id, r.role_code, r.role_name
      FROM   user_roles ur
      JOIN   roles r ON r.role_id = ur.role_id
      WHERE  ur.user_id = :userId
        AND  (ur.expires_at IS NULL OR ur.expires_at > SYSTIMESTAMP)
    `;
    const result = await query(sql, { userId });
    return result.rows;
  },

  async getEffectivePermissions(userId) {
    const sql = `
      SELECT DISTINCT p.permission_id, p.permission_code, p.module, p.action
      FROM   permissions p
      WHERE  p.permission_id IN (
        SELECT rp.permission_id
        FROM   user_roles ur
        JOIN   role_permissions rp ON rp.role_id = ur.role_id
        JOIN   roles r ON r.role_id = ur.role_id AND r.is_active = 1
        WHERE  ur.user_id = :userId
          AND  (ur.expires_at IS NULL OR ur.expires_at > SYSTIMESTAMP)
        UNION
        SELECT up.permission_id
        FROM   user_permissions up
        WHERE  up.user_id = :userId
      )
    `;
    const result = await query(sql, { userId });
    return result.rows;
  },

  async getAllRoles() {
    const sql = `
      SELECT role_id, role_code, role_name, description
      FROM   roles
      WHERE  is_active = 1
      ORDER  BY role_id
    `;
    const result = await query(sql);
    return result.rows;
  },

  async getPermissionsByModule(userId, moduleName) {
    // Ambil semua permission yang tersedia untuk modul ini
    const allPermsSql = `
      SELECT permission_id, action
      FROM   permissions
      WHERE  module = :moduleName
    `;
    const allPermsResult = await query(allPermsSql, { moduleName });
    const allPerms = allPermsResult.rows;

    // Ambil permission yang saat ini dimiliki user (baik via role maupun direct) untuk modul ini
    const userPermsSql = `
      SELECT DISTINCT p.permission_id, p.action
      FROM   permissions p
      WHERE  p.module = :moduleName
        AND  p.permission_id IN (
          SELECT rp.permission_id
          FROM   user_roles ur
          JOIN   role_permissions rp ON rp.role_id = ur.role_id
          JOIN   roles r ON r.role_id = ur.role_id AND r.is_active = 1
          WHERE  ur.user_id = :userId
            AND  (ur.expires_at IS NULL OR ur.expires_at > SYSTIMESTAMP)
          UNION
          SELECT up.permission_id
          FROM   user_permissions up
          WHERE  up.user_id = :userId
        )
    `;
    const userPermsResult = await query(userPermsSql, { userId, moduleName });
    const userPerms = userPermsResult.rows;

    // Aksi yang sudah dimiliki user (Permissions)
    const grantedActions = userPerms;

    // Aksi yang belum dimiliki user (Actions)
    const grantedIds = new Set(grantedActions.map(p => p.PERMISSION_ID));
    const availableActions = allPerms.filter(p => !grantedIds.has(p.PERMISSION_ID));

    return {
      module: moduleName,
      grantedActions,
      availableActions
    };
  },

  async updateUserRoles(userId, roleIds) {
    // Hapus role lama
    await query(
      `DELETE FROM user_roles WHERE user_id = :userId`,
      { userId }
    );

    // Sisipkan role baru
    for (const roleId of roleIds) {
      await query(
        `INSERT INTO user_roles (user_id, role_id) VALUES (:userId, :roleId)`,
        { userId, roleId }
      );
    }
  },

  async updateUserDirectPermissions(userId, moduleName, permissionIds, grantedBy = null) {
    // 1. Dapatkan semua permission_id untuk modul ini agar bisa dihapus secara spesifik untuk modul tersebut
    const modulePermsResult = await query(
      `SELECT permission_id FROM permissions WHERE module = :moduleName`,
      { moduleName }
    );
    const modulePermIds = modulePermsResult.rows.map(r => r.PERMISSION_ID);

    if (modulePermIds.length > 0) {
      // Hapus direct permissions lama user untuk modul ini saja
      const binds = { userId };
      const placeholders = modulePermIds.map((id, index) => {
        const key = `p${index}`;
        binds[key] = id;
        return `:${key}`;
      }).join(', ');

      await query(
        `DELETE FROM user_permissions 
         WHERE user_id = :userId 
           AND permission_id IN (${placeholders})`,
        binds
      );
    }

    // 2. Sisipkan direct permissions baru jika ada yang dipilih
    for (const permissionId of permissionIds) {
      await query(
        `INSERT INTO user_permissions (user_id, permission_id, granted_by) 
         VALUES (:userId, :permissionId, :grantedBy)`,
        { userId, permissionId, grantedBy: grantedBy || null }
      );
    }
  }
};

module.exports = AuthorizationRepository;
