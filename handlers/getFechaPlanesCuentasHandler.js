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

exports.handler = async (event) => {
  console.log('SimuladorPlanesCuentas GET - Event:', JSON.stringify(event, null, 2));

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

  if (!body.idflujo) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Campo requerido: idflujo' })
    };
  }

  const client = new Client(dbConfig);

  try {
    await client.connect();

    // 🔹 CONSULTA ÚNICA — traer solo la fecha más reciente
    const query = `
      SELECT fecha_creacion
      FROM public.simulador_planes_cuentas
      WHERE id_promociones_ttp = $1
      ORDER BY fecha_creacion DESC
      LIMIT 1
    `;

    const result = await client.query(query, [body.idflujo]);

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          message: `No hay registros para idflujo ${body.idflujo}`
        })
      };
    }

    const fecha = new Date(result.rows[0].fecha_creacion);
    const fechaFormato = fecha.toISOString().slice(0, 10);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Fecha obtenida correctamente",
        fecha: fecha
      })
    };

  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Error interno del servidor",
        details: error.message
      })
    };
  } finally {
    await client.end();
  }
};
