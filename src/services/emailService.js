// src/services/emailService.js - VERSIÓN SENDGRID PRODUCCIÓN
const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    // ✅ CONFIGURACIÓN PARA PRODUCCIÓN (SendGrid)
    this.transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey', // ← PALABRA FIJA
        pass: process.env.SENDGRID_API_KEY // ← Tu API Key de SendGrid
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000
    });
  }

  // 🔐 Enviar email de verificación
  async sendVerificationEmail(userEmail, verificationToken, userName) {
    const verificationUrl = `${process.env.FRONTEND_URL}/user/verify-email/${verificationToken}`;

    const mailOptions = {
      from: `"Sistema de Préstamos" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "✅ Verifica tu cuenta - Sistema de Préstamos",
      html: this.getVerificationTemplate(userName, verificationUrl),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email de verificación enviado a: ${userEmail}`);
      return true;
    } catch (error) {
      console.error("❌ Error enviando email de verificación:", error);
      return false;
    }
  }

  // ✅ Enviar email de invitación de administrador
  async sendAdminInvitationEmail(userEmail, setupUrl, userName) {
    console.log("📧 Enviando email de invitación a:", userEmail);
    console.log("🔗 Enlace recibido:", setupUrl);

    const mailOptions = {
      from: `"Sistema de Préstamos - Admin" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "🎯 Activación de Cuenta - Sistema de Préstamos",
      html: this.getAdminInvitationTemplate(userName, setupUrl),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email de invitación enviado a: ${userEmail}`);
      return true;
    } catch (error) {
      console.error("❌ Error enviando email de invitación:", error);
      return false;
    }
  }

  // 🔄 Enviar email de recuperación de contraseña
  async sendPasswordResetEmail(userEmail, resetToken, userName) {
    const resetUrl = `${process.env.FRONTEND_URL}/user/reset-password/${resetToken}`;

    const mailOptions = {
      from: `"Sistema de Préstamos" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "🔐 Recupera tu contraseña - Sistema de Préstamos",
      html: this.getPasswordResetTemplate(userName, resetUrl),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email de recuperación enviado a: ${userEmail}`);
      return true;
    } catch (error) {
      console.error("❌ Error enviando email de recuperación:", error);
      return false;
    }
  }

  getAdminInvitationTemplate(userName, setupUrl) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3498db 0%, #2c3e50 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 14px 28px; background: #3498db; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>¡Tu Cuenta ha sido Creada!</h1>
        </div>
        <div class="content">
          <h2>Hola ${userName},</h2>
          <p>El administrador del sistema de préstamos ha creado una cuenta para ti.</p>
          <p>Para <strong>activar tu cuenta y crear tu contraseña</strong>, haz clic en el siguiente enlace:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${setupUrl}" class="button">Activar Cuenta y Crear Contraseña</a>
          </p>
          <p>Si el botón no funciona, copia y pega este enlace:</p>
          <p style="word-break: break-all; background: #eee; padding: 15px; border-radius: 5px; font-size: 14px;">
            ${setupUrl}
          </p>
          <p><strong>⚠️ Este enlace expirará en 24 horas.</strong></p>
        </div>
        <div class="footer">
          <p>Sistema de Préstamos - Bienestar Universitario</p>
        </div>
      </div>
    </body>
    </html>
  `;
  }

  // 📋 Plantilla de verificación
  getVerificationTemplate(userName, verificationUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 14px 28px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>¡Bienvenido al Sistema de Préstamos!</h1>
          </div>
          <div class="content">
            <h2>Hola ${userName},</h2>
            <p>Estás a un paso de activar tu cuenta. Para completar tu registro, por favor verifica tu dirección de email:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" class="button">Verificar Mi Cuenta</a>
            </p>
            <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; background: #eee; padding: 15px; border-radius: 5px; font-size: 14px;">
              ${verificationUrl}
            </p>
            <p><strong>⚠️ Este enlace expirará en 24 horas.</strong></p>
          </div>
          <div class="footer">
            <p>Sistema de Préstamos - Bienestar Universitario</p>
            <p>Si no solicitaste este registro, por favor ignora este mensaje.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // 📋 Plantilla de recuperación de contraseña
  getPasswordResetTemplate(userName, resetUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 14px 28px; background: #ff6b6b; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Recuperación de Contraseña</h1>
          </div>
          <div class="content">
            <h2>Hola ${userName},</h2>
            <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
            </p>
            <p>Si el botón no funciona, copia y pega este enlace:</p>
            <p style="word-break: break-all; background: #eee; padding: 15px; border-radius: 5px; font-size: 14px;">
              ${resetUrl}
            </p>
            <p><strong>⏰ Este enlace expirará en 1 hora.</strong></p>
            <p style="color: #666;">Si no solicitaste este cambio, puedes ignorar este email y tu contraseña permanecerá igual.</p>
          </div>
          <div class="footer">
            <p>Sistema de Préstamos - Bienestar Universitario</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();