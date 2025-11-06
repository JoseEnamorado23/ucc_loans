// src/middleware/csrfProtection.js
const csrf = require('csurf');

// 🛡️ CONFIGURACIÓN CSRF PARA ADMINISTRADORES
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000 // 1 hora
  },
  // Personalizar nombre del token
  value: (req) => {
    return req.headers['x-csrf-token'] || req.body._csrf;
  }
});

// 🔒 MIDDLEWARE PARA VERIFICAR CSRF EN RUTAS ADMINISTRATIVAS
const adminCSRFProtection = (req, res, next) => {
  // Solo aplicar CSRF en métodos que modifican datos
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return csrfProtection(req, res, next);
  }
  next();
};

// 🔑 MIDDLEWARE PARA GENERAR TOKEN CSRF
const generateCSRFToken = (req, res, next) => {
  // Generar token CSRF
  req.csrfToken = () => {
    const token = require('crypto').randomBytes(32).toString('hex');
    res.cookie('csrf-token', token, {
      httpOnly: false, // Necesario para que el frontend pueda leerlo
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000 // 1 hora
    });
    return token;
  };
  next();
};

// 🔍 MIDDLEWARE PARA VERIFICAR TOKEN CSRF PERSONALIZADO
const verifyCSRFToken = (req, res, next) => {
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const cookieToken = req.cookies['csrf-token'];
  
  if (!token || !cookieToken || token !== cookieToken) {
    return res.status(403).json({
      success: false,
      message: 'Token CSRF inválido o faltante'
    });
  }
  
  next();
};

module.exports = {
  csrfProtection,
  adminCSRFProtection,
  generateCSRFToken,
  verifyCSRFToken
};
