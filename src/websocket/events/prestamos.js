// src/websocket/events/prestamos.js - ACTUALIZADO
const Loan = require('../../models/loans.model');

module.exports = (socket, io) => {
    
    // Cliente solicita unirse a una sala específica
    socket.on('unirse_prestamo', (prestamoId) => {
        socket.join(`prestamo_${prestamoId}`);
        console.log(`👥 Cliente ${socket.id} unido a préstamo ${prestamoId}`);
    });

    // Cliente solicita datos actualizados de préstamos
    socket.on('solicitar_prestamos_activos', async () => {
        try {
            const activeLoans = await Loan.findActiveWithTime();
            socket.emit('prestamos_activos_actualizados', activeLoans);
        } catch (error) {
            socket.emit('error', { mensaje: 'Error obteniendo préstamos activos' });
        }
    });

    // Cliente solicita préstamos pendientes
    socket.on('solicitar_prestamos_pendientes', async () => {
        try {
            const pendingLoans = await Loan.findPending();
            socket.emit('prestamos_pendientes_actualizados', pendingLoans);
        } catch (error) {
            socket.emit('error', { mensaje: 'Error obteniendo préstamos pendientes' });
        }
    });

    // Cliente solicita préstamos por vencer
    socket.on('solicitar_prestamos_por_vencer', async () => {
        try {
            const expiringLoans = await Loan.findExpiringLoans(30);
            socket.emit('prestamos_por_vencer_actualizados', expiringLoans);
        } catch (error) {
            socket.emit('error', { mensaje: 'Error obteniendo préstamos por vencer' });
        }
    });

    // Escuchar cuando el frontend solicita una actualización completa
    socket.on('solicitar_actualizacion_completa', async () => {
        try {
            const [activeLoans, pendingLoans, expiringLoans] = await Promise.all([
                Loan.findActiveWithTime(),
                Loan.findPending(),
                Loan.findExpiringLoans(30),
            ]);

            socket.emit('actualizacion_completa', {
                activos: activeLoans,
                pendientes: pendingLoans,
                por_vencer: expiringLoans,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            socket.emit('error', { mensaje: 'Error en actualización completa' });
        }
    });

    // src/websocket/events/prestamos.js - VERSIÓN MEJORADA
socket.on('verificar_prestamos_vencidos', async () => {
    try {
        console.log('🔄 Cliente solicitó verificación de préstamos vencidos...');
        
        const result = await db.query('SELECT * FROM marcar_prestamos_pendientes()');
        
        if (result.rows.length > 0) {
            const { prestamos_actualizados, detalles } = result.rows[0];
            
            if (prestamos_actualizados > 0) {
                // Notificar a TODOS los clientes
                io.emit('prestamos_actualizados', {
                    tipo: 'automatico',
                    prestamos_actualizados: prestamos_actualizados,
                    detalles: detalles,
                    timestamp: new Date().toISOString()
                });
                
                console.log(`✅ ${prestamos_actualizados} préstamos marcados como pendientes`);
                
                // También notificar al cliente que lo solicitó
                socket.emit('proceso_completado', {
                    mensaje: `Se marcaron ${prestamos_actualizados} préstamos como pendientes`,
                    detalles: detalles
                });
            } else {
                // Notificar solo al cliente que lo solicitó
                socket.emit('proceso_completado', {
                    mensaje: 'No hay préstamos para marcar como pendientes',
                    detalles: detalles
                });
            }
        }
    } catch (error) {
        console.error('❌ Error en proceso automático WebSocket:', error);
        socket.emit('error', { mensaje: 'Error verificando préstamos vencidos' });
    }
});
};