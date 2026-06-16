# Dokumentasi Implementasi CRUD Jobs API dengan Authentication & Authorization

Berikut adalah rangkuman dari pekerjaan yang telah diselesaikan berdasarkan analisis pada [challennge.md](file:///e:/Bootcamp/Code%20ID%202026/03.%20Express/batch35-auth-service-api/docs/challennge.md). Modul Jobs telah sukses dibangun dengan proteksi keamanan penuh dan divalidasi langsung menggunakan model basis data Oracle.

---

## 🚀 1. Ringkasan Fitur yang Diimplementasikan
Kami telah membangun API CRUD (Create, Read, Update, Delete) untuk mengelola data pekerjaan pada tabel `JOBS` dengan ketentuan keamanan:
*   **Authentication**: Mengamankan semua endpoint menggunakan JSON Web Token (JWT). Hanya user terdaftar dengan token aktif yang dapat mengakses.
*   **Authorization (RBAC)**: Membatasi hak akses operasional (tambah, edit, hapus data) berdasarkan role pengguna (`SUPER_ADMIN`, `ADMIN`, `MANAGER`).
*   **Model-Based Validation**: Validasi data input menggunakan fungsi internal `JobsModel.validate` (snake_case) guna mencocokkan struktur kolom dan batasan karakter tabel secara otomatis.

---

## 🛠️ 2. Struktur Endpoint dan Pembatasan Akses

Semua endpoint dipasang di bawah base path `/api/jobs` dan diproteksi dengan aturan otorisasi berikut:

| Endpoint | HTTP Method | Keterangan Fungsi | Batasan Akses (Role) | Middleware Utama |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `GET` | Mengambil seluruh list pekerjaan (mendukung pencarian `search` dan `page`/`limit` pagination) | Semua Role Terautentikasi | `authenticate` |
| `/:id` | `GET` | Mengambil detail satu pekerjaan berdasarkan ID | Semua Role Terautentikasi | `authenticate` |
| `/` | `POST` | Menambahkan pekerjaan baru (body: `job_title`, `min_salary`, `max_salary`) | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | `authenticate`, `authorize.roles()`, `validateJob` |
| `/:id` | `PUT` | Memperbarui data pekerjaan berdasarkan ID | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | `authenticate`, `authorize.roles()`, `validateJob` |
| `/:id` | `DELETE` | Menghapus pekerjaan berdasarkan ID | `SUPER_ADMIN`, `ADMIN` | `authenticate`, `authorize.roles()` |

---

## 📂 3. Penjelasan Struktur Kode & Komponen yang Dibuat

Kami mengadopsi struktur berlapis (layered architecture) yang rapi di bawah folder [src/modules/jobs](file:///e:/Bootcamp/Code%20ID%202026/03.%20Express/batch35-auth-service-api/src/modules/jobs):

1.  **Repository ([job.repository.js](file:///e:/Bootcamp/Code%20ID%202026/03.%20Express/batch35-auth-service-api/src/modules/jobs/job.repository.js))**:
    *   Mengatur interaksi langsung ke Oracle DB menggunakan pool connection.
    *   Menerapkan query database sederhana (tanpa pagination/search).
    *   Menangani sequence `jobs_seq.NEXTVAL` saat penyimpanan record baru.

2.  **Model ([job.model.js](file:///e:/Bootcamp/Code%20ID%202026/03.%20Express/batch35-auth-service-api/src/modules/jobs/job.model.js))**:
    *   Representasi struktur data tabel `JOBS` serta pemegang logika validasi `validate(data)` untuk memeriksa kelengkapan nama, nominal angka gaji positif, dan aturan `max_salary` >= `min_salary`.

3.  **Service ([job.service.js](file:///e:/Bootcamp/Code%20ID%202026/03.%20Express/batch35-auth-service-api/src/modules/jobs/job.service.js))**:
    *   Mengontrol alur bisnis logis CRUD.
    *   Melakukan validasi input menggunakan `JobModel.validate` secara internal sebelum operasi database (create/update).
    *   Mendeteksi apabila resource job ID yang diminta tidak ada di database dan melempar `AppError` 404 (atau 500 pada penghapusan).

4.  **Controller ([job.controller.js](file:///e:/Bootcamp/Code%20ID%202026/03.%20Express/batch35-auth-service-api/src/modules/jobs/job.controller.js))**:
    *   Menangani request objek HTTP, parameter URL, dan mengembalikan response JSON menggunakan standard wrapper wrapper (`response.success`).

5.  **Routes ([job.routes.js](file:///e:/Bootcamp/Code%20ID%202026/03.%20Express/batch35-auth-service-api/src/modules/jobs/job.routes.js))**:
    *   Tempat pendefinisian rute dan perakitan middleware keamanan (`authenticate` dan `authorize.roles`).

5.  **Registrasi Routing Utama ([routes.js](file:///e:/Bootcamp/Code%20ID%202026/03.%20Express/batch35-auth-service-api/src/routes.js))**:
    *   Mengimpor `jobsRoutes` dan menempelkannya ke path `/jobs`.

---

## 🧪 4. Skema Pengujian Postman Lengkap

Berikut adalah detail konfigurasi request Postman untuk menguji Jobs API. Gunakan environment variable `{{base_url}}` (default: `http://localhost:3000`) dan `{{accessToken}}` (diperoleh setelah login).

### 1. Ambil Semua Jobs (GET List)
*   **Method**: `GET`
*   **URL**: `{{base_url}}/api/jobs`
*   **Headers**: 
    *   `Authorization`: `Bearer {{accessToken}}`
*   **Response Sukses (200)**:
    ```json
    {
      "success": true,
      "statusCode": 200,
      "message": "Data jobs berhasil diambil",
      "data": [
        {
          "JOB_ID": 1,
          "JOB_TITLE": "Public Relations",
          "MIN_SALARY": 4500,
          "MAX_SALARY": 10500
        }
      ],
      "timestamp": "2026-06-16T03:51:20.123Z"
    }
    ```

### 2. Ambil Detail Job (GET Detail)
*   **Method**: `GET`
*   **URL**: `{{base_url}}/api/jobs/:id` (Contoh: `{{base_url}}/api/jobs/1`)
*   **Headers**: 
    *   `Authorization`: `Bearer {{accessToken}}`
*   **Response Sukses (200)**:
    ```json
    {
      "success": true,
      "statusCode": 200,
      "message": "Data job berhasil diambil",
      "data": {
        "JOB_ID": 1,
        "JOB_TITLE": "Public Relations",
        "MIN_SALARY": 4500,
        "MAX_SALARY": 10500
      },
      "timestamp": "2026-06-16T03:51:35.456Z"
    }
    ```

### 3. Buat Job Baru (POST Create)
*   **Method**: `POST`
*   **URL**: `{{base_url}}/api/jobs`
*   **Headers**: 
    *   `Authorization`: `Bearer {{accessToken}}`
    *   `Content-Type`: `application/json`
*   **Body (JSON)**:
    ```json
    {
      "job_title": "Software Engineer II",
      "min_salary": 8000,
      "max_salary": 15000
    }
    ```
*   **Response Sukses (201)**:
    ```json
    {
      "success": true,
      "statusCode": 201,
      "message": "Job berhasil ditambahkan",
      "data": {
        "JOB_ID": 21,
        "JOB_TITLE": "Software Engineer II",
        "MIN_SALARY": 8000,
        "MAX_SALARY": 15000
      },
      "timestamp": "2026-06-16T03:52:10.789Z"
    }
    ```

### 4. Perbarui Job (PUT Update)
*   **Method**: `PUT`
*   **URL**: `{{base_url}}/api/jobs/:id` (Contoh: `{{base_url}}/api/jobs/21`)
*   **Headers**: 
    *   `Authorization`: `Bearer {{accessToken}}`
    *   `Content-Type`: `application/json`
*   **Body (JSON)**:
    ```json
    {
      "job_title": "Lead Software Engineer",
      "min_salary": 12000,
      "max_salary": 22000
    }
    ```
*   **Response Sukses (200)**:
    ```json
    {
      "success": true,
      "statusCode": 200,
      "message": "Job berhasil diperbarui",
      "data": {
        "JOB_ID": 21,
        "JOB_TITLE": "Lead Software Engineer",
        "MIN_SALARY": 12000,
        "MAX_SALARY": 22000
      },
      "timestamp": "2026-06-16T03:52:45.012Z"
    }
    ```

### 5. Hapus Job (DELETE)
*   **Method**: `DELETE`
*   **URL**: `{{base_url}}/api/jobs/:id` (Contoh: `{{base_url}}/api/jobs/21`)
*   **Headers**: 
    *   `Authorization`: `Bearer {{accessToken}}`
*   **Response Sukses (200)**:
    ```json
    {
      "success": true,
      "statusCode": 200,
      "message": "Job berhasil dihapus",
      "data": {
        "job_id": 21
      },
      "timestamp": "2026-06-16T03:53:15.345Z"
    }
    ```

---

## 🧪 5. Skenario Pengujian Hak Akses (RBAC) & Validasi

Lakukan pengujian berikut untuk membuktikan proteksi authentication, authorization, dan model validation berjalan sesuai spesifikasi:

1.  **Tanpa JWT Token (Authentication Check)**:
    *   Aksi: `GET /api/jobs` tanpa menyertakan header `Authorization`.
    *   Hasil: `401 Unauthorized` dengan pesan `"Token tidak ditemukan"`.
2.  **Akses Terlarang untuk Write/Delete (USER / VIEWER)**:
    *   Aksi: Login dengan user ber-role `USER` / `VIEWER`, lakukan `POST /api/jobs`.
    *   Hasil: `403 Forbidden` dengan pesan `"Akses ditolak — dibutuhkan role: SUPER_ADMIN / ADMIN / MANAGER"`.
3.  **Akses Terlarang untuk Delete (MANAGER)**:
    *   Aksi: Login dengan user ber-role `MANAGER`, lakukan `DELETE /api/jobs/21`.
    *   Hasil: `403 Forbidden` dengan pesan `"Akses ditolak — dibutuhkan role: SUPER_ADMIN / ADMIN"`.
4.  **Uji Validasi Karakter Panjang**:
    *   Aksi: `POST /api/jobs` dengan `job_title` berupa 40 karakter string (maksimal 35).
    *   Hasil: `422 Unprocessable Entity` dengan pesan `"job_title maksimal 35 karakter"`.
5.  **Uji Validasi Nominal Gaji**:
    *   Aksi: `POST /api/jobs` dengan `min_salary: -100`.
    *   Hasil: `422 Unprocessable Entity` dengan pesan `"min_salary harus berupa angka non-negatif"`.
6.  **Uji Validasi Logika Rentang Gaji**:
    *   Aksi: `POST /api/jobs` dengan `min_salary: 10000` dan `max_salary: 5000` (max < min).
    *   Hasil: `422 Unprocessable Entity` dengan pesan `"max_salary tidak boleh lebih kecil dari min_salary"`.
