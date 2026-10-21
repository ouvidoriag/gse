import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3032,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'pmdc_chave_mestra_unificada_2026',
  sessionExpirationHours: Number(process.env.SESSION_EXPIRATION_HOURS) || 8,
  
  // Admin padrão
  admin: {
    username: process.env.ADMIN_USER || 'admin',
    password: process.env.ADMIN_PASS || 'admin123',
    name: process.env.ADMIN_NAME || 'Administrador Geral PMDC',
    role: process.env.ADMIN_ROLE || 'admin',
  },

  // MySQL (Carta de Serviços)
  mysql: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'carta_de_servico',
    poolSize: Number(process.env.DB_POOL_SIZE) || 50,
  },

  // SQLite (SIGEM - Endereços & Equipamentos)
  sqlite: {
    dbPath: process.env.SQLITE_DB_PATH 
      ? path.resolve(process.env.SQLITE_DB_PATH) 
      : path.join(__dirname, '..', '..', 'dados', 'enderecos_duque_de_caxias_v2.db'),
  },

  // E-mail (SMTP)
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    destinatario: process.env.EMAIL_DESTINATARIO || 'ouvgeral.gestao@gmail.com',
  }
};
