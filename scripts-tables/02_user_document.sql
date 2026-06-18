CREATE SEQUENCE seq_user_documents
  START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
  
-- select seq_user_documents.NEXTVAL from dual;

CREATE TABLE user_documents (
  usdoc_id          NUMBER(10)    NOT NULL,
  user_id           NUMBER(10)    NOT NULL,
  file_name         VARCHAR2(255) NOT NULL,   -- nama asli file dari user
  stored_file_name  VARCHAR2(255) NOT NULL,   -- nama file di storage (UUID-based)
  file_link         VARCHAR2(500) NOT NULL,   -- URL untuk akses file
  file_path         VARCHAR2(500) NOT NULL,   -- path relatif (local) atau public_id (cloudinary)
  file_size         NUMBER(12)    NOT NULL,   -- ukuran dalam bytes
  content_type      VARCHAR2(100) NOT NULL,   -- MIME type
  create_date       TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,

  CONSTRAINT pk_user_documents PRIMARY KEY (usdoc_id),
  CONSTRAINT fk_usdoc_user     FOREIGN KEY (user_id)
                                REFERENCES users(user_id)
                                ON DELETE CASCADE   -- hapus user → dokumen ikut terhapus
);

COMMENT ON TABLE  user_documents                  IS 'Dokumen yang diupload user — relasi 1:N ke users';
COMMENT ON COLUMN user_documents.stored_file_name  IS 'UUID-based filename untuk hindari collision';
COMMENT ON COLUMN user_documents.file_path         IS 'Local: path relatif. Cloudinary: public_id (untuk hapus)';
COMMENT ON COLUMN user_documents.file_link         IS 'URL yang bisa diakses langsung dari browser';

CREATE INDEX idx_usdoc_user_id ON user_documents(user_id);

COMMIT;