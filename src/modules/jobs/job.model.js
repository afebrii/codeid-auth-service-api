/**
 * Job model — representasi struktur tabel JOBS
 * Dipakai untuk validasi dan dokumentasi field.
 */
const JobModel = {
  tableName: 'JOBS',
  fields: {
    job_id:     { type: 'VARCHAR2', required: true, maxLength: 10, primaryKey: true },
    job_title:  { type: 'VARCHAR2', required: true, maxLength: 35 },
    min_salary: { type: 'NUMBER', precision: 8, scale: 2 },
    max_salary: { type: 'NUMBER', precision: 8, scale: 2 },
  },

  /**
   * Validasi payload input
   * @param {object} data
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validate(data) {
    const errors = [];

    if (!data.job_id || String(data.job_id).trim() === '') {
      errors.push('job_id wajib diisi');
    } else if (String(data.job_id).length > 10) {
      errors.push('job_id maksimal 10 karakter');
    }

    if (!data.job_title || String(data.job_title).trim() === '') {
      errors.push('job_title wajib diisi');
    } else if (String(data.job_title).length > 35) {
      errors.push('job_title maksimal 35 karakter');
    }

    if (data.min_salary !== undefined && data.min_salary !== null) {
      if (isNaN(Number(data.min_salary)) || Number(data.min_salary) < 0) {
        errors.push('min_salary harus berupa angka non-negatif');
      }
    }

    if (data.max_salary !== undefined && data.max_salary !== null) {
      if (isNaN(Number(data.max_salary)) || Number(data.max_salary) < 0) {
        errors.push('max_salary harus berupa angka non-negatif');
      }
    }

    if (
      data.min_salary !== undefined && data.min_salary !== null &&
      data.max_salary !== undefined && data.max_salary !== null &&
      Number(data.max_salary) < Number(data.min_salary)
    ) {
      errors.push('max_salary tidak boleh lebih kecil dari min_salary');
    }

    return { valid: errors.length === 0, errors };
  },
};

module.exports = JobModel;
