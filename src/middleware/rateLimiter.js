// src/middleware/rateLimiter.js - VERSIÓN SIMPLIFICADA
const rateLimit = require('express-rate-limit');

// 🛡️ RATE LIMITER PARA LOGIN DE ADMINISTRADOR
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos por IP cada 15 minutos
  message: {
    success: false,
    message: 'Demasiados intentos de login. Intenta nuevamente en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 🛡️ RATE LIMITER GENERAL PARA API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP cada 15 minutos
  message: {
    success: false,
    message: 'Demasiadas solicitudes. Intenta nuevamente más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false
}); 

// 🛡️ RATE LIMITER ESTRICTO PARA OPERACIONES SENSIBLES
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // máximo 10 operaciones sensibles por hora
  message: {
    success: false,
    message: 'Demasiadas operaciones sensibles. Intenta nuevamente en una hora.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 🛡️ RATE LIMITER PARA RECUPERACIÓN DE CONTRASEÑA
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // máximo 3 solicitudes de recuperación por hora
  message: {
    success: false,
    message: 'Demasiadas solicitudes de recuperación. Intenta nuevamente en una hora.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  adminLoginLimiter,
  apiLimiter,
  strictLimiter,
  passwordResetLimiter
};