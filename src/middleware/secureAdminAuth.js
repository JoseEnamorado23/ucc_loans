// src/middleware/secureAdminAuth.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Almacenamiento en memoria para refresh tokens (en producción usar Redis)
const refreshTokens = new Map();

const secureAdminAuth = {
  // 🔐 GENERAR PAR DE TOKENS (ACCESS + REFRESH)
  generateTokenPair(adminData) {
    const accessToken = jwt.sign(
      {
        userId: adminData.userId,
        type: 'admin',
        username: adminData.username,
        sessionId: crypto.randomUUID()
      },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '15m' } // Token de acceso corto
    );

    const refreshToken = jwt.sign(
      {
        userId: adminData.userId,
        type: 'refresh',
        sessionId: crypto.randomUUID()
      },
      process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret',
      { expiresIn: '7d' } // Refresh token más largo
    );

    // Guardar refresh token en memoria
    refreshTokens.set(refreshToken, {
      userId: adminData.userId,
      username: adminData.username,
      createdAt: new Date(),
      lastUsed: new Date()
    });

    return { accessToken, refreshToken };
  },

  // 🔄 REFRESCAR TOKEN
  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret');
      
      if (decoded.type !== 'refresh') {
        throw new Error('Token inválido');
      }

      const tokenData = refreshTokens.get(refreshToken);
      if (!tokenData) {
        throw new Error('Refresh token no encontrado');
      }

      // Actualizar último uso
      tokenData.lastUsed = new Date();

      // Generar nuevo access token
      const newAccessToken = jwt.sign(
        {
          userId: decoded.userId,
          type: 'admin',
          username: tokenData.username,
          sessionId: crypto.randomUUID()
        },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '15m' }
      );

      return { accessToken: newAccessToken, refreshToken };
    } catch (error) {
      // Limpiar refresh token inválido
      refreshTokens.delete(refreshToken);
      throw error;
    }
  },

  // 🔒 VERIFICAR TOKEN DE ADMINISTRADOR
  async verifyAdminToken(req, res, next) {
    try {
      // Obtener token desde cookie HttpOnly
      const accessToken = req.cookies?.adminAccessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          message: 'Acceso denegado. Token no proporcionado.'
        });
      }

      // Verificar token
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET || 'fallback_secret');
      
      if (decoded.type !== 'admin') {
        return res.status(401).json({
          success: false,
          message: 'Token no válido para acceso de administrador.'
        });
      }

      // Agregar datos del admin al request
      req.adminId = decoded.userId;
      req.adminUsername = decoded.username;
      req.sessionId = decoded.sessionId;
      
      next();
    } catch (error) {
      console.error('Error verificando token de admin:', error);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expirado. Intenta refrescar la sesión.',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Token inválido.'
      });
    }
  },

  // 🍪 CONFIGURAR COOKIES SEGURAS
  setSecureCookies(res, accessToken, refreshToken) {
    const cookieOptions = {
      httpOnly: true, // No accesible desde JavaScript
      secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
      sameSite: 'strict', // Protección CSRF
      path: '/'
    };

    // Access token (15 minutos)
    res.cookie('adminAccessToken', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000 // 15 minutos
    });

    // Refresh token (7 días)
    res.cookie('adminRefreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
    });
  },

  // 🗑️ LIMPIAR COOKIES
  clearCookies(res) {
    res.clearCookie('adminAccessToken');
    res.clearCookie('adminRefreshToken');
  },

  // 🚪 LOGOUT SEGURO
  logout(refreshToken) {
    if (refreshToken) {
      refreshTokens.delete(refreshToken);
    }
  },

  // 🧹 LIMPIAR TOKENS EXPIRADOS (ejecutar periódicamente)
  cleanupExpiredTokens() {
    const now = new Date();
    for (const [token, data] of refreshTokens.entries()) {
      // Limpiar tokens no usados por más de 7 días
      if (now - data.lastUsed > 7 * 24 * 60 * 60 * 1000) {
        refreshTokens.delete(token);
      }
    }
  }
};

// Ejecutar limpieza cada hora
setInterval(() => {
  secureAdminAuth.cleanupExpiredTokens();
}, 60 * 60 * 1000);

module.exports = secureAdminAuth;
