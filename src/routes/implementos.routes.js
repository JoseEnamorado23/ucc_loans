// src/routes/implementos.routes.js
const express = require('express');
const router = express.Router();
const implementosController = require('../controllers/implementos.controller');

// GET /api/implementos - Obtener todos los implementos
router.get('/', implementosController.getAll);

// GET /api/implementos/disponibles - Obtener implementos disponibles
router.get('/disponibles', implementosController.getAvailable);

// GET /api/implementos/:id - Obtener implemento por ID
router.get('/:id', implementosController.getById);

// POST /api/implementos - Crear nuevo implemento
router.post('/', implementosController.create);

// PUT /api/implementos/:id - Actualizar implemento
router.put('/:id', implementosController.update);

// DELETE /api/implementos/:id - Eliminar implemento
router.delete('/:id', implementosController.delete);

module.exports = router;