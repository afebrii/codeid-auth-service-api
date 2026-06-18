-- ============================================================
-- AUTH SCHEMA — Oracle 11g XE
-- Tables: users, roles, permissions, OTP, JWT tokens
-- ============================================================

-- ── SEQUENCES ────────────────────────────────────────────────

CREATE SEQUENCE seq_roles        START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_permissions  START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_users        START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_user_tokens  START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_otp_codes    START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_audit_logs   START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;


-- ============================================================
-- 1. ROLES
--    Definisi role: admin, manager, user, viewer, dll
-- ============================================================
CREATE TABLE roles (
  role_id     NUMBER(10)    NOT NULL,
  role_code   VARCHAR2(50)  NOT NULL,   -- e.g. 'ADMIN', 'MANAGER', 'USER'
  role_name   VARCHAR2(100) NOT NULL,   -- e.g. 'Administrator'
  description VARCHAR2(255),
  is_active   NUMBER(1)     DEFAULT 1 NOT NULL,
  created_at  TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at  TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,

  CONSTRAINT pk_roles         PRIMARY KEY (role_id),
  CONSTRAINT uq_roles_code    UNIQUE (role_code),
  CONSTRAINT ck_roles_active  CHECK (is_active IN (0, 1))
);

COMMENT ON TABLE  roles              IS 'Master data role';
COMMENT ON COLUMN roles.role_code    IS 'Kode unik role — dipakai di JWT payload dan authorize()';
COMMENT ON COLUMN roles.is_active    IS '1=aktif, 0=nonaktif';


-- ============================================================
-- 2. PERMISSIONS
--    misal : dept:read, dept:write, dll
-- ============================================================
CREATE TABLE permissions (
  permission_id   NUMBER(10)    NOT NULL,
  permission_code VARCHAR2(100) NOT NULL,   -- e.g. 'dept:read', 'dept:write'
  module          VARCHAR2(50)  NOT NULL,   -- e.g. 'DEPARTMENT', 'EMPLOYEE'
  action          VARCHAR2(50)  NOT NULL,   -- e.g. 'READ', 'WRITE', 'DELETE'
  description     VARCHAR2(255),
  created_at      TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,

  CONSTRAINT pk_permissions       PRIMARY KEY (permission_id),
  CONSTRAINT uq_permissions_code  UNIQUE (permission_code)
);

COMMENT ON TABLE  permissions                 IS 'Daftar aksi/permission yang bisa di-assign ke role';
COMMENT ON COLUMN permissions.permission_code IS 'Format: module:action — e.g. dept:read, user:delete';
COMMENT ON COLUMN permissions.module          IS 'Modul yang diproteksi';
COMMENT ON COLUMN permissions.action          IS 'Tipe aksi: READ, WRITE, UPDATE, DELETE, APPROVE';


-- ============================================================
-- 3. ROLE_PERMISSIONS
--    Many-to-many: role memiliki banyak permission
-- ============================================================
CREATE TABLE role_permissions (
  role_id         NUMBER(10) NOT NULL,
  permission_id   NUMBER(10) NOT NULL,
  granted_at      TIMESTAMP  DEFAULT SYSTIMESTAMP NOT NULL,
  granted_by      NUMBER(10),   -- user_id yang assign permission ini

  CONSTRAINT pk_role_permissions
    PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role
    FOREIGN KEY (role_id)       REFERENCES roles(role_id)       ON DELETE CASCADE,
  CONSTRAINT fk_rp_permission
    FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE
);

COMMENT ON TABLE role_permissions IS 'Mapping role → permissions (many-to-many)';


-- ============================================================
-- 4. USERS
--    Tabel utama user dengan password hash, status, lockout
-- ============================================================
CREATE TABLE users (
  user_id             NUMBER(10)    NOT NULL,
  username            VARCHAR2(100) NOT NULL,
  email               VARCHAR2(150) NOT NULL,
  password_hash       VARCHAR2(255) NOT NULL,   -- Argon2id hash
  full_name           VARCHAR2(200),
  phone_number        VARCHAR2(20),
  profile_picture_url VARCHAR2(500),

  -- Status
  is_active           NUMBER(1)     DEFAULT 0  NOT NULL,  -- 0 = belum verify email
  is_email_verified   NUMBER(1)     DEFAULT 0  NOT NULL,
  email_verified_at   TIMESTAMP,

  -- Security — lockout mechanism
  failed_attempts     NUMBER(3)     DEFAULT 0  NOT NULL,  -- jumlah login gagal
  locked_until        TIMESTAMP,                           -- null = tidak terkunci
  last_login_at       TIMESTAMP,
  last_login_ip       VARCHAR2(45),                        -- IPv4 atau IPv6

  -- Password reset
  password_reset_token     VARCHAR2(255),
  password_reset_expires   TIMESTAMP,

  -- Timestamps
  created_at          TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at          TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
  deleted_at          TIMESTAMP,                           -- soft delete

  CONSTRAINT pk_users           PRIMARY KEY (user_id),
  CONSTRAINT uq_users_username  UNIQUE (username),
  CONSTRAINT uq_users_email     UNIQUE (email),
  CONSTRAINT ck_users_active    CHECK (is_active         IN (0, 1)),
  CONSTRAINT ck_users_verified  CHECK (is_email_verified IN (0, 1)),
  CONSTRAINT ck_users_attempts  CHECK (failed_attempts   >= 0)
);

COMMENT ON TABLE  users                      IS 'Tabel utama user — autentikasi dan profil';
COMMENT ON COLUMN users.password_hash        IS 'Argon2id hash — JANGAN simpan plain text';
COMMENT ON COLUMN users.is_active            IS '0=pending verify, 1=aktif, diset true setelah OTP verified';
COMMENT ON COLUMN users.failed_attempts      IS 'Counter login gagal — reset ke 0 setelah login sukses';
COMMENT ON COLUMN users.locked_until         IS 'NULL=tidak terkunci. Diset saat failed_attempts >= MAX_ATTEMPTS';
COMMENT ON COLUMN users.deleted_at           IS 'Soft delete — NULL = tidak dihapus';


-- ============================================================
-- 5. USER_ROLES
--    Many-to-many: user bisa punya lebih dari satu role
-- ============================================================
CREATE TABLE user_roles (
  user_id     NUMBER(10) NOT NULL,
  role_id     NUMBER(10) NOT NULL,
  assigned_at TIMESTAMP  DEFAULT SYSTIMESTAMP NOT NULL,
  assigned_by NUMBER(10),   -- user_id yang assign role ini
  expires_at  TIMESTAMP,    -- NULL = tidak expired

  CONSTRAINT pk_user_roles  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_ur_user     FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_ur_role     FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE
);

COMMENT ON TABLE user_roles             IS 'Mapping user → roles (many-to-many)';
COMMENT ON COLUMN user_roles.expires_at IS 'Opsional: role temporary — null berarti permanent';


-- ============================================================
-- 6. USER_TOKENS
--    Menyimpan refresh token dan access token JWT untuk revoke
-- ============================================================
CREATE TABLE user_tokens (
  token_id      NUMBER(10)    NOT NULL,
  user_id       NUMBER(10)    NOT NULL,
  token_type    VARCHAR2(20)  NOT NULL,   -- 'REFRESH' | 'ACCESS_JWT'
  token_value   VARCHAR2(500) NOT NULL,   -- refresh token value JWT
  device_info   VARCHAR2(255),            -- user-agent / device name
  ip_address    VARCHAR2(45),
  expires_at    TIMESTAMP     NOT NULL,
  is_revoked    NUMBER(1)     DEFAULT 0 NOT NULL,
  revoked_at    TIMESTAMP,
  revoked_by    VARCHAR2(50),             -- 'LOGOUT' | 'ADMIN' | 'EXPIRED'
  created_at    TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,

  CONSTRAINT pk_user_tokens         PRIMARY KEY (token_id),
  CONSTRAINT fk_ut_user             FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT ck_ut_type             CHECK (token_type IN ('REFRESH', 'ACCESS_JWT','ACCESS_JTI')),
  CONSTRAINT ck_ut_revoked          CHECK (is_revoked  IN (0, 1))
);

COMMENT ON TABLE  user_tokens             IS 'Refresh token dan JWT blacklist untuk revoke JWT';
COMMENT ON COLUMN user_tokens.token_type  IS 'REFRESH=refresh token value, ACCESS_JWT=JWT claim dari JWT';
COMMENT ON COLUMN user_tokens.token_value IS 'Refresh: random UUID. Access JWT: claim JWT dari JWT payload';
COMMENT ON COLUMN user_tokens.is_revoked  IS '1=token sudah di-revoke/logout, tidak bisa dipakai lagi';
COMMENT ON COLUMN user_tokens.revoked_by  IS 'Alasan revoke: LOGOUT, ADMIN_ACTION, PASSWORD_CHANGE';


-- ============================================================
-- 7. OTP_CODES
--    OTP untuk email verification, 2FA, password reset, PIN
-- ============================================================
CREATE TABLE otp_codes (
  otp_id       NUMBER(10)   NOT NULL,
  user_id      NUMBER(10)   NOT NULL,
  otp_hash     VARCHAR2(255) NOT NULL,   -- Argon2id hash dari OTP plain text
  purpose      VARCHAR2(30) NOT NULL,    -- tipe OTP
  expires_at   TIMESTAMP    NOT NULL,
  attempts     NUMBER(3)    DEFAULT 0 NOT NULL,   -- jumlah percobaan salah
  max_attempts NUMBER(3)    DEFAULT 3 NOT NULL,   -- batas max percobaan
  is_used      NUMBER(1)    DEFAULT 0 NOT NULL,   -- 1 = sudah dipakai
  used_at      TIMESTAMP,
  created_at   TIMESTAMP    DEFAULT SYSTIMESTAMP NOT NULL,

  CONSTRAINT pk_otp_codes     PRIMARY KEY (otp_id),
  CONSTRAINT fk_otp_user      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT ck_otp_purpose   CHECK (purpose IN (
                                'EMAIL_VERIFY',    -- verifikasi email signup
                                'PASSWORD_RESET',  -- reset password
                                'TWO_FACTOR',      -- 2FA login
                                'PIN_SETUP',       -- setup PIN pertama kali
                                'PIN_RESET'        -- reset PIN
                              )),
  CONSTRAINT ck_otp_used      CHECK (is_used   IN (0, 1)),
  CONSTRAINT ck_otp_attempts  CHECK (attempts  >= 0)
);

COMMENT ON TABLE  otp_codes           IS 'OTP untuk semua keperluan: email verify, 2FA, password reset';
COMMENT ON COLUMN otp_codes.otp_hash  IS 'Argon2id hash — plain text OTP TIDAK disimpan';
COMMENT ON COLUMN otp_codes.purpose   IS 'Tipe penggunaan OTP';
COMMENT ON COLUMN otp_codes.attempts  IS 'Counter percobaan salah — token di-invalidate jika >= max_attempts';
COMMENT ON COLUMN otp_codes.is_used   IS '1=sudah digunakan, tidak bisa dipakai lagi (one-time use)';


-- ============================================================
-- 8. AUDIT_LOGS
--    Log semua aktivitas auth penting
-- ============================================================
CREATE TABLE audit_logs (
  log_id      NUMBER(10)    NOT NULL,
  user_id     NUMBER(10),               -- NULL jika belum login (e.g. failed login)
  action      VARCHAR2(50)  NOT NULL,   -- tipe aksi
  status      VARCHAR2(10)  NOT NULL,   -- 'SUCCESS' | 'FAILED'
  ip_address  VARCHAR2(45),
  user_agent  VARCHAR2(500),
  detail      VARCHAR2(1000),           -- info tambahan (e.g. "wrong password attempt 3/5")
  created_at  TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,

  CONSTRAINT pk_audit_logs    PRIMARY KEY (log_id),
  CONSTRAINT fk_al_user       FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT ck_al_action     CHECK (action IN (
                                'LOGIN',
                                'LOGOUT',
                                'REGISTER',
                                'EMAIL_VERIFY',
                                'PASSWORD_RESET',
                                'PASSWORD_CHANGE',
                                'PIN_SETUP',
                                'PIN_VERIFY',
                                'TOKEN_REFRESH',
                                'TOKEN_REVOKE',
                                'ROLE_ASSIGN',
                                'ROLE_REMOVE',
                                'ACCOUNT_LOCK',
                                'ACCOUNT_UNLOCK'
                              )),
  CONSTRAINT ck_al_status     CHECK (status IN ('SUCCESS', 'FAILED', 'BLOCKED'))
);

COMMENT ON TABLE  audit_logs         IS 'Log aktivitas autentikasi dan otorisasi';
COMMENT ON COLUMN audit_logs.user_id IS 'NULL jika aksi dilakukan sebelum login (e.g. login gagal)';
COMMENT ON COLUMN audit_logs.action  IS 'Tipe aksi yang dilakukan';


-- ============================================================
-- INDEXES — untuk query performa
-- ============================================================

-- users
CREATE INDEX idx_users_email      ON users(email);
CREATE INDEX idx_users_username   ON users(username);
CREATE INDEX idx_users_active     ON users(is_active, deleted_at);

-- user_tokens
CREATE INDEX idx_ut_user_type     ON user_tokens(user_id, token_type, is_revoked);
CREATE INDEX idx_ut_token_value   ON user_tokens(token_value);
CREATE INDEX idx_ut_expires       ON user_tokens(expires_at, is_revoked);

-- otp_codes
CREATE INDEX idx_otp_user_purpose ON otp_codes(user_id, purpose, is_used);
CREATE INDEX idx_otp_expires      ON otp_codes(expires_at, is_used);

-- audit_logs
CREATE INDEX idx_al_user_action   ON audit_logs(user_id, action);
CREATE INDEX idx_al_created       ON audit_logs(created_at);

-- user_roles
CREATE INDEX idx_ur_user          ON user_roles(user_id);
CREATE INDEX idx_ur_role          ON user_roles(role_id);

-- role_permissions
CREATE INDEX idx_rp_role          ON role_permissions(role_id);


-- ============================================================
-- SEED DATA — roles dan permissions default
-- ============================================================

-- Roles
INSERT INTO roles (role_id, role_code, role_name, description) VALUES
  (seq_roles.NEXTVAL, 'SUPER_ADMIN', 'Super Administrator', 'Akses penuh ke semua fitur dan konfigurasi sistem');

INSERT INTO roles (role_id, role_code, role_name, description) VALUES
  (seq_roles.NEXTVAL, 'ADMIN', 'Administrator', 'Kelola user, role, dan konfigurasi aplikasi');

INSERT INTO roles (role_id, role_code, role_name, description) VALUES
  (seq_roles.NEXTVAL, 'MANAGER', 'Manager', 'Approve dan review data — akses read/write sebagian besar modul');

INSERT INTO roles (role_id, role_code, role_name, description) VALUES
  (seq_roles.NEXTVAL, 'USER', 'Regular User', 'Akses standar — read dan submit data');

INSERT INTO roles (role_id, role_code, role_name, description) VALUES
  (seq_roles.NEXTVAL, 'VIEWER', 'Viewer', 'Read-only — tidak bisa create/edit/delete');


-- Permissions
INSERT INTO permissions (permission_id, permission_code, module, action, description) VALUES
  (seq_permissions.NEXTVAL, 'user:read',        'USER',       'READ',   'Lihat daftar dan detail user');
INSERT INTO permissions (permission_id, permission_code, module, action, description) VALUES
  (seq_permissions.NEXTVAL, 'user:write',       'USER',       'WRITE',  'Buat dan edit user');
INSERT INTO permissions (permission_id, permission_code, module, action, description) VALUES
  (seq_permissions.NEXTVAL, 'user:delete',      'USER',       'DELETE', 'Hapus user');
INSERT INTO permissions (permission_id, permission_code, module, action, description) VALUES
  (seq_permissions.NEXTVAL, 'role:manage',      'ROLE',       'MANAGE', 'Assign dan cabut role dari user');
INSERT INTO permissions (permission_id, permission_code, module, action, description) VALUES
  (seq_permissions.NEXTVAL, 'dept:read',        'DEPARTMENT', 'READ',   'Lihat data department');
INSERT INTO permissions (permission_id, permission_code, module, action, description) VALUES
  (seq_permissions.NEXTVAL, 'dept:write',       'DEPARTMENT', 'WRITE',  'Buat dan edit department');
INSERT INTO permissions (permission_id, permission_code, module, action, description) VALUES
  (seq_permissions.NEXTVAL, 'dept:delete',      'DEPARTMENT', 'DELETE', 'Hapus department');
INSERT INTO permissions (permission_id, permission_code, module, action, description) VALUES
  (seq_permissions.NEXTVAL, 'employee:read',    'EMPLOYEE',   'READ',   'Lihat data employee');
INSERT INTO permissions (permission_id, permission_code, module, action, description) VALUES
  (seq_permissions.NEXTVAL, 'employee:write',   'EMPLOYEE',   'WRITE',  'Buat dan edit employee');
INSERT INTO permissions (permission_id, permission_code, module, action, description) VALUES
  (seq_permissions.NEXTVAL, 'employee:delete',  'EMPLOYEE',   'DELETE', 'Hapus employee');
INSERT INTO permissions (permission_id, permission_code, module, action, description) VALUES
  (seq_permissions.NEXTVAL, 'report:read',      'REPORT',     'READ',   'Lihat laporan');
INSERT INTO permissions (permission_id, permission_code, module, action, description) VALUES
  (seq_permissions.NEXTVAL, 'report:export',    'REPORT',     'EXPORT', 'Export laporan ke PDF/Excel');

COMMIT;


-- ============================================================
-- VIEWS — untuk query JWT payload dan authorization check
-- ============================================================

-- View: user lengkap dengan roles (dipakai saat login untuk build JWT payload)
CREATE OR REPLACE VIEW v_user_roles AS
SELECT
  u.user_id,
  u.username,
  u.email,
  u.full_name,
  u.is_active,
  u.is_email_verified,
  u.failed_attempts,
  u.locked_until,
  r.role_id,
  r.role_code,
  r.role_name,
  ur.expires_at AS role_expires_at
FROM users u
JOIN user_roles  ur ON ur.user_id = u.user_id
                    AND (ur.expires_at IS NULL OR ur.expires_at > SYSTIMESTAMP)
JOIN roles       r  ON r.role_id   = ur.role_id
                    AND r.is_active = 1
WHERE u.deleted_at IS NULL;

COMMENT ON TABLE v_user_roles IS 'User dengan semua role aktif — dipakai untuk build JWT payload';


-- View: permission lengkap per user (dipakai untuk authorization check)
CREATE OR REPLACE VIEW v_user_permissions AS
SELECT DISTINCT
  u.user_id,
  u.username,
  r.role_code,
  p.permission_code,
  p.module,
  p.action
FROM users           u
JOIN user_roles      ur ON ur.user_id      = u.user_id
                        AND (ur.expires_at IS NULL OR ur.expires_at > SYSTIMESTAMP)
JOIN roles           r  ON r.role_id       = ur.role_id
                        AND r.is_active    = 1
JOIN role_permissions rp ON rp.role_id    = r.role_id
JOIN permissions     p  ON p.permission_id = rp.permission_id
WHERE u.deleted_at IS NULL
  AND u.is_active   = 1;

COMMENT ON TABLE v_user_permissions IS 'Semua permission efektif per user — untuk granular authorization';


-- ============================================================
-- TRIGGERS — auto update updated_at
-- ============================================================

CREATE OR REPLACE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
BEGIN
  :NEW.updated_at := SYSTIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER trg_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
BEGIN
  :NEW.updated_at := SYSTIMESTAMP;
END;
/

-- select * from users;
