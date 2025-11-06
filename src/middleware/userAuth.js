// src/middleware/userAuth.js
const jwt = require('jsonwebtoken');
const User = require('../models/users.model');

const userAuth = {
  // 🔒 VERIFICAR TOKEN JWT
  async verifyToken(req, res, next) {
    try {
      const authHeader = req.header('Authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Acceso denegado. Token no proporcionado.'
        });
      }

      const token = authHeader.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Acceso denegado. Token no válido.'
        });
      }

      // Verificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      
      // Verificar que el token es de tipo usuario (no admin)
      if (decoded.type !== 'user') {
        return res.status(401).json({
          success: false,
          message: 'Token no válido para acceso de usuario.'
        });
      }

      // Verificar que el usuario aún existe
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no encontrado.'
        });
      }

      // Verificar que el usuario esté verificado
      if (!user.verificado) {
        return res.status(403).json({
          success: false,
          message: 'Usuario no verificado. Por favor verifica tu email.'
        });
      }

      // Agregar usuario al request
      req.userId = decoded.userId;
      req.user = user;
      next();

    } catch (error) {
      console.error('Error verificando token:', error);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Token inválido.'
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expirado.'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor.'
      });
    }
  },

  // 🔓 MIDDLEWARE OPCIONAL (para rutas públicas que pueden usar token)
  async optionalAuth(req, res, next) {
    try {
      const authHeader = req.header('Authorization');
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
          
          if (decoded.type === 'user') {
            const user = await User.findById(decoded.userId);
            if (user && user.verificado) {
              req.userId = decoded.userId;
              req.user = user;
            }
          }
        } catch (error) {
          // Si el token es inválido, continuar sin usuario autenticado
          console.log('Token opcional inválido:', error.message);
        }
      }
      
      next();
    } catch (error) {
      console.error('Error en autenticación opcional:', error);
      next();
    }
  },

  // 🚫 VERIFICAR QUE NO ESTÉ AUTENTICADO (para registro/login)
  async ensureGuest(req, res, next) {
    try {
      const authHeader = req.header('Authorization');
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
          
          if (decoded.type === 'user') {
            return res.status(403).json({
              success: false,
              message: 'Ya tienes una sesión activa.'
            });
          }
        } catch (error) {
          // Token inválido, continuar
        }
      }
      
      next();
    } catch (error) {
      console.error('Error en ensureGuest:', error);
      next();
    }
  }
};

module.exports = userAuth;