import { Router, Request, Response } from 'express';
import mysqlPool from '../database/mysql';
import { authenticateToken, requireAdmin, RequestWithUser } from '../middlewares/auth';
import { registrarAuditoria } from '../middlewares/audit';
import { runSigemExport } from '../services/sigemExporter';
import { geocodeLocation } from '../services/geocodingService';
import { config } from '../config';

export const sigemRouter = Router();

// ==========================================
// 🛠️ HELPERS DE RESOLUÇÃO E SINCRONIZAÇÃO
// ==========================================
export async function resolveCategoriaId(catInput: any): Promise<number> {
  if (!catInput) return 1;
  if (!isNaN(catInput) && Number(catInput) > 0) return Number(catInput);
  const catStr = String(catInput).trim();
  
  try {
    const [rows]: any = await mysqlPool.query(
      'SELECT id FROM categorias WHERE nome = ? OR macrosetor = ? OR id = ? LIMIT 1',
      [catStr, catStr, catStr]
    );
    if (rows && rows.length > 0) return rows[0].id;

    const [partialRows]: any = await mysqlPool.query(
      'SELECT id FROM categorias WHERE nome LIKE ? LIMIT 1',
      [`%${catStr}%`]
    );
    if (partialRows && partialRows.length > 0) return partialRows[0].id;
  } catch (err: any) {
    console.warn('[SIGEM] Erro ao resolver categoria:', err.message);
  }
  return 1;
}

export async function resolveBairroId(bairroInput: any, distInput?: any): Promise<number> {
  if (!bairroInput) return 1;
  if (!isNaN(bairroInput) && Number(bairroInput) > 0) return Number(bairroInput);
  const bStr = String(bairroInput).trim();

  try {
    if (distInput && !isNaN(distInput)) {
      const [rowsDist]: any = await mysqlPool.query(
        'SELECT id FROM bairros WHERE nome LIKE ? AND distrito_id = ? LIMIT 1',
        [`%${bStr}%`, Number(distInput)]
      );
      if (rowsDist && rowsDist.length > 0) return rowsDist[0].id;
    }
    const [rows]: any = await mysqlPool.query(
      'SELECT id FROM bairros WHERE nome LIKE ? LIMIT 1',
      [`%${bStr}%`]
    );
    if (rows && rows.length > 0) return rows[0].id;
  } catch (err: any) {
    console.warn('[SIGEM] Erro ao resolver bairro:', err.message);
  }
  return 1;
}

export async function resolveHubId(hubInput: any): Promise<number | null> {
  if (!hubInput) return null;
  if (typeof hubInput === 'number' && hubInput > 0) return hubInput;
  const cleanStr = String(hubInput).trim();
  if (!cleanStr) return null;
  if (!isNaN(Number(cleanStr)) && Number(cleanStr) > 0) return Number(cleanStr);

  try {
    let [rows]: any = await mysqlPool.query(
      'SELECT id FROM hubs_predios WHERE codigo_hub = ? OR nome LIKE ? LIMIT 1',
      [cleanStr, `%${cleanStr}%`]
    );
    if (rows && rows.length > 0) return rows[0].id;

    const normalized = cleanStr.replace(/^hub_hub_/, 'hub_');
    [rows] = await mysqlPool.query(
      'SELECT id FROM hubs_predios WHERE codigo_hub = ? LIMIT 1',
      [normalized]
    );
    if (rows && rows.length > 0) return rows[0].id;

    const numMatch = cleanStr.match(/\d+/);
    if (numMatch) {
      const num = parseInt(numMatch[0], 10);
      [rows] = await mysqlPool.query('SELECT id FROM hubs_predios WHERE id = ? LIMIT 1', [num]);
      if (rows && rows.length > 0) return rows[0].id;
    }
  } catch (err: any) {
    console.warn('[SIGEM] Erro ao resolver hub:', err.message);
  }
  return null;
}

/**
 * Mapeia o usuário logado para a respectiva secretaria do SIGEM (sigem_secretarias)
 */
export async function getSigemSecretariaId(user: any): Promise<number | null> {
  if (!user) return null;
  try {
    if (user.secretariaId) {
      const [rows]: any = await mysqlPool.query(
        'SELECT id FROM sigem_secretarias WHERE mysql_id = ? LIMIT 1',
        [user.secretariaId]
      );
      if (rows && rows.length > 0) return rows[0].id;
    }
    if (user.secretariaNome) {
      const sNome = String(user.secretariaNome).trim();
      let [rows]: any = await mysqlPool.query(
        'SELECT id FROM sigem_secretarias WHERE LOWER(nome) = LOWER(?) OR LOWER(sigla) = LOWER(?) LIMIT 1',
        [sNome, sNome]
      );
      if (rows && rows.length > 0) return rows[0].id;

      [rows] = await mysqlPool.query(
        'SELECT id FROM sigem_secretarias WHERE ? LIKE CONCAT("%", sigla, "%") OR LOWER(nome) LIKE CONCAT("%", LOWER(?), "%") LIMIT 1',
        [sNome, sNome]
      );
      if (rows && rows.length > 0) return rows[0].id;
    }
  } catch (err: any) {
    console.warn('[SIGEM] Erro ao mapear secretaria do usuário:', err.message);
  }
  return null;
}

// Alias de retrocompatibilidade
export const getSqliteSecretariaId = getSigemSecretariaId;

/**
 * 🔒 RBAC SETORIAL: Verifica se o usuário tem permissão para editar/excluir o equipamento
 */
export async function userCanManageEquipamento(
  user: any,
  equipamentoId: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (!user) {
    return { allowed: false, reason: 'Usuário não autenticado.' };
  }
  if (user.role === 'admin') {
    return { allowed: true };
  }

  const userSecId = await getSigemSecretariaId(user);
  if (!userSecId) {
    return { allowed: false, reason: 'Secretaria do usuário logado não identificada no banco.' };
  }

  try {
    // 1. Verifica se o equipamento pertence diretamente à secretaria do usuário
    const [relRows]: any = await mysqlPool.query(
      `SELECT count(*) as total 
       FROM equipamento_secretarias 
       WHERE equipamento_id = ? AND secretaria_id = ?`,
      [equipamentoId, userSecId]
    );

    if (relRows && relRows[0]?.total > 0) {
      return { allowed: true };
    }

    // 2. Fallback por categoria
    const [equipRows]: any = await mysqlPool.query(
      'SELECT categoria_id FROM equipamentos WHERE id = ?',
      [equipamentoId]
    );
    if (equipRows && equipRows.length > 0) {
      const equip = equipRows[0];
      if (userSecId === 1 && (equip.categoria_id === 2 || equip.categoria_id === 3)) return { allowed: true };
      if (userSecId === 2 && equip.categoria_id === 4) return { allowed: true };
      if (userSecId === 4 && equip.categoria_id === 5) return { allowed: true };
      if (userSecId === 3 && equip.categoria_id === 6) return { allowed: true };
    }

    const [secRows]: any = await mysqlPool.query(
      'SELECT sigla, nome FROM sigem_secretarias WHERE id = ?',
      [userSecId]
    );
    const secName = secRows && secRows.length > 0 ? (secRows[0].sigla || secRows[0].nome) : 'sua secretaria';

    return {
      allowed: false,
      reason: `Acesso negado: Você só possui permissão para editar ou excluir equipamentos sob gestão da sua secretaria (${secName}).`
    };
  } catch (err: any) {
    return { allowed: false, reason: 'Erro ao verificar permissões de acesso: ' + err.message };
  }
}

async function syncFilesFromDatabase() {
  try {
    await runSigemExport();
  } catch (err: any) {
    console.error('⚠️ [Erro ao sincronizar exportações SIGEM]:', err.message);
  }
}

// ------------------------------------------
// 1. HEALTHCHECK
// ------------------------------------------
sigemRouter.get('/health', async (_req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  let totalEquipamentos = 0;

  try {
    const [rows]: any = await mysqlPool.query('SELECT count(*) as total FROM vw_equipamentos_consolidada');
    dbStatus = 'connected';
    totalEquipamentos = rows[0]?.total || 0;
  } catch (e: any) {
    dbStatus = `error: ${e.message}`;
  }

  res.json({
    status: 'online',
    app: 'SIGEM — Duque de Caxias (Portal Unificado)',
    versao: '3.0.0 (MySQL 8)',
    uptime_segundos: Math.floor(process.uptime()),
    memoria: process.memoryUsage(),
    banco_de_dados: {
      status: dbStatus,
      engine: 'MySQL 8 (InnoDb)',
      banco: 'carta_de_servico',
      total_equipamentos: totalEquipamentos,
    },
    timestamp: new Date().toISOString(),
  });
});

// ------------------------------------------
// 2. ESTATÍSTICAS
// ------------------------------------------
sigemRouter.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [totRows]: any = await mysqlPool.query('SELECT count(*) as total FROM vw_equipamentos_consolidada');
    const total = totRows[0]?.total || 0;

    const [porDistrito]: any = await mysqlPool.query(`
      SELECT distrito, count(*) as total 
      FROM vw_equipamentos_consolidada 
      GROUP BY distrito 
      ORDER BY distrito ASC
    `);

    const [porCategoria]: any = await mysqlPool.query(`
      SELECT categoria, count(*) as total 
      FROM vw_equipamentos_consolidada 
      GROUP BY categoria 
      ORDER BY total DESC
    `);

    const [hubRows]: any = await mysqlPool.query('SELECT count(*) as total FROM hubs_predios');
    const totalHubs = hubRows[0]?.total || 0;

    res.json({
      total_equipamentos: total,
      total_hubs: totalHubs,
      por_distrito: porDistrito,
      por_categoria: porCategoria,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------
// 2.2. GEOCODIFICAÇÃO UNIFICADA (GOOGLE ROOFTOP + NOMINATIM + POLÍGONOS)
// ------------------------------------------
sigemRouter.get(['/geocode', '/sigem/geocode'], async (req: Request, res: Response) => {
  try {
    const address = req.query.address ? String(req.query.address) : undefined;
    const logradouro = req.query.logradouro ? String(req.query.logradouro) : undefined;
    const numero = req.query.numero ? String(req.query.numero) : undefined;
    const bairro = req.query.bairro ? String(req.query.bairro) : undefined;
    const distrito = req.query.distrito ? Number(req.query.distrito) : undefined;
    const name = req.query.name ? String(req.query.name) : undefined;
    const userKey = req.query.key ? String(req.query.key).trim() : undefined;

    if (!address && !logradouro && !name) {
      return res.status(400).json({ error: 'Informe ao menos o endereço, logradouro ou nome para geocodificação.' });
    }

    const result = await geocodeLocation({
      address,
      logradouro,
      numero,
      bairro,
      distrito,
      name,
      userKey,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Erro no serviço de geocodificação: ' + err.message });
  }
});

// ------------------------------------------
// 3. LISTA DE EQUIPAMENTOS (FILTROS COMPLETOS)
// ------------------------------------------
sigemRouter.get('/equipamentos', async (req: Request, res: Response) => {
  const { categoria, distrito, distrito_oficial, bairro, bairro_oficial, hub_id, secretaria_id, secretaria_sigla, q, limit, offset } = req.query;
  let sql = 'SELECT * FROM vw_equipamentos_consolidada WHERE 1=1';
  const params: any[] = [];

  if (categoria) {
    sql += ' AND categoria = ?';
    params.push(categoria);
  }
  if (distrito) {
    sql += ' AND distrito = ?';
    params.push(Number(distrito));
  }
  if (distrito_oficial) {
    sql += ' AND distrito_oficial LIKE ?';
    params.push(`%${distrito_oficial}%`);
  }
  if (bairro) {
    sql += ' AND (bairro LIKE ? OR bairro_oficial LIKE ?)';
    params.push(`%${bairro}%`, `%${bairro}%`);
  }
  if (bairro_oficial) {
    sql += ' AND bairro_oficial LIKE ?';
    params.push(`%${bairro_oficial}%`);
  }
  if (hub_id) {
    sql += ' AND hub_id = ?';
    params.push(Number(hub_id));
  }
  if (secretaria_id) {
    sql += ' AND (secretaria_id = ? OR secretaria_mysql_id = ?)';
    params.push(Number(secretaria_id), Number(secretaria_id));
  }
  if (secretaria_sigla) {
    sql += ' AND secretaria_sigla = ?';
    params.push(String(secretaria_sigla).trim());
  }
  if (q) {
    sql += ' AND (nome LIKE ? OR sigla LIKE ? OR endereco LIKE ? OR bairro LIKE ? OR bairro_oficial LIKE ? OR telefone LIKE ? OR email LIKE ? OR secretaria_sigla LIKE ? OR secretaria_nome LIKE ?)';
    const term = `%${q}%`;
    params.push(term, term, term, term, term, term, term, term, term);
  }

  sql += ' ORDER BY id ASC';

  if (limit) {
    sql += ' LIMIT ?';
    params.push(Number(limit));
    if (offset) {
      sql += ' OFFSET ?';
      params.push(Number(offset));
    }
  }

  try {
    const [rows]: any = await mysqlPool.query(sql, params);
    res.json({
      total_resultados: rows.length,
      data: rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------
// 3.1. LISTA DE SECRETARIAS (COM TOTAL DE EQUIPAMENTOS)
// ------------------------------------------
sigemRouter.get('/secretarias', async (_req: Request, res: Response) => {
  try {
    const [rows]: any = await mysqlPool.query(`
      SELECT s.id, s.mysql_id, s.sigla, s.nome, count(es.equipamento_id) as total_equipamentos
      FROM sigem_secretarias s
      LEFT JOIN equipamento_secretarias es ON s.id = es.secretaria_id AND es.principal = 1
      GROUP BY s.id, s.mysql_id, s.sigla, s.nome
      ORDER BY total_equipamentos DESC, s.nome ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------
// 4. DETALHE DE UM EQUIPAMENTO
// ------------------------------------------
sigemRouter.get('/equipamentos/:id', async (req: Request, res: Response) => {
  const paramId = req.params.id;

  try {
    let [rows]: any = await mysqlPool.query('SELECT * FROM vw_equipamentos_consolidada WHERE id = ?', [paramId]);
    if ((!rows || rows.length === 0) && !isNaN(Number(paramId))) {
      [rows] = await mysqlPool.query('SELECT * FROM vw_equipamentos_consolidada WHERE id = ?', [`rec_${paramId}`]);
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Equipamento não encontrado' });
    }

    const equip = rows[0];
    const equipId = equip.id;

    const [telefones]: any = await mysqlPool.query(
      'SELECT tipo, ddd, numero, principal, whatsapp FROM equipamento_telefones WHERE equipamento_id = ?',
      [equipId]
    );

    const [emails]: any = await mysqlPool.query(
      'SELECT tipo, email, principal FROM equipamento_emails WHERE equipamento_id = ?',
      [equipId]
    );

    const [secretarias]: any = await mysqlPool.query(`
      SELECT s.id, s.nome, s.sigla, es.tipo_relacao
      FROM equipamento_secretarias es
      JOIN sigem_secretarias s ON s.id = es.secretaria_id
      WHERE es.equipamento_id = ?
    `, [equipId]);

    const [servicos]: any = await mysqlPool.query(`
      SELECT s.id, s.nome, s.descricao, c.nome as categoria
      FROM equipamento_servicos es
      JOIN servicos s ON s.id = es.servico_id
      LEFT JOIN categorias c ON c.id = s.categoria_id
      WHERE es.equipamento_id = ?
    `, [equipId]);

    res.json({
      ...equip,
      contatos: {
        telefones,
        emails,
      },
      secretarias,
      servicos_ofertados: servicos,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------
// 5. CADASTRO DE EQUIPAMENTO (CREATE)
// ------------------------------------------
sigemRouter.post('/equipamentos', authenticateToken, async (req: RequestWithUser, res: Response) => {
  const body = req.body;
  const nome = body.nome;

  if (!nome || !nome.trim()) {
    return res.status(400).json({ error: 'O campo "nome" é obrigatório.' });
  }

  const conn = await mysqlPool.getConnection();
  try {
    await conn.beginTransaction();

    const catId = body.categoria_id ? Number(body.categoria_id) : await resolveCategoriaId(body.categoria);
    const bId = body.bairro_id ? Number(body.bairro_id) : await resolveBairroId(body.bairro, body.distrito);

    const logradouro = body.logradouro || body.endereco || 'Endereço não informado';
    const numero = body.numero || 's/nº';
    const complemento = body.complemento || '';
    const cep = body.cep || '25000-000';
    const latitude = body.latitude !== undefined ? Number(body.latitude) : (body.lat !== undefined ? Number(body.lat) : null);
    const longitude = body.longitude !== undefined ? Number(body.longitude) : (body.lon !== undefined ? Number(body.lon) : null);
    const finalHubId = await resolveHubId(body.hub_id);

    const validPrecisao = ['NUMERO_EXATO', 'APROXIMADO_LOGRADOURO', 'CENTROIDE_BAIRRO', 'ESTIMADO'];
    const precisaoFinal = validPrecisao.includes(body.precisao_geo) ? body.precisao_geo : 'APROXIMADO_LOGRADOURO';
    const statusFinal = body.status ? body.status.trim() : 'Ativo';
    const bairroOficial = body.bairro_oficial ? String(body.bairro_oficial).trim() : null;
    const distritoOficial = body.distrito_oficial ? String(body.distrito_oficial).trim() : null;

    const [endResult]: any = await conn.query(`
      INSERT INTO enderecos (bairro_id, logradouro, numero, complemento, cep, latitude, longitude, precisao_geo, bairro_oficial, distrito_oficial, criado_em)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [bId, logradouro, numero, complemento, cep, latitude, longitude, precisaoFinal, bairroOficial, distritoOficial]);
    
    const enderecoId = Number(endResult.insertId);

    let novoId = body.id ? String(body.id).trim() : '';
    if (novoId) {
      const [existe]: any = await conn.query('SELECT id FROM equipamentos WHERE id = ?', [novoId]);
      if (existe && existe.length > 0) {
        novoId = `rec_${Date.now().toString(36)}_${Math.floor(Math.random() * 1000)}`;
      }
    } else {
      const [maxRecRows]: any = await conn.query('SELECT count(*) as total FROM equipamentos');
      const maxRec = maxRecRows[0]?.total || 0;
      novoId = `rec_${Date.now().toString(36)}_${maxRec + 1}`;
    }

    await conn.query(`
      INSERT INTO equipamentos (id, nome, sigla, categoria_id, endereco_id, hub_id, predio_sala, status, horario_funcionamento, descricao, codigo_cnes, codigo_inep, criado_em, atualizado_em)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      novoId,
      nome.trim(),
      body.sigla ? body.sigla.trim() : '',
      catId,
      enderecoId,
      finalHubId,
      body.predio_sala || '',
      statusFinal,
      body.horario_funcionamento || '',
      body.descricao || '',
      body.codigo_cnes || null,
      body.codigo_inep || null
    ]);

    if (body.telefone) {
      await conn.query(`
        INSERT INTO equipamento_telefones (equipamento_id, ddd, numero, tipo, principal, whatsapp)
        VALUES (?, '21', ?, 'GERAL', 1, 0)
      `, [novoId, String(body.telefone).trim()]);
    }

    if (body.email) {
      await conn.query(`
        INSERT INTO equipamento_emails (equipamento_id, email, tipo, principal)
        VALUES (?, ?, 'GERAL', 1)
      `, [novoId, String(body.email).trim()]);
    }

    // 🏛️ Vincula automaticamente a Secretaria do Usuário / Solicitada
    const user = req.user;
    const userSecId = await getSigemSecretariaId(user);
    let targetSecId = (user?.role === 'admin' && body.secretaria_id) 
      ? Number(body.secretaria_id) 
      : userSecId;

    if (!targetSecId) {
      if (catId === 2 || catId === 3) targetSecId = 1; // SMS
      else if (catId === 4) targetSecId = 2; // SMEDC
      else if (catId === 5) targetSecId = 4; // FUNDEC
      else if (catId === 6) targetSecId = 3; // SEASDIH
      else targetSecId = 5; // SMG
    }

    await conn.query(`
      INSERT INTO equipamento_secretarias (equipamento_id, secretaria_id, tipo_relacao, principal, inicio_vigencia)
      VALUES (?, ?, 'GESTAO_PRINCIPAL', 1, CURDATE())
    `, [novoId, targetSecId]);

    await registrarAuditoria('equipamentos', novoId, 'INSERT', null, { nome, categoria_id: catId, endereco_id: enderecoId, status: statusFinal, secretaria_id: targetSecId }, req.user?.username || 'SISTEMA_API', 1, req);

    await conn.commit();
    conn.release();

    await syncFilesFromDatabase();

    const [createdRows]: any = await mysqlPool.query('SELECT * FROM vw_equipamentos_consolidada WHERE id = ?', [novoId]);
    res.status(201).json({
      success: true,
      message: 'Equipamento cadastrado com sucesso no MySQL',
      data: createdRows[0] || null,
    });
  } catch (err: any) {
    try { await conn.rollback(); } catch (_) {}
    conn.release();
    res.status(500).json({ error: 'Erro ao cadastrar equipamento: ' + err.message });
  }
});

// ------------------------------------------
// 6. ATUALIZAÇÃO DE EQUIPAMENTO (UPDATE)
// ------------------------------------------
sigemRouter.put('/equipamentos/:id', authenticateToken, async (req: RequestWithUser, res: Response) => {
  const paramId = req.params.id;

  try {
    let [rows]: any = await mysqlPool.query('SELECT * FROM equipamentos WHERE id = ?', [paramId]);
    if ((!rows || rows.length === 0) && !isNaN(Number(paramId))) {
      [rows] = await mysqlPool.query('SELECT * FROM equipamentos WHERE id = ?', [`rec_${paramId}`]);
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Equipamento não encontrado para atualização.' });
    }

    const anterior = rows[0];
    const equipId = anterior.id;

    // 🔒 Checagem de Autorização Setorial / Secretaria
    const authCheck = await userCanManageEquipamento(req.user, equipId);
    if (!authCheck.allowed) {
      return res.status(403).json({ error: authCheck.reason });
    }

    const body = req.body;
    const conn = await mysqlPool.getConnection();
    try {
      await conn.beginTransaction();

      const nome = body.nome !== undefined ? body.nome.trim() : anterior.nome;
      const sigla = body.sigla !== undefined ? body.sigla.trim() : anterior.sigla;
      let categoria_id = anterior.categoria_id;
      if (body.categoria_id !== undefined) {
        categoria_id = Number(body.categoria_id);
      } else if (body.categoria !== undefined) {
        categoria_id = await resolveCategoriaId(body.categoria);
      }

      let hub_id = anterior.hub_id;
      if (body.hub_id !== undefined) {
        hub_id = await resolveHubId(body.hub_id);
      }

      const predio_sala = body.predio_sala !== undefined ? body.predio_sala : anterior.predio_sala;
      const status = body.status !== undefined ? body.status : anterior.status;
      const horario = body.horario_funcionamento !== undefined ? body.horario_funcionamento : anterior.horario_funcionamento;
      const descricao = body.descricao !== undefined ? body.descricao : anterior.descricao;
      const codigo_cnes = body.codigo_cnes !== undefined ? body.codigo_cnes : anterior.codigo_cnes;
      const codigo_inep = body.codigo_inep !== undefined ? body.codigo_inep : anterior.codigo_inep;

      await conn.query(`
        UPDATE equipamentos
        SET nome = ?, sigla = ?, categoria_id = ?, hub_id = ?, predio_sala = ?, status = ?, horario_funcionamento = ?, descricao = ?, codigo_cnes = ?, codigo_inep = ?, atualizado_em = NOW()
        WHERE id = ?
      `, [nome, sigla, categoria_id, hub_id, predio_sala, status, horario, descricao, codigo_cnes, codigo_inep, equipId]);

      if (anterior.endereco_id) {
        const [endRows]: any = await conn.query('SELECT * FROM enderecos WHERE id = ?', [anterior.endereco_id]);
        if (endRows && endRows.length > 0) {
          const endAtual = endRows[0];
          let bId = endAtual.bairro_id;
          if (body.bairro_id !== undefined) {
            bId = Number(body.bairro_id);
          } else if (body.bairro !== undefined) {
            bId = await resolveBairroId(body.bairro, body.distrito);
          }

          const logradouro = body.logradouro !== undefined ? body.logradouro : (body.endereco !== undefined ? body.endereco : endAtual.logradouro);
          const numero = body.numero !== undefined ? body.numero : endAtual.numero;
          const complemento = body.complemento !== undefined ? body.complemento : endAtual.complemento;
          const cep = body.cep !== undefined ? body.cep : endAtual.cep;
          const latitude = body.latitude !== undefined ? Number(body.latitude) : (body.lat !== undefined ? Number(body.lat) : endAtual.latitude);
          const longitude = body.longitude !== undefined ? Number(body.longitude) : (body.lon !== undefined ? Number(body.lon) : endAtual.longitude);
          const bairroOficial = body.bairro_oficial !== undefined ? body.bairro_oficial : endAtual.bairro_oficial;
          const distritoOficial = body.distrito_oficial !== undefined ? body.distrito_oficial : endAtual.distrito_oficial;

          const validPrecisao = ['NUMERO_EXATO', 'APROXIMADO_LOGRADOURO', 'CENTROIDE_BAIRRO', 'ESTIMADO'];
          const precisaoGeo = (body.precisao_geo && validPrecisao.includes(body.precisao_geo)) ? body.precisao_geo : endAtual.precisao_geo;

          await conn.query(`
            UPDATE enderecos
            SET logradouro = ?, numero = ?, complemento = ?, cep = ?, latitude = ?, longitude = ?, bairro_id = ?, bairro_oficial = ?, distrito_oficial = ?, precisao_geo = ?
            WHERE id = ?
          `, [logradouro, numero, complemento, cep, latitude, longitude, bId, bairroOficial, distritoOficial, precisaoGeo, anterior.endereco_id]);
        }
      }

      if (body.telefone !== undefined) {
        const [telRows]: any = await conn.query('SELECT id FROM equipamento_telefones WHERE equipamento_id = ? AND principal = 1', [equipId]);
        if (telRows && telRows.length > 0) {
          await conn.query('UPDATE equipamento_telefones SET numero = ? WHERE id = ?', [body.telefone, telRows[0].id]);
        } else if (body.telefone) {
          await conn.query("INSERT INTO equipamento_telefones (equipamento_id, ddd, numero, principal) VALUES (?, '21', ?, 1)", [equipId, body.telefone]);
        }
      }

      if (body.email !== undefined) {
        const [emailRows]: any = await conn.query('SELECT id FROM equipamento_emails WHERE equipamento_id = ? AND principal = 1', [equipId]);
        if (emailRows && emailRows.length > 0) {
          await conn.query('UPDATE equipamento_emails SET email = ? WHERE id = ?', [body.email, emailRows[0].id]);
        } else if (body.email) {
          await conn.query("INSERT INTO equipamento_emails (equipamento_id, email, principal) VALUES (?, ?, 1)", [equipId, body.email]);
        }
      }

      // Se admin forneceu nova secretaria responsável, atualiza relação
      if (req.user?.role === 'admin' && body.secretaria_id !== undefined) {
        const newSecId = Number(body.secretaria_id);
        const [secExistRows]: any = await conn.query('SELECT id FROM equipamento_secretarias WHERE equipamento_id = ? AND principal = 1', [equipId]);
        if (secExistRows && secExistRows.length > 0) {
          await conn.query('UPDATE equipamento_secretarias SET secretaria_id = ? WHERE id = ?', [newSecId, secExistRows[0].id]);
        } else {
          await conn.query("INSERT INTO equipamento_secretarias (equipamento_id, secretaria_id, tipo_relacao, principal, inicio_vigencia) VALUES (?, ?, 'GESTAO_PRINCIPAL', 1, CURDATE())", [equipId, newSecId]);
        }
      }

      await registrarAuditoria('equipamentos', equipId, 'UPDATE', anterior, body, req.user?.username || 'SISTEMA_API', 1, req);
      await conn.commit();
      conn.release();

      await syncFilesFromDatabase();

      const [atualizadoRows]: any = await mysqlPool.query('SELECT * FROM vw_equipamentos_consolidada WHERE id = ?', [equipId]);
      res.json({
        success: true,
        message: 'Equipamento atualizado com sucesso no MySQL',
        data: atualizadoRows[0] || null,
      });
    } catch (err: any) {
      try { await conn.rollback(); } catch (_) {}
      conn.release();
      res.status(500).json({ error: 'Erro ao atualizar equipamento: ' + err.message });
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao processar equipamento: ' + err.message });
  }
});

// ------------------------------------------
// 7. EXCLUSÃO DE EQUIPAMENTO (DELETE)
// ------------------------------------------
sigemRouter.delete('/equipamentos/:id', authenticateToken, async (req: RequestWithUser, res: Response) => {
  const paramId = req.params.id;
  const hardDelete = req.query.hard === 'true';

  try {
    let [rows]: any = await mysqlPool.query('SELECT * FROM equipamentos WHERE id = ?', [paramId]);
    if ((!rows || rows.length === 0) && !isNaN(Number(paramId))) {
      [rows] = await mysqlPool.query('SELECT * FROM equipamentos WHERE id = ?', [`rec_${paramId}`]);
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Equipamento não encontrado para exclusão.' });
    }

    const equip = rows[0];
    const equipId = equip.id;

    // 🔒 Checagem de Autorização Setorial / Secretaria
    const authCheck = await userCanManageEquipamento(req.user, equipId);
    if (!authCheck.allowed) {
      return res.status(403).json({ error: authCheck.reason });
    }

    const conn = await mysqlPool.getConnection();
    try {
      await conn.beginTransaction();

      if (hardDelete) {
        await conn.query('DELETE FROM equipamento_telefones WHERE equipamento_id = ?', [equipId]);
        await conn.query('DELETE FROM equipamento_emails WHERE equipamento_id = ?', [equipId]);
        await conn.query('DELETE FROM equipamento_secretarias WHERE equipamento_id = ?', [equipId]);
        await conn.query('DELETE FROM equipamento_servicos WHERE equipamento_id = ?', [equipId]);
        await conn.query('DELETE FROM service_locations WHERE equipamento_id = ?', [equipId]);
        await conn.query('DELETE FROM equipamentos WHERE id = ?', [equipId]);
        await registrarAuditoria('equipamentos', equipId, 'DELETE', equip, { action: 'HARD_DELETE' }, req.user?.username || 'SISTEMA_API', 1, req);
      } else {
        await conn.query("UPDATE equipamentos SET status = 'INATIVO', atualizado_em = NOW() WHERE id = ?", [equipId]);
        await registrarAuditoria('equipamentos', equipId, 'UPDATE', equip, { status: 'INATIVO', action: 'SOFT_DELETE' }, req.user?.username || 'SISTEMA_API', 1, req);
      }

      await conn.commit();
      conn.release();

      await syncFilesFromDatabase();

      res.json({
        success: true,
        message: hardDelete ? 'Equipamento excluído permanentemente do MySQL.' : 'Equipamento inativado com sucesso no MySQL.',
        id: equipId,
      });
    } catch (err: any) {
      try { await conn.rollback(); } catch (_) {}
      conn.release();
      res.status(500).json({ error: 'Erro ao excluir equipamento: ' + err.message });
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao localizar equipamento: ' + err.message });
  }
});

// ------------------------------------------
// 8. CONSULTAS AUXILIARES
// ------------------------------------------
sigemRouter.get('/distritos', async (_req: Request, res: Response) => {
  try {
    const [distritos]: any = await mysqlPool.query(`
      SELECT d.*, count(e.id) as total_equipamentos
      FROM distritos d
      LEFT JOIN bairros b ON b.distrito_id = d.numero
      LEFT JOIN enderecos ed ON ed.bairro_id = b.id
      LEFT JOIN equipamentos e ON e.endereco_id = ed.id
      GROUP BY d.id, d.numero, d.nome, d.sede
      ORDER BY d.numero ASC
    `);
    res.json(distritos);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

sigemRouter.get('/bairros', async (req: Request, res: Response) => {
  const { distrito } = req.query;
  let sql = 'SELECT * FROM bairros';
  const params: any[] = [];

  if (distrito) {
    sql += ' WHERE distrito_id = ?';
    params.push(Number(distrito));
  }
  sql += ' ORDER BY distrito_id ASC, nome ASC';

  try {
    const [bairros]: any = await mysqlPool.query(sql, params);
    res.json({
      total: bairros.length,
      data: bairros,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

sigemRouter.get('/categorias', async (_req: Request, res: Response) => {
  try {
    const [categorias]: any = await mysqlPool.query('SELECT * FROM categorias ORDER BY nome ASC');
    res.json(categorias);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

sigemRouter.post('/categorias', authenticateToken, async (req: RequestWithUser, res: Response) => {
  const { nome, macrosetor, icone, cor_hex } = req.body || {};
  const cleanNome = (nome || '').trim();
  const cleanMacro = (macrosetor || 'Administração e Serviços').trim();
  const cleanIcone = (icone || 'ri-folder-line').trim();
  const cleanCor = (cor_hex || '#3b82f6').trim();

  if (!cleanNome) {
    return res.status(400).json({ error: 'O nome da categoria é obrigatório.' });
  }

  try {
    const [existing]: any = await mysqlPool.query('SELECT id, nome FROM categorias WHERE LOWER(nome) = LOWER(?)', [cleanNome]);
    if (existing && existing.length > 0) {
      return res.status(409).json({ error: `A categoria "${cleanNome}" já existe cadastrada no sistema.` });
    }

    const [result]: any = await mysqlPool.query(
      'INSERT INTO categorias (nome, macrosetor, icone, cor_hex) VALUES (?, ?, ?, ?)',
      [cleanNome, cleanMacro, cleanIcone, cleanCor]
    );
    const newId = Number(result.insertId);

    await registrarAuditoria('categorias', String(newId), 'INSERT', null, { id: newId, nome: cleanNome, macrosetor: cleanMacro, icone: cleanIcone, cor_hex: cleanCor }, req.user?.username || 'admin', 1, req);

    res.status(201).json({
      success: true,
      message: `Categoria "${cleanNome}" criada com sucesso!`,
      categoria: {
        id: newId,
        nome: cleanNome,
        macrosetor: cleanMacro,
        icone: cleanIcone,
        cor_hex: cleanCor,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

sigemRouter.get('/hubs', async (_req: Request, res: Response) => {
  try {
    const [hubs]: any = await mysqlPool.query(`
      SELECT h.*, count(e.id) as total_ocupantes
      FROM hubs_predios h
      LEFT JOIN equipamentos e ON e.hub_id = h.id
      GROUP BY h.id, h.codigo_hub, h.nome, h.tipo, h.endereco_id, h.distrito_id, h.bairro_id, h.descricao, h.criado_em, h.atualizado_em
      ORDER BY h.id ASC
    `);
    res.json(hubs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------
// 9. AUDITORIA
// ------------------------------------------
sigemRouter.get('/auditoria', authenticateToken, async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 100, 300);
  const offset = Number(req.query.offset) || 0;
  const tabela = req.query.tabela;
  const operacao = req.query.operacao;
  const q = req.query.q;

  const whereClauses: string[] = [];
  const params: any[] = [];

  if (tabela) {
    whereClauses.push('tabela_afetada = ?');
    params.push(tabela);
  }
  if (operacao) {
    whereClauses.push('operacao = ?');
    params.push(operacao);
  }
  if (q) {
    whereClauses.push('(usuario LIKE ? OR registro_id LIKE ? OR dados_novos LIKE ? OR dados_anteriores LIKE ? OR ip LIKE ? OR dispositivo LIKE ? OR localizacao LIKE ?)');
    const term = `%${q}%`;
    params.push(term, term, term, term, term, term, term);
  }

  const whereSql = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';
  const countSql = `SELECT count(*) as total FROM auditoria${whereSql}`;
  const sql = `SELECT * FROM auditoria${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`;

  try {
    const [totalRows]: any = await mysqlPool.query(countSql, params);
    const total = totalRows[0]?.total || 0;
    const [logs]: any = await mysqlPool.query(sql, [...params, limit, offset]);

    res.json({
      total,
      limit,
      offset,
      logs,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------
// 10. EXPORTAÇÃO CENTRALIZADA
// ------------------------------------------
sigemRouter.post('/export', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const stats = await runSigemExport();
    res.json({
      success: true,
      message: 'Exportação centralizada executada com sucesso a partir do MySQL oficial.',
      stats,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Falha na exportação centralizada: ' + err.message });
  }
});
