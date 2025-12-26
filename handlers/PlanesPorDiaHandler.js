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

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: "CORS preflight" }) };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Método no permitido" }) };
  }

  const client = new Client(dbConfig);

  try {
    await client.connect();

    const queryAllPlanes = `
        SELECT id_promociones_ttp, planes, fecha_creacion
        FROM simulador_planes_cuentas
        WHERE fecha_creacion::date = CURRENT_DATE
    `;

    const planesResult = await client.query(queryAllPlanes);

    /*if (!planesResult.rows || planesResult.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: "No hay registros hoy", data: [] })
      };
    }*/

    // -----------------------------
    // CONTAR PLANES DE TODOS LOS REGISTROS
    // -----------------------------
    let totalPlanes = 0;

    for (const row of planesResult.rows) {
      let planes = row.planes;

      if (typeof planes === "string") {
        try {
          planes = JSON.parse(planes);
        } catch (e) {
          console.log("Error parseando planes:", e);
          planes = [];
        }
      }

      if (!Array.isArray(planes)) planes = [];

      totalPlanes += planes.length;
    }

    const fechaActual = new Date().toISOString().slice(0, 10);

    // -----------------------------------------
    // 2) CONSULTA DE CUENTAS_VALIDAR (HOY)
    // -----------------------------------------
    const queryCuentasValidar = `
      SELECT 
        cuentas_validar AS "cuentasValidar",
        tipo_reloj AS "tipoReloj",
        ciclo_facturacion AS "cicloFacturacion",
        sub,
        nombre_editor AS "nombreEditor",
        status,
        fecha_creacion AS "fechaMod"
      FROM simulador_cuentas_reloj_ciclo
      WHERE fecha_creacion::date = CURRENT_DATE
    `;

    const cuentasResult = await client.query(queryCuentasValidar);

    // Contador total de cuentas_validar
    let totalCuentasValidar = 0;

    if (cuentasResult.rows && cuentasResult.rows.length > 0) {
      for (const row of cuentasResult.rows) {

        let valor = row.cuentasValidar;

        if (typeof valor === 'string') {
          try {
            valor = JSON.parse(valor);
          } catch (err) {
            console.log("Error parseando cuentas_validar:", err);
            valor = 0;
          }
        }

        const numero = Number(valor) || 0;
        totalCuentasValidar += numero;
      }
    }

    console.log("totalPlanes: ", totalPlanes);
    console.log("totalCuentasValidar: ", totalCuentasValidar);

    let totalRegistrosXCuentasValidar = totalCuentasValidar * totalPlanes;
    
    console.log("totalRegistrosXCuentasValidar: ", totalRegistrosXCuentasValidar);


    // ----------------------------------------------------
    // CONSULTA: número_cuentas_max más reciente
    // ----------------------------------------------------
    const queryNumeroCuentas = `
      SELECT numero_cuentas_max
      FROM catalogo_gestion_simulador
      ORDER BY fecha_ultima_modificacion DESC
      LIMIT 1;
    `;

    const result = await client.query(queryNumeroCuentas);

    /*if (result.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "No se encontraron registros en catalogo_gestion_simulador"
        })
      };
    }*/

    let numeroCuentasMax = result.rows[0].numero_cuentas_max;


    let datoRestante =  numeroCuentasMax - totalRegistrosXCuentasValidar;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Datos obtenidos correctamente",
        conteo_cuentas: datoRestante,
        máximo_cuentas: numeroCuentasMax,
        fecha: fechaActual,
        conteo_promociones: totalPlanes,
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Error interno", details: error.message })
    };
  } finally {
    await client.end();
  }
};
