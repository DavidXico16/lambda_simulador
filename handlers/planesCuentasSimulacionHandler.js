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

// Convierte dd/mm/yyyy o dd/mm/yyyy HH:mm:ss → yyyy-mm-dd HH:mm:ss
function convertirFecha(fecha) {
  if (!fecha) return null;

  // Si ya viene en formato ISO (Postgres friendly)
  if (/^\d{4}-\d{2}-\d{2}/.test(fecha)) {
    return fecha;
  }

  // dd/mm/yyyy o dd/mm/yyyy HH:mm:ss
  const [fechaParte, horaParte] = fecha.split(' ');
  const partes = fechaParte.split('/');

  if (partes.length === 3) {
    const fechaISO = `${partes[2]}-${partes[1]}-${partes[0]}`;
    return horaParte ? `${fechaISO} ${horaParte}` : `${fechaISO} 00:00:00`;
  }

  return fecha;
}


exports.handler = async (event) => {
  console.log('SimuladorPlanesCuentas handler - Event:', JSON.stringify(event, null, 2));

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'CORS preflight' }) };
  }

  try {
    let body;
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (parseError) {
        console.log("Error: " ,parseError)
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Cuerpo JSON inválido' })
        };
      }
    } else {
      body = event;
    }

    // Validar campos requeridos
    const requiredFields = ['idflujo', 'planes', 'cuentas', 'sub', 'nombreEditor', 'fecha_mod', 'status'];
    const missingFields = requiredFields.filter(f => !body[f]);
    if (missingFields.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Campos requeridos faltantes', missing: missingFields })
      };
    }

    const fechaModConvertida = convertirFecha(body.fecha_mod);

    const client = new Client(dbConfig);
    await client.connect();

    try {
      await client.query('BEGIN');

      // 1️⃣ Verificar que idflujo exista en promociones_ttp
      const checkParentQuery = 'SELECT id_promociones_ttp FROM promociones_ttp WHERE id_promociones_ttp = $1';
      const checkParent = await client.query(checkParentQuery, [body.idflujo]);

      if (checkParent.rows.length === 0) {
        await client.query('ROLLBACK');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: `El idflujo (${body.idflujo}) no existe en promociones_ttp`
          })
        };
      }

      // 2️⃣ Verificar si ya existe en simulador_planes_cuentas
      const checkQuery = `
        SELECT id_simulador_planes_cuentas 
        FROM simulador_planes_cuentas 
        WHERE id_promociones_ttp = $1
      `;
      const checkResult = await client.query(checkQuery, [body.idflujo]);
      const exists = checkResult.rows.length > 0;

      if (exists) {
        console.log(`Actualizando simulador_planes_cuentas para idflujo: ${body.idflujo}`);
        const updateQuery = `
          UPDATE simulador_planes_cuentas 
          SET 
            planes = $1,
            cuentas = $2,
            sub = $3,
            nombre_editor = $4,
            status = $5,
            responsable_modificacion = $6,
            fecha_mod = $7
          WHERE id_promociones_ttp = $8
          RETURNING id_simulador_planes_cuentas
        `;
        const values = [
          JSON.stringify(body.planes),
          JSON.stringify(body.cuentas),
          body.sub,
          body.nombreEditor,
          body.status,
          body.nombreEditor,
          fechaModConvertida,
          body.idflujo
        ];
        await client.query(updateQuery, values);
      } else {
        console.log(`Creando nuevo simulador_planes_cuentas para idflujo: ${body.idflujo}`);
        const insertQuery = `
          INSERT INTO simulador_planes_cuentas
          (id_promociones_ttp, planes, cuentas, sub, nombre_editor, status,
           fecha_creacion, responsable_modificacion, fecha_mod)
          VALUES ($1, $2, $3, $4, $5, $6, $9, $7, $8)
          RETURNING id_simulador_planes_cuentas
        `;
        const values = [
          body.idflujo,
          JSON.stringify(body.planes),
          JSON.stringify(body.cuentas),
          body.sub,
          body.nombreEditor,
          body.status,
          body.nombreEditor,
          fechaModConvertida,
          fechaModConvertida
        ];
        await client.query(insertQuery, values);
      }

      await client.query('COMMIT');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: exists ? 'Registro actualizado exitosamente' : 'Registro creado exitosamente',
          idflujo: body.idflujo,
          action: exists ? 'updated' : 'created'
        })
      };

    } catch (dbError) {
      await client.query('ROLLBACK');
      console.error('Database error in simulador_planes_cuentas handler:', dbError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Error en la base de datos',
          details: dbError.message
        })
      };
    } finally {
      await client.end();
    }

  } catch (error) {
    console.error('Error en simulador_planes_cuentas handler:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Error interno del servidor',
        details: error.message
      })
    };
  }
};
