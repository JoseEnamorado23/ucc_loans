// src/controllers/auth.controller.js
const User = require("../models/users.model");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const emailService = require("../services/emailService");
const db = require("../db");
const secureAdminAuth = require("../middleware/secureAdminAuth");

// Generar JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { userId, type: "user" },
    process.env.JWT_SECRET || "fallback_secret",
    { expiresIn: "30d" }
  );
};

const authController = {
  // 🔐 LOGIN DE ADMINISTRADOR SEGURO (VERSIÓN MEJORADA)
  async adminLogin(req, res) {
    try {
      const { username, password } = req.body;

      console.log("🔐 Intento de login admin:", { username, ip: req.ip });

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: "Usuario y contraseña son requeridos",
        });
      }

      // Verificar credenciales de admin
      if (
        username === process.env.ADMIN_USERNAME &&
        password === process.env.ADMIN_PASSWORD
      ) {
        console.log("✅ Credenciales admin correctas");

        // Generar par de tokens seguros
        const { accessToken, refreshToken } = secureAdminAuth.generateTokenPair(
          {
            userId: "admin",
            username: username,
          }
        );

        // Configurar cookies seguras
        secureAdminAuth.setSecureCookies(res, accessToken, refreshToken);

        // Log de seguridad
        console.log(`🔐 Admin login exitoso: ${username} desde IP: ${req.ip}`);

        return res.json({
          success: true,
          message: "Login de administrador exitoso",
          data: {
            user: {
              id: "admin",
              username: username,
              type: "admin",
            },
            // No enviar tokens en el body por seguridad
            sessionInfo: {
              expiresIn: "15 minutos",
              refreshAvailable: true,
            },
          },
        });
      }

      console.log("❌ Credenciales admin incorrectas desde IP:", req.ip);
      res.status(401).json({
        success: false,
        message: "Credenciales de administrador inválidas",
      });
    } catch (error) {
      console.error("💥 Error en login de admin:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor: " + error.message,
      });
    }
  },

  // 🔄 REFRESCAR TOKEN DE ADMINISTRADOR
  async refreshAdminToken(req, res) {
    try {
      const refreshToken = req.cookies?.adminRefreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: "Refresh token no proporcionado",
        });
      }

      const { accessToken, refreshToken: newRefreshToken } =
        await secureAdminAuth.refreshAccessToken(refreshToken);

      // Configurar nuevas cookies
      secureAdminAuth.setSecureCookies(res, accessToken, newRefreshToken);

      res.json({
        success: true,
        message: "Token refrescado exitosamente",
        data: {
          sessionInfo: {
            expiresIn: "15 minutos",
            refreshAvailable: true,
          },
        },
      });
    } catch (error) {
      console.error("Error refrescando token:", error);

      // Limpiar cookies si hay error
      secureAdminAuth.clearCookies(res);

      res.status(401).json({
        success: false,
        message: "Token de refresh inválido o expirado",
      });
    }
  },

  // 🚪 LOGOUT SEGURO DE ADMINISTRADOR
  async adminLogout(req, res) {
    try {
      const refreshToken = req.cookies?.adminRefreshToken;

      // Limpiar refresh token del almacenamiento
      if (refreshToken) {
        secureAdminAuth.logout(refreshToken);
      }

      // Limpiar cookies
      secureAdminAuth.clearCookies(res);

      console.log(
        `🚪 Admin logout: ${req.adminUsername || "unknown"} desde IP: ${req.ip}`
      );

      res.json({
        success: true,
        message: "Logout exitoso",
      });
    } catch (error) {
      console.error("Error en logout:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  },

  // 🔍 VERIFICAR ESTADO DE SESIÓN DE ADMINISTRADOR
  async checkAdminSession(req, res) {
    try {
      res.json({
        success: true,
        data: {
          authenticated: true,
          user: {
            id: req.adminId,
            username: req.adminUsername,
            type: "admin",
          },
          sessionInfo: {
            expiresIn: "15 minutos",
            refreshAvailable: true,
          },
        },
      });
    } catch (error) {
      console.error("Error verificando sesión:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  },

  // En src/controllers/auth.controller.js - AGREGAR esta función
  async registerAdmin(req, res) {
    try {
      const {
        nombre_completo,
        numero_cedula,
        numero_telefono,
        programa_id,
        email,
      } = req.body;

      // ✅ LOGS DETALLADOS
      console.log("🔍 ========== REGISTER ADMIN ==========");
      console.log("📨 Request body completo:", req.body);
      console.log("📋 Campos individuales:");
      console.log(
        "  - nombre_completo:",
        nombre_completo,
        "| Tipo:",
        typeof nombre_completo
      );
      console.log(
        "  - numero_cedula:",
        numero_cedula,
        "| Tipo:",
        typeof numero_cedula
      );
      console.log(
        "  - numero_telefono:",
        numero_telefono,
        "| Tipo:",
        typeof numero_telefono
      );
      console.log(
        "  - programa_id:",
        programa_id,
        "| Tipo:",
        typeof programa_id
      );
      console.log("  - email:", email, "| Tipo:", typeof email);

      // Validaciones con logs
      const camposFaltantes = [];
      if (!nombre_completo) camposFaltantes.push("nombre_completo");
      if (!numero_cedula) camposFaltantes.push("numero_cedula");
      if (!numero_telefono) camposFaltantes.push("numero_telefono");
      if (!programa_id) camposFaltantes.push("programa_id");
      if (!email) camposFaltantes.push("email");

      if (camposFaltantes.length > 0) {
        console.log("❌ CAMPOS FALTANTES:", camposFaltantes);
        return res.status(400).json({
          success: false,
          message: "Todos los campos son requeridos",
          camposFaltantes: camposFaltantes, // ← Para debug
        });
      }

      console.log("✅ TODOS LOS CAMPOS PRESENTES");

      // Validaciones
      if (
        !nombre_completo ||
        !numero_cedula ||
        !numero_telefono ||
        !programa_id ||
        !email
      ) {
        console.log("❌ Campos faltantes - programa_id:", programa_id);
        return res.status(400).json({
          success: false,
          message: "Todos los campos son requeridos",
        });
      }

      // ✅ CONVERTIR programa_id A NÚMERO
      const programaId = parseInt(programa_id);
      if (isNaN(programaId)) {
        return res.status(400).json({
          success: false,
          message: "Programa académico inválido",
        });
      }

      // Crear usuario (sin contraseña, verificado automáticamente por admin)
      const user = await User.create({
        nombre_completo: nombre_completo.trim(),
        numero_cedula: numero_cedula.trim(),
        numero_telefono: numero_telefono.trim(),
        programa_id: programaId, // ✅ CAMBIADO: programa_id en lugar de programa
        email: email.trim(),
        creado_por_admin: true,
      });

      // Generar token de verificación para que el usuario cree su contraseña
      const verificationToken = await User.generateVerificationToken(user.id);

      // 📧 ENVIAR EMAIL DE INVITACIÓN
      const emailService = require("../services/emailService");
      const setupUrl = `${process.env.FRONTEND_URL}/user/create-password/${verificationToken}`;
      const emailSent = await emailService.sendAdminInvitationEmail(
        user.email,
        setupUrl,
        user.nombre_completo
      );

      let message = "Usuario creado exitosamente. ";
      message += emailSent
        ? "Se ha enviado un email al usuario para que active su cuenta y cree su contraseña."
        : "Usuario creado, pero no se pudo enviar el email de invitación. Contacta al usuario directamente.";

      res.status(201).json({
        success: true,
        message: message,
        data: {
          id: user.id,
          nombre_completo: user.nombre_completo,
          email: user.email,
          verificado: user.verificado,
          emailSent: emailSent,
        },
      });
    } catch (error) {
      console.error("Error en registro por admin:", error);

      if (error.message.includes("Ya existe un usuario")) {
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

  async verifyToken(req, res) {
    try {
      const { token } = req.params;

      console.log("🔍 ========== INICIO VERIFICACIÓN TOKEN ==========");
      console.log("📨 Token recibido en URL:", token);
      console.log("📏 Longitud del token:", token?.length);

      // ✅ VERIFICAR FORMATO DEL TOKEN
      if (!token || token.length !== 64) {
        console.log("❌ Token con formato incorrecto");
        return res.status(400).json({
          success: false,
          message: "Token inválido",
        });
      }

      // ✅ CONSULTA DIRECTA CON LOGS DETALLADOS
      console.log("🗄️ Ejecutando consulta en BD...");

      const result = await db.query(
        `SELECT id, email, verificado, creado_por_admin 
       FROM usuarios 
       WHERE token_verificacion = $1`,
        [token]
      );

      console.log("📊 Resultado de la consulta:");
      console.log("- Filas encontradas:", result.rows.length);

      if (result.rows.length > 0) {
        const user = result.rows[0];
        console.log("✅ USUARIO ENCONTRADO:");
        console.log("   ID:", user.id);
        console.log("   Email:", user.email);
        console.log("   Verificado:", user.verificado);
        console.log("   Creado por admin:", user.creado_por_admin);
      } else {
        console.log("❌ NO SE ENCONTRÓ USUARIO CON ESE TOKEN");

        // ✅ DEBUG: Buscar tokens similares o problemas de encoding
        const similarTokens = await db.query(
          `SELECT id, email, token_verificacion 
         FROM usuarios 
         WHERE token_verificacion IS NOT NULL 
         LIMIT 5`
        );

        console.log("🔍 Tokens existentes en BD:");
        similarTokens.rows.forEach((row, index) => {
          console.log(`   ${index + 1}. ID: ${row.id}, Email: ${row.email}`);
          console.log(`      Token en BD: ${row.token_verificacion}`);
          console.log(`      Longitud: ${row.token_verificacion?.length}`);
          console.log(`      Coincide: ${row.token_verificacion === token}`);
        });
      }

      if (result.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Token inválido o expirado",
        });
      }

      const user = result.rows[0];

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          verificado: user.verificado,
          creado_por_admin: user.creado_por_admin,
        },
      });

      console.log("✅ ========== VERIFICACIÓN COMPLETADA ==========");
    } catch (error) {
      console.error("💥 Error en verifyToken:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  },

  // Crear contraseña y activar cuenta
  async createPassword(req, res) {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({
          success: false,
          message: "Token y contraseña son requeridos",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "La contraseña debe tener al menos 6 caracteres",
        });
      }

      // Buscar usuario por token
      const userResult = await db.query(
        `SELECT id, email FROM usuarios WHERE token_verificacion = $1`,
        [token]
      );

      if (userResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Token inválido o expirado",
        });
      }

      const user = userResult.rows[0];

      // Hashear contraseña
      const bcrypt = require("bcryptjs");
      const password_hash = await bcrypt.hash(password, 12);

      // Actualizar usuario: contraseña, verificado y limpiar token
      await db.query(
        `UPDATE usuarios 
       SET password_hash = $1, 
           verificado = true, 
           token_verificacion = NULL,
           fecha_verificacion = CURRENT_TIMESTAMP
       WHERE id = $2`,
        [password_hash, user.id]
      );

      res.json({
        success: true,
        message:
          "✅ Cuenta activada exitosamente. Ahora puedes iniciar sesión.",
        data: {
          id: user.id,
          email: user.email,
        },
      });
    } catch (error) {
      console.error("Error creando contraseña:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  },

  // 🔐 REGISTRO DE USUARIO
  async register(req, res) {
    try {
      const {
        nombre_completo,
        numero_cedula,
        numero_telefono,
        programa_id,
        email,
        password,
      } = req.body;

      // Validaciones
      if (
        !nombre_completo ||
        !numero_cedula ||
        !numero_telefono ||
        !programa_id ||
        !email ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          message: "Todos los campos son requeridos",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "La contraseña debe tener al menos 6 caracteres",
        });
      }

      // Crear usuario (no verificado aún)
      const user = await User.create({
        nombre_completo: nombre_completo.trim(),
        numero_cedula: numero_cedula.trim(),
        numero_telefono: numero_telefono.trim(),
        programa_id: programa_id,
        email: email.trim(),
        password: password,
      });

      // Obtener token de verificación
      const verificationToken = await User.generateVerificationToken(user.id);

      // 📧 ENVIAR EMAIL DE VERIFICACIÓN
      const emailService = require("../services/emailService");
      const emailSent = await emailService.sendVerificationEmail(
        user.email,
        verificationToken,
        user.nombre_completo
      );

      let message = "Usuario registrado. ";
      message += emailSent
        ? "Por favor verifica tu email."
        : "Usuario creado, pero no se pudo enviar el email de verificación. Contacta al administrador.";

      res.status(201).json({
        success: true,
        message: message,
        data: {
          id: user.id,
          nombre_completo: user.nombre_completo,
          email: user.email,
          verificado: user.verificado,
          emailSent: emailSent,
        },
      });
    } catch (error) {
      console.error("Error en registro:", error);

      if (error.message.includes("Ya existe un usuario")) {
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

  // 🔐 INICIO DE SESIÓN
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email y contraseña son requeridos",
        });
      }

      // Buscar usuario por email
      const user = await User.findByEmail(email);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Credenciales inválidas",
        });
      }

      // Verificar contraseña
      const isPasswordValid = await User.verifyPassword(
        password,
        user.password_hash
      );

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Credenciales inválidas",
        });
      }

      // Verificar si el email está verificado
      if (!user.verificado) {
        return res.status(403).json({
          success: false,
          message: "Por favor verifica tu email antes de iniciar sesión",
        });
      }

      // Actualizar último login
      await User.updateLastLogin(user.id);

      // Generar token
      const token = generateToken(user.id);

      res.json({
        success: true,
        message: "Login exitoso",
        data: {
          token,
          user: {
            id: user.id,
            nombre_completo: user.nombre_completo,
            email: user.email,
            numero_cedula: user.numero_cedula,
            programa: user.programa_id,
            horas_totales_acumuladas: user.horas_totales_acumuladas,
          },
        },
      });
    } catch (error) {
      console.error("Error en login:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  },

  // 🔐 VERIFICAR EMAIL
  async verifyEmail(req, res) {
    try {
      const { token } = req.params;

      const user = await User.verifyEmail(token);

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Token de verificación inválido o expirado",
        });
      }

      res.json({
        success: true,
        message: "Email verificado exitosamente. Ya puedes iniciar sesión.",
        data: {
          nombre_completo: user.nombre_completo,
          email: user.email,
        },
      });
    } catch (error) {
      console.error("Error verificando email:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  },

  // 🔐 SOLICITAR RECUPERACIÓN DE CONTRASEÑA
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email es requerido",
        });
      }

      const result = await User.generateResetToken(email);

      if (!result) {
        // Por seguridad, no revelar si el email existe o no
        return res.json({
          success: true,
          message:
            "Si el email existe, recibirás un enlace para recuperar tu contraseña",
        });
      }

      // 📧 ENVIAR EMAIL DE RECUPERACIÓN
      const emailSent = await emailService.sendPasswordResetEmail(
        result.user.email,
        result.token,
        result.user.nombre_completo
      );

      const message = emailSent
        ? "Si el email existe, recibirás un enlace para recuperar tu contraseña"
        : "Solicitud procesada, pero hubo un error enviando el email. Contacta al administrador.";

      res.json({
        success: true,
        message: message,
        emailSent: emailSent,
      });
    } catch (error) {
      console.error("Error en recuperación:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  },

  // 🔐 RESTABLECER CONTRASEÑA
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Token y nueva contraseña son requeridos",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "La contraseña debe tener al menos 6 caracteres",
        });
      }

      // Validar token
      const user = await User.validateResetToken(token);

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Token inválido o expirado",
        });
      }

      // Actualizar contraseña
      await User.updatePassword(user.id, newPassword);

      res.json({
        success: true,
        message: "Contraseña actualizada exitosamente",
      });
    } catch (error) {
      console.error("Error restableciendo contraseña:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  },

  // 🔐 OBTENER PERFIL DE USUARIO
  // 🔐 OBTENER PERFIL DE USUARIO - CORREGIDO
  // 🔐 OBTENER PERFIL DE USUARIO - CORREGIDO CON ESTADÍSTICAS
async getProfile(req, res) {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    // ✅ AGREGADO: Obtener estadísticas del usuario
    const stats = await User.getUserStats(req.userId);

    res.json({
      success: true,
      data: {
        id: user.id,
        nombre_completo: user.nombre_completo,
        email: user.email,
        numero_cedula: user.numero_cedula,
        numero_telefono: user.numero_telefono,
        programa_id: user.programa_id,
        programa_nombre: user.programa_nombre,
        horas_totales_acumuladas: user.horas_totales_acumuladas,
        verificado: user.verificado,
        fecha_registro: user.fecha_registro,
        ultimo_login: user.ultimo_login,
        activo: user.activo,
        // ✅ AGREGADO: Incluir las estadísticas
        total_prestamos: stats?.total_prestamos || 0,
        prestamos_activos: stats?.prestamos_activos || 0,
        prestamos_devueltos: stats?.prestamos_devueltos || 0,
        prestamos_pendientes: stats?.prestamos_pendientes || 0,
        prestamos_perdidos: stats?.prestamos_perdidos || 0,
        horas_totales_reales: stats?.horas_totales_reales || 0
      },
    });
  } catch (error) {
    console.error("Error obteniendo perfil:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
},
};

module.exports = authController;
