const express = require('express');
const router = express.Router();

const usersController = require('../controllers/users.controller');
const loansRoutes = require('./loans.routes');
const implementosRoutes = require('./implementos.routes');
const configRoutes = require('./config.routes');
const authRoutes = require('./auth.routes');
const usersRoutes = require('./users.routes');
const programasRoutes = require('./programas.routes');

// Rutas de Autenticación
router.use('/auth', authRoutes);

// router.get('/auth/debug', (req, res) => {
//   res.json({ message: 'Auth routes working', timestamp: new Date() });
// });

// Rutas de Usuarios
router.get('/usuarios/buscar', usersController.searchUsers);
router.get('/usuarios/cedula/:cedula', usersController.findByCedula);
router.post('/usuarios', usersController.createUser);

// Rutas de Préstamos
router.use('/prestamos', loansRoutes);

// Rutas de Implementos
router.use('/implementos', implementosRoutes);

// Rutas de Configuración
router.use('/config', configRoutes);

router.use('/users', usersRoutes);
router.use('/programas', programasRoutes);


module.exports = router;