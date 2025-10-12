const { Client } = require('pg');

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

exports.handler = async (event) => {
  console.log("Evento recibido en crudUsuariosHandler:", JSON.stringify(event, null, 2));

  const client = new Client(dbConfig);
  await client.connect();

  try {
    const httpMethod = event.httpMethod?.toUpperCase() || '';
    const body = event.body ? JSON.parse(event.body) : {};
    const noEmpleado = event.pathParameters?.noEmpleado || body.noEmpleado;

    switch (httpMethod) {
      case 'POST':
        return await crearOActualizarUsuario(client, body);

      case 'GET':
        if (noEmpleado) {
          return await obtenerUsuarioPorId(client, noEmpleado);
        } else {
          return await obtenerTodosUsuarios(client);
        }

      case 'PUT':
        return await actualizarUsuario(client, body);

      case 'DELETE':
        if (!noEmpleado) {
          return response(400, { error: 'Debe proporcionar el no_empleado para eliminar.' });
        }
        return await eliminarUsuario(client, noEmpleado);

      default:
        return response(405, { error: `Método no permitido: ${httpMethod}` });
    }

  } catch (error) {
    console.error("Error en crudUsuariosHandler:", error);
    return response(500, { error: 'Error interno del servidor', details: error.message });
  } finally {
    await client.end();
  }
};

// 🔹 Crear o actualizar usuario (UPSERT)
async function crearOActualizarUsuario(client, body) {
  const { noEmpleado, nombre, correo, area, perfil, permisos } = body;

  if (!noEmpleado || !nombre || !correo || !area || !perfil || !permisos) {
    return response(400, { error: 'Faltan campos obligatorios: noEmpleado, nombre, correo, area, perfil o permisos' });
  }

  const query = `
    INSERT INTO perfil_usuarios (no_empleado, nombre, correo, area, perfil, permisos)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (no_empleado)
    DO UPDATE SET 
      nombre = EXCLUDED.nombre,
      correo = EXCLUDED.correo,
      area = EXCLUDED.area,
      perfil = EXCLUDED.perfil,
      permisos = EXCLUDED.permisos
    RETURNING *;
  `;
  const values = [noEmpleado, nombre, correo, area, perfil, permisos];
  const result = await client.query(query, values);

  return response(200, {
    message: 'Usuario creado o actualizado correctamente',
    usuario: result.rows[0]
  });
}

// 🔹 Obtener todos los usuarios
async function obtenerTodosUsuarios(client) {
  const query = 'SELECT * FROM perfil_usuarios ORDER BY no_empleado ASC;';
  const result = await client.query(query);
  return response(200, { total: result.rowCount, usuarios: result.rows });
}

// 🔹 Obtener un usuario por su número de empleado
async function obtenerUsuarioPorId(client, noEmpleado) {
  const query = 'SELECT * FROM perfil_usuarios WHERE no_empleado = $1;';
  const result = await client.query(query, [noEmpleado]);

  if (result.rows.length === 0) {
    return response(404, { message: `No se encontró el usuario con no_empleado ${noEmpleado}` });
  }

  return response(200, result.rows[0]);
}

// 🔹 Actualizar usuario (solo si ya existe)
async function actualizarUsuario(client, body) {
  const { no_empleado, nombre, correo, area, perfil, permisos } = body;

  if (!no_empleado) {
    return response(400, { error: 'Debe proporcionar el no_empleado para actualizar.' });
  }

  const query = `
    UPDATE perfil_usuarios
    SET nombre = $2, correo = $3, area = $4, perfil = $5, permisos = $6
    WHERE no_empleado = $1
    RETURNING *;
  `;
  const values = [no_empleado, nombre, correo, area, perfil, permisos];
  const result = await client.query(query, values);

  if (result.rows.length === 0) {
    return response(404, { message: `No se encontró el usuario con no_empleado ${no_empleado}` });
  }

  return response(200, {
    message: 'Usuario actualizado correctamente',
    usuario: result.rows[0]
  });
}

// 🔹 Eliminar usuario
async function eliminarUsuario(client, no_empleado) {
  const query = 'DELETE FROM perfil_usuarios WHERE no_empleado = $1 RETURNING *;';
  const result = await client.query(query, [no_empleado]);

  if (result.rows.length === 0) {
    return response(404, { message: `No se encontró el usuario con no_empleado ${no_empleado}` });
  }

  return response(200, {
    message: `Usuario ${no_empleado} eliminado correctamente`,
    usuario: result.rows[0]
  });
}

// 🔹 Helper para respuesta estándar
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
