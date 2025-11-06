// src/controllers/config.controller.js
const Config = require('../models/config.model');

const configController = {
  // Obtener todas las configuraciones
  async getAll(req, res) {
    try {
      const configs = await Config.findAll();
      
      res.json({
        success: true,
        data: configs
      });
    } catch (error) {
      console.error('Error obteniendo configuraciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // Obtener configuración específica
  async getByClave(req, res) {
    try {
      const { clave } = req.params;
      
      const config = await Config.findByClave(clave);
      
      if (!config) {
        return res.status(404).json({
          success: false,
          message: 'Configuración no encontrada'
        });
      }

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('Error obteniendo configuración:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // Actualizar configuración
  async update(req, res) {
    try {
      const { clave } = req.params;
      const { valor } = req.body;
      
      if (valor === undefined || valor === null) {
        return res.status(400).json({
          success: false,
          message: 'El valor es requerido'
        });
      }

      const updatedConfig = await Config.update(clave, valor.toString());

      res.json({
        success: true,
        message: 'Configuración actualizada exitosamente',
        data: updatedConfig
      });
    } catch (error) {
      console.error('Error actualizando configuración:', error);
      
      if (error.message === 'Configuración no encontrada') {
        return res.status(404).json({
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

  // Obtener configuración como objeto
  async getConfigObject(req, res) {
    try {
      const configObj = await Config.getConfigObject();
      
      res.json({
        success: true,
        data: configObj
      });
    } catch (error) {
      console.error('Error obteniendo configuración:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
};

module.exports = configController;