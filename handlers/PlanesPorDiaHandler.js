const { Client } = require('pg');

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
};

exports.handler = async (event) => {
  console.log('SimuladorPlanesCuentas GET - Event:', JSON.stringify(event, null, 2));

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight' })
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido. Usa POST.' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (error) {
    console.log('Error al parsear JSON:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Cuerpo JSON inválido' })
    };
  }

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

    // 1) CONSULTA PARA PLANES (validando fecha ACTUAL)
    const queryPlanes = `
    SELECT planes, fecha_creacion
    FROM simulador_planes_cuentas
    WHERE id_promociones_ttp = $1
        AND fecha_creacion::date = CURRENT_DATE
    `;

    const planesResult = await client.query(queryPlanes, [body.idflujo]);

    if (!planesResult.rows || planesResult.rows.length === 0) {
    return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
        message: `No hay registros de HOY (${new Date().toISOString().slice(0,10)}) para idflujo: ${body.idflujo}`,
        data: {}
        })
    };
    }

    console.log("planesResult");
    console.log(planesResult.rows);

    const listaPlanes = planesResult.rows.map(row => {
    let planes = row.planes;
    if (typeof planes === 'string') {
        try {
        planes = JSON.parse(planes);
        } catch (err) {
        console.log("Error parseando JSON:", err);
        planes = [];
        }
    }
    return planes;
    });

    const planesFlatten = listaPlanes.flat();

    const totalPlanes = planesFlatten.length;

    // 2) CONSULTA PARA CUENTAS_VALIDAR
    const queryCuentasValidar = `
      SELECT 
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

    const cuentasResult = await client.query(queryCuentasValidar, [body.idflujo]);

    let cuentasValidar = null;

    if (cuentasResult.rows && cuentasResult.rows.length > 0) {
      const r = cuentasResult.rows[0];

      cuentasValidar =
        typeof r.cuentasValidar === 'string'
          ? JSON.parse(r.cuentasValidar)
          : r.cuentasValidar;
    }

    const totalCuentasValidar = Number(cuentasValidar) || 0;
    const resultadoMultiplicacion = totalPlanes * totalCuentasValidar;

    const fechaActual = new Date().toISOString().slice(0, 10);


    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Datos obtenidos correctamente',
        conteo_cuentas: resultadoMultiplicacion,
        fecha: fechaActual,
        conteo_promociones: totalPlanes
      })
    };

  } catch (error) {
    console.error('Error al consultar simulador_planes_cuentas:', error);
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
