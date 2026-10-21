import mysql from 'mysql2/promise';
import { config } from '../config';

export const mysqlPool = mysql.createPool({
  host: config.mysql.host,
  port: config.mysql.port,
  user: config.mysql.user,
  password: config.mysql.password,
  database: config.mysql.database,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: config.mysql.poolSize,
  queueLimit: 0,
});

export async function testMysqlConnection(): Promise<boolean> {
  try {
    const conn = await mysqlPool.getConnection();
    conn.release();
    console.log(`🐬 [MySQL] Conectado ao banco "${config.mysql.database}" em ${config.mysql.host}:${config.mysql.port}`);
    return true;
  } catch (error: any) {
    console.error(`❌ [MySQL Erro]: Não foi possível conectar ao MySQL: ${error.message}`);
    return false;
  }
}

export default mysqlPool;
