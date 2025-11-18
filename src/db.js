const { Pool } = require("pg");
require("dotenv").config();

// Configuración para producción en Render
const connectionConfig = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      // ✅ AGREGAR ESTO PARA TIMEZONE BOGOTÁ
      options: '-c timezone=America/Bogota'
    }
  : {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      // ✅ AGREGAR PARA DESARROLLO TAMBIÉN
      options: '-c timezone=America/Bogota'
    };

const pool = new Pool(connectionConfig);

// ✅ CONFIGURAR TIMEZONE EN CADA CONEXIÓN
pool.on('connect', (client) => {
  console.log('🕒 Configurando timezone America/Bogota para nueva conexión...');
  client.query('SET TIME ZONE \"America/Bogota\"')
    .then(() => console.log('✅ Timezone configurado correctamente'))
    .catch(err => console.error('❌ Error configurando timezone:', err));
});

// Verificar conexión y timezone
pool.connect()
  .then(async (client) => {
    console.log("📦 Conectado a PostgreSQL");
    
    // Verificar timezone configurado
    const timezoneResult = await client.query('SELECT current_setting(\'TIMEZONE\') as timezone');
    console.log('🕒 Timezone de la BD:', timezoneResult.rows[0].timezone);
    
    client.release();
  })
  .catch((err) => console.error("❌ Error al conectar a PostgreSQL", err));

module.exports = pool;