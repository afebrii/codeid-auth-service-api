# Analisis Implementasi Authentication & Authorization pada Jobs API

Dokumen ini berisi hasil analisis kebutuhan dan rancangan teknis untuk menambahkan modul CRUD Jobs dengan proteksi keamanan menggunakan Authentication dan Authorization.

---

## 1. Analisis Kebutuhan CRUD Jobs (Tabel `JOBS`)

Berdasarkan berkas generator model `jobModel.js`, tabel `JOBS` memiliki skema berikut:
*   **`job_id`**: `NUMBER` (Primary Key, di-generate dari sequence `jobs_seq`)
*   **`job_title`**: `VARCHAR2(35)` (Wajib diisi, maksimal 35 karakter)
*   **`min_salary`**: `NUMBER(8,2)` (Opsional)
*   **`max_salary`**: `NUMBER(8,2)` (Opsional)

### Endpoint CRUD yang Dibutuhkan:
1.  **Create Job**
    *   **Method / Route**: `POST /api/jobs`
    *   **Body**: `{ job_title, min_salary, max_salary }`
2.  **Read All Jobs**
    *   **Method / Route**: `GET /api/jobs`
    *   **Query Params (Opsional)**: Pagination & Search (`page`, `limit`, `search`)
3.  **Read Job Detail**
    *   **Method / Route**: `GET /api/jobs/:id`
4.  **Update Job**
    *   **Method / Route**: `PUT /api/jobs/:id`
    *   **Body**: `{ job_title, min_salary, max_salary }`
5.  **Delete Job**
    *   **Method / Route**: `DELETE /api/jobs/:id`

---

## 2. Rancangan Authentication (Autentikasi)

Semua endpoint CRUD Jobs akan dilindungi oleh middleware autentikasi global yang sudah tersedia:
*   **Middleware**: `authenticate` dari `src/shared/middlewares/authenticate.js`
*   **Fungsi**: Memeriksa token JWT pada header `Authorization: Bearer <token>`. Jika tidak ada atau tidak valid, kirim respon `401 Unauthorized`. Jika sukses, data token akan didecode dan disimpan di `req.user` (`req.user = { sub, username, email, roles[], permissions[], jti }`).

---

## 3. Rancangan Authorization (Otorisasi)

Kita menggunakan pendekatan **Role-Based Access Control (RBAC)** untuk membatasi akses berdasarkan nama Role yang dimiliki oleh user (`req.user.roles`). Pendekatan ini langsung dapat digunakan tanpa memerlukan perubahan data seed permission di database.

| Endpoint | Method | Fungsi | Role yang Diperbolehkan | Middleware |
| :--- | :--- | :--- | :--- | :--- |
| `/api/jobs` | `GET` | List Jobs | Semua Role terautentikasi (`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `USER`, `VIEWER`) | `authenticate` |
| `/api/jobs/:id` | `GET` | Detail Job | Semua Role terautentikasi (`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `USER`, `VIEWER`) | `authenticate` |
| `/api/jobs` | `POST` | Create Job | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | `authenticate`, `authorize.roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')` |
| `/api/jobs/:id` | `PUT` | Update Job | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | `authenticate`, `authorize.roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')` |
| `/api/jobs/:id` | `DELETE`| Delete Job | `SUPER_ADMIN`, `ADMIN` | `authenticate`, `authorize.roles('SUPER_ADMIN', 'ADMIN')` |

---

## 4. Rencana Kerja Implementasi

Kita akan membuat modul baru bernama `jobs` di dalam folder `src/modules/jobs`:
1.  **`job.repository.js`**: Menyediakan fungsi akses query Oracle database (SELECT, INSERT, UPDATE, DELETE).
2.  **`job.validator.js`**: Validasi body request menggunakan model validator bawaan (`JobsModel.validate` di `model-generator/output/jobModel.js`).
3.  **`job.service.js`**: Logic bisnis pengolahan data CRUD Jobs.
4.  **`job.controller.js`**: Handler Express untuk menangkap request dan merespon ke client.
5.  **`job.routes.js`**: Definisikan route-route CRUD, pasangkan dengan middleware `authenticate` serta `authorize` (menggunakan Opsi A/RBAC).
6.  **`src/routes.js`**: Daftarkan router Jobs ke routing utama (`router.use('/jobs', jobsRoutes)`).
