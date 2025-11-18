// src/models/users.model.js
const db = require("../db");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

class User {
  // 🔐 MÉTODOS EXISTENTES (modificados)
  static async searchUsers(query) {
  try {
    const result = await db.query(
      `SELECT 
        u.id, 
        u.nombre_completo, 
        u.numero_cedula, 
        u.numero_telefono,
        u.programa_id, 
        p.nombre as programa_nombre,  -- ✅ Agregar nombre del programa
        u.email, 
        u.verificado
       FROM usuarios u
       LEFT JOIN programas p ON u.programa_id = p.id  -- ✅ JOIN con programas
       WHERE u.numero_cedula = $1 OR u.nombre_completo ILIKE $2 
       LIMIT 5`,
      [query, `%${query}%`]
    );
    return result.rows;
  } catch (error) {
    throw error;
  }
}

  static async findByCedula(cedula) {
  try {
    const result = await db.query(
      `SELECT 
        u.id, 
        u.nombre_completo, 
        u.numero_cedula, 
        u.numero_telefono, 
        u.programa_id, 
        p.nombre as programa_nombre,  -- ✅ Agregar nombre del programa
        u.email, 
        u.verificado
       FROM usuarios u
       LEFT JOIN programas p ON u.programa_id = p.id  -- ✅ JOIN con programas
       WHERE u.numero_cedula = $1`,
      [cedula]
    );
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
}

// 📊 OBTENER ESTADÍSTICAS DETALLADAS DEL USUARIO - MÉTODO FALTANTE
// En models/users.model.js - MÉTODO CON DEBUG EXTENDIDO
static async getUserDetailedStats(userId) {
  try {
    console.log('🔍 MODELO: getUserDetailedStats llamado para userId:', userId);
    
    // Primero, verifiquemos qué préstamos tiene este usuario
    const todosPrestamos = await db.query(
      `SELECT id, estado, implemento FROM prestamos WHERE usuario_id = $1`,
      [userId]
    );
    
    console.log('📋 TODOS los préstamos del usuario:', todosPrestamos.rows);
    console.log('🎯 Estados encontrados:', [...new Set(todosPrestamos.rows.map(p => p.estado))]);
    
    const rechazados = todosPrestamos.rows.filter(p => p.estado === 'rechazado');
    console.log('❌ Préstamos rechazados encontrados:', rechazados);

    // Ahora ejecutemos la consulta principal
    const result = await db.query(
      `
      SELECT 
        u.*,
        p.nombre as programa_nombre,
        COUNT(pm.id) as total_prestamos,
        COUNT(CASE WHEN pm.estado = 'activo' THEN 1 END) as prestamos_activos,
        COUNT(CASE WHEN pm.estado = 'devuelto' THEN 1 END) as prestamos_devueltos,
        COUNT(CASE WHEN pm.estado = 'pendiente' THEN 1 END) as prestamos_pendientes,
        COUNT(CASE WHEN pm.estado = 'perdido' THEN 1 END) as prestamos_perdidos,
        
        -- ✅ AGREGAR ESTOS NUEVOS ESTADOS
        COUNT(CASE WHEN pm.estado = 'solicitado' THEN 1 END) as prestamos_solicitados,
        COUNT(CASE WHEN pm.estado = 'rechazado' THEN 1 END) as prestamos_rechazados,
        
        COALESCE(SUM(CASE WHEN pm.estado = 'devuelto' THEN pm.horas_totales ELSE 0 END), 0) as horas_totales_reales,
        COALESCE(SUM(pm.horas_totales), 0) as horas_totales_acumuladas,
        
        -- Métricas adicionales
        COUNT(DISTINCT pm.implemento) as implementos_diferentes,
        EXTRACT(DAYS FROM NOW() - MIN(pm.fecha_registro)) as dias_activo
        
      FROM usuarios u
      LEFT JOIN programas p ON u.programa_id = p.id
      LEFT JOIN prestamos pm ON u.id = pm.usuario_id
      WHERE u.id = $1
      GROUP BY u.id, p.nombre, p.id
      `,
      [userId]
    );

    console.log('📊 RESULTADO de la consulta principal:');
    if (result.rows[0]) {
      console.log({
        total: result.rows[0].total_prestamos,
        activos: result.rows[0].prestamos_activos,
        devueltos: result.rows[0].prestamos_devueltos,
        solicitados: result.rows[0].prestamos_solicitados,
        rechazados: result.rows[0].prestamos_rechazados,
        pendientes: result.rows[0].prestamos_pendientes,
        perdidos: result.rows[0].prestamos_perdidos
      });
    } else {
      console.log('❌ No se encontraron resultados para el usuario');
    }

    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error en getUserDetailedStats:', error);
    throw error;
  }
}

  // 🔐 MÉTODOS NUEVOS PARA AUTENTICACIÓN
  static async findByEmail(email) {
    try {
      const result = await db.query(`SELECT * FROM usuarios WHERE email = $1`, [
        email.toLowerCase(),
      ]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
  try {
    const result = await db.query(
      `SELECT 
        u.id, 
        u.nombre_completo, 
        u.numero_cedula, 
        u.numero_telefono, 
        u.programa_id, 
        p.nombre as programa_nombre,  -- ✅ Obtener el nombre del programa
        u.email, 
        u.verificado, 
        u.horas_totales_acumuladas,
        u.activo,
        u.motivo_bloqueo,
        u.fecha_bloqueo,
        u.fecha_registro,
        u.ultimo_login,
        u.creado_por_admin
       FROM usuarios u
       LEFT JOIN programas p ON u.programa_id = p.id  -- ✅ JOIN con programas
       WHERE u.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
}

  // 🔐 CREAR USUARIO CON AUTENTICACIÓN
  static async create(userData) {
    const {
      nombre_completo,
      numero_cedula,
      numero_telefono,
      programa_id,
      email,
      password,
      creado_por_admin = false,
    } = userData;

    try {
      let password_hash = null;
      let token_verificacion = null;
      let verificado = false;

      // Si viene contraseña, hashearla
      if (password) {
        password_hash = await bcrypt.hash(password, 12);
        token_verificacion = crypto.randomBytes(32).toString("hex");
      }

      // Si es creado por admin, marcar como verificado
      if (creado_por_admin) {
        verificado = false;
        token_verificacion = null;
      }

      const result = await db.query(
        `INSERT INTO usuarios 
        (nombre_completo, numero_cedula, numero_telefono, programa_id, email, password_hash, verificado, token_verificacion, creado_por_admin) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
        RETURNING id, nombre_completo, numero_cedula, numero_telefono, programa_id, email, verificado, creado_por_admin`,
        [
          nombre_completo,
          numero_cedula,
          numero_telefono,
          programa_id,
          email ? email.toLowerCase() : null,
          password_hash,
          verificado,
          token_verificacion,
          creado_por_admin,
        ]
      );
      return result.rows[0];
    } catch (error) {
      if (error.code === "23505") {
        if (error.constraint === "usuarios_numero_cedula_key") {
          throw new Error("Ya existe un usuario con esta cédula");
        } else {
          throw new Error("Ya existe un usuario con este email");
        }
      }
      throw error;
    }
  }

  // 🔐 VERIFICAR CONTRASEÑA
  static async verifyPassword(plainPassword, hashedPassword) {
    if (!hashedPassword) return false;
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // 🔐 ACTUALIZAR CONTRASEÑA
  static async updatePassword(userId, newPassword) {
    const password_hash = await bcrypt.hash(newPassword, 12);
    await db.query(
      `UPDATE usuarios SET password_hash = $1, token_verificacion = NULL, token_recuperacion = NULL WHERE id = $2`,
      [password_hash, userId]
    );
  }

  // 🔐 GENERAR TOKEN DE VERIFICACIÓN
  static async generateVerificationToken(userId) {
    const token_verificacion = crypto.randomBytes(32).toString("hex");
    await db.query(
      `UPDATE usuarios SET token_verificacion = $1 WHERE id = $2`,
      [token_verificacion, userId]
    );
    return token_verificacion;
  }

  // 🔐 VERIFICAR EMAIL CON TOKEN
  // En src/models/users.model.js - MODIFICAR esta función:
  static async verifyEmail(token) {
    const result = await db.query(
      `UPDATE usuarios 
     SET verificado = true, 
         fecha_verificacion = CURRENT_TIMESTAMP 
     WHERE token_verificacion = $1 
     RETURNING id, nombre_completo, email, verificado`,
      [token]
    );
    return result.rows[0] || null;
  }

  // 🔐 GENERAR TOKEN DE RECUPERACIÓN
  static async generateResetToken(email) {
    const token_recuperacion = crypto.randomBytes(32).toString("hex");
    const result = await db.query(
      `UPDATE usuarios SET token_recuperacion = $1 WHERE email = $2 
       RETURNING id, nombre_completo, email`,
      [token_recuperacion, email.toLowerCase()]
    );
    return result.rows[0]
      ? { user: result.rows[0], token: token_recuperacion }
      : null;
  }

  // 🔐 VALIDAR TOKEN DE RECUPERACIÓN
  static async validateResetToken(token) {
    const result = await db.query(
      `SELECT id, email FROM usuarios WHERE token_recuperacion = $1`,
      [token]
    );
    return result.rows[0] || null;
  }

  // 🔐 ACTUALIZAR ÚLTIMO LOGIN
  static async updateLastLogin(userId) {
    await db.query(
      `UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1`,
      [userId]
    );
  }

  // src/models/users.model.js - AGREGAR ESTOS MÉTODOS NUEVOS

  // 🔍 OBTENER TODOS LOS USUARIOS CON FILTROS Y PAGINACIÓN
  static async findAllWithFilters(filters = {}) {
    try {
      const {
        page = 1,
        limit = 15,
        search = "",
        programa_id = "",
        estado = "",
        ordenar_por = "nombre_completo",
        orden = "ASC",
      } = filters;

      // Construir condiciones WHERE dinámicamente
      let whereConditions = [];
      let queryParams = [];
      let paramCount = 0;

      // Búsqueda general
      if (search) {
        paramCount++;
        whereConditions.push(
          `(u.nombre_completo ILIKE $${paramCount} OR 
         u.numero_cedula ILIKE $${paramCount} OR 
         u.email ILIKE $${paramCount})`
        );
        queryParams.push(`%${search}%`);
      }

      // ✅ CORREGIDO: Filtro por programa_id
      if (programa_id) {
        paramCount++;
        whereConditions.push(`u.programa_id = $${paramCount}`);
        queryParams.push(programa_id);
      }

      // Filtro por estado
      if (estado === "activo") {
        whereConditions.push(`u.activo = true`);
      } else if (estado === "inactivo") {
        whereConditions.push(`u.activo = false`);
      }

      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      // Calcular paginación
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // ✅ QUERY PRINCIPAL CORREGIDA
      const query = `
      SELECT 
        u.id,
        u.nombre_completo,
        u.numero_cedula,
        u.numero_telefono,
        u.programa_id,
        prog.nombre as programa_nombre,
        u.email,
        u.horas_totales_acumuladas,
        u.activo,
        u.motivo_bloqueo,
        u.fecha_bloqueo,
        u.verificado,
        u.fecha_registro,
        u.ultimo_login,
        u.creado_por_admin
      FROM usuarios u
      LEFT JOIN programas prog ON u.programa_id = prog.id
      ${whereClause}
      ORDER BY ${ordenar_por} ${orden}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

      // ✅ COUNT QUERY CORREGIDA - MISMAS CONDICIONES
      const countQuery = `
      SELECT COUNT(*) as total
      FROM usuarios u
      LEFT JOIN programas prog ON u.programa_id = prog.id
      ${whereClause}
    `;

      queryParams.push(parseInt(limit), offset);

      console.log("🔍 Query ejecutada:", query);
      console.log("🔍 Parámetros:", queryParams);

      const [result, countResult] = await Promise.all([
        db.query(query, queryParams),
        db.query(countQuery, queryParams.slice(0, -2)), // Excluir LIMIT/OFFSET
      ]);

      const total = parseInt(countResult.rows[0].total);
      const totalPaginas = Math.ceil(total / parseInt(limit));

      return {
        usuarios: result.rows,
        paginacion: {
          pagina_actual: parseInt(page),
          por_pagina: parseInt(limit),
          total: total,
          total_paginas: totalPaginas,
        },
      };
    } catch (error) {
      console.error("❌ Error en findAllWithFilters:", error);
      throw error;
    }
  }

  // 📊 OBTENER ESTADÍSTICAS COMPLETAS DEL USUARIO
  static async getUserStats(userId) {
  try {
    const result = await db.query(
      `
      SELECT 
        u.*,
        p.nombre as programa_nombre,  -- ✅ Agregar nombre del programa
        COUNT(pm.id) as total_prestamos,
        COUNT(CASE WHEN pm.estado = 'activo' THEN 1 END) as prestamos_activos,
        COUNT(CASE WHEN pm.estado = 'devuelto' THEN 1 END) as prestamos_devueltos,
        COUNT(CASE WHEN pm.estado = 'pendiente' THEN 1 END) as prestamos_pendientes,
        COUNT(CASE WHEN pm.estado = 'perdido' THEN 1 END) as prestamos_perdidos,
        COALESCE(SUM(CASE WHEN pm.estado = 'devuelto' THEN pm.horas_totales ELSE 0 END), 0) as horas_totales_reales
      FROM usuarios u
      LEFT JOIN programas p ON u.programa_id = p.id  -- ✅ JOIN con programas
      LEFT JOIN prestamos pm ON u.id = pm.usuario_id
      WHERE u.id = $1
      GROUP BY u.id, p.nombre, p.id  -- ✅ Agregar p.nombre y p.id al GROUP BY
      `,
      [userId]
    );

    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
}

  // ✏️ ACTUALIZAR INFORMACIÓN DEL USUARIO
  static async updateUser(userId, updateData) {
    try {
      const allowedFields = [
        "nombre_completo",
        "numero_telefono",
        "programa_id",
        "email",
        "activo",
        "motivo_bloqueo",
      ];

      const updateFields = [];
      const queryParams = [];
      let paramCount = 1;

      // Construir SET dinámicamente
      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          updateFields.push(`${field} = $${paramCount}`);
          queryParams.push(updateData[field]);
          paramCount++;
        }
      });

      // Si se está bloqueando, agregar fecha_bloqueo
      if (updateData.activo === false && updateData.motivo_bloqueo) {
        updateFields.push(`fecha_bloqueo = CURRENT_TIMESTAMP`);
      }

      // Si se está desbloqueando, limpiar motivo_bloqueo y fecha_bloqueo
      if (updateData.activo === true) {
        updateFields.push(`motivo_bloqueo = NULL`);
        updateFields.push(`fecha_bloqueo = NULL`);
      }

      // Siempre actualizar fecha_actualizacion
      updateFields.push(`fecha_actualizacion = CURRENT_TIMESTAMP`);

      if (updateFields.length === 0) {
        throw new Error("No hay campos válidos para actualizar");
      }

      queryParams.push(userId);

      const query = `
      UPDATE usuarios 
      SET ${updateFields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING *
    `;

      const result = await db.query(query, queryParams);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // ⏱️ ACTUALIZAR HORAS MANUALMENTE
  static async updateHours(userId, horas) {
    try {
      const result = await db.query(
        `
      UPDATE usuarios 
      SET horas_totales_acumuladas = $1,
          fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, nombre_completo, horas_totales_acumuladas
    `,
        [parseFloat(horas), userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // 🔒 BLOQUEAR USUARIO
  static async blockUser(userId, motivo) {
    try {
      const result = await db.query(
        `
      UPDATE usuarios 
      SET activo = false,
          motivo_bloqueo = $1,
          fecha_bloqueo = CURRENT_TIMESTAMP,
          fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `,
        [motivo, userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // 🔓 DESBLOQUEAR USUARIO
  static async unblockUser(userId) {
    try {
      const result = await db.query(
        `
      UPDATE usuarios 
      SET activo = true,
          motivo_bloqueo = NULL,
          fecha_bloqueo = NULL,
          fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `,
        [userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }
  // 📋 OBTENER HISTORIAL DE PRÉSTAMOS DEL USUARIO CON PAGINACIÓN
  // 📋 OBTENER HISTORIAL DE PRÉSTAMOS DEL USUARIO CON PAGINACIÓN - CORREGIDO
  
  static async getUserLoansHistory(userId, filters = {}) {
    try {
      const { page = 1, limit = 10, estado = "", implemento = "" } = filters;

      // Construir condiciones WHERE dinámicamente
      let whereConditions = ["p.usuario_id = $1"];
      let queryParams = [userId];
      let paramCount = 1;

      // Filtro por estado
      if (estado) {
        paramCount++;
        whereConditions.push(`p.estado = $${paramCount}`);
        queryParams.push(estado);
      }

      // Filtro por implemento (búsqueda por nombre del implemento)
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

      // ✅ QUERY CORREGIDA - usar p.implemento directamente (es texto, no ID)
      const query = `
      SELECT 
        p.id,
        p.fecha_prestamo,
        p.hora_inicio,
        p.hora_fin_estimada,
        p.hora_fin_real,
        p.horas_totales,
        p.estado,
        p.extendido,
        p.motivo_rechazo,
        p.fecha_registro,
        p.implemento,  -- ✅ Usar directamente p.implemento (es texto)
        p.implemento as implemento_nombre,  -- ✅ Alias para consistencia
        'N/A' as implemento_codigo,  -- ✅ No existe en la tabla
        'General' as categoria  -- ✅ No existe categoría en la estructura
      FROM prestamos p
      ${whereClause}
      ORDER BY p.fecha_prestamo DESC, p.hora_inicio DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

      // ✅ COUNT QUERY CORREGIDA
      const countQuery = `
      SELECT COUNT(*) as total
      FROM prestamos p
      ${whereClause}
    `;

      queryParams.push(parseInt(limit), offset);

      console.log("🔍 Query historial préstamos:", query);
      console.log("🔍 Parámetros:", queryParams);

      const [result, countResult] = await Promise.all([
        db.query(query, queryParams),
        db.query(countQuery, queryParams.slice(0, -2)), // Excluir LIMIT/OFFSET
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
      console.error("❌ Error en getUserLoansHistory:", error);
      throw error;
    }
  }
}

module.exports = User;
