// src/models/programas.model.js
const db = require("../db");

class Programa {
  // 📚 OBTENER TODOS LOS PROGRAMAS
  static async findAll() {
    try {
      const result = await db.query(
        "SELECT id, nombre FROM programas ORDER BY nombre ASC"
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // 📚 OBTENER PROGRAMA POR ID
  static async findById(id) {
    try {
      const result = await db.query(
        "SELECT id, nombre FROM programas WHERE id = $1",
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // ➕ CREAR NUEVO PROGRAMA
  static async create(nombre) {
    try {
      const result = await db.query(
        "INSERT INTO programas (nombre) VALUES ($1) RETURNING id, nombre",
        [nombre.trim()]
      );
      return result.rows[0];
    } catch (error) {
      if (error.code === "23505") {
        throw new Error("Ya existe un programa con este nombre");
      }
      throw error;
    }
  }

  // ✏️ ACTUALIZAR PROGRAMA
  static async update(id, nombre) {
    try {
      const result = await db.query(
        "UPDATE programas SET nombre = $1 WHERE id = $2 RETURNING id, nombre",
        [nombre.trim(), id]
      );
      return result.rows[0] || null;
    } catch (error) {
      if (error.code === "23505") {
        throw new Error("Ya existe un programa con este nombre");
      }
      throw error;
    }
  }

  // 🗑️ ELIMINAR PROGRAMA
  static async delete(id) {
    try {
      const result = await db.query(
        "DELETE FROM programas WHERE id = $1 RETURNING id, nombre",
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      // Si hay usuarios usando este programa, no se puede eliminar
      if (error.code === "23503") {
        throw new Error("No se puede eliminar el programa porque hay usuarios asociados");
      }
      throw error;
    }
  }

  // 🔍 BUSCAR PROGRAMAS POR NOMBRE
  static async search(query) {
    try {
      const result = await db.query(
        "SELECT id, nombre FROM programas WHERE nombre ILIKE $1 ORDER BY nombre ASC",
        [`%${query}%`]
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Programa;