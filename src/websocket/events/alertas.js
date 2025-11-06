const Loan = require('../../models/loans.model');

module.exports = (socket, io) => {
    
    // Cliente solicita alertas actuales
    socket.on('solicitar_alertas', async () => {
        try {
            const alertas = await Loan.findExpiringLoans(30); // 30 minutos de aviso
            socket.emit('alertas_actualizadas', alertas);
        } catch (error) {
            socket.emit('error', { mensaje: 'Error obteniendo alertas' });
        }
    });

    // Escuchar cuando se necesite una alerta específica
    socket.on('nueva_alerta', (alertaData) => {
        io.emit('alerta_urgente', alertaData);
    });
};