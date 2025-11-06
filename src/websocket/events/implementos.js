const Implemento = require('../../models/implementos.model');

module.exports = (socket, io) => {
    
    // Cliente solicita inventario actualizado
    socket.on('solicitar_inventario', async () => {
        try {
            const inventario = await Implemento.findAvailable();
            socket.emit('inventario_actualizado', inventario);
        } catch (error) {
            socket.emit('error', { mensaje: 'Error obteniendo inventario' });
        }
    });

    // Escuchar cambios en inventario
    socket.on('inventario_modificado', (implementoData) => {
        io.emit('inventario_actualizado', implementoData);
    });
};