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
  console.log('catalogo_navegacion Handler - Event received:', JSON.stringify(event, null, 2));

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
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  let body;
  try {
    body = event.body ? JSON.parse(event.body) : event;
  } catch (error) {
    console.log("Error parsing JSON:", error);
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) };
  }

  // Campos obligatorios
  const requiredFields = ['idFlujo', 'estatus_navegacion'];
  const missing = requiredFields.filter(f => body[f] === undefined || body[f] === null);

  if (missing.length > 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Campos requeridos faltantes',
        missing
      })
    };
  }

  const client = new Client(dbConfig);
  await client.connect();

  try {
    await client.query('BEGIN');

    // Validar idFlujo existe en promociones_ttp
    const checkFlujo = await client.query(
      'SELECT id_promociones_ttp FROM promociones_ttp WHERE id_promociones_ttp = $1',
      [body.idFlujo]
    );

    if (checkFlujo.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'El idFlujo no existe en la tabla promociones_ttp',
          idFlujo: body.idFlujo
        })
      };
    }

    // Validar estatus_navegacion existe en catalogo_navegacion
    const checkCatalogo = await client.query(
      'SELECT id_catalogo FROM catalogo_navegacion WHERE id_catalogo = $1',
      [body.estatus_navegacion]
    );

    if (checkCatalogo.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'estatus_navegacion no existe en catalogo_navegacion',
          estatus_navegacion: body.estatus_navegacion
        })
      };
    }

    // UPDATE campo en promociones_ttp
    const updateQuery = `
      UPDATE promociones_ttp
      SET estatus_navegacion = $1
      WHERE id_promociones_ttp = $2
    `;

    const values = [
      body.estatus_navegacion,
      body.idFlujo
    ];

    await client.query(updateQuery, values);
    await client.query('COMMIT');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'estatus_navegacion actualizado exitosamente',
        idFlujo: body.idFlujo,
        estatus_navegacion: body.estatus_navegacion
      })
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en catalogo_navegacion handler:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Error interno',
        details: error.message
      })
    };
  } finally {
    await client.end();
  }
};
