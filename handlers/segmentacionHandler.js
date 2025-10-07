const { Client } = require('pg');

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
};

// Convierte fecha dd/mm/yyyy → yyyy-mm-dd
function convertirFecha(fecha) {
  if (!fecha) return null;
  const partes = fecha.split('/');
  if (partes.length === 3) return `${partes[2]}-${partes[1]}-${partes[0]}`;
  return fecha;
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'CORS preflight' }) };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido. Usa POST.' }) };
  }

  let body;
  try {
    body = event.body ? JSON.parse(event.body) : event;
  } catch (error) {
    console.log("ERROR: ", error)
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) };
  }

  // Validación de campos requeridos
  const requiredFields = ['segmentacion'];
  const missingFields = requiredFields.filter(f => !body[f]);
  if (missingFields.length > 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Campos requeridos faltantes', missing: missingFields }) };
  }

  // Validar los campos dentro de segmentacion
  const seg = body.segmentacion;
  const requiredSegFields = ['idFlujo', 'plazas', 'distritos', 'clusters', 'canal_de_venta', 'sub', 'nombreEditor', 'fecha_mod'];
  const missingSegFields = requiredSegFields.filter(f => seg[f] === undefined || seg[f] === null);
  if (missingSegFields.length > 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Campos requeridos dentro de segmentacion faltantes', missing: missingSegFields }) };
  }

  const fechaConvertida = convertirFecha(seg.fecha_mod);
  const client = new Client(dbConfig);
  await client.connect();

  try {
    await client.query('BEGIN');

    // Verificar si idFlujo existe en promociones_ttp
    const checkFlujo = await client.query(
      'SELECT id_promociones_ttp FROM promociones_ttp WHERE id_promociones_ttp = $1',
      [seg.idFlujo]
    );
    if (checkFlujo.rows.length === 0) {
      await client.query('ROLLBACK');
      return { statusCode: 400, headers, body: JSON.stringify({ error: `idFlujo ${seg.idFlujo} no existe en promociones_ttp` }) };
    }

    // Verificar si ya existe registro
    const checkExist = await client.query(
      'SELECT id_simulacion_segmentacion FROM simulacion_segmentacion WHERE id_promociones_ttp = $1',
      [seg.idFlujo]
    );

    const values = [
      JSON.stringify(seg.plazas),
      JSON.stringify(seg.distritos),
      JSON.stringify(seg.clusters),
      seg.canal_de_venta,
      seg.sub,
      seg.nombreEditor,
      fechaConvertida,
      seg.nombreEditor,
      seg.idFlujo
    ];

    if (checkExist.rows.length > 0) {
      // 🔁 UPDATE
      const updateQuery = `
        UPDATE simulacion_segmentacion
        SET plazas = $1,
            distritos = $2,
            clusters = $3,
            canal_de_venta = $4,
            sub = $5,
            nombre_editor = $6,
            fecha_mod = $7,
            responsable_modificacion = $8
        WHERE id_promociones_ttp = $9
      `;
      await client.query(updateQuery, values);
      await client.query('COMMIT');
      return { statusCode: 200, headers, body: JSON.stringify({ message: 'Datos de segmentación actualizados', idFlujo: seg.idFlujo }) };
    } else {
      // 🆕 INSERT
      const insertQuery = `
        INSERT INTO simulacion_segmentacion
        (plazas, distritos, clusters, canal_de_venta, sub, nombre_editor, fecha_mod, responsable_modificacion, id_promociones_ttp)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `;
      await client.query(insertQuery, values);
      await client.query('COMMIT');
      return { statusCode: 200, headers, body: JSON.stringify({ message: 'Datos de segmentación guardados', idFlujo: seg.idFlujo }) };
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en simulacion_segmentacion handler:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error interno', details: error.message }) };
  } finally {
    await client.end();
  }
};
