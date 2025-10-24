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
  console.log('Catalogo Navegacion - Event received:', JSON.stringify(event, null, 2));

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
  if (!body.idFlujo) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta el campo idFlujo' }) };
  }

  const client = new Client(dbConfig);

  try {
    await client.connect();

    // 1️⃣ Validar que existe en promociones_ttp
    const queryPromo = `
      SELECT id_promociones_ttp, estatus_navegacion
      FROM promociones_ttp
      WHERE id_promociones_ttp = $1
    `;
    
    const promoResult = await client.query(queryPromo, [body.idFlujo]);

    if (promoResult.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          message: `El idFlujo ${body.idFlujo} no existe en promociones_ttp.`,
          data: {}
        })
      };
    }

    const estatusNavegacion = promoResult.rows[0].estatus_navegacion;

    // 2️⃣ Validar si el estatus existe
    if (estatusNavegacion === null) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: `El idFlujo ${body.idFlujo} no tiene estatus_navegacion configurado.`,
          data: {}
        })
      };
    }

    // 3️⃣ Buscar el registro en catalogo_navegacion
    const queryCatalogo = `
      SELECT
        id_catalogo AS "estatus",
        clave AS "nombre"
      FROM catalogo_navegacion
      WHERE id_catalogo = $1
    `;

    const catalogoResult = await client.query(queryCatalogo, [estatusNavegacion]);

    if (catalogoResult.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          message: `No existe registro en catalogo_navegacion para estatus_navegacion = ${estatusNavegacion}`,
          data: {}
        })
      };
    }

    // ✅ Todo OK
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Estatus navegación obtenido correctamente",
        data: catalogoResult.rows[0]
      })
    };

  } catch (error) {
    console.error('Error al consultar:', error);
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
