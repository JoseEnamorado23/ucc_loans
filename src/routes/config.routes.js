// src/routes/config.routes.js
const express = require('express');
const router = express.Router();
const configController = require('../controllers/config.controller');

// GET /api/config - Obtener todas las configuraciones
router.get('/', configController.getAll);

// GET /api/config/object - Obtener configuración como objeto
router.get('/object', configController.getConfigObject);

// GET /api/config/:clave - Obtener configuración específica
router.get('/:clave', configController.getByClave);

// PUT /api/config/:clave - Actualizar configuración
router.put('/:clave', configController.update);

module.exports = router;