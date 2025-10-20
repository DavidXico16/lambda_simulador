// handlers/aprobacionesPromocionesHandler.js
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
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { idFlujo, numEmpleado, decision, comentarios } = body;

    // Validación de campos requeridos
    if (!idFlujo || !numEmpleado || decision === undefined || !comentarios) {
      return response(400, {
        error: 'Campos requeridos: idFlujo, numEmpleado, decision y comentarios'
      });
    }

    // Verificar si idFlujo existe en promociones_ttp
    const checkFlujo = await client.query(
      'SELECT id_promociones_ttp FROM promociones_ttp WHERE id_promociones_ttp = $1',
      [idFlujo]
    );
    if (checkFlujo.rows.length === 0) {
      return response(404, {
        error: `No se encontró el idFlujo en las tablas:  ${idFlujo}`
      });
    }


    // Verificar existencia del empleado
    const empleadoQuery = `SELECT nombre, perfil, area FROM perfil_usuarios WHERE no_empleado = $1`;
    const empleadoResult = await client.query(empleadoQuery, [numEmpleado]);

    if (empleadoResult.rows.length === 0) {
      return response(404, {
        error: `No se encontró el empleado con número ${numEmpleado}`
      });
    }

    const { nombre, perfil, area } = empleadoResult.rows[0];

    //Verificar si ya existe una aprobación para este idFlujo + no_empleado
    const checkQuery = `
      SELECT id FROM aprobaciones_promociones
      WHERE id_promociones_ttp = $1 AND no_empleado = $2
    `;
    const checkResult = await client.query(checkQuery, [idFlujo, numEmpleado]);

    let result;
    if (checkResult.rows.length > 0) {
      //Si existe → UPDATE
      const updateQuery = `
        UPDATE aprobaciones_promociones
        SET decision = $1,
            comentarios = $2,
            perfil = $3,
            nombre = $4,
            fecha_decision = NOW(),
            area = $7
        WHERE id_promociones_ttp = $5 AND no_empleado = $6
        RETURNING *
      `;
      result = await client.query(updateQuery, [decision, comentarios, perfil, nombre, idFlujo, numEmpleado, area]);
    } else {
      //Si no existe → INSERT
      const insertQuery = `
        INSERT INTO aprobaciones_promociones
        (id_promociones_ttp, perfil, nombre, no_empleado, decision, comentarios, fecha_decision, area)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
        RETURNING *
      `;
      result = await client.query(insertQuery, [idFlujo, perfil, nombre, numEmpleado, decision, comentarios, area]);
    }

    return response(200, {
      message: checkResult.command === 'INSERT' ? 'Aprobación registrada' : 'Aprobación actualizada',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error en aprobacionesPromocionesHandler:', error);
    return response(500, {
      error: 'Error interno del servidor',
      details: error.message
    });
  } finally {
    await client.end();
  }
};

// Función helper para respuestas con CORS
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
