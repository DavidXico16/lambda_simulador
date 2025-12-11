const handlers = {
  'POST:/planesCuentasSimulacion': require('./handlers/planesCuentasSimulacionHandler'),
  'POST:/detallePlanesCuentasSimulacion': require('./handlers/detallePlanesCuentasSimulacionHandler'),
  'POST:/cuentasRelojCicloSimulacion': require('./handlers/cuentasRelojCicloSimulacionHandler'),
  'POST:/detalleCuentasRelojCiclo': require('./handlers/detalleCuentasRelojCicloSimulacionHandler'),
  'POST:/segmentacionSimulacion': require('./handlers/segmentacionHandler'),
  'POST:/detalleSegmentacionSimulacion': require('./handlers/detalleSegmentacionHandler'),
  'POST:/grafoSimulador': require('./handlers/grafoSimuladorHandler'),
  'POST:/validacionUsuario': require('./handlers/validacionUsuarioHandler'),
  'POST:/aprobacionUsuario': require('./handlers/aprobacionesUsuariosHandler'),
  'POST:/detalleAprobacionUsuarios': require('./handlers/detalleAprobacionesUsuariosHandler'),
  // CRUD de perfilUsuarios
  'POST:/perfilUsuarios': require('./handlers/crudUsuariosHandler'),
  'GET:/perfilUsuarios': require('./handlers/crudUsuariosHandler'),
  'PUT:/perfilUsuarios': require('./handlers/crudUsuariosHandler'),
  'DELETE:/perfilUsuarios': require('./handlers/crudUsuariosHandler'),

  'POST:/addonPlanes': require('./handlers/addoPlanesHandler'),
  'POST:/detalleAddonPlanes': require('./handlers/detalleAddoPlanesHandler'),
  'POST:/getLink': require('./handlers/getLinkHandler'),
  'POST:/estatusNavegacion': require('./handlers/catalogoNavehacionHandler'),
  'POST:/getEstatusNavegacion': require('./handlers/getEstatusNavegacionHandler'),
  'POST:/getSimuladorProgresive': require('./handlers/getSimuladorProgresiveHandler'),
  'POST:/getResultadoCompra': require('./handlers/getResultadoCompraHandler'),
  'POST:/getErroresProcesamiento': require('./handlers/getErroresProcesamientoHandler'),

  'POST:/getPlanesPorDia': require('./handlers/PlanesPorDiaHandler'),
  'POST:/getFechaPlanesCuentas': require('./handlers/getFechaPlanesCuentasHandler')

  
};

exports.handler = async (event) => {
  console.log('Evento recibido para enrutar:', JSON.stringify(event, null, 2));

  const path = event.path?.trim() || '';
  const httpMethod = event.httpMethod?.toUpperCase() || '';

  // Coincidencia exacta
  let key = `${httpMethod}:${path}`;
  let handler = handlers[key];

  //GET /perfilUsuarios/:no_empleado
  if (!handler && httpMethod === 'GET' && path.startsWith('/perfilUsuarios/')) {
    key = 'GET:/perfilUsuarios';
    handler = handlers[key];
    // Agregamos el parámetro a event.pathParameters
    const parts = path.split('/');
    event.pathParameters = { noEmpleado: parts[2] };
  }

  if (handler) {
    console.log(`Routing to ${key}`);
    return await handler.handler(event);
  }

  return {
    statusCode: 404,
    headers: defaultHeaders(),
    body: JSON.stringify({
      error: 'Ruta no encontrada',
      path,
      method: httpMethod
    })
  };
};

const defaultHeaders = () => ({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token'
});
