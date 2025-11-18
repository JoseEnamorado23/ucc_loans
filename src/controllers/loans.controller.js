// src/controllers/loans.controller.js - VERSIÓN COMPLETA
const db = require("../db");
const Loan = require("../models/loans.model");
const User = require("../models/users.model");
const Implemento = require("../models/implementos.model");
const { getIO } = require("../websocket/socketManager");

const loansController = {
  // ✅ MÉTODO FALTANTE - AGREGAR
  async getActiveLoans(req, res) {
    try {
      const activeLoans = await Loan.findActive();
      res.json({
        success: true,
        data: activeLoans,
        count: activeLoans.length,
      });
    } catch (error) {
      console.error("Error obteniendo préstamos activos:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  },

  async finishLoan(req, res) {
    try {
      console.log("🎯🎯🎯 FINISH LOAN BACKEND INICIADO 🎯🎯🎯");

      const { id } = req.params;
      const { mostrar_resumen = true } = req.body;

      console.log("📝 Parámetros recibidos:", { id, mostrar_resumen });

      // 1. OBTENER PRÉSTAMO
      console.log("🔍 Buscando préstamo con ID:", id);
      const prestamoActual = await db.query(
        "SELECT * FROM prestamos WHERE id = $1",
        [id]
      );

      console.log("📋 Préstamo encontrado:", prestamoActual.rows[0]);

      if (prestamoActual.rows.length === 0) {
        console.log("❌ Préstamo no encontrado");
        return res.status(404).json({
          success: false,
          message: "Préstamo no encontrado",
        });
      }

      const prestamo = prestamoActual.rows[0];
      console.log("✅ Préstamo a finalizar:", {
        id: prestamo.id,
        implemento: prestamo.implemento,
        estado: prestamo.estado,
      });

      // 2. ACTUALIZAR INVENTARIO - BUSCAR POR NOMBRE
      console.log("🔄 Iniciando actualización de inventario...");
      if (prestamo.implemento) {
        console.log("🔍 Buscando implemento por nombre:", prestamo.implemento);

        const implementoObj = await Implemento.findByNombre(
          prestamo.implemento
        );
        console.log("📦 Resultado búsqueda implemento:", implementoObj);

        if (implementoObj) {
          console.log("✅ Implemento encontrado:", {
            id: implementoObj.id,
            nombre: implementoObj.nombre,
            cantidad_actual: implementoObj.cantidad_disponible,
          });

          const nuevaCantidad = implementoObj.cantidad_disponible + 1;
          console.log(
            "➕ Nueva cantidad calculada:",
            implementoObj.cantidad_disponible,
            "+ 1 =",
            nuevaCantidad
          );

          console.log("🔄 Ejecutando updateCantidad...");
          await Implemento.updateCantidad(implementoObj.id, nuevaCantidad);
          console.log("✅✅✅ INVENTARIO ACTUALIZADO EXITOSAMENTE");
        } else {
          console.log(
            "❌ NO se encontró implemento con nombre:",
            prestamo.implemento
          );
        }
      } else {
        console.log("⚠️ Préstamo no tiene campo implemento");
      }

      // 3. FINALIZAR PRÉSTAMO
      console.log("🎯 Finalizando préstamo en BD...");
      const result = await Loan.finish(id, mostrar_resumen);
      console.log("✅ Préstamo finalizado en BD:", result);

      // WEBSOCKET
      const io = getIO();
      io.emit("prestamo_finalizado", {
        tipo: "prestamo_devuelto",
        prestamo: result.prestamo || result,
        timestamp: new Date().toISOString(),
      });

      console.log("📡 WebSocket emitido");

      res.json({
        success: true,
        message: "Préstamo finalizado exitosamente",
        data: result,
      });

      console.log("🏁 FINISH LOAN COMPLETADO");
    } catch (error) {
      console.error("❌❌❌ ERROR EN finishLoan:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error interno del servidor",
      });
    }
  },

  // Crear nuevo préstamo
  async createLoan(req, res) {
    try {
      const {
        nombre_completo,
        numero_cedula,
        numero_telefono,
        programa_id,
        implemento,
        implemento_id,
        fecha_prestamo,
        hora_inicio,
      } = req.body;

      // Validaciones básicas
      if (!nombre_completo || !numero_cedula || !implemento_id) {
        return res.status(400).json({
          success: false,
          message: "Nombre completo, cédula e implemento son requeridos",
        });
      }

      // 1. Verificar o crear usuario
      let usuario_id;
      let existingUser = await User.findByCedula(numero_cedula);

      if (existingUser) {
        usuario_id = existingUser.id;
      } else {
        if (!numero_telefono || !programa_id) {
          return res.status(400).json({
            success: false,
            message: "Para nuevo usuario: teléfono y programa son requeridos",
          });
        }
        const newUser = await User.create({
          nombre_completo,
          numero_cedula,
          numero_telefono,
          programa_id,
        });
        usuario_id = newUser.id;
        existingUser = newUser;
      }

      // 2. Verificar implemento
      const implementoObj = await Implemento.findById(implemento_id);
      if (!implementoObj || implementoObj.cantidad_disponible <= 0) {
        return res.status(400).json({
          success: false,
          message: "Implemento no disponible",
        });
      }

      // 3. Actualizar inventario
      await Implemento.updateCantidad(
        implemento_id,
        implementoObj.cantidad_disponible - 1
      );

      // 4. Crear préstamo
      const newLoan = await Loan.create({
        usuario_id,
        implemento: implemento || implementoObj.nombre,
        implemento_id,
        fecha_prestamo:
          fecha_prestamo || new Date().toISOString().split("T")[0],
        hora_inicio: hora_inicio || new Date().toTimeString().split(" ")[0],
      });

      // ✅ WEBSOCKET
      const io = getIO();
      io.emit("nuevo_prestamo", {
        tipo: "nuevo_prestamo",
        prestamo: newLoan,
        usuario: existingUser,
        implemento: implementoObj.nombre,
        timestamp: new Date().toISOString(),
      });

      res.status(201).json({
        success: true,
        message: "Préstamo creado exitosamente",
        data: { prestamo: newLoan, usuario_existente: !!existingUser },
      });
    } catch (error) {
      console.error("Error creando préstamo:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  },

  // ✅ AGREGAR LOS DEMÁS MÉTODOS BÁSICOS (simplificados)
  async getLoansByUser(req, res) {
    try {
      const { usuarioId } = req.params;
      const userLoans = await Loan.findByUserId(usuarioId);
      res.json({ success: true, data: userLoans });
    } catch (error) {
      console.error("Error obteniendo préstamos del usuario:", error);
      res
        .status(500)
        .json({ success: false, message: "Error interno del servidor" });
    }
  },

  async getActiveLoansWithTime(req, res) {
    try {
      const activeLoans = await Loan.findActiveWithTime();
      res.json({ success: true, data: activeLoans });
    } catch (error) {
      console.error("Error obteniendo préstamos activos:", error);
      res
        .status(500)
        .json({ success: false, message: "Error interno del servidor" });
    }
  },

  // src/controllers/loans.controller.js - AGREGAR ESTE MÉTODO

  // ✅ MÉTODO COMPLETO CON WEBSOCKETS Y PAGINACIÓN
  async getLoansWithFilters(req, res) {
    try {
      const {
        page = 1,
        limit = 15,
        search = "",
        fecha_inicio = "",
        fecha_fin = "",
        usuario_id = "",
        implemento = "",
        estado = "",
        ordenar_por = "fecha_prestamo",
        orden = "DESC",
      } = req.query;

      console.log("🔍 Filtros recibidos:", req.query);

      // Construir condiciones WHERE dinámicamente
      let whereConditions = [];
      let queryParams = [];
      let paramCount = 0;

      // Búsqueda general (nombre, cédula, implemento)
      if (search) {
        paramCount++;
        whereConditions.push(
          `(u.nombre_completo ILIKE $${paramCount} OR 
         u.numero_cedula ILIKE $${paramCount} OR 
         p.implemento ILIKE $${paramCount})`
        );
        queryParams.push(`%${search}%`);
      }

      // Filtro por fecha inicio
      if (fecha_inicio) {
        paramCount++;
        whereConditions.push(`p.fecha_prestamo >= $${paramCount}`);
        queryParams.push(fecha_inicio);
      }

      // Filtro por fecha fin
      if (fecha_fin) {
        paramCount++;
        whereConditions.push(`p.fecha_prestamo <= $${paramCount}`);
        queryParams.push(fecha_fin);
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

      // Filtro por usuario_id
      if (usuario_id) {
        paramCount++;
        whereConditions.push(`p.usuario_id = $${paramCount}`);
        queryParams.push(usuario_id);
      }

      // Construir WHERE final
      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      // Validar ordenamiento
      const validOrderColumns = [
        "fecha_prestamo",
        "hora_inicio",
        "implemento",
        "estado",
        "nombre_completo",
      ];
      const orderBy = validOrderColumns.includes(ordenar_por)
        ? ordenar_por
        : "fecha_prestamo";
      const orderDir = orden.toUpperCase() === "ASC" ? "ASC" : "DESC";

      // Calcular paginación
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Query principal con paginación
      const query = `
      SELECT 
        p.*,
        u.nombre_completo,
        u.numero_cedula,
        u.programa_id,
        prog.nombre as programa,
        u.numero_telefono,
        p.horas_totales as horas_totales
      FROM prestamos p
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      LEFT JOIN programas prog ON u.programa_id = prog.id
      ${whereClause}
      ORDER BY p.${orderBy} ${orderDir}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

      // Query para el total (paginación)
      const countQuery = `
      SELECT COUNT(*) as total
      FROM prestamos p
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      ${whereClause}
    `;

      // Ejecutar queries
      queryParams.push(parseInt(limit), offset);

      const [result, countResult] = await Promise.all([
        db.query(query, queryParams),
        db.query(countQuery, queryParams.slice(0, -2)), // Excluir LIMIT/OFFSET
      ]);

      const total = parseInt(countResult.rows[0].total);
      const totalPaginas = Math.ceil(total / parseInt(limit));

      // ✅ WEBSOCKET: Notificar búsqueda realizada
      const io = getIO();
      io.emit("busqueda_prestamos", {
        tipo: "busqueda_filtrada",
        filtros: req.query,
        total_resultados: total,
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        data: result.rows,
        paginacion: {
          pagina_actual: parseInt(page),
          por_pagina: parseInt(limit),
          total: total,
          total_paginas: totalPaginas,
        },
        filtros: req.query,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error en getLoansWithFilters:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor al filtrar préstamos",
      });
    }
  },

  // AGREGAR ESTE MÉTODO A loans.controller.js - ANTES DE module.exports

// En loans.controller.js - MODIFICAR el método rejectLoanRequest
async rejectLoanRequest(req, res) {
  try {
    console.log("❌ Rechazando solicitud de préstamo...");
    
    const { id } = req.params;
    const { motivo_rechazo } = req.body;

    // ✅ USAR EL MÉTODO DEL MODELO
    const solicitudRechazada = await Loan.rejectLoan(id, motivo_rechazo);

    console.log("✅ Solicitud rechazada:", solicitudRechazada);

    // ✅ WEBSOCKET: Notificar rechazo
    const io = getIO();
    io.emit("solicitud_rechazada", {
      tipo: "solicitud_rechazada",
      solicitud: solicitudRechazada,
      usuario: {
        nombre_completo: solicitudRechazada.nombre_completo, // Asumiendo que el modelo incluye esto
        id: solicitudRechazada.usuario_id
      },
      implemento: solicitudRechazada.implemento,
      motivo: motivo_rechazo || "Solicitud rechazada por el administrador",
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: "Solicitud rechazada exitosamente",
      data: solicitudRechazada
    });

  } catch (error) {
    console.error("❌ Error rechazando solicitud:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error interno del servidor al rechazar solicitud"
    });
  }
},

  async getPendingLoans(req, res) {
    try {
      const pendingLoans = await Loan.findPending();
      res.json({ success: true, data: pendingLoans });
    } catch (error) {
      console.error("Error obteniendo préstamos pendientes:", error);
      res
        .status(500)
        .json({ success: false, message: "Error interno del servidor" });
    }
  },

  async getTodayCompleted(req, res) {
    try {
      const completedLoans = await Loan.findTodayCompleted();
      res.json({ success: true, data: completedLoans });
    } catch (error) {
      console.error("Error obteniendo préstamos finalizados:", error);
      res
        .status(500)
        .json({ success: false, message: "Error interno del servidor" });
    }
  },

  // src/controllers/loans.controller.js - MÉTODO finishLoan CORREGIDO

  // Finalizar préstamo - VERSIÓN CORREGIDA
  // Finalizar préstamo - VERSIÓN CORREGIDA

  async extendLoan(req, res) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;
      const updatedLoan = await Loan.extend(id, motivo);

      const io = getIO();
      io.emit("prestamo_actualizado", {
        tipo: "prestamo_extendido",
        prestamo: updatedLoan,
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        message: "Préstamo extendido",
        data: updatedLoan,
      });
    } catch (error) {
      console.error("Error extendiendo préstamo:", error);
      res
        .status(500)
        .json({ success: false, message: "Error interno del servidor" });
    }
  },

  // CORREGIR estos métodos en loans.controller.js

// CORREGIR el método createLoanRequest en loans.controller.js
// MÉTODO createLoanRequest CORREGIDO - VERSIÓN FUNCIONAL
async createLoanRequest(req, res) {
  try {
    console.log("📝 Creando solicitud de préstamo...");
    console.log("🕒 Datos recibidos del frontend:", req.body);
    
    const { usuario_id, implemento, fecha_solicitud, timestamp_bogota, debug_time } = req.body;

    // ✅ DEBUG: Ver qué hora envía el frontend
    console.log("🎯 HORA RECIBIDA DEL FRONTEND:");
    console.log(" - fecha_solicitud:", fecha_solicitud);
    console.log(" - timestamp_bogota:", timestamp_bogota);
    console.log(" - debug_time:", debug_time?.hora_bogota_legible);
    console.log(" - Hora servidor (Local):", new Date().toString());

    // Validaciones básicas
    if (!usuario_id || !implemento) {
      return res.status(400).json({
        success: false,
        message: "Usuario e implemento son requeridos"
      });
    }

    // 1. Verificar que el usuario existe
    const usuario = await db.query(
      "SELECT * FROM usuarios WHERE id = $1 AND activo = true",
      [usuario_id]
    );

    if (usuario.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado o inactivo"
      });
    }

    // 2. Verificar que el implemento existe y tiene disponibilidad
    const implementoObj = await Implemento.findByNombre(implemento);
    if (!implementoObj) {
      return res.status(404).json({
        success: false,
        message: "Implemento no encontrado"
      });
    }

    if (implementoObj.cantidad_disponible <= 0) {
      return res.status(400).json({
        success: false,
        message: "Implemento no disponible para préstamo"
      });
    }

    // 3. Verificar que el usuario no tenga solicitudes pendientes para el mismo implemento
    const solicitudExistente = await db.query(
      `SELECT * FROM prestamos 
       WHERE usuario_id = $1 
       AND implemento = $2 
       AND estado = 'solicitado'`,
      [usuario_id, implemento]
    );

    if (solicitudExistente.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Ya tienes una solicitud pendiente para este implemento"
      });
    }

    // ✅ CORRECCIÓN DEFINITIVA: Usar fecha actual del servidor pero formateada correctamente
    const ahora = new Date();
    
    // Convertir a hora Bogotá manualmente en el backend
    const offsetBogota = -5 * 60 * 60 * 1000; // UTC-5 en milisegundos
    const utc = ahora.getTime() + (ahora.getTimezoneOffset() * 60000);
    const horaBogota = new Date(utc + offsetBogota);
    
    console.log("🕒 CÁLCULO BACKEND:");
    console.log(" - Hora servidor:", ahora.toString());
    console.log(" - Hora Bogotá calculada:", horaBogota.toString());
    console.log(" - Hora (HH:MM):", horaBogota.getHours() + ':' + horaBogota.getMinutes());

    // Usar fecha en formato YYYY-MM-DD para fecha_prestamo
    const fechaPrestamo = horaBogota.toISOString().split('T')[0];
    const timestampRegistro = horaBogota.toISOString();

    console.log("💾 GUARDANDO EN BD:");
    console.log(" - fecha_prestamo:", fechaPrestamo);
    console.log(" - fecha_registro:", timestampRegistro);

    // 4. Crear préstamo con estado 'solicitado'
    const loanRequest = await db.query(
      `INSERT INTO prestamos (usuario_id, implemento, fecha_prestamo, estado, fecha_registro) 
       VALUES ($1, $2, $3, 'solicitado', $4) 
       RETURNING *`,
      [usuario_id, implemento, fechaPrestamo, timestampRegistro]
    );

    const solicitudCreada = loanRequest.rows[0];
    console.log("✅ Solicitud creada en BD:", {
      id: solicitudCreada.id,
      fecha_prestamo: solicitudCreada.fecha_prestamo,
      fecha_registro: solicitudCreada.fecha_registro,
      estado: solicitudCreada.estado
    });

    // ✅ WEBSOCKET: Notificar nueva solicitud
    const io = getIO();
    io.emit("nueva_solicitud_prestamo", {
      tipo: "solicitud_creada",
      solicitud: solicitudCreada,
      usuario: usuario.rows[0],
      implemento: implemento,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: "Solicitud de préstamo creada exitosamente",
      data: solicitudCreada
    });

  } catch (error) {
    console.error("❌ Error creando solicitud:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor al crear solicitud"
    });
  }
},

// ✅ MÉTODO 2 CORREGIDO: Obtener solicitudes pendientes
async getPendingRequests(req, res) {
  try {
    console.log("📋 Obteniendo solicitudes pendientes...");

    const solicitudes = await db.query(
      `SELECT 
        p.*, 
        u.nombre_completo, 
        u.numero_cedula, 
        u.numero_telefono,
        u.programa_id, 
        prog.nombre as programa,
        imp.nombre as nombre_implemento,
        imp.cantidad_disponible
       FROM prestamos p
       INNER JOIN usuarios u ON p.usuario_id = u.id
       LEFT JOIN programas prog ON u.programa_id = prog.id
       LEFT JOIN implementos imp ON p.implemento = imp.nombre  -- JOIN por nombre en lugar de ID
       WHERE p.estado = 'solicitado'
       ORDER BY p.fecha_registro DESC`
    );

    console.log(`✅ ${solicitudes.rows.length} solicitudes encontradas`);

    res.json({
      success: true,
      data: solicitudes.rows,
      count: solicitudes.rows.length
    });

  } catch (error) {
    console.error("❌ Error obteniendo solicitudes:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor al obtener solicitudes"
    });
  }
},

// CORREGIR el método approveLoanRequest
async approveLoanRequest(req, res) {
  try {
    console.log("✅ Aprobando solicitud de préstamo...");
    
    const { id } = req.params;

    // 1. Obtener la solicitud
    const solicitud = await db.query(
      `SELECT p.*, u.nombre_completo, imp.cantidad_disponible, imp.id as implemento_id
       FROM prestamos p
       INNER JOIN usuarios u ON p.usuario_id = u.id
       LEFT JOIN implementos imp ON p.implemento = imp.nombre
       WHERE p.id = $1 AND p.estado = 'solicitado'`,
      [id]
    );

    if (solicitud.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Solicitud no encontrada o ya procesada"
      });
    }

    const prestamo = solicitud.rows[0];
    console.log("📋 Solicitud a aprobar:", prestamo);

    // 2. Verificar que el implemento sigue disponible
    if (!prestamo.implemento_id || prestamo.cantidad_disponible <= 0) {
      return res.status(400).json({
        success: false,
        message: "El implemento ya no está disponible"
      });
    }

    // 3. Actualizar inventario (descontar)
    await Implemento.updateCantidad(
      prestamo.implemento_id,
      prestamo.cantidad_disponible - 1
    );

    // 4. Calcular horas ACTUALES (cuando se aprueba)
    const tiempoMaximoResult = await db.query(
      "SELECT valor FROM configuracion_sistema WHERE clave = 'tiempo_maximo_prestamo_horas'"
    );
    
    const tiempoMaximo = tiempoMaximoResult.rows[0]?.valor || 2;
    const horaActual = new Date().toTimeString().split(' ')[0];
    const horaFinEstimada = new Date(Date.now() + (tiempoMaximo * 60 * 60 * 1000))
      .toTimeString()
      .split(' ')[0];

    // 5. Cambiar estado a 'activo' y ASIGNAR HORAS
    const prestamoAprobado = await db.query(
      `UPDATE prestamos 
       SET estado = 'activo',
           hora_inicio = $1,           -- ✅ Hora cuando se APRUEBA
           hora_fin_estimada = $2,     -- ✅ Hora fin basada en aprobación
           fecha_actualizacion = CURRENT_TIMESTAMP
       WHERE id = $3 
       RETURNING *`,
      [horaActual, horaFinEstimada, id]
    );

    console.log("✅ Solicitud aprobada:", prestamoAprobado.rows[0]);

    // ✅ WEBSOCKET: Notificar aprobación
    const io = getIO();
    io.emit("solicitud_aprobada", {
      tipo: "solicitud_aprobada",
      prestamo: prestamoAprobado.rows[0],
      usuario: {
        nombre_completo: prestamo.nombre_completo,
        id: prestamo.usuario_id
      },
      implemento: prestamo.implemento,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: "Solicitud aprobada exitosamente",
      data: prestamoAprobado.rows[0]
    });

  } catch (error) {
    console.error("❌ Error aprobando solicitud:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor al aprobar solicitud"
    });
  }
},

// ✅ MÉTODO 5 CORREGIDO: Obtener solicitudes por usuario
async getUserLoanRequests(req, res) {
  try {
    const { usuarioId } = req.params;

    const solicitudes = await db.query(
      `SELECT 
        p.*, 
        imp.nombre as nombre_implemento,
        imp.imagen_url
       FROM prestamos p
       LEFT JOIN implementos imp ON p.implemento = imp.nombre  -- JOIN por nombre
       WHERE p.usuario_id = $1 AND p.estado = 'solicitado'
       ORDER BY p.fecha_registro DESC`,
      [usuarioId]
    );

    res.json({
      success: true,
      data: solicitudes.rows,
      count: solicitudes.rows.length
    });

  } catch (error) {
    console.error("Error obteniendo solicitudes del usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
},

  async markAsLost(req, res) {
    try {
      const { id } = req.params;
      const updatedLoan = await Loan.markAsLost(id);

      const io = getIO();
      io.emit("prestamo_actualizado", {
        tipo: "prestamo_perdido",
        prestamo: updatedLoan,
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        message: "Préstamo marcado como perdido",
        data: updatedLoan,
      });
    } catch (error) {
      console.error("Error marcando préstamo como perdido:", error);
      res
        .status(500)
        .json({ success: false, message: "Error interno del servidor" });
    }
  },

  async getExpiringLoans(req, res) {
    try {
      const expiringLoans = await Loan.findExpiringLoans(30);
      res.json({ success: true, data: expiringLoans });
    } catch (error) {
      console.error("Error obteniendo préstamos por vencer:", error);
      res
        .status(500)
        .json({ success: false, message: "Error interno del servidor" });
    }
  },

  async markPendingLoans(req, res) {
    try {
      const result = await db.query(
        "SELECT * FROM marcar_prestamos_pendientes()"
      );
      res.json({
        success: true,
        message: result.rows[0]?.detalles || "Proceso completado",
        data: {
          prestamos_actualizados: result.rows[0]?.prestamos_actualizados || 0,
        },
      });
    } catch (error) {
      console.error("Error marcando préstamos pendientes:", error);
      res
        .status(500)
        .json({ success: false, message: "Error interno del servidor" });
    }
  },

  async getLoansWithAutoUpdate(req, res) {
    try {
      const [activeLoans, pendingLoans, expiringLoans] = await Promise.all([
        Loan.findActiveWithTime(),
        Loan.findPending(),
        Loan.findExpiringLoans(30),
      ]);
      res.json({
        success: true,
        data: {
          activos: activeLoans,
          pendientes: pendingLoans,
          por_vencer: expiringLoans,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error en getLoansWithAutoUpdate:", error);
      res
        .status(500)
        .json({ success: false, message: "Error interno del servidor" });
    }
  },

  async getLoansRealTime(req, res) {
    try {
      const [activeLoans, pendingLoans, expiringLoans] = await Promise.all([
        Loan.findActiveWithTime(),
        Loan.findPending(),
        Loan.findExpiringLoans(30),
      ]);
      res.json({
        success: true,
        data: {
          activos: activeLoans,
          pendientes: pendingLoans,
          por_vencer: expiringLoans,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error en getLoansRealTime:", error);
      res
        .status(500)
        .json({ success: false, message: "Error interno del servidor" });
    }
  },

  // ✅ NUEVO MÉTODO PARA REPORTES DE EXPORTACIÓN
  async exportLoansReport(req, res) {
    try {
      const {
        tipo_reporte = "todos",
        fecha_inicio = "",
        fecha_fin = "",
        usuario = "",
        implemento = "",
        estado = "",
        limite = "",
        search = "",
      } = req.query;

      console.log("📊 Generando reporte con filtros:", req.query);

      // Construir condiciones WHERE dinámicamente
      let whereConditions = [];
      let queryParams = [];
      let paramCount = 0;

      // Filtro por tipo de reporte
      switch (tipo_reporte) {
        case "hoy":
          whereConditions.push(`p.fecha_prestamo = CURRENT_DATE`);
          break;
        case "ayer":
          whereConditions.push(
            `p.fecha_prestamo = CURRENT_DATE - INTERVAL '1 day'`
          );
          break;
        case "semana":
          whereConditions.push(
            `p.fecha_prestamo >= CURRENT_DATE - INTERVAL '7 days'`
          );
          break;
        case "mes":
          whereConditions.push(
            `p.fecha_prestamo >= CURRENT_DATE - INTERVAL '30 days'`
          );
          break;
        case "personalizado":
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
          break;
        default:
          // 'todos' - sin filtro de fecha
          break;
      }

      // Filtro por búsqueda general
      if (search) {
        paramCount++;
        whereConditions.push(
          `(u.nombre_completo ILIKE $${paramCount} OR u.numero_cedula ILIKE $${paramCount} OR p.implemento ILIKE $${paramCount})`
        );
        queryParams.push(`%${search}%`);
      }

      // Filtro por usuario específico
      if (usuario) {
        paramCount++;
        whereConditions.push(
          `(u.nombre_completo ILIKE $${paramCount} OR u.numero_cedula ILIKE $${paramCount})`
        );
        queryParams.push(`%${usuario}%`);
      }

      // Filtro por implemento específico
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

      // Query para obtener datos
      let query = `
      SELECT 
        p.*,
        u.nombre_completo,
        u.numero_cedula,
        u.programa_id,
        prog.nombre as programa,
        u.numero_telefono,
        p.horas_totales as horas_totales,
        TO_CHAR(p.hora_inicio, 'HH12:MI AM') as hora_inicio_formatted,
        TO_CHAR(p.hora_fin_real, 'HH12:MI AM') as hora_fin_real_formatted,
        TO_CHAR(p.hora_fin_estimada, 'HH12:MI AM') as hora_fin_estimada_formatted
      FROM prestamos p
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      LEFT JOIN programas prog ON u.programa_id = prog.id
      ${whereClause}
      ORDER BY p.fecha_prestamo DESC, p.hora_inicio DESC
    `;

      // Aplicar límite si se especifica
      if (limite && !isNaN(limite)) {
        query += ` LIMIT ${parseInt(limite)}`;
      }

      console.log("📋 Query ejecutado:", query);
      console.log("🔍 Parámetros:", queryParams);

      const result = await db.query(query, queryParams);

      console.log(
        "✅ Datos obtenidos para reporte:",
        result.rows.length,
        "registros"
      );
      
      // Formatear datos para exportación
      const datosFormateados = result.rows.map((prestamo) => ({
        "Nombre completo": prestamo.nombre_completo,
        "N° cédula": prestamo.numero_cedula,
        Programa: prestamo.programa,
        Teléfono: prestamo.numero_telefono,
        Implemento: prestamo.implemento,
        Fecha: new Date(prestamo.fecha_prestamo).toLocaleDateString("es-ES"),
        "Hora inicio":
          prestamo.hora_inicio_formatted || formatHora12h(prestamo.hora_inicio),
        "Hora final":
          prestamo.hora_fin_real_formatted ||
          prestamo.hora_fin_estimada_formatted ||
          "--:--",
        "Horas totales": prestamo.horas_totales
          ? formatDuracion(prestamo.horas_totales)
          : "--",
        Estado: prestamo.estado,
      }));

      // Función helper para formatear horas (si no viene formateada de la BD)
      function formatHora12h(horaString) {
        if (!horaString) return "--:--";
        const [horas, minutos] = horaString.split(":");
        const horasNum = parseInt(horas);
        const ampm = horasNum >= 12 ? "PM" : "AM";
        const horas12 = horasNum % 12 || 12;
        return `${horas12}:${minutos} ${ampm}`;
      }

      // Función helper para formatear duración
      function formatDuracion(horasDecimal) {
        if (!horasDecimal) return "--";
        const minutosTotales = Math.round(horasDecimal * 60);
        if (minutosTotales < 60) {
          return `${minutosTotales} min`;
        } else {
          const horas = Math.floor(minutosTotales / 60);
          const minutos = minutosTotales % 60;
          return `${horas}:${minutos.toString().padStart(2, "0")} h`;
        }
      }

      res.json({
        success: true,
        data: datosFormateados,
        total: result.rows.length,
        titulo:
          "CONTROL DE PRÉSTAMOS DE IMPLEMENTOS DE BIENESTAR UNIVERSITARIO",
        fecha_generacion: new Date().toLocaleDateString("es-ES"),
        filtros_aplicados: req.query,
      });
    } catch (error) {
      console.error("❌ Error generando reporte:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor al generar reporte",
      });
    }
  },
};

module.exports = loansController;
