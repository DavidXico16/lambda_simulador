// index.js - Router principal actualizado
const planesCuentasSimulacionHandler = require('./handlers/planesCuentasSimulacionHandler');
const detallePlanesCuentasSimulacionHandler = require('./handlers/detallePlanesCuentasSimulacionHandler');


exports.handler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));
  
  const path = event.path || '';
  const httpMethod = event.httpMethod;
  
// Routing 
// ------ SIMULACION ----  //
if (path.includes('/planesCuentasSimulacion') && httpMethod === 'POST') {
  return await planesCuentasSimulacionHandler.handler(event);
}
if (path.includes('/detallePlanesCuentasSimulacion') && httpMethod === 'POST') {
  return await detallePlanesCuentasSimulacionHandler.handler(event);
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