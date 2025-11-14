// src/app.js - VERSIÓN CORREGIDA PARA PRODUCCIÓN
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const pgSession = require('connect-pg-simple')(session);
const routes = require("./routes");
const db = require("./db");
const { apiLimiter } = require("./middleware/rateLimiter");

const app = express();

// ========== CONFIGURACIÓN DE SEGURIDAD ==========

// ========== CONFIGURACIÓN DE SEGURIDAD ==========

// ✅ CSP SEGURO - SIN WILDCARDS
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " + // ✅ AGREGAR unsafe-inline y unsafe-eval
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " + // ✅ unsafe-inline
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://uccloans.vercel.app; " +
    "frame-src 'self'; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "object-src 'none'"
  );
  next();
});

// Configurar CORS con opciones más seguras
const allowedOrigins = [
  'http://localhost:3000', 
  'http://172.25.64.178:3000',
  process.env.FRONTEND_URL,
  'https://uccloans.vercel.app',
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

// Middlewares básicos
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate limiting global
//app.use('/api', apiLimiter);

// Configuración de sesiones con PostgreSQL (CORREGIDO)
app.use(session({
  store: new pgSession({
    pool: db,
    tableName: 'user_sessions',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'secreto-temporal-sesiones',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
    httpOnly: true, // No accesible desde JavaScript
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    sameSite: 'lax' // Cambiado a 'lax' para mejor compatibilidad en producción
  },
  name: 'sessionId' // Nombre personalizado para la cookie de sesión
}));

// ========== RUTAS ==========
app.use("/api", routes);

// Ruta de salud
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Servidor de Préstamos funcionando correctamente",
    timestamp: new Date().toISOString(),
  });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada",
  });
});

// Manejo de errores global
app.use((error, req, res, next) => {
  console.error("Error global:", error);
  res.status(500).json({
    success: false,
    message: "Error interno del servidor",
  });
});

// ✅ FUNCIÓN MEJORADA CON WEBSOCKETS Y MEJOR MANEJO DE ERRORES
const ejecutarProcesoAutomatico = async () => {
  try {
    console.log('🔄 Ejecutando proceso automático de préstamos pendientes...');
    
    const result = await db.query('SELECT * FROM marcar_prestamos_pendientes()');
    
    if (result.rows.length > 0) {
      const { prestamos_actualizados, detalles } = result.rows[0];
      
      if (prestamos_actualizados > 0) {
        console.log(`✅ ${prestamos_actualizados} préstamos marcados como pendientes: ${detalles}`);
        
        try {
          const { getIO } = require('./websocket/socketManager');
          const io = getIO();
          
          if (io) {
            io.emit('prestamos_actualizados', {
              tipo: 'automatico',
              prestamos_actualizados: prestamos_actualizados,
              detalles: detalles,
              timestamp: new Date().toISOString()
            });
            console.log('📡 Notificación WebSocket enviada a clientes');
          }
        } catch (wsError) {
          console.log('⚠️ WebSocket no disponible para notificación:', wsError.message);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error en proceso automático:', error);
  }
};

const iniciarProcesoAutomatico = () => {
  console.log('⏰ Configurando proceso automático...');
  
  setTimeout(() => {
    ejecutarProcesoAutomatico();
  }, 10000);

  const autoProcessInterval = setInterval(ejecutarProcesoAutomatico, 60000);
  return autoProcessInterval;
};

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 API Usuarios: http://localhost:${PORT}/api/usuarios/buscar?q=`);
  console.log(`💰 API Préstamos: http://localhost:${PORT}/api/prestamos`);
  console.log(`⚙️ API Config: http://localhost:${PORT}/api/config`);
  console.log(`🔐 API Auth: http://localhost:${PORT}/api/auth/admin-login`);
  console.log(`💾 Sesiones almacenadas en PostgreSQL`);
  
  const autoProcessInterval = iniciarProcesoAutomatico();
  
  process.on('SIGTERM', () => {
    clearInterval(autoProcessInterval);
  });
});

module.exports = app;