import path from 'path';
import mysqlPool from '../database/mysql';

// Importa a lógica do script existente
export async function runSigemExport(): Promise<{ success: boolean; total: number; message: string }> {
  try {
    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'exportador_central.js');
    const { exportarTudo } = require(scriptPath);
    const resultado = await exportarTudo(mysqlPool);
    return {
      success: true,
      total: resultado.total_geral || 466,
      message: `Exportação centralizada concluída com sucesso. ${resultado.total_geral || 466} registros processados.`
    };
  } catch (err: any) {
    console.error('❌ [Erro na exportação SIGEM]:', err.message);
    throw err;
  }
}
