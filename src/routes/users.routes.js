// src/routes/users.routes.js - VERSIÓN COMPLETA
const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');

// 🔍 RUTAS DE BÚSQUEDA Y CONSULTA
router.get('/', usersController.getAllUsers);           // Obtener todos los usuarios con filtros
router.get('/search', usersController.searchUsers);     // Búsqueda rápida
router.get('/cedula/:cedula', usersController.findByCedula); // Buscar por cédula exacta
router.get('/:id/stats', usersController.getUserDetailedStats); // Estadísticas detalladas

// 👤 RUTAS DE PERFIL E INFORMACIÓN
router.get('/:id', usersController.getUserProfile);     // Perfil completo + stats
router.get('/:id/loans', usersController.getUserLoansHistory); // Historial de préstamos

// ✏️ RUTAS DE ACTUALIZACIÓN
router.put('/:id', usersController.updateUser);         // Editar información
router.put('/:id/horas', usersController.updateUserHours); // Actualizar horas manualmente

// 🔒 RUTAS DE BLOQUEO/DESBLOQUEO
router.put('/:id/block', usersController.blockUser);    // Bloquear usuario
router.put('/:id/unblock', usersController.unblockUser); // Desbloquear usuario


// ➕ RUTA DE CREACIÓN (ya existente)
router.post('/', usersController.createUser);           // Crear nuevo usuario

module.exports = router;