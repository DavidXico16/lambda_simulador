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
  console.log('Flujo completo - Event received:', JSON.stringify(event, null, 2));

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

  // Parsear body
  let body;
  try {
    body = event.body ? JSON.parse(event.body) : event;
  } catch (error) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) };
  }

  // Validar campo requerido idFlujo
  const requiredFields = ['idFlujo'];
  const missingFields = requiredFields.filter(f => !body[f]);
  if (missingFields.length > 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Campos requeridos faltantes', missing: missingFields })
    };
  }

  const client = new Client(dbConfig);

  try {
    await client.connect();

    const idFlujo = body.idFlujo;

    // Ejecutar todas las consultas relacionadas al mismo idFlujo
    const [promocion, datosPromocion, quitasCondiciones, cuentasReloj, segmentacion] = await Promise.all([
      client.query('SELECT * FROM promociones_ttp WHERE id_promociones_ttp = $1', [idFlujo]),
      client.query('SELECT * FROM datos_promociones WHERE id_promociones_ttp = $1', [idFlujo]),
      client.query('SELECT * FROM datos_quitas_condiciones WHERE id_promociones_ttp = $1', [idFlujo]),
      client.query('SELECT * FROM simulador_cuentas_reloj_ciclo WHERE id_promociones_ttp = $1', [idFlujo]),
      client.query('SELECT * FROM simulacion_segmentacion WHERE id_promociones_ttp = $1', [idFlujo])
    ]);

    // Construir respuesta unificada
    const data = {
      promociones_ttp: promocion.rows[0] || null,
      datos_promociones: datosPromocion.rows[0] || null,
      datos_quitas_condiciones: quitasCondiciones.rows[0] || null,
      simulador_cuentas_reloj_ciclo: cuentasReloj.rows[0] || null,
      simulacion_segmentacion: segmentacion.rows[0] || null
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: `Datos completos del flujo ${idFlujo}`,
        data
      })
    };
  } catch (error) {
    console.error('Error al obtener flujo completo:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno del servidor', details: error.message })
    };
  } finally {
    await client.end();
  }
};
