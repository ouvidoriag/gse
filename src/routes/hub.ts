import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { mysqlPool } from '../database/mysql';

export const hubRouter = Router();

hubRouter.get('/stats', async (_req: Request, res: Response) => {
  try {
    // 1. Estatísticas da Carta de Serviços (MySQL)
    let totalServicos = 0;
    let totalSecretarias = 0;
    let totalCategorias = 0;
    let servicosPorSecretaria: any[] = [];

    try {
      const [sCount]: any = await mysqlPool.query("SELECT count(*) as total FROM services WHERE (status IS NULL OR status != 'archived')");
      totalServicos = sCount[0]?.total || 0;

      const [secCount]: any = await mysqlPool.query('SELECT count(*) as total FROM secretarias');
      totalSecretarias = secCount[0]?.total || 0;

      const [catCount]: any = await mysqlPool.query('SELECT count(*) as total FROM categories');
      totalCategorias = catCount[0]?.total || 0;

      const [topSec]: any = await mysqlPool.query(`
        SELECT s.name as secretaria, count(srv.id) as total_servicos
        FROM secretarias s
        LEFT JOIN services srv ON s.id = srv.secretaria_id AND (srv.status IS NULL OR srv.status != 'archived')
        GROUP BY s.id, s.name
        ORDER BY total_servicos DESC
        LIMIT 6
      `);
      servicosPorSecretaria = topSec;
    } catch (mysqlErr: any) {
      console.warn('⚠️ [Hub Stats] MySQL temporariamente indisponível:', mysqlErr.message);
    }

    // 2. Estatísticas do SIGEM (MySQL)
    let totalEquipamentos = 0;
    let totalDistritos = 4;
    let totalBairros = 118;
    let totalHubs = 12;
    let equipamentosPorDistrito: any[] = [];
    let equipamentosPorMacrosetor: any[] = [];
    let totalComunidades = 0;
    let totalComplexos = 0;
    let totalRuasComunidades = 0;
    let comunidadesPorComplexo: any[] = [];

    try {
      const [equipRow]: any = await mysqlPool.query('SELECT count(*) as c FROM equipamentos');
      totalEquipamentos = equipRow[0]?.c || 0;

      const [distRow]: any = await mysqlPool.query('SELECT count(*) as c FROM distritos');
      totalDistritos = distRow[0]?.c || 4;

      const [bairroRow]: any = await mysqlPool.query('SELECT count(*) as c FROM bairros');
      totalBairros = bairroRow[0]?.c || 118;

      const [hubRow]: any = await mysqlPool.query('SELECT count(*) as c FROM hubs_predios');
      totalHubs = hubRow[0]?.c || 12;

      // Métricas de Comunidades e Favelas (SIMAC)
      try {
        const [comRow]: any = await mysqlPool.query('SELECT count(*) as c FROM comunidades');
        totalComunidades = comRow[0]?.c || 0;
        const [compRow]: any = await mysqlPool.query('SELECT count(*) as c FROM complexos');
        totalComplexos = compRow[0]?.c || 0;
        const [ruasRow]: any = await mysqlPool.query('SELECT count(*) as c FROM comunidade_ruas');
        totalRuasComunidades = ruasRow[0]?.c || 0;
        const [compList]: any = await mysqlPool.query(`
          SELECT nome, total_comunidades, total_ruas, cor_hex
          FROM complexos
          ORDER BY total_comunidades DESC
        `);
        comunidadesPorComplexo = compList || [];
      } catch (_) {}

      const [distList]: any = await mysqlPool.query(`
        SELECT CONCAT(d.numero, 'º Distrito') as distrito, d.nome as regiao, count(e.id) as total
        FROM distritos d
        LEFT JOIN bairros b ON d.id = b.distrito_id
        LEFT JOIN enderecos end ON b.id = end.bairro_id
        LEFT JOIN equipamentos e ON end.id = e.endereco_id
        GROUP BY d.id
        ORDER BY d.numero ASC
      `);
      equipamentosPorDistrito = distList || [];

      const [macroList]: any = await mysqlPool.query(`
        SELECT c.macrosetor, count(e.id) as total
        FROM categorias c
        JOIN equipamentos e ON c.id = e.categoria_id
        GROUP BY c.macrosetor
        ORDER BY total DESC
      `);
      equipamentosPorMacrosetor = macroList || [];

      return res.json({
        success: true,
        timestamp: new Date().toISOString(),
        resumo: {
          totalServicos,
          totalEquipamentos,
          totalSecretarias,
          totalCategorias,
          totalDistritos,
          totalBairros,
          totalHubs,
          totalLinhasOnibus: 16,
          totalParadasOnibus: 1795,
          totalComunidades,
          totalComplexos,
          totalRuasComunidades,
        },
        graficos: {
          servicosPorSecretaria,
          equipamentosPorDistrito,
          equipamentosPorMacrosetor,
          comunidadesPorComplexo,
        }
      });
    } catch (mysqlSigemErr: any) {
      console.warn('⚠️ [Hub Stats] Erro ao consultar stats do SIGEM no MySQL:', mysqlSigemErr.message);
    }

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      resumo: {
        totalServicos,
        totalEquipamentos,
        totalSecretarias,
        totalCategorias,
        totalDistritos,
        totalBairros,
        totalHubs,
        totalLinhasOnibus: 20,
        totalParadasOnibus: 1795,
      },
      graficos: {
        servicosPorSecretaria,
        equipamentosPorDistrito,
        equipamentosPorMacrosetor,
      }
    });
  } catch (error: any) {
    console.error('❌ [Erro em /hub/stats]:', error);
    return res.status(500).json({ error: 'Erro ao gerar consolidador de estatísticas.' });
  }
});

// Busca Unificada Global (cruza serviços e equipamentos públicos)
hubRouter.get('/search', async (req: Request, res: Response) => {
  const query = String(req.query.q || '').trim();
  if (!query || query.length < 2) {
    return res.json({ servicos: [], equipamentos: [] });
  }

  const results: { servicos: any[]; equipamentos: any[] } = {
    servicos: [],
    equipamentos: [],
  };

  // Busca Serviços no MySQL (apenas publicados)
  try {
    const [servRows]: any = await mysqlPool.query(
      `SELECT s.id, s.name, s.description, sec.name as secretaria
       FROM services s
       LEFT JOIN secretarias sec ON s.secretaria_id = sec.id
       WHERE s.status = 'published'
         AND (s.name LIKE ? OR s.description LIKE ?)
       LIMIT 8`,
      [`%${query}%`, `%${query}%`]
    );
    results.servicos = servRows;
  } catch (e: any) {
    // ignore
  }

  // Busca Equipamentos no MySQL com tolerância a acentos
  try {
    const termList: string[] = [query];
    const normalized = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const aliasMap: Record<string, string[]> = {
      saude: ['Saúde', 'Hospital', 'Posto', 'UBS', 'USF', 'UPH', 'UPA'],
      educacao: ['Educação', 'Escola', 'Creche', 'CIEP', 'Colégio'],
      anhanga: ['Anhangá'],
      imbarie: ['Imbariê'],
      xerem: ['Xerém'],
      cras: ['CRAS', 'Assistência Social']
    };

    for (const [key, variants] of Object.entries(aliasMap)) {
      if (normalized.includes(key)) {
        variants.forEach(v => {
          if (!termList.includes(v)) termList.push(v);
        });
      }
    }

    const clauses = termList.map(() => '(nome LIKE ? OR endereco LIKE ? OR bairro LIKE ? OR categoria LIKE ?)').join(' OR ');
    const sqlParams: string[] = [];
    termList.forEach(t => {
      const pattern = `%${t}%`;
      sqlParams.push(pattern, pattern, pattern, pattern);
    });

    const [equipRows]: any = await mysqlPool.query(`
      SELECT id, nome, categoria, bairro, distrito, endereco
      FROM vw_equipamentos_consolidada
      WHERE ${clauses}
      LIMIT 8
    `, sqlParams);
    results.equipamentos = equipRows || [];

    // Busca Comunidades, Favelas e Complexos (SIMAC) no MySQL
    try {
      const [comRows]: any = await mysqlPool.query(`
        SELECT id, nome, complexo, cor_hex, distrito, total_ruas
        FROM comunidades
        WHERE nome LIKE ? OR complexo LIKE ?
        LIMIT 6
      `, [`%${query}%`, `%${query}%`]);
      (results as any).comunidades = comRows || [];
    } catch (_) {}
  } catch (e: any) {
    // ignore
  }

  // Busca Linhas de Ônibus (Tarifa Zero)
  try {
    const rotasFile = path.join(__dirname, '..', '..', 'public', 'sigem', 'dados', 'geojson', 'rotas_onibus_tarifa_zero.geojson');
    if (fs.existsSync(rotasFile)) {
      const data = JSON.parse(fs.readFileSync(rotasFile, 'utf-8'));
      const qLower = query.toLowerCase();
      (results as any).linhas_onibus = data.features
        .filter((f: any) => {
          const n = (f.properties?.nome || '').toLowerCase();
          const l = (f.properties?.linha_id || '').toLowerCase();
          return n.includes(qLower) || l.includes(qLower) || qLower.includes('onibus') || qLower.includes('tarifa');
        })
        .slice(0, 5)
        .map((f: any) => ({
          linha_id: f.properties?.linha_id,
          nome: f.properties?.nome,
          cor: f.properties?.cor,
          extensao_km: f.properties?.extensao_km,
        }));
    }
  } catch (_) {
    // ignore
  }

  return res.json({ success: true, query, results });
});
