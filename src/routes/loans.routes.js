// src/routes/loans.routes.js - VERSIÓN ESTABLE
const express = require('express');
const router = express.Router();
const loansController = require('../controllers/loans.controller');

// Rutas existentes
router.post('/', loansController.createLoan);
router.get('/activos', loansController.getActiveLoans);
router.get('/usuario/:usuarioId', loansController.getLoansByUser);

// Nuevas rutas
router.get('/activos-con-tiempo', loansController.getActiveLoansWithTime);
router.get('/pendientes', loansController.getPendingLoans);
router.get('/finalizados-hoy', loansController.getTodayCompleted);
router.put('/:id/finalizar', loansController.finishLoan);
router.put('/:id/extender', loansController.extendLoan);
router.put('/:id/marcar-perdido', loansController.markAsLost);
router.get('/por-vencer', loansController.getExpiringLoans);
router.get('/marcar-pendientes', loansController.markPendingLoans);
router.get('/auto-update', loansController.getLoansWithAutoUpdate);
router.get('/tiempo-real', loansController.getLoansRealTime);
router.get('/filtros', loansController.getLoansWithFilters);
router.get('/reporte/exportar', loansController.exportLoansReport);


// ✅ NUEVAS RUTAS PARA SOLICITUDES
router.post('/solicitar', loansController.createLoanRequest);
router.get('/solicitudes-pendientes', loansController.getPendingRequests);
router.get('/usuario/:usuarioId/solicitudes', loansController.getUserLoanRequests);
router.put('/:id/aprobar', loansController.approveLoanRequest);
router.put('/:id/rechazar', loansController.rejectLoanRequest);


module.exports = router;