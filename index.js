const handlers = {
  'POST:/planesCuentasSimulacion': require('./handlers/planesCuentasSimulacionHandler'),
  'POST:/detallePlanesCuentasSimulacion': require('./handlers/detallePlanesCuentasSimulacionHandler'),
  'POST:/cuentasRelojCicloSimulacion': require('./handlers/cuentasRelojCicloSimulacionHandler'),
  'POST:/detalleCuentasRelojCiclo': require('./handlers/detalleCuentasRelojCicloSimulacionHandler'),
  'POST:/segmentacionSimulacion': require('./handlers/segmentacionHandler'),
  'POST:/detalleSegmentacionSimulacion': require('./handlers/detalleSegmentacionHandler'),
  'POST:/grafoSimulador': require('./handlers/grafoSimuladorHandler'),
  'POST:/validacionUsuario': require('./handlers/validacionUsuarioHandler'),
  'POST:/aprobacionUsuario': require('./handlers/aprobacionesUsuariosHandler')
};

exports.handler = async (event) => {
  console.log('Evento recibido para enrutar:', JSON.stringify(event, null, 2));

  const path = event.path?.trim() || '';
  const httpMethod = event.httpMethod?.toUpperCase() || '';

  //coincidencia exacta
  const key = `${httpMethod}:${path}`;
  const handler = handlers[key];

  if (handler) {
    console.log(`Routing to ${key}`);
    return await handler.handler(event);
  }

  return {
    statusCode: 404,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token'
    },
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
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token'
});
