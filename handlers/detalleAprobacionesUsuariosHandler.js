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
    const { idFlujo } = body;

    //Validar idFlujo
    if (!idFlujo) {
      return response(400, { error: 'El parámetro "idFlujo" es obligatorio' });
    }


    //Buscar apobaciones por idFlujo
    const query = `
      SELECT 
        ap.id_promociones_ttp AS idFlujo,
        ap.no_empleado,
        pu.nombre,
        pu.perfil,
        pu.area,
        ap.decision,
        ap.comentarios,
        ap.fecha_decision
      FROM aprobaciones_promociones ap
      INNER JOIN perfil_usuarios pu ON ap.no_empleado = pu.no_empleado
      WHERE ap.id_promociones_ttp = $1
      ORDER BY ap.fecha_decision DESC;
    `;

    const result = await client.query(query, [idFlujo]);

    //Validar si hay resultados
    if (result.rows.length === 0) {
      return response(404, { message: `No hay aprobaciones para el idFlujo ${idFlujo}` });
    }

    return response(200, {
      idFlujo,
      total_registros: result.rows.length,
      aprobaciones: result.rows
    });

  } catch (error) {
    console.error('Error en getAprobacionesHandler:', error);
    return response(500, { error: 'Error interno del servidor', details: error.message });
  } finally {
    await client.end();
  }
};

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
