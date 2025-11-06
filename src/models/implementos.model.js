// src/models/implementos.model.js
const db = require("../db");

class Implemento {
  // Obtener todos los implementos
  static async findAll() {
    try {
      const result = await db.query(
        "SELECT * FROM implementos ORDER BY nombre"
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Obtener implementos disponibles
  static async findAvailable() {
    try {
      const result = await db.query(
        "SELECT * FROM implementos WHERE activo = true AND cantidad_disponible > 0 ORDER BY nombre"
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Buscar por ID
  static async findById(id) {
    try {
      const result = await db.query("SELECT * FROM implementos WHERE id = $1", [
        id,
      ]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Buscar por nombre
  // Buscar por nombre
  static async findByNombre(nombre) {
    try {
      const result = await db.query(
        "SELECT * FROM implementos WHERE nombre = $1 AND activo = true",
        [nombre]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }
  // Actualizar cantidad disponible
  static async updateCantidad(id, nuevaCantidad) {
    try {
      const result = await db.query(
        "UPDATE implementos SET cantidad_disponible = $1 WHERE id = $2 RETURNING *",
        [nuevaCantidad, id]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Crear nuevo implemento
  // En el método create del modelo
  static async create(implementoData) {
    const {
      nombre,
      cantidad_total,
      cantidad_disponible = cantidad_total, // ← Valor por defecto
      imagen_url,
      activo = true,
    } = implementoData;

    try {
      const result = await db.query(
        `INSERT INTO implementos (nombre, cantidad_total, cantidad_disponible, imagen_url, activo) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
        [nombre, cantidad_total, cantidad_disponible, imagen_url, activo]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  // Actualizar implemento
  // En el método update del modelo
  static async update(id, implementoData) {
    const { nombre, cantidad_total, cantidad_disponible, imagen_url, activo } =
      implementoData;

    try {
      const result = await db.query(
        `UPDATE implementos 
       SET nombre = $1, 
           cantidad_total = $2, 
           cantidad_disponible = $3, 
           imagen_url = $4, 
           activo = $5,
           fecha_actualizacion = CURRENT_TIMESTAMP
       WHERE id = $6 
       RETURNING *`,
        [
          nombre,
          cantidad_total,
          cantidad_disponible !== undefined
            ? cantidad_disponible
            : cantidad_total, // ← Valor por defecto
          imagen_url,
          activo,
          id,
        ]
      );

      if (result.rows.length === 0) {
        throw new Error("Implemento no encontrado");
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Eliminar implemento
  static async delete(id) {
    try {
      const result = await db.query(
        "DELETE FROM implementos WHERE id = $1 RETURNING *",
        [id]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Implemento;
