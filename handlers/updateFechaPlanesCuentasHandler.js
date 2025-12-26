const { Client } = require('pg');

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
};

function esFechaHoraValida(fecha) {
  // Formato esperado: YYYY-MM-DD HH:mm:ss
  const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

  if (!regex.test(fecha)) return false;

  const date = new Date(fecha.replace(' ', 'T'));

  return !isNaN(date.getTime());
}


exports.handler = async (event) => {
  console.log('SimuladorPlanesCuentas UPDATE - Event:', JSON.stringify(event, null, 2));

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido. Usa POST.' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'JSON inválido' })
    };
  }

  const { idFlujo, fecha } = body;

  if (!idFlujo || !fecha) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Campos requeridos: idflujo, fecha'
      })
    };
  }

  if (!esFechaHoraValida(body.fecha)) {
    return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
        error: 'Formato de fecha inválido. Usa YYYY-MM-DD HH:mm:ss'
        })
    };
    }

  const client = new Client(dbConfig);

  try {
    await client.connect();

    const query = `
      UPDATE public.simulador_planes_cuentas
      SET fecha_creacion = $2
      WHERE id_promociones_ttp = $1
    `;

    const result = await client.query(query, [idFlujo, fecha]);

    if (result.rowCount === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          message: `No se encontró el idflujo ${idFlujo}`
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Fecha actualizada correctamente',
        idFlujo,
        fecha
      })
    };

  } catch (error) {
    console.error('Error:', error);
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
