# Analisis Halaman Otorisasi & Perancangan REST API

Dokumen ini berisi analisis tabel database yang terlibat dan rancangan REST API untuk halaman otorisasi user (`/profile/auth/:id`) berdasarkan mockup yang diberikan.

---

## 1. Analisis Tabel yang Terlibat

Berdasarkan mockup halaman otorisasi untuk user dengan ID `100` (`kangdiancp`), sistem ini mengelola dua hal utama: **Role Grants (Pemberian Peran)** dan **Modules Permission (Hak Akses Modul)**.

### A. Tabel Utama (Berdasarkan Skema Database Saat Ini)
1. **`USERS`**
   - **Peran**: Menyimpan informasi identitas user seperti `username` dan `email` yang ditampilkan pada bagian panel **Profiles**.
   - **Kolom Kunci**: `user_id`, `username`, `email`.

2. **`ROLES`**
   - **Peran**: Menyimpan daftar semua peran yang tersedia di sistem (seperti `SUPER_ADMIN`, `ADMIN`, `USERS`, `MANAGER`, `VIEWER`). Ini digunakan untuk mengisi kotak daftar sebelah kiri (**Roles**).
   - **Kolom Kunci**: `role_id`, `role_code`, `role_name`.

3. **`USER_ROLES`**
   - **Peran**: Menyimpan hubungan many-to-many antara user dan role. Digunakan untuk mengisi kotak sebelah kanan (**Role Grants**) dan diperbarui ketika tombol **Save** pada bagian Roles ditekan.
   - **Kolom Kunci**: `user_id`, `role_id`.

4. **`PERMISSIONS`**
   - **Peran**: Menyimpan daftar modul (`module` seperti `USERS`, `ROLE`, `DEPARTMENT`, `EMPLOYEE`, `REPORT`) beserta aksinya (`action` seperti `READ`, `WRITE`, `DELETE`). Ini digunakan untuk mengisi pilihan pada bagian **Modules Permission**.
   - **Kolom Kunci**: `permission_id`, `permission_code`, `module`, `action`.

5. **`ROLE_PERMISSIONS`**
   - **Peran**: Menyimpan hubungan many-to-many antara role dan permission.
   - **Kolom Kunci**: `role_id`, `permission_id`.

---

### B. Analisis Arsitektur "Modules Permission" (Penting)
Pada skema database saat ini, permission dikaitkan ke **Role** (`ROLE_PERMISSIONS`), bukan langsung ke **User**. Namun, di mockup terdapat panel **Modules Permission** per user dengan tombol **Save** dan **Cancel**.

Ada 2 opsi pendekatan untuk mengimplementasikan hal ini:

#### Opsi 1: Menggunakan Direct User Permissions (Direkomendasikan)
Menambahkan tabel baru bernama `USER_PERMISSIONS` agar admin dapat memberikan hak akses khusus langsung kepada user (bersifat melengkapi/override permission dari role-nya).
```sql
CREATE TABLE user_permissions (
  user_id         NUMBER(10) NOT NULL,
  permission_id   NUMBER(10) NOT NULL,
  granted_at      TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  granted_by      NUMBER(10),
  
  CONSTRAINT pk_user_permissions PRIMARY KEY (user_id, permission_id),
  CONSTRAINT fk_up_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_up_permission FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE
);
```

#### Opsi 2: Berbasis Transitive/Role Permissions
Halaman ini hanya menampilkan permission efektif user yang didapat dari role-role yang ia miliki melalui view `v_user_permissions`. Jika demikian, bagian **Modules Permission** ini hanya bersifat *read-only* atau perubahan di sini akan membuat sistem otomatis memodifikasi tabel `ROLE_PERMISSIONS` (tetapi hal ini akan berdampak pada seluruh user lain yang memiliki role tersebut).

---

## 2. Perancangan REST API

Berikut adalah rancangan REST API lengkap untuk mendukung fungsionalitas halaman tersebut.

### API 1: Mengambil Data Profil Autentikasi User
*   **Endpoint**: `GET /api/users/:id/authorization`
*   **Deskripsi**: Mengambil data profil user (untuk bagian **Profiles**), beserta role yang saat ini dimiliki (**Role Grants**), dan seluruh permission aktifnya.
*   **Tabel Terlibat**: `USERS`, `USER_ROLES`, `ROLES`, `V_USER_PERMISSIONS`.
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Data otorisasi user berhasil diambil",
      "data": {
        "user": {
          "user_id": 100,
          "username": "kangdiancp",
          "email": "kangdiancp@gmail.com"
        },
        "grantedRoles": [
          {
            "role_id": 4,
            "role_code": "USERS",
            "role_name": "Regular User"
          }
        ],
        "effectivePermissions": [
          {
            "permission_id": 5,
            "permission_code": "dept:read",
            "module": "DEPARTMENT",
            "action": "READ"
          }
        ]
      }
    }
    ```

---

### API 2: Mengambil Semua Daftar Role yang Tersedia
*   **Endpoint**: `GET /api/roles`
*   **Deskripsi**: Mengambil semua daftar master role untuk ditampilkan pada kotak pilihan kiri (**Roles**).
*   **Tabel Terlibat**: `ROLES`.
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Daftar role berhasil diambil",
      "data": [
        { "role_id": 1, "role_code": "SUPER_ADMIN", "role_name": "Super Administrator" },
        { "role_id": 2, "role_code": "ADMIN", "role_name": "Administrator" },
        { "role_id": 4, "role_code": "USERS", "role_name": "Regular User" }
      ]
    }
    ```

---

### API 3: Memperbarui Role yang Dimiliki User
*   **Endpoint**: `PUT /api/users/:id/roles`
*   **Deskripsi**: Menyimpan daftar role baru yang dipilih untuk user ketika tombol **Save** pada bagian Roles ditekan.
*   **Tabel Terlibat**: `USER_ROLES` (menggunakan transaksi: menghapus data role lama user, lalu memasukkan daftar role baru).
*   **Request Body**:
    ```json
    {
      "roles": [4] // daftar role_id yang diberikan ke user
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Role user berhasil diperbarui",
      "data": {
        "user_id": 100,
        "roles": [
          { "role_id": 4, "role_code": "USERS", "role_name": "Regular User" }
        ]
      }
    }
    ```

---

### API 4: Mengambil Detail Permission Berdasarkan Modul Terpilih
*   **Endpoint**: `GET /api/users/:id/permissions?module=:moduleName`
*   **Deskripsi**: Ketika admin memilih salah satu modul di list box **Modules** (misal: `DEPARTMENT`), API ini dipanggil untuk memisahkan daftar aksi yang belum dimiliki (**Actions**) dan aksi yang sudah dimiliki (**Permissions**).
*   **Tabel Terlibat**: `PERMISSIONS`, `ROLE_PERMISSIONS` (atau `USER_PERMISSIONS` jika menggunakan Opsi 1).
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Data permission modul DEPARTMENT berhasil diambil",
      "data": {
        "module": "DEPARTMENT",
        "grantedActions": [
          { "permission_id": 5, "action": "READ" }
        ],
        "availableActions": [
          { "permission_id": 6, "action": "WRITE" },
          { "permission_id": 7, "action": "DELETE" }
        ]
      }
    }
    ```

---

### API 5: Memperbarui Permission Langsung (Direct Permission) User
*   **Endpoint**: `PUT /api/users/:id/permissions`
*   **Deskripsi**: Menyimpan konfigurasi permission baru untuk modul tertentu ketika tombol **Save** pada bagian Modules Permission ditekan (Menggunakan Opsi 1 `USER_PERMISSIONS`).
*   **Tabel Terlibat**: `USER_PERMISSIONS` (menggunakan transaksi: menghapus permission lama untuk user di modul tersebut, lalu menyisipkan yang baru dipilih).
*   **Request Body**:
    ```json
    {
      "module": "DEPARTMENT",
      "permissionIds": [5, 6] // daftar permission_id yang di-grant (misal READ & WRITE)
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Permission modul DEPARTMENT berhasil diperbarui"
    }
    ```
