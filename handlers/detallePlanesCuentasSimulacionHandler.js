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
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight' })
    };
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
    console.log('Error al parsear JSON:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Cuerpo JSON inválido' })
    };
  }

  // Validar campo requerido
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

    // Consulta a la tabla simulador_planes_cuentas
    const query = `
      SELECT 
        id_promociones_ttp AS idflujo,
        planes,
        cuentas,
        sub,
        nombre_editor AS nombreEditor,
        status,
        fecha_mod
      FROM simulador_planes_cuentas
      WHERE id_promociones_ttp = $1
    `;

    const result = await client.query(query, [body.idflujo]);

    if (!result.rows || result.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          message: `No se encontraron registros en simulador_planes_cuentas para idflujo: ${body.idflujo}`,
          data: {}
        })
      };
    }

    // Convertimos los JSONB a objetos
    const row = result.rows[0];
    if (typeof row.planes === 'string') row.planes = JSON.parse(row.planes);
    if (typeof row.cuentas === 'string') row.cuentas = JSON.parse(row.cuentas);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Datos obtenidos exitosamente de simulador_planes_cuentas',
        data: row
      })
    };

  } catch (error) {
    console.error('Error al consultar simulador_planes_cuentas:', error);
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
