// src/controllers/users.controller.js
const User = require('../models/users.model');

const usersController = {
  // 🔍 OBTENER TODOS LOS USUARIOS CON FILTROS Y PAGINACIÓN
  async getAllUsers(req, res) {
    try {
      const {
        page = 1,
        limit = 15,
        search = "",
        programa_id = "",
        estado = "",
        ordenar_por = "nombre_completo",
        orden = "ASC"
      } = req.query;

      const result = await User.findAllWithFilters({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        programa_id,
        estado,
        ordenar_por,
        orden
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error en getAllUsers:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los usuarios'
      });
    }
  },

  // 🔍 BUSCAR USUARIOS (BÚSQUEDA RÁPIDA)
  async searchUsers(req, res) {
    try {
      const { q } = req.query;
      
      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Término de búsqueda requerido'
        });
      }

      const users = await User.searchUsers(q);

      res.json({
        success: true,
        data: users
      });

    } catch (error) {
      console.error('Error en searchUsers:', error);
      res.status(500).json({
        success: false,
        message: 'Error al buscar usuarios'
      });
    }
  },

  // 🔍 BUSCAR USUARIO POR CÉDULA
  async findByCedula(req, res) {
    try {
      const { cedula } = req.params;

      const user = await User.findByCedula(cedula);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        data: user
      });

    } catch (error) {
      console.error('Error en findByCedula:', error);
      res.status(500).json({
        success: false,
        message: 'Error al buscar usuario'
      });
    }
  },

  // 👤 OBTENER PERFIL COMPLETO DEL USUARIO
  async getUserProfile(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Obtener estadísticas del usuario
      const stats = await User.getUserStats(id);

      res.json({
        success: true,
        data: {
          ...user,
          ...stats
        }
      });

    } catch (error) {
      console.error('Error en getUserProfile:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el perfil del usuario'
      });
    }
  },

  // 📋 OBTENER HISTORIAL DE PRÉSTAMOS DEL USUARIO
  async getUserLoansHistory(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10, estado = '' } = req.query;

      const result = await User.getUserLoansHistory(id, {
        page: parseInt(page),
        limit: parseInt(limit),
        estado
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error en getUserLoansHistory:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el historial de préstamos'
      });
    }
  },

  // 📊 OBTENER ESTADÍSTICAS DETALLADAS DEL USUARIO
  async getUserDetailedStats(req, res) {
    try {
      const { id } = req.params;

      const stats = await User.getUserDetailedStats(id);

      if (!stats) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error en getUserDetailedStats:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las estadísticas del usuario'
      });
    }
  },

  // ✏️ ACTUALIZAR INFORMACIÓN DEL USUARIO
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const updatedUser = await User.updateUser(id, updateData);

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        data: updatedUser
      });

    } catch (error) {
      console.error('Error en updateUser:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el usuario'
      });
    }
  },

  // ⏱️ ACTUALIZAR HORAS MANUALMENTE
  async updateUserHours(req, res) {
    try {
      const { id } = req.params;
      const { horas } = req.body;

      const updatedUser = await User.updateHours(id, horas);

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        data: updatedUser
      });

    } catch (error) {
      console.error('Error en updateUserHours:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar las horas'
      });
    }
  },

  // 🔒 BLOQUEAR USUARIO
  async blockUser(req, res) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;

      const blockedUser = await User.blockUser(id, motivo);

      if (!blockedUser) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        data: blockedUser
      });

    } catch (error) {
      console.error('Error en blockUser:', error);
      res.status(500).json({
        success: false,
        message: 'Error al bloquear el usuario'
      });
    }
  },

  // 🔓 DESBLOQUEAR USUARIO
  async unblockUser(req, res) {
    try {
      const { id } = req.params;

      const unblockedUser = await User.unblockUser(id);

      if (!unblockedUser) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        data: unblockedUser
      });

    } catch (error) {
      console.error('Error en unblockUser:', error);
      res.status(500).json({
        success: false,
        message: 'Error al desbloquear el usuario'
      });
    }
  },

  async getUserDetailedStats(req, res) {
  try {
    const { id } = req.params;

    const stats = await User.getUserStats(id);

    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error en getUserDetailedStats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las estadísticas del usuario'
    });
  }
},

  // ➕ CREAR USUARIO
  async createUser(req, res) {
    try {
      const userData = req.body;

      const newUser = await User.create(userData);

      res.status(201).json({
        success: true,
        data: newUser
      });

    } catch (error) {
      console.error('Error en createUser:', error);
      
      if (error.message.includes('Ya existe un usuario')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error al crear el usuario'
      });
    }
  }
};

module.exports = usersController;