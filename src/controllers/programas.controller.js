// src/controllers/programas.controller.js
const Programa = require('../models/programas.model');

const programasController = {
  // 📚 OBTENER TODOS LOS PROGRAMAS
  async getAllProgramas(req, res) {
    try {
      const programas = await Programa.findAll();
      
      res.json({
        success: true,
        data: programas,
        count: programas.length
      });
    } catch (error) {
      console.error('Error obteniendo programas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // ➕ CREAR NUEVO PROGRAMA
  async createPrograma(req, res) {
    try {
      const { nombre } = req.body;

      if (!nombre || nombre.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'El nombre del programa es requerido'
        });
      }

      const nuevoPrograma = await Programa.create(nombre);

      res.status(201).json({
        success: true,
        message: 'Programa creado exitosamente',
        data: nuevoPrograma
      });
    } catch (error) {
      console.error('Error creando programa:', error);
      
      if (error.message === 'Ya existe un programa con este nombre') {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // ✏️ ACTUALIZAR PROGRAMA
  async updatePrograma(req, res) {
    try {
      const { id } = req.params;
      const { nombre } = req.body;

      if (!nombre || nombre.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'El nombre del programa es requerido'
        });
      }

      const programaActualizado = await Programa.update(parseInt(id), nombre);

      if (!programaActualizado) {
        return res.status(404).json({
          success: false,
          message: 'Programa no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Programa actualizado exitosamente',
        data: programaActualizado
      });
    } catch (error) {
      console.error('Error actualizando programa:', error);
      
      if (error.message === 'Ya existe un programa con este nombre') {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // 🗑️ ELIMINAR PROGRAMA
  async deletePrograma(req, res) {
    try {
      const { id } = req.params;

      const programaEliminado = await Programa.delete(parseInt(id));

      if (!programaEliminado) {
        return res.status(404).json({
          success: false,
          message: 'Programa no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Programa eliminado exitosamente',
        data: programaEliminado
      });
    } catch (error) {
      console.error('Error eliminando programa:', error);
      
      if (error.message === 'No se puede eliminar el programa porque hay usuarios asociados') {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // 🔍 BUSCAR PROGRAMAS
  async searchProgramas(req, res) {
    try {
      const { q } = req.query;

      if (!q || q.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Término de búsqueda requerido'
        });
      }

      const programas = await Programa.search(q.trim());

      res.json({
        success: true,
        data: programas,
        count: programas.length
      });
    } catch (error) {
      console.error('Error buscando programas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
};

module.exports = programasController;