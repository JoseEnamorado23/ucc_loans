// src/routes/programas.routes.js
const express = require('express');
const router = express.Router();
const programasController = require('../controllers/programas.controller');

// 📚 RUTAS DE CONSULTA
router.get('/', programasController.getAllProgramas);      // Obtener todos
router.get('/search', programasController.searchProgramas); // Buscar

// ✏️ RUTAS DE GESTIÓN
router.post('/', programasController.createPrograma);      // Crear
router.put('/:id', programasController.updatePrograma);    // Actualizar
router.delete('/:id', programasController.deletePrograma); // Eliminar

module.exports = router;