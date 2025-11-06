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
  console.log('Consulta Planes Asociados - Event:', JSON.stringify(event, null, 2));

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
    body = JSON.parse(event.body);
  } catch (error) {
    console.error('Error al parsear JSON:', error);
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cuerpo JSON inválido' }) };
  }

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
        id AS "idRegistro",
        id_promociones_ttp AS "idFlujo",
        plan_id AS "planId",
        plan_name AS "planName",
        error AS "errorDescripcion",
        fecha_creacion AS "fechaCreacion"
      FROM errores_procesamiento
      WHERE id_promociones_ttp = $1
      ORDER BY fecha_creacion DESC;
    `;

    const result = await client.query(query, [body.idFlujo]);

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          message: `No se encontraron registros para idFlujo: ${body.idFlujo}`,
          data: []
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Datos obtenidos exitosamente',
        data: result.rows
      })
    };

  } catch (error) {
    console.error('Error en consulta:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno', details: error.message })
    };
  } finally {
    await client.end();
  }
};
