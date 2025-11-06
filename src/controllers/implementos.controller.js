// src/controllers/implementos.controller.js - MODIFICADO CON WEBSOCKETS
const Implemento = require("../models/implementos.model");
const { getIO } = require("../websocket/socketManager"); // ✅ NUEVA IMPORTACIÓN

const implementosController = {
  // Obtener todos los implementos
  async getAll(req, res) {
    try {
      const { activo } = req.query;
      const includeInactive = activo === "false";

      const implementos = await Implemento.findAll(!includeInactive);

      res.json({
        success: true,
        data: implementos,
        count: implementos.length,
      });
    } catch (error) {
      console.error("Error obteniendo implementos:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  },

  // Obtener implementos disponibles
  async getAvailable(req, res) {
    try {
      const implementos = await Implemento.findAvailable();

      res.json({
        success: true,
        data: implementos,
        count: implementos.length,
      });
    } catch (error) {
      console.error("Error obteniendo implementos disponibles:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  },

  // Obtener implemento por ID
  async getById(req, res) {
    try {
      const { id } = req.params;

      const implemento = await Implemento.findById(parseInt(id));

      if (!implemento) {
        return res.status(404).json({
          success: false,
          message: "Implemento no encontrado",
        });
      }

      res.json({
        success: true,
        data: implemento,
      });
    } catch (error) {
      console.error("Error obteniendo implemento:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  },

  // Crear nuevo implemento - MODIFICADO
  async create(req, res) {
    try {
      const { nombre, cantidad_total, imagen_url } = req.body;

      // Validaciones básicas
      if (!nombre || !cantidad_total) {
        return res.status(400).json({
          success: false,
          message: "Nombre y cantidad total son requeridos",
        });
      }

      if (cantidad_total < 0) {
        return res.status(400).json({
          success: false,
          message: "La cantidad total debe ser mayor o igual a 0",
        });
      }

      const newImplemento = await Implemento.create({
        nombre: nombre.trim(),
        cantidad_total: parseInt(cantidad_total),
        imagen_url: imagen_url || null,
      });

      // ✅ WEBSOCKET: Emitir nuevo implemento
      const io = getIO();
      io.emit('implemento_creado', {
        tipo: 'nuevo_implemento',
        implemento: newImplemento,
        timestamp: new Date().toISOString()
      });

      // ✅ WEBSOCKET: Actualizar lista de implementos
      io.emit('inventario_actualizado', {
        tipo: 'implemento_creado',
        implemento: newImplemento,
        timestamp: new Date().toISOString()
      });

      res.status(201).json({
        success: true,
        message: "Implemento creado exitosamente",
        data: newImplemento,
      });
    } catch (error) {
      console.error("Error creando implemento:", error);

      if (error.message === "Ya existe un implemento con este nombre") {
        return res.status(409).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  },

  // Actualizar implemento - MODIFICADO
  async update(req, res) {
    try {
      const { id } = req.params;
      const {
        nombre,
        cantidad_total,
        cantidad_disponible,
        imagen_url,
        activo,
      } = req.body;

      console.log("📦 Datos para actualizar implemento:", req.body);

      // Validar campos requeridos
      if (!nombre || cantidad_total === undefined) {
        return res.status(400).json({
          success: false,
          message: "Campos requeridos: nombre, cantidad_total",
        });
      }

      // Establecer cantidad_disponible si no viene
      const cantidadDisponibleFinal =
        cantidad_disponible !== undefined
          ? cantidad_disponible
          : cantidad_total;

      const updatedImplemento = await Implemento.update(id, {
        nombre: nombre.trim(),
        cantidad_total: parseInt(cantidad_total),
        cantidad_disponible: cantidadDisponibleFinal,
        imagen_url: imagen_url || "",
        activo: activo !== undefined ? activo : true,
      });

      // ✅ WEBSOCKET: Emitir implemento actualizado
      const io = getIO();
      io.emit('implemento_actualizado', {
        tipo: 'implemento_modificado',
        implemento: updatedImplemento,
        timestamp: new Date().toISOString()
      });

      // ✅ WEBSOCKET: Actualizar inventario
      io.emit('inventario_actualizado', {
        tipo: 'implemento_actualizado',
        implemento: updatedImplemento,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: "Implemento actualizado exitosamente",
        data: updatedImplemento,
      });
    } catch (error) {
      console.error("Error actualizando implemento:", error);

      if (error.message === "Implemento no encontrado") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  },

  // Eliminar implemento (soft delete) - MODIFICADO
  async delete(req, res) {
    try {
      const { id } = req.params;

      const deletedImplemento = await Implemento.delete(parseInt(id));

      // ✅ WEBSOCKET: Emitir implemento eliminado
      const io = getIO();
      io.emit('implemento_eliminado', {
        tipo: 'implemento_eliminado',
        implemento_id: parseInt(id),
        implemento: deletedImplemento,
        timestamp: new Date().toISOString()
      });

      // ✅ WEBSOCKET: Actualizar inventario
      io.emit('inventario_actualizado', {
        tipo: 'implemento_eliminado',
        implemento_id: parseInt(id),
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: "Implemento eliminado exitosamente",
        data: deletedImplemento,
      });
    } catch (error) {
      console.error("Error eliminando implemento:", error);

      if (error.message === "Implemento no encontrado") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  },

  // ✅ NUEVO MÉTODO: Obtener inventario actualizado vía WebSocket
  async getInventoryRealTime(req, res) {
    try {
      const [allImplementos, availableImplementos] = await Promise.all([
        Implemento.findAll(true), // Todos los implementos incluidos inactivos
        Implemento.findAvailable(), // Solo disponibles
      ]);

      res.json({
        success: true,
        data: {
          todos: allImplementos,
          disponibles: availableImplementos,
          total_count: allImplementos.length,
          available_count: availableImplementos.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error en getInventoryRealTime:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  },
};

module.exports = implementosController;