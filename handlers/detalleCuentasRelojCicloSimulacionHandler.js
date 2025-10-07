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
  console.log('Simulador Cuentas Reloj Ciclo - Event received:', JSON.stringify(event, null, 2));

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

  // Solo POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido. Usa POST.' }) };
  }

  // Parse JSON
  let body;
  try {
    body = event.body ? JSON.parse(event.body) : event;
  } catch (error) {
    console.log("Error: ", error)
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) };
  }

  // Validar campo obligatorio
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

    const query = `
      SELECT 
        id_promociones_ttp AS idflujo,
        cuentas_validar AS "cuentasValidar",
        tipo_reloj AS "tipoReloj",
        ciclo_facturacion AS "cicloFacturacion",
        sub,
        nombre_editor AS "nombreEditor",
        status,
        fecha_mod AS "fechaMod"
      FROM simulador_cuentas_reloj_ciclo
      WHERE id_promociones_ttp = $1
    `;

    const result = await client.query(query, [body.idflujo]);

    if (!result.rows || result.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          message: `No se encontraron registros para idflujo: ${body.idflujo}`,
          data: {}
        })
      };
    }

    const row = result.rows[0];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Datos obtenidos exitosamente de simulador_cuentas_reloj_ciclo',
        data: row
      })
    };
  } catch (error) {
    console.error('Error al consultar simulador_cuentas_reloj_ciclo:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno del servidor', details: error.message })
    };
  } finally {
    await client.end();
  }
};
