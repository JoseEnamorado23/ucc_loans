// src/middleware/adminAuth.js - MIDDLEWARE LEGACY (DEPRECADO)
// Este archivo se mantiene por compatibilidad pero se recomienda usar secureAdminAuth.js

const secureAdminAuth = require('./secureAdminAuth');

const requireAdmin = (req, res, next) => {
  // Usar el nuevo middleware seguro
  return secureAdminAuth.verifyAdminToken(req, res, next);
};

module.exports = { requireAdmin };