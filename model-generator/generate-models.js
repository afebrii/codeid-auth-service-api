/**
 * Oracle → JS Model Generator
 * Membaca schema dari ALL_COLUMNS / USER_COLUMNS Oracle
 * lalu generate file model JS otomatis.
 *
 * Usage:
 *   node generate-models.js                    → semua tabel
 *   node generate-models.js DEPARTMENTS        → satu tabel
 *   node generate-models.js DEPARTMENTS EMPLOYEES JOBS  → beberapa tabel
 */

require('dotenv').config();
const oracledb = require('oracledb');
const fs       = require('fs');
const path     = require('path');

oracledb.initOracleClient();

// ── Config ────────────────────────────────────────────────
const DB = {
  user:          process.env.DB_USER     || 'hr',
  password:      process.env.DB_PASSWORD || 'hr',
  connectString: `${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 1521}/${process.env.DB_SERVICE || 'XE'}`,
};

const OUTPUT_DIR   = path.resolve(__dirname, 'output');
const OWNER_FILTER = process.env.DB_USER?.toUpperCase(); // hanya tabel milik user ini

// ── Oracle type → JS type mapping ────────────────────────
const TYPE_MAP = {
  NUMBER:        'NUMBER',
  INTEGER:       'NUMBER',
  FLOAT:         'NUMBER',
  BINARY_FLOAT:  'NUMBER',
  BINARY_DOUBLE: 'NUMBER',
  VARCHAR2:      'VARCHAR2',
  NVARCHAR2:     'VARCHAR2',
  CHAR:          'CHAR',
  NCHAR:         'CHAR',
  CLOB:          'CLOB',
  NCLOB:         'CLOB',
  DATE:          'DATE',
  TIMESTAMP:     'TIMESTAMP',
  'TIMESTAMP(6)':'TIMESTAMP',
  BLOB:          'BLOB',
  RAW:           'RAW',
};

// ── Fetch schema dari Oracle ──────────────────────────────
async function fetchSchema(connection, tableNames = []) {
  const tableFilter = tableNames.length > 0
    ? `AND c.table_name IN (${tableNames.map((_, i) => `:t${i}`).join(',')})`
    : '';

  const tableBinds = tableNames.reduce((acc, t, i) => {
    acc[`t${i}`] = t.toUpperCase();
    return acc;
  }, {});

  // Query kolom
  const colSQL = `
    SELECT
      c.table_name,
      c.column_name,
      c.data_type,
      c.data_length,
      c.data_precision,
      c.data_scale,
      c.nullable,
      c.column_id,
      c.data_default
    FROM all_tab_columns c
    WHERE c.owner = :owner
      ${tableFilter}
    ORDER BY c.table_name, c.column_id
  `;

  // Query primary key
  const pkSQL = `
    SELECT
      cc.table_name,
      cc.column_name
    FROM all_constraints  ac
    JOIN all_cons_columns cc ON cc.constraint_name = ac.constraint_name
                             AND cc.owner = ac.owner
    WHERE ac.owner            = :owner
      AND ac.constraint_type  = 'P'
      ${tableNames.length > 0
        ? `AND cc.table_name IN (${tableNames.map((_, i) => `:t${i}`).join(',')})`
        : ''}
  `;

  // Query unique constraints
  const uqSQL = `
    SELECT
      cc.table_name,
      cc.column_name
    FROM all_constraints  ac
    JOIN all_cons_columns cc ON cc.constraint_name = ac.constraint_name
                             AND cc.owner = ac.owner
    WHERE ac.owner           = :owner
      AND ac.constraint_type = 'U'
      ${tableNames.length > 0
        ? `AND cc.table_name IN (${tableNames.map((_, i) => `:t${i}`).join(',')})`
        : ''}
  `;

  const binds = { owner: OWNER_FILTER, ...tableBinds };
  const opts  = { outFormat: oracledb.OUT_FORMAT_OBJECT };

  const [colResult, pkResult, uqResult] = await Promise.all([
    connection.execute(colSQL,  binds, opts),
    connection.execute(pkSQL,   binds, opts),
    connection.execute(uqSQL,   binds, opts),
  ]);

  // Build lookup sets
  const pkSet = new Set(pkResult.rows.map(r => `${r.TABLE_NAME}.${r.COLUMN_NAME}`));
  const uqSet = new Set(uqResult.rows.map(r => `${r.TABLE_NAME}.${r.COLUMN_NAME}`));

  // Group kolom per tabel
  const tables = {};
  for (const col of colResult.rows) {
    const tbl = col.TABLE_NAME;
    if (!tables[tbl]) tables[tbl] = [];
    tables[tbl].push({
      name:       col.COLUMN_NAME,
      type:       TYPE_MAP[col.DATA_TYPE] || col.DATA_TYPE,
      rawType:    col.DATA_TYPE,
      length:     col.DATA_LENGTH,
      precision:  col.DATA_PRECISION,
      scale:      col.DATA_SCALE,
      nullable:   col.NULLABLE === 'Y',
      hasDefault: col.DATA_DEFAULT !== null,
      primaryKey: pkSet.has(`${tbl}.${col.COLUMN_NAME}`),
      unique:     uqSet.has(`${tbl}.${col.COLUMN_NAME}`),
    });
  }

  return tables;
}

// ── Render template model JS ──────────────────────────────
function renderModel(tableName, columns) {
  const modelName  = toPascalCase(tableName) + 'Model';
  const sequenceName = toSnake(tableName) + '_seq';

  // Build fields block
  const fieldsLines = columns.map(col => {
    const key    = col.name.toLowerCase();
    const props  = [];

    props.push(`type: '${col.type}'`);

    if (col.primaryKey)                  props.push(`primaryKey: true`);
    if (col.unique && !col.primaryKey)   props.push(`unique: true`);
    if (!col.nullable && !col.primaryKey && !col.hasDefault)
                                          props.push(`required: true`);
    if (['VARCHAR2', 'CHAR', 'NVARCHAR2', 'NCHAR'].includes(col.type) && col.length)
                                          props.push(`maxLength: ${col.length}`);
    if (col.type === 'NUMBER' && col.precision !== null)
                                          props.push(`precision: ${col.precision}`);
    if (col.type === 'NUMBER' && col.scale !== null && col.scale > 0)
                                          props.push(`scale: ${col.scale}`);

    return `    ${key}: { ${props.join(', ')} },`;
  });

  // Build validate() method — hanya kolom required & varchar
  const validations = [];

  for (const col of columns) {
    if (col.primaryKey) continue; // skip PK

    const key = col.name.toLowerCase();

    // required check
    if (!col.nullable && !col.hasDefault) {
      validations.push(
        `    if (data.${key} === undefined || data.${key} === null || String(data.${key}).trim() === '') {`,
        `      errors.push('${key} wajib diisi');`,
        `    }`
      );
    }

    // maxLength check
    if (['VARCHAR2', 'CHAR'].includes(col.type) && col.length) {
      validations.push(
        `    else if (data.${key} && String(data.${key}).length > ${col.length}) {`,
        `      errors.push('${key} maksimal ${col.length} karakter');`,
        `    }`
      );
    }

    // number range check
    if (col.type === 'NUMBER' && !col.nullable && !col.hasDefault) {
      validations.push(
        `    if (data.${key} !== undefined && isNaN(Number(data.${key}))) {`,
        `      errors.push('${key} harus berupa angka');`,
        `    }`
      );
    }
  }

  const validateBody = validations.length > 0
    ? validations.join('\n')
    : `    // semua kolom optional atau sudah ada default`;

  return `/**
 * Model: ${tableName}
 * Auto-generated by Oracle Model Generator
 * Generated at: ${new Date().toISOString()}
 *
 * DO NOT EDIT — regenerate dengan: node generate-models.js ${tableName}
 */

const ${modelName} = {
  tableName:    '${tableName}',
  sequenceName: '${sequenceName}',

  fields: {
${fieldsLines.join('\n')}
  },

  /**
   * Validasi payload input (CREATE / UPDATE)
   * @param {object} data
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validate(data) {
    const errors = [];

${validateBody}

    return { valid: errors.length === 0, errors };
  },
};

module.exports = ${modelName};
`;
}

// ── String helpers ────────────────────────────────────────
function toPascalCase(str) {
  return str
    .toLowerCase()
    .split(/[_\s]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

function toSnake(str) {
  return str.toLowerCase();
}

function toFileName(tableName) {
  // DEPARTMENTS → departmentModel.js
  const base = tableName.toLowerCase().replace(/s$/, ''); // simple singularize
  return `${base}Model.js`;
}

// ── Main ──────────────────────────────────────────────────
async function main() {
  const targetTables = process.argv.slice(2).map(t => t.toUpperCase());

  let connection;
  try {
    console.log(`\nConnecting to Oracle ${DB.connectString}...`);
    connection = await oracledb.getConnection(DB);
    console.log('Connected\n');

    const tables = await fetchSchema(connection, targetTables);
    const tableList = Object.keys(tables);

    if (tableList.length === 0) {
      console.warn('Tidak ada tabel ditemukan. Cek DB_USER atau nama tabel.');
      return;
    }

    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    console.log(`Tabel ditemukan: ${tableList.join(', ')}\n`);

    for (const tableName of tableList) {
      const columns  = tables[tableName];
      const content  = renderModel(tableName, columns);
      const fileName = toFileName(tableName);
      const filePath = path.join(OUTPUT_DIR, fileName);

      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Generated: output/${fileName}  (${columns.length} kolom)`);
    }

    console.log(`\nSelesai! ${tableList.length} model digenerate ke ./output/`);

  } catch (err) {
    console.error('\nError:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.close();
  }
}

main();
