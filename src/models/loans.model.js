// src/models/loans.model.js
const db = require("../db");

class Loan {
  // Crear nuevo préstamo
  static async create(loanData) {
    const {
      usuario_id,
      implemento,
      fecha_prestamo,
      hora_inicio,
      estado = "activo",
    } = loanData;

    try {
      const result = await db.query(
        `INSERT INTO prestamos (usuario_id, implemento, fecha_prestamo, hora_inicio, estado) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [usuario_id, implemento, fecha_prestamo, hora_inicio, estado]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Obtener préstamos por usuario
  static async findByUserId(usuario_id) {
    try {
      const result = await db.query(
        `SELECT * FROM prestamos 
         WHERE usuario_id = $1 
         ORDER BY fecha_prestamo DESC, hora_inicio DESC`,
        [usuario_id]
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Obtener préstamos activos
  static async findActive() {
    try {
      const result = await db.query(
        `SELECT p.*, u.nombre_completo, u.numero_cedula, u.numero_telefono
         FROM prestamos p
         INNER JOIN usuarios u ON p.usuario_id = u.id
         LEFT JOIN programas prog ON u.programa_id = prog.id 
         WHERE p.estado = 'activo'
         ORDER BY p.fecha_prestamo DESC, p.hora_inicio DESC`
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // AGREGAR ESTOS MÉTODOS AL MODELO EXISTENTE

  // Obtener préstamos activos con tiempo restante calculado
  // En el método findActiveWithTime, cambia:
  static async findActiveWithTime() {
    try {
      const result = await db.query(
        `SELECT 
        p.*, 
        u.nombre_completo, 
        u.numero_cedula,
        u.numero_telefono,
        u.programa_id,
        prog.nombre as programa,
        p.hora_fin_estimada - CURRENT_TIME::time as tiempo_restante,
        FLOOR(EXTRACT(EPOCH FROM (p.hora_fin_estimada - CURRENT_TIME::time))) as segundos_restantes
       FROM prestamos p
       INNER JOIN usuarios u ON p.usuario_id = u.id
       LEFT JOIN programas prog ON u.programa_id = prog.id
       WHERE p.estado = 'activo'
         AND p.fecha_prestamo >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY p.hora_fin_estimada ASC`
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // ✅ MÉTODO NUEVO - Para ser usado por el controlador existente
static async rejectLoan(prestamoId, motivoRechazo = null) {
  try {
    console.log(`🗑️ Rechazando préstamo ${prestamoId}...`);
    
    const result = await db.query(
      `UPDATE prestamos 
       SET estado = 'rechazado',
           motivo_rechazo = $1,
           fecha_actualizacion = CURRENT_TIMESTAMP
       WHERE id = $2 AND estado = 'solicitado'
       RETURNING *`,
      [motivoRechazo || "Solicitud rechazada por el administrador", prestamoId]
    );

    if (result.rows.length === 0) {
      throw new Error("Préstamo solicitado no encontrado");
    }

    console.log(`✅ Solicitud ${prestamoId} rechazada exitosamente`);
    return result.rows[0];
  } catch (error) {
    console.error(`❌ Error rechazando solicitud ${prestamoId}:`, error);
    throw error;
  }
}

  // Obtener préstamos pendientes (excedidos)
  static async findPending() {
    try {
      const result = await db.query(
        `SELECT 
        p.*, 
        u.nombre_completo, 
        u.numero_cedula,
        u.numero_telefono,
        u.programa_id,
        prog.nombre as programa,
        CURRENT_TIME::time - p.hora_fin_estimada as tiempo_excedido
       FROM prestamos p
       INNER JOIN usuarios u ON p.usuario_id = u.id
       LEFT JOIN programas prog ON u.programa_id = prog.id
       WHERE p.estado = 'pendiente'
         AND p.fecha_prestamo >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY p.hora_fin_estimada ASC`
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Obtener préstamos finalizados hoy
  static async findTodayCompleted() {
    try {
      const result = await db.query(
        `SELECT 
        p.*, 
        u.nombre_completo, 
        u.numero_cedula,
        u.numero_telefono,
        u.programa_id
       FROM prestamos p
       INNER JOIN usuarios u ON p.usuario_id = u.id
       WHERE p.estado = 'devuelto'
         AND p.fecha_prestamo >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY p.hora_fin_real DESC`
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async findByUserIdWithFilters(userId, filters = {}) {
    try {
      const { page = 1, limit = 20, estado = "", implemento = "" } = filters;

      let whereConditions = [`p.usuario_id = $1`];
      let queryParams = [userId];
      let paramCount = 1;

      // Filtro por estado
      if (estado) {
        paramCount++;
        whereConditions.push(`p.estado = $${paramCount}`);
        queryParams.push(estado);
      }

      // Filtro por implemento
      if (implemento) {
        paramCount++;
        whereConditions.push(`p.implemento ILIKE $${paramCount}`);
        queryParams.push(`%${implemento}%`);
      }

      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      // Calcular paginación
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Query principal
      const query = `
      SELECT 
        p.*,
        u.nombre_completo,
        u.numero_cedula,
        u.programa_id
      FROM prestamos p
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      ${whereClause}
      ORDER BY p.fecha_prestamo DESC, p.hora_inicio DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

      // Query para el total
      const countQuery = `
      SELECT COUNT(*) as total
      FROM prestamos p
      ${whereClause}
    `;

      queryParams.push(parseInt(limit), offset);

      const [result, countResult] = await Promise.all([
        db.query(query, queryParams),
        db.query(countQuery, queryParams.slice(0, -2)),
      ]);

      const total = parseInt(countResult.rows[0].total);
      const totalPaginas = Math.ceil(total / parseInt(limit));

      return {
        prestamos: result.rows,
        paginacion: {
          pagina_actual: parseInt(page),
          por_pagina: parseInt(limit),
          total: total,
          total_paginas: totalPaginas,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Finalizar préstamo
  static async finish(id, mostrarResumen = true) {
    try {
      const result = await db.query(
        `UPDATE prestamos 
         SET estado = 'devuelto',
             hora_fin_real = CURRENT_TIME::time,
             fecha_actualizacion = CURRENT_TIMESTAMP
         WHERE id = $1 
         RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error("Préstamo no encontrado");
      }

      // ✅ RETORNAR EN EL FORMATO CORRECTO
      return {
        prestamo: result.rows[0],
        mostrar_resumen: mostrarResumen,
      };
    } catch (error) {
      console.error("Error en Loan.finish():", error);
      throw error;
    }
  }

  // Extender préstamo
  static async extend(id, motivo) {
    try {
      const result = await db.query(
        `UPDATE prestamos 
       SET extendido = true,
           motivo_extension = $1,
           fecha_actualizacion = CURRENT_TIMESTAMP
       WHERE id = $2 
       RETURNING *`,
        [motivo, id]
      );

      if (result.rows.length === 0) {
        throw new Error("Préstamo no encontrado");
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Marcar como perdido
  static async markAsLost(id) {
    try {
      const result = await db.query(
        `UPDATE prestamos 
       SET estado = 'perdido',
           fecha_actualizacion = CURRENT_TIMESTAMP
       WHERE id = $1 
       RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error("Préstamo no encontrado");
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  static async calcularHorasEstimadasParaActivos() {
    try {
      const result = await db.query(
        `UPDATE prestamos 
       SET hora_fin_estimada = hora_inicio + INTERVAL '3 hours'
       WHERE hora_fin_estimada IS NULL 
       AND estado = 'activo'
       AND fecha_prestamo >= CURRENT_DATE - INTERVAL '7 days'
       RETURNING id, hora_inicio, hora_fin_estimada`
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Agregar este método a loans.model.js
  static async findExpiringLoans(minutosAviso = 30) {
    try {
      const result = await db.query(
        `SELECT 
        p.*, 
        u.nombre_completo, 
        u.numero_cedula,
        u.numero_telefono,
        u.programa_id,
        p.hora_fin_estimada - CURRENT_TIME::time as tiempo_restante,
        FLOOR(EXTRACT(EPOCH FROM (p.hora_fin_estimada - CURRENT_TIME::time))) as segundos_restantes
       FROM prestamos p
       INNER JOIN usuarios u ON p.usuario_id = u.id
       WHERE p.estado = 'activo'
         AND p.fecha_prestamo = CURRENT_DATE
         AND EXTRACT(EPOCH FROM (p.hora_fin_estimada - CURRENT_TIME::time)) <= ($1 * 60)
         AND EXTRACT(EPOCH FROM (p.hora_fin_estimada - CURRENT_TIME::time)) > 0
       ORDER BY p.hora_fin_estimada ASC`,
        [minutosAviso]
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // src/models/loans.model.js - AGREGAR ESTE MÉTODO
  static async findWithFilters(filters = {}) {
    try {
      const {
        page = 1,
        limit = 15,
        search = "",
        fecha_inicio,
        fecha_fin,
        usuario_id,
        implemento,
        estado,
        ordenar_por = "fecha_prestamo",
        orden = "DESC",
      } = filters;

      const offset = (page - 1) * limit;

      let whereConditions = [];
      let queryParams = [];
      let paramCount = 0;

      // Filtro de búsqueda general
      if (search) {
        paramCount++;
        whereConditions.push(`
        (u.nombre_completo ILIKE $${paramCount} OR 
         u.numero_cedula ILIKE $${paramCount} OR 
         p.implemento ILIKE $${paramCount} OR
         u.programa_id ILIKE $${paramCount})
      `);
        queryParams.push(`%${search}%`);
      }

      // Filtro por fechas
      if (fecha_inicio) {
        paramCount++;
        whereConditions.push(`p.fecha_prestamo >= $${paramCount}`);
        queryParams.push(fecha_inicio);
      }

      if (fecha_fin) {
        paramCount++;
        whereConditions.push(`p.fecha_prestamo <= $${paramCount}`);
        queryParams.push(fecha_fin);
      }

      // Filtro por usuario
      if (usuario_id) {
        paramCount++;
        whereConditions.push(`p.usuario_id = $${paramCount}`);
        queryParams.push(usuario_id);
      }

      // Filtro por implemento
      if (implemento) {
        paramCount++;
        whereConditions.push(`p.implemento ILIKE $${paramCount}`);
        queryParams.push(`%${implemento}%`);
      }

      // Filtro por estado
      if (estado) {
        paramCount++;
        whereConditions.push(`p.estado = $${paramCount}`);
        queryParams.push(estado);
      }

      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      // Query para los datos
      const dataQuery = `
      SELECT 
        p.*,
        u.nombre_completo,
        u.numero_cedula,
        u.numero_telefono,
        u.programa_id,
        EXTRACT(EPOCH FROM (p.hora_fin_real - p.hora_inicio))/3600 as horas_reales,
        CASE 
          WHEN p.estado = 'activo' THEN p.hora_fin_estimada - CURRENT_TIME::time
          ELSE p.hora_fin_real - p.hora_inicio
        END as duracion_estimada
      FROM prestamos p
      INNER JOIN usuarios u ON p.usuario_id = u.id
      ${whereClause}
      ORDER BY p.${ordenar_por} ${orden}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

      // Query para el total
      const countQuery = `
      SELECT COUNT(*) as total
      FROM prestamos p
      INNER JOIN usuarios u ON p.usuario_id = u.id
      ${whereClause}
    `;

      queryParams.push(limit, offset);

      const [dataResult, countResult] = await Promise.all([
        db.query(dataQuery, queryParams),
        db.query(countQuery, queryParams.slice(0, -2)), // Excluir limit y offset
      ]);

      return {
        prestamos: dataResult.rows,
        paginacion: {
          pagina_actual: parseInt(page),
          por_pagina: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          total_paginas: Math.ceil(countResult.rows[0].total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Loan;
