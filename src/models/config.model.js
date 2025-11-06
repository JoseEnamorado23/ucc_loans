// src/models/config.model.js
const db = require('../db');

class Config {
  // Obtener todas las configuraciones
  static async findAll() {
    try {
      const result = await db.query('SELECT * FROM configuracion_sistema ORDER BY clave');
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Obtener configuración por clave
  static async findByClave(clave) {
    try {
      const result = await db.query(
        'SELECT * FROM configuracion_sistema WHERE clave = $1',
        [clave]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Actualizar configuración
  static async update(clave, valor) {
    try {
      const result = await db.query(
        `UPDATE configuracion_sistema 
         SET valor = $1, fecha_actualizacion = CURRENT_TIMESTAMP
         WHERE clave = $2 
         RETURNING *`,
        [valor, clave]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Configuración no encontrada');
      }
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Obtener configuración completa como objeto
  static async getConfigObject() {
    try {
      const configs = await this.findAll();
      const configObj = {};
      
      configs.forEach(config => {
        configObj[config.clave] = config.valor;
      });
      
      return configObj;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Config;