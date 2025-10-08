// index.js - Router principal actualizado
const planesCuentasHandler = require('./handlers/planesCuentasSimulacionHandler');
const detallePlanesCuentasHandler = require('./handlers/detallePlanesCuentasSimulacionHandler');
const cuentasRelojCicloHandler = require('./handlers/cuentasRelojCicloSimulacionHandler');
const detalleCuentasRelojCicloHandler = require('./handlers/detalleCuentasRelojCicloSimulacionHandler');
const segmentacionSimulacionHandlerjs = require('./handlers/segmentacionHandler');
const detalleSegmentacionSimulacionHandlerjs = require('./handlers/detalleSegmentacionHandler');
const grafoSimuladorHandler = require('./handlers/grafoSimuladorHandler')


exports.handler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));
  
  const path = event.path || '';
  const httpMethod = event.httpMethod;
  
// Routing 
// ------ SIMULACION ----  //
if (path.includes('/planesCuentasSimulacion') && httpMethod === 'POST') {
  return await planesCuentasHandler.handler(event);
}
if (path.includes('/detallePlanesCuentasSimulacion') && httpMethod === 'POST') {
  return await detallePlanesCuentasHandler.handler(event);
}
if (path.includes('/cuentasRelojCicloSimulacion') && httpMethod === 'POST') {
  return await cuentasRelojCicloHandler.handler(event);
}
if (path.includes('/detalleCuentasRelojCiclo') && httpMethod === 'POST') {
  return await detalleCuentasRelojCicloHandler.handler(event);
}
if (path.includes('/segmentacionSimulacion') && httpMethod === 'POST') {
  return await segmentacionSimulacionHandlerjs.handler(event);
}
if (path.includes('/detalleSegmentacionSimulacion') && httpMethod === 'POST') {
  return await detalleSegmentacionSimulacionHandlerjs.handler(event);
}
if (path.includes('/grafoSimulador') && httpMethod === 'POST') {
  return await grafoSimuladorHandler.handler(event);
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