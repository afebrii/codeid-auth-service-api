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
    *   Menerapkan query database menggunakan pagination native Oracle (`ROWNUM`) dan pencarian data berbasis `LIKE` query (case-insensitive).
    *   Menangani sequence `jobs_seq.NEXTVAL` saat penyimpanan record baru.

2.  **Validator ([job.validator.js](file:///e:/Bootcamp/Code%20ID%202026/03.%20Express/batch35-auth-service-api/src/modules/jobs/job.validator.js))**:
    *   Alih-alih membuat schema Zod baru, modul ini mereferensikan dan memanggil langsung fungsi validator dari `model-generator/output/jobModel.js`.
    *   Jika validator model mendeteksi adanya field wajib yang kosong atau panjang karakter tidak sesuai, respon `422 Unprocessable Entity` akan dikembalikan ke client bersama dengan daftar error.

3.  **Service ([job.service.js](file:///e:/Bootcamp/Code%20ID%202026/03.%20Express/batch35-auth-service-api/src/modules/jobs/job.service.js))**:
    *   Mengontrol alur bisnis logis CRUD.
    *   Memetakan objek data DB untuk konsumsi controller.
    *   Mendeteksi apabila resource job ID yang diminta tidak ada di database dan melempar `AppError` 404.

4.  **Controller ([job.controller.js](file:///e:/Bootcamp/Code%20ID%202026/03.%20Express/batch35-auth-service-api/src/modules/jobs/job.controller.js))**:
    *   Menangani request objek HTTP, parsing parameter query, dan mengembalikan response JSON menggunakan standard wrapper wrapper (`response.success` / `response.paginate`).

5.  **Routes ([job.routes.js](file:///e:/Bootcamp/Code%20ID%202026/03.%20Express/batch35-auth-service-api/src/modules/jobs/job.routes.js))**:
    *   Tempat pendefinisian rute dan perakitan middleware keamanan (`authenticate`, `authorize.roles`, dan `validateJob`).

6.  **Registrasi Routing Utama ([routes.js](file:///e:/Bootcamp/Code%20ID%202026/03.%20Express/batch35-auth-service-api/src/routes.js))**:
    *   Mengimpor `jobsRoutes` dan menempelkannya ke path `/jobs`.

---

## 🧪 4. Skenario Uji Coba (Postman)
Anda dapat memverifikasi implementasi ini dengan menguji skenario berikut:
1.  **Akses Publik Ditolak**: Lakukan `GET /api/jobs` tanpa token JWT (Hasil: `401 Unauthorized`).
2.  **Hak Akses Terbatas (USER / VIEWER)**: Lakukan login sebagai user, lalu kirim request `POST /api/jobs` (Hasil: `403 Forbidden`).
3.  **Hak Akses Menengah (MANAGER)**: Lakukan login sebagai manager, kirim request `POST` / `PUT` (Hasil: `200/201 Success`). Lakukan request `DELETE` (Hasil: `403 Forbidden`).
4.  **Hak Akses Penuh (ADMIN / SUPER_ADMIN)**: Semua operasi CRUD berjalan lancar.
5.  **Uji Validasi Model**: Kirim data `POST /api/jobs` dengan `job_title` kosong (Hasil: `422 Unprocessable Entity` - `"job_title wajib diisi"`).
