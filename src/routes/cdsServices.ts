import { Router, Request, Response } from 'express';
import { mysqlPool as pool } from '../database/mysql';
import { authenticateToken, RequestWithUser } from '../middlewares/auth';
import { generateXlsx } from '../services/xlsxGenerator';

export const cdsServicesRouter = Router();
export const servicesRouter = cdsServicesRouter;

// ============================================================================
// ROTAS PÚBLICAS (Sem necessidade de autenticação) - Para cidadãos e futuras APIs
// Serviços com status = 'hidden', 'draft' ou 'archived' NUNCA são expostos externamente!
// ============================================================================
cdsServicesRouter.get('/public', async (req: Request, res: Response) => {
  try {
    const secId = req.query.secretaria_id ? Number(req.query.secretaria_id) : null;
    const catId = req.query.categoria_id ? Number(req.query.categoria_id) : null;
    const search = req.query.search ? String(req.query.search).trim() : null;

    let sql = `
      SELECT s.id, s.name, s.description, s.how_to_access, s.address, s.who_can_request,
             s.waiting_time, s.max_deadline, s.cost, s.regulation_norm, s.status, s.secretaria_id,
             GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR '; ') as categoria_nome,
             GROUP_CONCAT(DISTINCT c.id ORDER BY c.name) as categoria_ids,
             sec.name as secretaria_nome 
      FROM services s
      LEFT JOIN service_categories sc ON s.id = sc.service_id
      LEFT JOIN categories c ON sc.category_id = c.id
      LEFT JOIN secretarias sec ON s.secretaria_id = sec.id
      WHERE (s.status = 'published' OR s.status IS NULL)
        AND s.status NOT IN ('hidden', 'draft', 'archived')
    `;
    const params: any[] = [];

    if (secId) {
      sql += ' AND s.secretaria_id = ?';
      params.push(secId);
    }
    if (catId) {
      sql += ' AND sc.category_id = ?';
      params.push(catId);
    }
    if (search) {
      sql += ' AND (s.name LIKE ? OR s.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' GROUP BY s.id, sec.name ORDER BY s.name ASC';

    const [rows] = await pool.query(sql, params) as any[];
    res.json(rows);
  } catch (err) {
    console.error('Erro na API pública de serviços:', err);
    res.status(500).json({ error: 'Erro ao consultar catálogo público de serviços.' });
  }
});

cdsServicesRouter.get('/public/:id', async (req: Request, res: Response) => {
  try {
    const serviceId = req.params.id;
    const [rows] = await pool.query(
      `SELECT s.*, 
              GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR '; ') as categoria_nome,
              sec.name as secretaria_nome 
       FROM services s
       LEFT JOIN service_categories sc ON s.id = sc.service_id
       LEFT JOIN categories c ON sc.category_id = c.id
       LEFT JOIN secretarias sec ON s.secretaria_id = sec.id
       WHERE s.id = ? 
         AND (s.status = 'published' OR s.status IS NULL)
         AND s.status NOT IN ('hidden', 'draft', 'archived')
       GROUP BY s.id, sec.name`,
      [serviceId]
    ) as any[];

    if (!rows || rows.length === 0) {
      res.status(404).json({ error: 'Serviço público não encontrado ou não está disponível.' });
      return;
    }

    const service = rows[0];
    const [phones] = await pool.query('SELECT phone FROM service_phones WHERE service_id = ?', [serviceId]) as any[];
    const [emails] = await pool.query('SELECT email FROM service_emails WHERE service_id = ?', [serviceId]) as any[];
    const [links] = await pool.query('SELECT link FROM service_links WHERE service_id = ?', [serviceId]) as any[];
    const [steps] = await pool.query('SELECT step_number, description FROM service_steps WHERE service_id = ? ORDER BY step_number ASC', [serviceId]) as any[];
    const [documents] = await pool.query('SELECT document_name FROM service_documents WHERE service_id = ?', [serviceId]) as any[];
    const [priorities] = await pool.query('SELECT priority_name FROM service_priorities WHERE service_id = ?', [serviceId]) as any[];

    res.json({
      ...service,
      telefones: phones.map((p: any) => p.phone),
      emails: emails.map((e: any) => e.email),
      links: links.map((l: any) => l.link),
      passos: steps.map((s: any) => s.description),
      documentos: documents.map((d: any) => d.document_name),
      prioridades: priorities.map((p: any) => p.priority_name),
    });
  } catch (err) {
    console.error('Erro ao detalhar serviço público:', err);
    res.status(500).json({ error: 'Erro ao carregar serviço público.' });
  }
});

// GET /api/cds/services/categories - Retorna todas as categorias públicas
cdsServicesRouter.get('/categories', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT id, name FROM categories ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar categorias:', err);
    res.status(500).json({ error: 'Erro ao carregar categorias.' });
  }
});

// A partir daqui, todos os endpoints administrativos exigem autenticação via Token JWT
cdsServicesRouter.use(authenticateToken);

async function logAudit(
  connection: any,
  serviceId: number,
  userId: number,
  action: string,
  fieldName: string | null,
  oldValue: string | null,
  newValue: string | null,
  ipAddress: string
) {
  try {
    let validUserId = userId;
    if (!validUserId || validUserId <= 0) {
      const [uRows]: any = await connection.query("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1");
      validUserId = uRows && uRows[0]?.id ? uRows[0].id : 19;
    }
    await connection.query(
      `INSERT INTO service_history (service_id, user_id, action, field_name, old_value, new_value, ip_address) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [serviceId, validUserId, action, fieldName, oldValue, newValue, ipAddress]
    );
  } catch (err) {
    console.error('Error writing audit history log:', err);
  }
}

async function saveServiceChildTables(
  connection: any,
  serviceId: number,
  category_ids: number[],
  telefones: string[],
  emails: string[],
  links: string[],
  passos: string[],
  documentos: string[],
  prioridades: string[]
) {
  // 1. Categories (N:N)
  await connection.query('DELETE FROM service_categories WHERE service_id = ?', [serviceId]);
  for (const catId of category_ids) {
    await connection.query('INSERT IGNORE INTO service_categories (service_id, category_id) VALUES (?, ?)', [serviceId, catId]);
  }

  // 2. Telefones
  await connection.query('DELETE FROM service_phones WHERE service_id = ?', [serviceId]);
  for (const t of telefones) {
    if (t.trim()) await connection.query('INSERT INTO service_phones (service_id, phone) VALUES (?, ?)', [serviceId, t.trim()]);
  }

  // 3. Emails
  await connection.query('DELETE FROM service_emails WHERE service_id = ?', [serviceId]);
  for (const e of emails) {
    if (e.trim()) await connection.query('INSERT INTO service_emails (service_id, email) VALUES (?, ?)', [serviceId, e.trim()]);
  }

  // 4. Links
  await connection.query('DELETE FROM service_links WHERE service_id = ?', [serviceId]);
  for (const l of links) {
    if (l.trim()) await connection.query('INSERT INTO service_links (service_id, link) VALUES (?, ?)', [serviceId, l.trim()]);
  }

  // 5. Passos
  await connection.query('DELETE FROM service_steps WHERE service_id = ?', [serviceId]);
  let idx = 1;
  for (const p of passos) {
    if (p.trim()) await connection.query('INSERT INTO service_steps (service_id, step_number, description) VALUES (?, ?, ?)', [serviceId, idx++, p.trim()]);
  }

  // 6. Documentos
  await connection.query('DELETE FROM service_documents WHERE service_id = ?', [serviceId]);
  for (const d of documentos) {
    if (d.trim()) await connection.query('INSERT INTO service_documents (service_id, document_name) VALUES (?, ?)', [serviceId, d.trim()]);
  }

  // 7. Prioridades
  await connection.query('DELETE FROM service_priorities WHERE service_id = ?', [serviceId]);
  for (const p of prioridades) {
    if (p.trim()) await connection.query('INSERT INTO service_priorities (service_id, priority_name) VALUES (?, ?)', [serviceId, p.trim()]);
  }
}

// GET /api/services/export - Exporta os serviços da secretaria em formato Excel (.xlsx)
servicesRouter.get('/export', async (req: RequestWithUser, res: Response) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const secId = req.user?.secretariaId;
    const secName = isAdmin ? 'Consolidado' : (req.user?.secretariaNome || 'Secretaria');

    // 1. Busca os serviços principais do banco (EXCLUINDO serviços ocultos, rascunhos ou arquivados)
    let services;
    if (isAdmin) {
      [services] = await pool.query(
        `SELECT * FROM services 
         WHERE (status = 'published' OR status IS NULL)
           AND status NOT IN ('hidden', 'draft', 'archived')
         ORDER BY id DESC`
      ) as any[];
    } else {
      [services] = await pool.query(
        `SELECT * FROM services 
         WHERE secretaria_id = ? 
           AND (status = 'published' OR status IS NULL)
           AND status NOT IN ('hidden', 'draft', 'archived')
         ORDER BY id DESC`,
        [secId]
      ) as any[];
    }

    // 2. Busca e mapeia os relacionamentos 1:N de cada serviço
    const mappedServices = [];
    for (const s of services) {
      const [phones] = await pool.query('SELECT phone FROM service_phones WHERE service_id = ?', [s.id]) as any[];
      const [emails] = await pool.query('SELECT email FROM service_emails WHERE service_id = ?', [s.id]) as any[];
      const [links] = await pool.query('SELECT link FROM service_links WHERE service_id = ?', [s.id]) as any[];
      const [steps] = await pool.query('SELECT description FROM service_steps WHERE service_id = ? ORDER BY step_number ASC', [s.id]) as any[];
      const [documents] = await pool.query('SELECT document_name FROM service_documents WHERE service_id = ?', [s.id]) as any[];
      const [priorities] = await pool.query('SELECT priority_name FROM service_priorities WHERE service_id = ?', [s.id]) as any[];
      
      let categoryName = '';
      const [cats] = await pool.query(
        `SELECT c.name FROM categories c
         JOIN service_categories sc ON sc.category_id = c.id
         WHERE sc.service_id = ?
         ORDER BY c.name`,
        [s.id]
      ) as any[];
      if (cats.length > 0) {
        categoryName = cats.map((c: any) => c.name).join('; ');
      }

      mappedServices.push({
        servico: s.name || '',
        categoria: categoryName,
        o_que_e: s.description || '',
        como_acessar: s.how_to_access || '',
        endereco: s.address || '',
        telefones: phones.map((p: any) => p.phone),
        emails: emails.map((e: any) => e.email),
        links: links.map((l: any) => l.link),
        passos: steps.map((st: any) => st.description),
        quem_pode_solicitar: s.who_can_request || '',
        documentos: documents.map((d: any) => d.document_name),
        tempo_de_espera: s.waiting_time || '',
        prazo_maximo: s.max_deadline || '',
        prioridade_atendimento: priorities.map((p: any) => p.priority_name),
        quanto_custa: s.cost || '',
        norma_que_regulamenta: s.regulation_norm || '',
      });
    }

    // 3. Gera a planilha em formato Buffer
    const xlsxBuffer = await generateXlsx(secName, mappedServices);

    // 4. Envia o arquivo para download
    const filename = `Carta_Servicos_${secName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(xlsxBuffer);

  } catch (err) {
    console.error('Erro ao exportar serviços para Excel:', err);
    res.status(500).json({ error: 'Erro interno ao exportar serviços para planilha.' });
  }
});

// GET /api/services - Lista todos os serviços da secretaria do usuário logado
servicesRouter.get('/', async (req: RequestWithUser, res: Response) => {
  try {
    let rows;
    if (req.user?.role === 'admin') {
      [rows] = await pool.query(
        `SELECT s.*, 
                GROUP_CONCAT(c.name ORDER BY c.name SEPARATOR '; ') as categoria_nome,
                GROUP_CONCAT(c.id ORDER BY c.name) as categoria_ids,
                sec.name as secretaria_nome 
         FROM services s
         LEFT JOIN service_categories sc ON s.id = sc.service_id
         LEFT JOIN categories c ON sc.category_id = c.id
         LEFT JOIN secretarias sec ON s.secretaria_id = sec.id
         WHERE (s.status IS NULL OR s.status != 'archived')
         GROUP BY s.id, sec.name
         ORDER BY s.id DESC`
      );
    } else {
      const secId = req.user?.secretariaId;
      [rows] = await pool.query(
        `SELECT s.*, 
                GROUP_CONCAT(c.name ORDER BY c.name SEPARATOR '; ') as categoria_nome,
                GROUP_CONCAT(c.id ORDER BY c.name) as categoria_ids
         FROM services s
         LEFT JOIN service_categories sc ON s.id = sc.service_id
         LEFT JOIN categories c ON sc.category_id = c.id
         WHERE s.secretaria_id = ? AND (s.status IS NULL OR s.status != 'archived')
         GROUP BY s.id
         ORDER BY s.id DESC`,
        [secId]
      );
    }

    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar serviços:', err);
    res.status(500).json({ error: 'Erro interno ao listar serviços.' });
  }
});

// GET /api/categories - Retorna todas as categorias disponíveis
servicesRouter.get('/categories', async (req: RequestWithUser, res: Response) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const secId = req.user?.secretariaId;
    let rows;
    if (isAdmin) {
      [rows] = await pool.query('SELECT id, name, secretaria_id FROM categories ORDER BY name ASC');
    } else {
      [rows] = await pool.query(
        'SELECT id, name, secretaria_id FROM categories WHERE secretaria_id = ? OR secretaria_id IS NULL ORDER BY name ASC',
        [secId]
      );
    }
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar categorias:', err);
    res.status(500).json({ error: 'Erro interno ao obter categorias.' });
  }
});

// POST /api/categories - Cria uma nova categoria
servicesRouter.post('/categories', async (req: RequestWithUser, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ error: 'O nome da categoria é obrigatório.' });
      return;
    }

    const secId = req.user?.secretariaId;

    // Verifica se já existe para esta secretaria
    const [existing] = await pool.query(
      'SELECT id FROM categories WHERE name = ? AND (secretaria_id = ? OR secretaria_id IS NULL)',
      [name.trim(), secId]
    ) as any[];
    if (existing.length > 0) {
      res.status(400).json({ error: 'Esta categoria já existe.' });
      return;
    }

    const [result] = await pool.query(
      'INSERT INTO categories (name, secretaria_id) VALUES (?, ?)',
      [name.trim(), secId]
    ) as any;
    res.status(201).json({ id: result.insertId, name: name.trim(), message: 'Categoria criada com sucesso!' });
  } catch (err) {
    console.error('Erro ao criar categoria:', err);
    res.status(500).json({ error: 'Erro interno ao criar categoria.' });
  }
});

// GET /api/services/:id - Detalha um serviço específico
servicesRouter.get('/:id', async (req: RequestWithUser, res: Response) => {
  try {
    const secId = req.user?.secretariaId;
    const serviceId = req.params.id;
    // Busca o serviço com nomes de categorias e secretaria
    let services;
    if (req.user?.role === 'admin') {
      [services] = await pool.query(
        `SELECT s.*, 
                GROUP_CONCAT(DISTINCT sc.category_id) as category_ids,
                GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR '; ') as categoria_nome,
                sec.name as secretaria_nome 
         FROM services s
         LEFT JOIN service_categories sc ON s.id = sc.service_id
         LEFT JOIN categories c ON sc.category_id = c.id
         LEFT JOIN secretarias sec ON s.secretaria_id = sec.id
         WHERE s.id = ?
         GROUP BY s.id, sec.name`,
        [serviceId]
      ) as any[];
    } else {
      [services] = await pool.query(
        `SELECT s.*, 
                GROUP_CONCAT(DISTINCT sc.category_id) as category_ids,
                GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR '; ') as categoria_nome,
                sec.name as secretaria_nome 
         FROM services s
         LEFT JOIN service_categories sc ON s.id = sc.service_id
         LEFT JOIN categories c ON sc.category_id = c.id
         LEFT JOIN secretarias sec ON s.secretaria_id = sec.id
         WHERE s.id = ? AND s.secretaria_id = ?
         GROUP BY s.id, sec.name`,
        [serviceId, secId]
      ) as any[];
    }

    if (services.length === 0) {
      res.status(404).json({ error: 'Serviço não encontrado ou acesso negado.' });
      return;
    }

    const service = services[0];
    const categoryIds = service.category_ids ? service.category_ids.split(',').map(Number) : [];

    // Busca dados das tabelas relacionadas
    const [phones] = await pool.query('SELECT phone FROM service_phones WHERE service_id = ?', [serviceId]) as any[];
    const [emails] = await pool.query('SELECT email FROM service_emails WHERE service_id = ?', [serviceId]) as any[];
    const [links] = await pool.query('SELECT link FROM service_links WHERE service_id = ?', [serviceId]) as any[];
    const [steps] = await pool.query('SELECT step_number, description FROM service_steps WHERE service_id = ? ORDER BY step_number ASC', [serviceId]) as any[];
    const [documents] = await pool.query('SELECT document_name FROM service_documents WHERE service_id = ?', [serviceId]) as any[];
    const [priorities] = await pool.query('SELECT priority_name FROM service_priorities WHERE service_id = ?', [serviceId]) as any[];

    res.json({
      ...service,
      category_ids: categoryIds,
      telefones: phones.map((p: any) => p.phone),
      emails: emails.map((e: any) => e.email),
      links: links.map((l: any) => l.link),
      passos: steps.map((s: any) => s.description),
      documentos: documents.map((d: any) => d.document_name),
      prioridades: priorities.map((p: any) => p.priority_name),
    });  } catch (err) {
    console.error('Erro ao detalhar serviço:', err);
    res.status(500).json({ error: 'Erro interno ao carregar detalhes do serviço.' });
  }
});

// POST /api/services - Cria um novo serviço
servicesRouter.post('/', async (req: RequestWithUser, res: Response) => {
  const connection = await pool.getConnection();
  try {
    const isAdmin = req.user?.role === 'admin';
    const {
      name,
      category_ids = [],
      description,
      how_to_access,
      address,
      who_can_request,
      waiting_time,
      max_deadline,
      cost,
      regulation_norm,
      telefones = [],
      emails = [],
      links = [],
      passos = [],
      documentos = [],
      prioridades = [],
      secretaria_id,
      status = 'published',
    } = req.body;

    const finalSecretariaId = (isAdmin && secretaria_id) ? secretaria_id : req.user?.secretariaId;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'O nome do serviço é obrigatório.' });
      return;
    }

    await connection.beginTransaction();

    // Compatibilidade Fase 1: Grava o primeiro ID da lista no category_id legado
    const legacyCategoryId = category_ids.length > 0 ? category_ids[0] : null;

    // 1. Insere o serviço principal
    const [serviceResult] = await connection.query(
      `INSERT INTO services 
       (secretaria_id, category_id, name, description, how_to_access, address, who_can_request, waiting_time, max_deadline, cost, regulation_norm, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ,[finalSecretariaId, legacyCategoryId, name, description || '', how_to_access || '', address || '', who_can_request || '', waiting_time || '', max_deadline || '', cost || '', regulation_norm || '', status]
    ) as any;

    const serviceId = serviceResult.insertId;

    // 2. Insere tabelas filhas (categorias, contatos, passos, docs, prioridades)
    await saveServiceChildTables(connection, serviceId, category_ids, telefones, emails, links, passos, documentos, prioridades);

    // 8. Grava log de auditoria
    const ip = (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '') as string;
    await logAudit(connection, serviceId, req.user?.id || 0, 'INSERT', null, null, 'Serviço cadastrado no sistema', ip);

    await connection.commit();
    res.status(201).json({ success: true, serviceId, message: 'Serviço cadastrado com sucesso!' });
  } catch (err) {
    await connection.rollback();
    console.error('Erro ao cadastrar serviço:', err);
    res.status(500).json({ error: 'Erro interno ao cadastrar serviço.' });
  } finally {
    connection.release();
  }
});


// PUT /api/services/:id - Atualiza um serviço existente
servicesRouter.put('/:id', async (req: RequestWithUser, res: Response) => {
  const connection = await pool.getConnection();
  try {
    const isAdmin = req.user?.role === 'admin';
    const secId = req.user?.secretariaId;
    const serviceId = req.params.id;
    const {
      name,
      category_ids = [],
      description,
      how_to_access,
      address,
      who_can_request,
      waiting_time,
      max_deadline,
      cost,
      regulation_norm,
      telefones = [],
      emails = [],
      links = [],
      passos = [],
      documentos = [],
      prioridades = [],
      secretaria_id,
      status = 'published',
    } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'O nome do serviço é obrigatório.' });
      return;
    }

    // Valida propriedade
    let existing;
    if (isAdmin) {
      [existing] = await pool.query('SELECT id, secretaria_id FROM services WHERE id = ?', [serviceId]) as any[];
    } else {
      [existing] = await pool.query('SELECT id, secretaria_id FROM services WHERE id = ? AND secretaria_id = ?', [serviceId, secId]) as any[];
    }
    if (existing.length === 0) {
      res.status(404).json({ error: 'Serviço não encontrado ou acesso negado.' });
      return;
    }

    const finalSecretariaId = (isAdmin && secretaria_id) ? secretaria_id : existing[0].secretaria_id;

    // Busca estado anterior para fazer a auditoria fina de alteração
    const [oldRows] = await pool.query('SELECT * FROM services WHERE id = ?', [serviceId]) as any[];
    const oldService = oldRows[0];

    const [oldCats] = await pool.query('SELECT GROUP_CONCAT(category_id ORDER BY category_id) as cat_ids FROM service_categories WHERE service_id = ?', [serviceId]) as any[];
    const oldCatIds = oldCats[0]?.cat_ids || '';

    await connection.beginTransaction();

    // Compatibilidade Fase 1: Grava o primeiro ID da lista no category_id legado
    const legacyCategoryId = category_ids.length > 0 ? category_ids[0] : null;

    // 1. Atualiza dados do serviço principal
    await connection.query(
      `UPDATE services 
       SET category_id = ?, name = ?, description = ?, how_to_access = ?, address = ?, who_can_request = ?, waiting_time = ?, max_deadline = ?, cost = ?, regulation_norm = ?, status = ?, secretaria_id = ?
       WHERE id = ?`,
      [legacyCategoryId, name, description || '', how_to_access || '', address || '', who_can_request || '', waiting_time || '', max_deadline || '', cost || '', regulation_norm || '', status, finalSecretariaId, serviceId]
    );

    // 2. Atualiza tabelas filhas (categorias, contatos, passos, docs, prioridades)
    await saveServiceChildTables(connection, Number(serviceId), category_ids, telefones, emails, links, passos, documentos, prioridades);

    // 8. Rastreia e grava as alterações na auditoria
    const ip = (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '') as string;
    const fieldsToCompare = ['name', 'description', 'how_to_access', 'address', 'who_can_request', 'waiting_time', 'max_deadline', 'cost', 'regulation_norm', 'status', 'secretaria_id'];
    
    for (const field of fieldsToCompare) {
      const oldValue = oldService[field] !== null && oldService[field] !== undefined ? String(oldService[field]) : '';
      const newValue = req.body[field] !== null && req.body[field] !== undefined ? String(req.body[field]) : '';
      if (oldValue !== newValue) {
        await logAudit(connection, Number(serviceId), req.user?.id || 0, 'UPDATE', field, oldValue, newValue, ip);
      }
    }

    // Rastreia mudança nas categorias N:N
    const newCatIds = (category_ids || []).slice().sort().join(',');
    if (oldCatIds !== newCatIds) {
      await logAudit(connection, Number(serviceId), req.user?.id || 0, 'UPDATE', 'category_ids', oldCatIds, newCatIds, ip);
    }

    await connection.commit();
    res.json({ success: true, message: 'Serviço atualizado com sucesso!' });
  } catch (err) {
    await connection.rollback();
    console.error('Erro ao atualizar serviço:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar serviço.' });
  } finally {
    connection.release();
  }
});

// PATCH /api/services/:id/status - Altera status / visibilidade (published / hidden)
servicesRouter.patch('/:id/status', async (req: RequestWithUser, res: Response) => {
  const connection = await pool.getConnection();
  try {
    const isAdmin = req.user?.role === 'admin';
    const secId = req.user?.secretariaId;
    const serviceId = req.params.id;
    const { status } = req.body;

    if (!status || !['published', 'hidden', 'draft', 'archived'].includes(status)) {
      res.status(400).json({ error: 'Status inválido. Use "published" ou "hidden".' });
      return;
    }

    // Valida propriedade
    let existing;
    if (isAdmin) {
      [existing] = await connection.query('SELECT id, name, status, secretaria_id FROM services WHERE id = ?', [serviceId]) as any[];
    } else {
      [existing] = await connection.query('SELECT id, name, status, secretaria_id FROM services WHERE id = ? AND secretaria_id = ?', [serviceId, secId]) as any[];
    }

    if (existing.length === 0) {
      res.status(404).json({ error: 'Serviço não encontrado ou você não tem permissão para alterá-lo.' });
      return;
    }

    const oldStatus = existing[0].status || 'published';
    const serviceName = existing[0].name;

    await connection.beginTransaction();

    await connection.query('UPDATE services SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, serviceId]);

    // Registra alteração na auditoria
    const ip = (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '') as string;
    await logAudit(connection, Number(serviceId), req.user?.id || 0, 'UPDATE', 'status', oldStatus, status, ip);

    await connection.commit();

    const isHidden = status === 'hidden';
    const msg = isHidden
      ? `O serviço "${serviceName}" foi ocultado. Ele não será exportado nem exibido publicamente.`
      : `O serviço "${serviceName}" foi publicado com sucesso no catálogo oficial.`;

    res.json({ success: true, status, message: msg });
  } catch (err) {
    await connection.rollback();
    console.error('Erro ao alternar status do serviço:', err);
    res.status(500).json({ error: 'Erro interno ao alterar status do serviço.' });
  } finally {
    connection.release();
  }
});

// DELETE /api/services/:id - Arquivamento Lógico (Soft Delete) com preservação de auditoria
servicesRouter.delete('/:id', async (req: RequestWithUser, res: Response) => {
  const connection = await pool.getConnection();
  try {
    const isAdmin = req.user?.role === 'admin';
    const secId = req.user?.secretariaId;
    const serviceId = req.params.id;

    // Valida propriedade e existência antes de arquivar
    let existing: any[];
    if (isAdmin) {
      [existing] = await connection.query('SELECT id, name, status, secretaria_id FROM services WHERE id = ? AND (status IS NULL OR status != "archived")', [serviceId]) as any[];
    } else {
      [existing] = await connection.query('SELECT id, name, status, secretaria_id FROM services WHERE id = ? AND secretaria_id = ? AND (status IS NULL OR status != "archived")', [serviceId, secId]) as any[];
    }

    if (!existing || existing.length === 0) {
      res.status(404).json({ error: 'Serviço não encontrado ou acesso negado.' });
      return;
    }

    const oldStatus = existing[0].status || 'published';
    const serviceName = existing[0].name;

    await connection.beginTransaction();

    // Soft delete: preserva a integridade referencial e o histórico de auditoria
    await connection.query('UPDATE services SET status = "archived", updated_at = CURRENT_TIMESTAMP WHERE id = ?', [serviceId]);

    // Grava na trilha de auditoria
    const ip = (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '') as string;
    await logAudit(connection, Number(serviceId), req.user?.id || 0, 'DELETE', 'status', oldStatus, 'archived', ip);

    await connection.commit();
    res.json({ success: true, message: `Serviço "${serviceName}" arquivado e removido com sucesso!` });
  } catch (err) {
    await connection.rollback();
    console.error('Erro ao excluir serviço:', err);
    res.status(500).json({ error: 'Erro interno ao excluir serviço.' });
  } finally {
    connection.release();
  }
});
