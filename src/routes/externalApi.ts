import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { requireApiKey, RequestWithApiKey } from '../middlewares/apiKeyAuth';
import mysqlPool from '../database/mysql';

export const externalApiRouter = Router();

// ==========================================
// 🔑 GESTÃO DIRETA DE CHAVES NO PORTAL (/docs)
// ==========================================

/**
 * Listar todas as chaves cadastradas para o gerenciador da página docs
 */
externalApiRouter.get('/chaves', async (_req: Request, res: Response) => {
  try {
    const [keys]: any = await mysqlPool.query(`
      SELECT 
        id,
        chave,
        nome_cliente,
        email_cliente,
        orgao_empresa,
        limite_req_minuto,
        limite_req_dia,
        total_requisicoes,
        status,
        ultimo_acesso,
        criado_em,
        notas
      FROM api_keys
      ORDER BY id DESC
    `);

    res.json({ success: true, total: keys.length, data: keys });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Erro ao listar chaves: ' + err.message });
  }
});

/**
 * Gerar e ativar uma nova chave permanente diretamente pela página docs
 */
externalApiRouter.post('/chaves', async (req: Request, res: Response) => {
  try {
    const { nome_cliente, email_cliente, orgao_empresa, notas } = req.body || {};

    const nome = (nome_cliente && String(nome_cliente).trim()) || 'Desenvolvedor Autorizado';
    const email = (email_cliente && String(email_cliente).trim()) || 'dev@duquedecaxias.rj.gov.br';
    const orgao = (orgao_empresa && String(orgao_empresa).trim()) || 'Prefeitura Municipal / Parceiro';

    // Gera chave permanente segura (não expira)
    const chave = `pmdc_live_${crypto.randomBytes(20).toString('hex')}`;

    const limitMin = 120; // 120 req/min
    const limitDia = 50000; // 50.000 req/dia

    const [result]: any = await mysqlPool.query(`
      INSERT INTO api_keys (
        chave, nome_cliente, email_cliente, orgao_empresa,
        limite_req_minuto, limite_req_dia, status, notas
      ) VALUES (?, ?, ?, ?, ?, ?, 'ATIVO', ?)
    `, [
      chave,
      nome,
      email,
      orgao,
      limitMin,
      limitDia,
      notas ? String(notas).trim() : 'Chave permanente gerada via Portal do Desenvolvedor'
    ]);

    const newId = Number(result.insertId);

    res.status(201).json({
      success: true,
      message: 'Chave de API gerada com sucesso! Ela é permanente e já está ativa para uso.',
      data: {
        id: newId,
        chave,
        nome_cliente: nome,
        email_cliente: email,
        orgao_empresa: orgao,
        limite_req_minuto: limitMin,
        limite_req_dia: limitDia,
        status: 'ATIVO',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Erro ao gerar chave: ' + err.message });
  }
});

/**
 * Excluir permanentemente uma chave de API pelo gerenciador da página docs
 */
externalApiRouter.delete('/chaves/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, error: 'ID de chave inválido.' });
    }

    const [rows]: any = await mysqlPool.query('SELECT * FROM api_keys WHERE id = ?', [id]);
    const current = rows[0];
    if (!current) {
      return res.status(404).json({ success: false, error: 'Chave não encontrada no banco.' });
    }

    await mysqlPool.query('DELETE FROM api_keys WHERE id = ?', [id]);

    res.json({
      success: true,
      message: `Chave [${current.chave.slice(0, 15)}...] de "${current.nome_cliente}" foi excluída com sucesso.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Erro ao excluir chave: ' + err.message });
  }
});

// A partir daqui, todas as consultas abaixo exigem uma Chave de API válida
externalApiRouter.use(requireApiKey);

// ==========================================
// 1. INFORMAÇÕES DA CREDENCIAL / QUOTA (ME)
// ==========================================
externalApiRouter.get('/me', (req: RequestWithApiKey, res: Response) => {
  res.json({
    success: true,
    client: req.apiKeyClient,
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 2. CARTA DE SERVIÇOS AO CIDADÃO
// ==========================================

/**
 * Listagem paginada e filtrada de serviços públicos municipais
 */
externalApiRouter.get('/servicos', async (req: RequestWithApiKey, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const offset = (page - 1) * limit;

    const { q, secretaria_id, secretaria, categoria_id, publico, canal } = req.query;

    let whereClause = "WHERE (s.status = 'published' OR s.status IS NULL) AND s.status NOT IN ('hidden', 'draft', 'archived')";
    const params: any[] = [];

    if (q) {
      whereClause += ' AND (s.name LIKE ? OR s.description LIKE ? OR s.who_can_request LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    if (secretaria_id) {
      whereClause += ' AND s.secretaria_id = ?';
      params.push(Number(secretaria_id));
    }

    if (secretaria) {
      whereClause += ' AND (sec.code LIKE ? OR sec.name LIKE ?)';
      params.push(`%${secretaria}%`, `%${secretaria}%`);
    }

    if (categoria_id) {
      whereClause += ' AND s.id IN (SELECT service_id FROM service_categories WHERE category_id = ?)';
      params.push(Number(categoria_id));
    }

    if (publico) {
      whereClause += ' AND s.who_can_request LIKE ?';
      params.push(`%${publico}%`);
    }

    if (canal) {
      whereClause += ' AND s.how_to_access LIKE ?';
      params.push(`%${canal}%`);
    }

    // Contagem total
    const [countRows]: any = await mysqlPool.query(
      `SELECT COUNT(DISTINCT s.id) as total 
       FROM services s 
       LEFT JOIN secretarias sec ON s.secretaria_id = sec.id 
       ${whereClause}`,
      params
    );
    const total = countRows[0]?.total || 0;

    // Registros da página
    const [rows]: any = await mysqlPool.query(
      `SELECT 
         s.id,
         s.name as titulo,
         s.description as descricao,
         s.who_can_request as publico_alvo,
         s.how_to_access as formato_atendimento,
         s.waiting_time as tempo_espera,
         s.max_deadline as prazo_maximo,
         s.cost as custos_taxas,
         s.regulation_norm as fundamentacao_legal,
         s.address as endereco_atendimento,
         s.created_at as data_criacao,
         s.updated_at as data_atualizacao,
         sec.id as secretaria_id,
         sec.name as secretaria_nome,
         sec.code as secretaria_sigla
       FROM services s
       LEFT JOIN secretarias sec ON s.secretaria_id = sec.id
       ${whereClause}
       ORDER BY s.name ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: rows,
    });
  } catch (err: any) {
    console.error('[ExternalAPI /servicos] Erro:', err);
    res.status(500).json({ success: false, error: 'Falha ao consultar serviços municipais: ' + err.message });
  }
});

/**
 * Detalhes completos de um serviço público
 */
externalApiRouter.get('/servicos/:id', async (req: RequestWithApiKey, res: Response) => {
  try {
    const serviceId = Number(req.params.id);
    if (!serviceId || isNaN(serviceId)) {
      return res.status(400).json({ success: false, error: 'ID de serviço inválido.' });
    }

    const [rows]: any = await mysqlPool.query(
      `SELECT 
         s.*,
         sec.name as secretaria_nome,
         sec.code as secretaria_sigla
       FROM services s
       LEFT JOIN secretarias sec ON s.secretaria_id = sec.id
       WHERE s.id = ? 
         AND (s.status = 'published' OR s.status IS NULL)
         AND s.status NOT IN ('hidden', 'draft', 'archived')`,
      [serviceId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Serviço público não encontrado.' });
    }

    const service = rows[0];

    // Consultar etapas, documentos, canais e categorias em paralelo
    const [
      [steps],
      [documents],
      [phones],
      [emails],
      [links],
      [categories],
      [priorities],
    ]: any = await Promise.all([
      mysqlPool.query('SELECT step_number, description FROM service_steps WHERE service_id = ? ORDER BY step_number ASC', [serviceId]),
      mysqlPool.query('SELECT document_name FROM service_documents WHERE service_id = ?', [serviceId]),
      mysqlPool.query('SELECT phone FROM service_phones WHERE service_id = ?', [serviceId]),
      mysqlPool.query('SELECT email FROM service_emails WHERE service_id = ?', [serviceId]),
      mysqlPool.query('SELECT link FROM service_links WHERE service_id = ?', [serviceId]),
      mysqlPool.query('SELECT c.id, c.name FROM service_categories sc JOIN categories c ON sc.category_id = c.id WHERE sc.service_id = ?', [serviceId]),
      mysqlPool.query('SELECT priority_name FROM service_priorities WHERE service_id = ?', [serviceId]),
    ]);

    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({
      success: true,
      data: {
        id: service.id,
        titulo: service.name,
        descricao: service.description,
        publico_alvo: service.who_can_request,
        formato_atendimento: service.how_to_access,
        tempo_espera: service.waiting_time,
        prazo_maximo: service.max_deadline,
        custos_taxas: service.cost,
        fundamentacao_legal: service.regulation_norm,
        endereco_atendimento: service.address,
        secretaria: {
          id: service.secretaria_id,
          nome: service.secretaria_nome,
          sigla: service.secretaria_sigla,
          email: service.secretaria_email,
          telefone: service.secretaria_telefone,
          endereco: service.secretaria_endereco,
        },
        categorias: categories,
        etapas: steps.map((s: any) => s.description),
        documentos_exigidos: documents.map((d: any) => d.document_name),
        prioridades: priorities.map((p: any) => p.priority_name),
        canais_atendimento: {
          telefones: phones.map((p: any) => p.phone),
          emails: emails.map((e: any) => e.email),
          links: links.map((l: any) => l.link),
        },
      },
    });
  } catch (err: any) {
    console.error('[ExternalAPI /servicos/:id] Erro:', err);
    res.status(500).json({ success: false, error: 'Falha ao buscar detalhes do serviço: ' + err.message });
  }
});

// ==========================================
// 3. SIGEM (EQUIPAMENTOS E PRÉDIOS PÚBLICOS)
// ==========================================

/**
 * Listagem paginada e filtrada dos 466 equipamentos públicos com coordenadas GPS
 */
externalApiRouter.get('/equipamentos', async (req: RequestWithApiKey, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const offset = (page - 1) * limit;

    const { q, distrito, bairro, categoria, hub_id, secretaria_id, precisao_geo, status } = req.query;

    let whereSql = 'WHERE 1=1';
    const params: any[] = [];

    if (q) {
      whereSql += ' AND (nome LIKE ? OR sigla LIKE ? OR logradouro LIKE ? OR bairro LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }

    if (status) {
      whereSql += ' AND status = ?';
      params.push(String(status));
    }

    if (distrito) {
      whereSql += ' AND distrito = ?';
      params.push(Number(distrito));
    }

    if (bairro) {
      whereSql += ' AND (bairro LIKE ? OR bairro_oficial LIKE ?)';
      params.push(`%${bairro}%`, `%${bairro}%`);
    }

    if (categoria) {
      whereSql += ' AND categoria LIKE ?';
      params.push(`%${categoria}%`);
    }

    if (hub_id) {
      whereSql += ' AND hub_id = ?';
      params.push(String(hub_id));
    }

    if (secretaria_id) {
      whereSql += ' AND (secretaria_id = ? OR secretaria_mysql_id = ?)';
      params.push(Number(secretaria_id), Number(secretaria_id));
    }

    if (precisao_geo) {
      whereSql += ' AND precisao_geo = ?';
      params.push(String(precisao_geo));
    }

    const [countRows]: any = await mysqlPool.query(
      `SELECT count(*) as total FROM vw_equipamentos_consolidada ${whereSql}`,
      params
    );
    const total = countRows[0]?.total || 0;

    const [rows]: any = await mysqlPool.query(`
      SELECT 
        id,
        nome,
        sigla,
        categoria,
        distrito,
        distrito_oficial,
        bairro,
        bairro_oficial,
        logradouro,
        numero,
        complemento,
        endereco as endereco_completo,
        cep,
        predio_sala,
        telefone,
        email,
        horario_funcionamento,
        lat as latitude,
        lon as longitude,
        precisao_geo,
        hub_id,
        hub_nome,
        secretaria_sigla,
        secretaria_nome
      FROM vw_equipamentos_consolidada
      ${whereSql}
      ORDER BY nome ASC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: rows,
    });
  } catch (err: any) {
    console.error('[ExternalAPI /equipamentos] Erro:', err);
    res.status(500).json({ success: false, error: 'Falha ao consultar equipamentos: ' + err.message });
  }
});

/**
 * Detalhes de um equipamento público específico por ID
 */
externalApiRouter.get('/equipamentos/:id', async (req: RequestWithApiKey, res: Response) => {
  try {
    const eqId = String(req.params.id);
    const [rows]: any = await mysqlPool.query(
      'SELECT * FROM vw_equipamentos_consolidada WHERE id = ?',
      [eqId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Equipamento público não encontrado.' });
    }

    const row = rows[0];

    // Busca contatos adicionais
    const [telefones]: any = await mysqlPool.query(
      'SELECT tipo, numero, principal FROM equipamento_telefones WHERE equipamento_id = ?',
      [eqId]
    );
    const [emails]: any = await mysqlPool.query(
      'SELECT tipo, email, principal FROM equipamento_emails WHERE equipamento_id = ?',
      [eqId]
    );

    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({
      success: true,
      data: {
        ...row,
        latitude: row.lat,
        longitude: row.lon,
        telefones,
        emails,
      },
    });
  } catch (err: any) {
    console.error('[ExternalAPI /equipamentos/:id] Erro:', err);
    res.status(500).json({ success: false, error: 'Falha ao buscar equipamento: ' + err.message });
  }
});

// ==========================================
// 4. TABELAS DE APOIO E TERRITÓRIO
// ==========================================

/**
 * 4 Distritos Administrativos de Duque de Caxias
 */
externalApiRouter.get('/distritos', async (req: RequestWithApiKey, res: Response) => {
  try {
    const [rows]: any = await mysqlPool.query('SELECT id, numero, nome FROM distritos ORDER BY numero ASC');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({ success: true, total: rows.length, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Falha ao listar distritos: ' + err.message });
  }
});

/**
 * 118 Bairros Oficiais vinculados a seus distritos
 */
externalApiRouter.get('/bairros', async (req: RequestWithApiKey, res: Response) => {
  try {
    const [rows]: any = await mysqlPool.query(`
      SELECT b.id, b.nome, d.numero as distrito_numero, d.nome as distrito_nome
      FROM bairros b
      JOIN distritos d ON b.distrito_id = d.id
      ORDER BY d.numero ASC, b.nome ASC
    `);

    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({ success: true, total: rows.length, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Falha ao listar bairros: ' + err.message });
  }
});

/**
 * 18 Secretarias e Órgãos Municipais
 */
externalApiRouter.get('/secretarias', async (req: RequestWithApiKey, res: Response) => {
  try {
    const [rows]: any = await mysqlPool.query(
      'SELECT id, name as nome, code as sigla FROM secretarias ORDER BY name ASC'
    );
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({ success: true, total: rows.length, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Falha ao listar secretarias: ' + err.message });
  }
});

/**
 * 12 Hubs e Polos Prediais Administrativos
 */
externalApiRouter.get('/hubs', async (req: RequestWithApiKey, res: Response) => {
  try {
    const [rows]: any = await mysqlPool.query(
      'SELECT id, codigo_hub, nome, tipo_imovel, capacidade, status, descricao FROM hubs_predios ORDER BY id ASC'
    );
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({ success: true, total: rows.length, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Falha ao listar hubs: ' + err.message });
  }
});

/**
 * Estatísticas e Indicadores Gerais
 */
externalApiRouter.get('/estatisticas', async (req: RequestWithApiKey, res: Response) => {
  try {
    const [
      [[servCount]],
      [[secCount]],
      [[eqRow]],
      [[distRow]],
      [[bairroRow]],
      [[comRow]],
      [[compRow]],
      [[ruasRow]]
    ]: any = await Promise.all([
      mysqlPool.query("SELECT COUNT(*) as total FROM services WHERE status = 'published'"),
      mysqlPool.query('SELECT COUNT(*) as total FROM secretarias'),
      mysqlPool.query('SELECT count(*) as total FROM equipamentos'),
      mysqlPool.query('SELECT count(*) as total FROM distritos'),
      mysqlPool.query('SELECT count(*) as total FROM bairros'),
      mysqlPool.query('SELECT count(*) as total FROM comunidades'),
      mysqlPool.query('SELECT count(*) as total FROM complexos'),
      mysqlPool.query('SELECT count(*) as total FROM comunidade_ruas')
    ]);

    res.setHeader('Cache-Control', 'public, max-age=120');
    res.json({
      success: true,
      municipio: 'Prefeitura Municipal de Duque de Caxias - RJ',
      dados: {
        total_servicos_publicados: servCount?.total || 0,
        total_equipamentos_georreferenciados: eqRow?.total || 0,
        total_secretarias: secCount?.total || 0,
        total_distritos: distRow?.total || 0,
        total_bairros: bairroRow?.total || 0,
        total_linhas_onibus: 20,
        total_paradas_onibus: 1795,
        total_comunidades: comRow?.total || 0,
        total_complexos: compRow?.total || 0,
        total_ruas_comunidades: ruasRow?.total || 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Falha ao calcular estatísticas: ' + err.message });
  }
});

// ==========================================
// 5. COMUNIDADES, FAVELAS E COMPLEXOS (SIMAC)
// ==========================================

/**
 * Listagem paginada e filtrada das 105 comunidades e favelas mapeadas
 */
externalApiRouter.get('/comunidades', async (req: RequestWithApiKey, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(150, Math.max(1, parseInt(String(req.query.limit || '50'), 10)));
    const offset = (page - 1) * limit;

    const { q, complexo, distrito } = req.query;

    let whereSql = 'WHERE 1=1';
    const params: any[] = [];

    if (q) {
      whereSql += ' AND (nome LIKE ? OR complexo LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }

    if (complexo) {
      whereSql += ' AND complexo = ?';
      params.push(String(complexo));
    }

    if (distrito) {
      whereSql += ' AND distrito LIKE ?';
      params.push(`%${distrito}%`);
    }

    const [countRows]: any = await mysqlPool.query(
      `SELECT count(*) as total FROM comunidades ${whereSql}`,
      params
    );
    const total = countRows[0]?.total || 0;

    const [rows]: any = await mysqlPool.query(`
      SELECT 
        id, nome, complexo, cor_hex, distrito, latitude, longitude,
        ids_social, classe_prioridade, origem_cartografica, total_ruas
      FROM comunidades
      ${whereSql}
      ORDER BY complexo ASC, nome ASC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    res.setHeader('Cache-Control', 'public, max-age=180');
    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: rows,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Falha ao consultar comunidades: ' + err.message });
  }
});

/**
 * Detalhes de uma comunidade específica com ruas e CEPs
 */
externalApiRouter.get('/comunidades/:id', async (req: RequestWithApiKey, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [rows]: any = await mysqlPool.query('SELECT * FROM comunidades WHERE id = ?', [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Comunidade não encontrada' });
    }

    const [ruasRows]: any = await mysqlPool.query('SELECT nome_rua FROM comunidade_ruas WHERE comunidade_id = ? ORDER BY nome_rua ASC', [id]);
    const ruas = ruasRows.map((r: any) => r.nome_rua);

    const [ceps]: any = await mysqlPool.query('SELECT cep, logradouro, bairro, localidade, uf, ibge, ddd FROM comunidade_ceps WHERE comunidade_id = ?', [id]);

    res.setHeader('Cache-Control', 'public, max-age=180');
    res.json({
      success: true,
      data: {
        ...rows[0],
        ruas,
        ceps,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Falha ao consultar comunidade: ' + err.message });
  }
});

/**
 * Grandes Complexos Territoriais de Duque de Caxias
 */
externalApiRouter.get('/complexos', async (req: RequestWithApiKey, res: Response) => {
  try {
    const [rows]: any = await mysqlPool.query('SELECT id, nome, cor_hex, distrito, total_comunidades, total_ruas FROM complexos ORDER BY total_comunidades DESC');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({ success: true, total: rows.length, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Falha ao consultar complexos: ' + err.message });
  }
});
