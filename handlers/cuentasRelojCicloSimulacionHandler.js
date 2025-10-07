const { Client } = require('pg');

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
};

// 🔹 Convierte fecha dd/mm/yyyy → yyyy-mm-dd
function convertirFecha(fecha) {
  if (!fecha) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
  const partes = fecha.split('/');
  if (partes.length === 3) return `${partes[2]}-${partes[1]}-${partes[0]}`;
  return fecha;
}

exports.handler = async (event) => {
  console.log('Simulador Cuentas Reloj Ciclo - Event received:', JSON.stringify(event, null, 2));

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

  // ✅ Campos obligatorios
  const requiredFields = ['idflujo', 'sub', 'nombreEditor', 'fecha_mod', 'status'];
  const missing = requiredFields.filter(f => !body[f]);
  if (missing.length > 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Campos requeridos faltantes', missing })
    };
  }

  // ✅ Validar que al menos venga uno de los tres opcionales
  const optionalFields = ['cuentasValidar', 'tipoReloj', 'cicloFacturacion'];
  const hasOneOptional = optionalFields.some(f => body[f]);
  if (!hasOneOptional) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Debe incluir al menos uno de los siguientes campos: cuentasValidar, tipoReloj o cicloFacturacion'
      })
    };
  }

  const fechaConvertida = convertirFecha(body.fecha_mod);

  const client = new Client(dbConfig);
  await client.connect();

  try {
    await client.query('BEGIN');

    // 1️⃣ Verificar si el idFlujo existe en promociones_ttp
    const checkFlujo = await client.query(
      'SELECT id_promociones_ttp FROM promociones_ttp WHERE id_promociones_ttp = $1',
      [body.idflujo]
    );

    if (checkFlujo.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'El idFlujo no existe en la tabla promociones_ttp',
          idflujo: body.idflujo
        })
      };
    }

    // 2️⃣ Verificar si ya existe el registro
    const checkExist = await client.query(
      'SELECT id_simulador_cuentas_reloj_ciclo FROM simulador_cuentas_reloj_ciclo WHERE id_promociones_ttp = $1',
      [body.idflujo]
    );

    const exists = checkExist.rows.length > 0;
    const fechaActual = new Date().toISOString().slice(0, 10);

    if (exists) {
      // 🔁 UPDATE dinámico solo con los campos que vengan
      const updates = [];
      const values = [];
      let index = 1;

      if (body.cuentasValidar) {
        updates.push(`cuentas_validar = $${index++}`);
        values.push(body.cuentasValidar);
      }
      if (body.tipoReloj) {
        updates.push(`tipo_reloj = $${index++}`);
        values.push(body.tipoReloj);
      }
      if (body.cicloFacturacion) {
        updates.push(`ciclo_facturacion = $${index++}`);
        values.push(body.cicloFacturacion);
      }

      updates.push(`sub = $${index++}`);
      values.push(body.sub);

      updates.push(`nombre_editor = $${index++}`);
      values.push(body.nombreEditor);

      updates.push(`status = $${index++}`);
      values.push(body.status);

      updates.push(`responsable_modificacion = $${index++}`);
      values.push(body.nombreEditor);

      updates.push(`fecha_mod = $${index++}`);
      values.push(fechaConvertida);

      const where = `WHERE id_promociones_ttp = $${index}`;
      values.push(body.idflujo);

      const updateQuery = `UPDATE simulador_cuentas_reloj_ciclo SET ${updates.join(', ')} ${where}`;
      await client.query(updateQuery, values);

      await client.query('COMMIT');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Datos actualizados exitosamente',
          idflujo: body.idflujo,
          updatedFields: updates.map(u => u.split('=')[0].trim())
        })
      };
    } else {
      // 🆕 INSERT
      const insertQuery = `
        INSERT INTO simulador_cuentas_reloj_ciclo
        (id_promociones_ttp, cuentas_validar, tipo_reloj, ciclo_facturacion, sub, nombre_editor, status, responsable_modificacion, fecha_mod, fecha_creacion)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `;

      const values = [
        body.idflujo,
        body.cuentasValidar || null,
        body.tipoReloj || null,
        body.cicloFacturacion || null,
        body.sub,
        body.nombreEditor,
        body.status,
        body.nombreEditor,
        fechaConvertida,
        fechaActual
      ];

      await client.query(insertQuery, values);
      await client.query('COMMIT');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Datos guardados exitosamente',
          idflujo: body.idflujo,
          action: 'created'
        })
      };
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en simulador_cuentas_reloj_ciclo handler:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno', details: error.message })
    };
  } finally {
    await client.end();
  }
};
