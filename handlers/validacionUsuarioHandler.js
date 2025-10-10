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
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token'
  };

  // ✅ Soporte CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'CORS preflight' }) };
  }

  // ✅ Solo permite método POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido. Usa POST.' }) };
  }

  let body;
  try {
    body = event.body ? JSON.parse(event.body) : event;
  } catch (error) {
    console.error('Error parseando JSON:', error);
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) };
  }

  // ✅ Validar campo requerido
  const requiredFields = ['numEmpleado'];
  const missingFields = requiredFields.filter(f => !body[f]);
  if (missingFields.length > 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Campos requeridos faltantes', missing: missingFields }) };
  }

  const client = new Client(dbConfig);
  await client.connect();

  try {
    const query = `
      SELECT 
        no_empleado,
        nombre,
        correo,
        area,
        perfil,
        permisos
      FROM perfil_usuarios
      WHERE no_empleado = $1
    `;

    const result = await client.query(query, [body.numEmpleado]);

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: `No se encontró el usuario con numero de Empleado ${body.numEmpleado}` })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Usuario encontrado', 
        data: result.rows[0] })
    };
  } catch (error) {
    console.error('Error al buscar perfil_usuarios:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno', details: error.message })
    };
  } finally {
    await client.end();
  }
};
