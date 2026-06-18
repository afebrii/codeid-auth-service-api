# Panduan Pengujian API Upload (Local & Cloudinary) dengan Postman

Dokumen ini menyediakan skema pengujian lengkap menggunakan Postman untuk memvalidasi fitur Upload Dokumen (baik menggunakan driver `local` maupun `cloudinary`).

---

## ── PERSYARATAN & SETUP LINGKUNGAN ──

Sebelum menguji, pastikan Anda telah menyiapkan variabel lingkungan (Environment) di Postman:
*   **`baseUrl`**: `http://localhost:3000/api`
*   **`accessToken`**: Token JWT hasil login (Bearer Token)

> [!TIP]
> **Otomatisasi Simpan Token di Postman:**
> Anda bisa meletakkan script berikut di tab **Tests** pada request Login agar token otomatis terupdate di environment:
> ```javascript
> const response = pm.response.json();
> if (response.success && response.data.accessToken) {
>     pm.environment.set("accessToken", response.data.accessToken);
> }
> ```

---

## ── SKEMA PENGUJIAN API ──

### 1. Authenticate (Login)
*   **Method**: `POST`
*   **URL**: `{{baseUrl}}/auth/login`
*   **Headers**:
    *   `Content-Type`: `application/json`
*   **Body** (raw - JSON):
    ```json
    {
      "identifier": "regularuser@mail.com",
      "password": "Password123!"
    }
    ```
*   **Expected Response**: `200 OK` dengan payload data user beserta `accessToken`.

---

### 2. Upload Single File (Satu Dokumen)
*   **Method**: `POST`
*   **URL**: `{{baseUrl}}/documents/upload`
*   **Headers**:
    *   `Authorization`: `Bearer {{accessToken}}`
*   **Body** (form-data):
    *   **`file`** (Type: **File**): Pilih file dari komputer Anda (misal: `.jpg`, `.png`, `.pdf`, maks 10MB).
*   **Expected Response**: `201 Created`
    ```json
    {
      "success": true,
      "statusCode": 201,
      "message": "File berhasil diupload",
      "data": {
        "usdoc_id": 1,
        "user_id": 4,
        "file_name": "laporan_keuangan.pdf",
        "stored_file_name": "c20029b4-023a-4efb-88a9-92c13d78905e-laporan_keuangan.pdf",
        "file_link": "https://res.cloudinary.com/dcj79x5cw/image/upload/v1718712345/user_documents/c20029b4-023a-4efb-88a9-92c13d78905e-laporan_keuangan.pdf",
        "file_path": "user_documents/c20029b4-023a-4efb-88a9-92c13d78905e-laporan_keuangan",
        "file_size": 254102,
        "content_type": "application/pdf"
      }
    }
    ```

---

### 3. Upload Multiple Files (Banyak Dokumen)
*   **Method**: `POST`
*   **URL**: `{{baseUrl}}/documents/upload-multiple`
*   **Headers**:
    *   `Authorization`: `Bearer {{accessToken}}`
*   **Body** (form-data):
    *   **`files`** (Type: **File**): Pilih beberapa file sekaligus (maksimal 5 file).
    *   *(Di Postman, arahkan kursor ke kolom Key, pilih tipe **File**, lalu Anda dapat memilih lebih dari satu file saat mengklik tombol Select Files)*
*   **Expected Response**: `201 Created`
    ```json
    {
      "success": true,
      "statusCode": 201,
      "message": "3 file berhasil diupload",
      "data": [
        {
          "usdoc_id": 2,
          "user_id": 4,
          "file_name": "foto1.jpg",
          "file_link": "https://res.cloudinary.com/.../foto1.jpg",
          ...
        },
        {
          "usdoc_id": 3,
          "user_id": 4,
          "file_name": "foto2.jpg",
          "file_link": "https://res.cloudinary.com/.../foto2.jpg",
          ...
        }
      ]
    }
    ```

---

### 4. Get All User Documents (Daftar Dokumen User)
*   **Method**: `GET`
*   **URL**: `{{baseUrl}}/documents/user/:userId` (misal: `{{baseUrl}}/documents/user/4`)
*   **Headers**:
    *   `Authorization`: `Bearer {{accessToken}}`
*   **Expected Response**: `200 OK` dengan array list dokumen milik user terkait.

---

### 5. Get Document Detail (Detail Satu Dokumen)
*   **Method**: `GET`
*   **URL**: `{{baseUrl}}/documents/:id` (misal: `{{baseUrl}}/documents/1`)
*   **Headers**:
    *   `Authorization`: `Bearer {{accessToken}}`
*   **Expected Response**: `200 OK` dengan detail data dokumen yang dicari.

---

### 6. Delete Document (Hapus Dokumen)
*   **Method**: `DELETE`
*   **URL**: `{{baseUrl}}/documents/:id` (misal: `{{baseUrl}}/documents/1`)
*   **Headers**:
    *   `Authorization`: `Bearer {{accessToken}}`
*   **Expected Response**: `200 OK`
    ```json
    {
      "success": true,
      "statusCode": 200,
      "message": "Dokumen berhasil dihapus",
      "data": {
        "usdoc_id": 1,
        "user_id": 4
      }
    }
    ```
    *Catatan: Menghapus data dari database sekaligus akan menghapus file fisik di storage local (`uploads/`) atau public_id di Cloudinary secara otomatis.*

---

## ── TIPS TROUBLESHOOTING ──

*   **Error: `Multipart: Boundary not found`**
    *   **Solusi**: Jangan isi header `Content-Type` secara manual di Postman untuk request upload file. Kosongkan/hilangkan centang pada `Content-Type`, karena Postman akan mendeteksinya secara otomatis dan menyisipkan parameter `boundary` yang diperlukan untuk `multipart/form-data`.
*   **Limit Ukuran File**
    *   Jika mengupload file yang lebih besar dari batas konfigurasi (default 10MB), server akan merespon dengan error `400 Bad Request` dari error handler multer.
