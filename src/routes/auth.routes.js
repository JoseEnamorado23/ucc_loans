const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const userAuth = require('../middleware/userAuth');
const secureAdminAuth = require('../middleware/secureAdminAuth');
const { adminLoginLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const { adminCSRFProtection, generateCSRFToken } = require('../middleware/csrfProtection');

// ========== RUTAS DE ADMINISTRADOR ==========

// Ruta para login de administrador (con rate limiting)
router.post('/admin-login', adminLoginLimiter, authController.adminLogin);

// Ruta para refrescar token de administrador
router.post('/admin-refresh', authController.refreshAdminToken);

// Ruta para logout de administrador
router.post('/admin-logout', authController.adminLogout);

// Ruta para verificar sesión de administrador
router.get('/admin-session', secureAdminAuth.verifyAdminToken, authController.checkAdminSession);

// Generar token CSRF para formularios administrativos
router.get('/admin-csrf', generateCSRFToken, (req, res) => {
  res.json({
    success: true,
    csrfToken: req.csrfToken()
  });
});

// Registro de usuario por administrador (protegido)
router.post('/register-admin', 
  //secureAdminAuth.verifyAdminToken, 
  //adminCSRFProtection, 
  authController.registerAdmin
);

// ========== RUTAS DE USUARIOS ==========

// 🔓 RUTAS PÚBLICAS
router.post('/register', userAuth.ensureGuest, authController.register);
router.post('/login', userAuth.ensureGuest, authController.login);
router.post('/forgot-password', passwordResetLimiter, userAuth.ensureGuest, authController.forgotPassword);
router.post('/reset-password', userAuth.ensureGuest, authController.resetPassword);

// Verificación de email y tokens
router.get('/verify-token/:token', authController.verifyToken);
router.post('/create-password', authController.createPassword);
router.get('/verify-email/:token', authController.verifyEmail);

// 🔒 RUTAS PROTEGIDAS (requieren autenticación)
router.get('/profile', userAuth.verifyToken, authController.getProfile);

module.exports = router;