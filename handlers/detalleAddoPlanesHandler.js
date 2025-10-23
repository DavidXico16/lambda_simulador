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
  console.log('Addon Planes GET - Event received:', JSON.stringify(event, null, 2));

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
    console.log("Error: ", error)
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) };
  }

  // Validar campo obligatorio
  if (!body.idFlujo) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Campo requerido: idFlujo' })
    };
  }

  const client = new Client(dbConfig);

  try {
    await client.connect();

    const query = `
      SELECT 
        id_promociones_ttp AS idFlujo,
        result_description AS "resultDescription",
        result_code AS "resultCode",
        addon_info AS "info"
      FROM addon_planes
      WHERE id_promociones_ttp = $1
    `;

    const result = await client.query(query, [body.idFlujo]);

    if (!result.rows || result.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          message: `No se encontraron registros para idFlujo: ${body.idFlujo}`,
          data: {}
        })
      };
    }

    const row = result.rows[0];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Datos obtenidos exitosamente de addon_planes',
        data: row
      })
    };
  } catch (error) {
    console.error('Error al consultar addon_planes:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error interno del servidor', 
        details: error.message 
      })
    };
  } finally {
    await client.end();
  }
};