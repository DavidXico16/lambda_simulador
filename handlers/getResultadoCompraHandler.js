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
  console.log('Consulta Resultado Compra - Event:', JSON.stringify(event, null, 2));

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token'
  };

  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido. Usa POST.' }) };
  }

  let body;
  try {
    body = event.body ? JSON.parse(event.body) : event;
  } catch (err) {
    console.log("Error: ", err)
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) };
  }

  if (!body.idFlujo) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta el campo idFlujo' }) };
  }

  const client = new Client(dbConfig);

  try {
    await client.connect();

    const query = `
      SELECT
        id,
        id_promociones_ttp,
        plan_id,
        id_modelo_cuenta,
        compra_exitosa,
        cuentas_compradas,
        codigo_resultado,
        fecha_creacion,
        id_resultado_modelado_sf,
        cuenta_brm,
        id_ticket_sf,
        id_cot_plan_servicio_activacion,
        payload_envio,
        respuesta_sf,
        descripcion_resultado
      FROM resultados_compra
      WHERE id_promociones_ttp = $1 AND cuentas_compradas = 1
      ORDER BY id DESC
    `;

    const result = await client.query(query, [body.idFlujo]);

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          message: `No existe información para idFlujo = ${body.idFlujo}`,
          data: []
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Datos obtenidos correctamente",
        data: result.rows
      })
    };

  } catch (error) {
    console.error('Error al consultar:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno', details: error.message })
    };
  } finally {
    await client.end();
  }
};
