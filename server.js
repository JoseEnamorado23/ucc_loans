
// server.js - MODIFICADO
const app = require("./src/app");
require("dotenv").config();
const { initializeWebSocket } = require("./src/websocket/socketManager"); // NUEVA LÍNEA

const PORT = process.env.PORT || 4000;

// Crear servidor HTTP para WebSockets
const server = app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// ✅ INICIALIZAR WEBSOCKETS
initializeWebSocket(server);
console.log('🔌 WebSockets inicializados');