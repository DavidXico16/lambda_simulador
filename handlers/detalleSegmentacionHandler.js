const { Client } = require('pg');

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
};

exports.handler = async (event) => {
  console.log('Simulacion Segmentacion - Event received:', JSON.stringify(event, null, 2));

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token'
  };

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'CORS preflight' }) };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido. Usa POST.' }) };
  }

  // Parse JSON
  let body;
  try {
    body = event.body ? JSON.parse(event.body) : event;
  } catch (error) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) };
  }

  // Validación de campo requerido idFlujo
  const requiredFields = ['idFlujo'];
  const missingFields = requiredFields.filter(f => !body[f]);
  if (missingFields.length > 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Campos requeridos faltantes', missing: missingFields }) };
  }

  const client = new Client(dbConfig);

  try {
    await client.connect();

    const query = `
      SELECT
        id_simulacion_segmentacion,
        id_promociones_ttp AS idFlujo,
        plazas,
        distritos,
        clusters,
        canal_de_venta,
        sub,
        nombre_editor,
        fecha_mod,
        fecha_creacion,
        responsable_modificacion
      FROM simulacion_segmentacion
      WHERE id_promociones_ttp = $1
    `;

    const result = await client.query(query, [body.idFlujo]);

    if (!result.rows || result.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: `No se encontraron registros para idFlujo: ${body.idFlujo}`, data: {} })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Datos obtenidos exitosamente de simulacion_segmentacion',
        data: result.rows[0]
      })
    };
  } catch (error) {
    console.error('Error al consultar simulacion_segmentacion:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno del servidor', details: error.message })
    };
  } finally {
    await client.end();
  }
};
