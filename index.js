// index.js - Router principal actualizado
const datosQuitaHadler = require('./handlers/datosQuitaHandler');
const detallesQuitaHandler = require('./handlers/detalleQuitaHandler');
const quitaCondicionesHandler = require('./handlers/quitaCondicionesHandler');
const detalleQuitaCondiciones = require('./handlers/detalleQuitaCondicionesHandler');
const planesQuitaHandler = require('./handlers/planesQuitaHandler');
const detallePlamesQuitaHandler = require('./handlers/detallePlanesQuitaHandler');
const segmentacionQuitaHandler = require('./handlers/segmentacionQuitaHandler');
const detalleSegmentacionQuitaHandler = require('./handlers/detalleSegmentacionQuitaHandler');
const inconvivenciasQuitaHandler = require('./handlers/inconvivenciasQuitaHandler');
const detalleInconvivenciasQuitaHandler = require('./handlers/detalleInconvicenciasQuita');

exports.handler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));
  
  const path = event.path || '';
  const httpMethod = event.httpMethod;
  
// Routing 
// ------ QUITAS ----  //
if (path.includes('/datosQuita') && httpMethod === 'POST') {
  return await datosQuitaHadler.handler(event);
}
else if (path.includes('/detalleQuita') && httpMethod === 'POST') {
  return await detallesQuitaHandler.handler(event);
}
else if (path.includes('/quitaCondiciones') && httpMethod === 'POST') {
  return await quitaCondicionesHandler.handler(event);
}
else if (path.includes('/detalleCondicionesQuita') && httpMethod === 'POST') {
  return await detalleQuitaCondiciones.handler(event);
}
else if (path.includes('/datosPlanesQuita') && httpMethod === 'POST') {
  return await planesQuitaHandler.handler(event);
}
else if (path.includes('/detallePlanesQuita') && httpMethod === 'POST') {
  return await detallePlamesQuitaHandler.handler(event);
}
else if (path.includes('/segmentacionQuita') && httpMethod === 'POST') {
  return await segmentacionQuitaHandler.handler(event);
}
else if (path.includes('/detalleSegmentacionQuita') && httpMethod === 'POST') {
  return await detalleSegmentacionQuitaHandler.handler(event);
}
else if (path.includes('/inconvivenciasQuita') && httpMethod === 'POST') {
  return await inconvivenciasQuitaHandler.handler(event);
}
else if (path.includes('/detalleInconvivenciasQuita') && httpMethod === 'POST') {
  return await detalleInconvivenciasQuitaHandler.handler(event);
}
  else {
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
        path: path,
        method: httpMethod 
      })
    };
  }
};