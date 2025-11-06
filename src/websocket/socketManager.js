// src/websocket/socketManager.js
const { Server } = require('socket.io');
const db = require('../db');

let io;

const initializeWebSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:3000",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log('🔌 Cliente conectado:', socket.id);
        
        // Registrar eventos
        require('./events/prestamos')(socket, io);
        require('./events/implementos')(socket, io);
        require('./events/alertas')(socket, io);

        socket.on('disconnect', () => {
            console.log('🔌 Cliente desconectado:', socket.id);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.io no inicializado");
    }
    return io;
};

module.exports = { initializeWebSocket, getIO };