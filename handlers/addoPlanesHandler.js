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
  console.log('Addon Planes Handler - Event received:', JSON.stringify(event, null, 2));

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
    console.log("Error: ", error)
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) };
  }

  //Campos obligatorios específicos de addon_planes
  const requiredFields = ['idFlujo', 'resultDescription', 'result', 'info'];
  const missing = requiredFields.filter(f => !body[f]);
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

  //Validar que info sea un objeto (pero sin validar estructura interna)
  if (body.info && typeof body.info !== 'object') {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'info debe ser un objeto JSON válido' 
      })
    };
  }

  const client = new Client(dbConfig);
  await client.connect();

  try {
    await client.query('BEGIN');

    //Verificar si el idFlujo existe en promociones_ttp
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

    //Verificar si ya existe el registro en addon_planes
    const checkExist = await client.query(
      'SELECT id_addon_planes FROM addon_planes WHERE id_promociones_ttp = $1',
      [body.idFlujo]
    );

    const exists = checkExist.rows.length > 0;

    console.log("checkExist :", checkExist)
    console.log("exists :", exists)

    if (exists) {
      //UPDATE de todos los campos específicos
      const updateQuery = `
        UPDATE addon_planes 
        SET result_description = $1, 
            result_code = $2, 
            addon_info = $3
        WHERE id_promociones_ttp = $4
      `;

      const values = [
        body.resultDescription,
        body.result,
        JSON.stringify(body.info),
        body.idFlujo
      ];

      await client.query(updateQuery, values);
      await client.query('COMMIT');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Datos de addon_planes actualizados exitosamente',
          idFlujo: body.idFlujo,
          action: 'updated'
        })
      };
    } else {
      //INSERT
      const insertQuery = `
        INSERT INTO addon_planes
        (id_promociones_ttp, result_description, result_code, addon_info)
        VALUES ($1, $2, $3, $4)
      `;

      const values = [
        body.idFlujo,
        body.resultDescription,
        body.result,
        JSON.stringify(body.info)  // ← Se almacena el campo 'info' como JSONB
      ];

      await client.query(insertQuery, values);
      await client.query('COMMIT');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Datos de addon_planes guardados exitosamente',
          idFlujo: body.idFlujo,
          action: 'created'
        })
      };
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en addon_planes handler:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error interno', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  } finally {
    await client.end();
  }
};