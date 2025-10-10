const { Client } = require('pg');

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

exports.handler = async (event) => {
  const client = new Client(dbConfig);
  await client.connect();

  try {
    // Obtener query params
    const queryParams = event.queryStringParameters || {};
    const { idFlujo, no_empleado } = queryParams;

    let query = 'SELECT * FROM aprobaciones_promociones';
    const values = [];
    const conditions = [];

    if (idFlujo) {
      conditions.push(`id_promociones_ttp = $${values.length + 1}`);
      values.push(idFlujo);
    }

    if (no_empleado) {
      conditions.push(`no_empleado = $${values.length + 1}`);
      values.push(no_empleado);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY fecha_decision DESC';

    const result = await client.query(query, values);

    return response(200, { data: result.rows });

  } catch (error) {
    console.error('Error en getAprobacionesHandler:', error);
    return response(500, { error: 'Error interno del servidor', details: error.message });
  } finally {
    await client.end();
  }
};

// Helper para respuestas JSON con CORS
function response(statusCode, body) {
  return {
    statusCode,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(body)
  };
}
