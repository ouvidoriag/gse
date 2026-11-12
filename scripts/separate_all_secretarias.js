const mysql = require('mysql2/promise');
const { getSqliteDb } = require('../dist/database/sqlite.js');
require('dotenv').config();

const NEW_SECRETARIAS = [
  {
    name: 'Secretaria Municipal de Habitação',
    code: 'SECRETARIA_MUNICIPAL_DE_HABITACAO',
    sigla: 'SMH',
    titular: 'Titular da Habitação',
    email: 'smh@duquedecaxias.rj.gov.br',
    telefone: '(21) 96557-7062',
    categoryName: 'Habitação',
    services: [
      {
        name: 'Regularização Fundiária Urbana (REURB)',
        description: 'Processo de titulação e legitimação de posse de imóveis urbanos para famílias de interesse social em áreas consolidadas.',
        how_to_access: 'Atendimento presencial no Polo Integrado Jardim Primavera - Alameda Bartolomeu Gusmão, 85.',
        address: 'Alameda Bartolomeu Gusmão, 85 - Jardim Primavera, Duque de Caxias - RJ',
        who_can_request: 'Moradores de núcleos urbanos informais consolidados no município.',
        waiting_time: '30 dias úteis',
        max_deadline: '90 dias úteis',
        cost: 'Gratuito',
        regulation_norm: 'Lei Federal nº 13.465/2017 e legislação municipal correlata.'
      }
    ]
  },
  {
    name: 'Secretaria Municipal de Trabalho, Emprego e Renda',
    code: 'SECRETARIA_MUNICIPAL_DE_TRABALHO_EMPREGO_E_RENDA',
    sigla: 'SMTER',
    titular: 'Michaell Cezar Soares França',
    email: 'smter.gabinete@duquedecaxias.rj.gov.br',
    telefone: '(21) 2772-7200',
    categoryName: 'Trabalho, Emprego e Renda',
    services: [
      {
        name: 'Intermediação de Mão de Obra e Balcão de Empregos (SINE)',
        description: 'Cadastro de trabalhadores, triagem de currículos e encaminhamento para vagas de emprego ofertadas pelo mercado em Duque de Caxias e região metropolitana.',
        how_to_access: 'Atendimento presencial no Posto Central do SINE - Rua Major Frazão, 52, 25 de Agosto.',
        address: 'Rua Major Frazão, 52 - 25 de Agosto, Duque de Caxias - RJ',
        who_can_request: 'Qualquer cidadão em busca de colocação ou recolocação no mercado de trabalho.',
        waiting_time: 'Imediato (por ordem de chegada)',
        max_deadline: '5 dias úteis',
        cost: 'Gratuito',
        regulation_norm: 'Lei Federal nº 7.998/1990 (Programa Seguro-Desemprego e SINE).'
      },
      {
        name: 'Habilitação ao Seguro-Desemprego e Suporte à Carteira de Trabalho Digital',
        description: 'Requerimento de seguro-desemprego para trabalhadores dispensados sem justa causa e auxílio no acesso e emissão da CTPS Digital.',
        how_to_access: 'Presencialmente nos postos do SINE com agendamento prévio ou ordem de chegada.',
        address: 'Rua Major Frazão, 52 - 25 de Agosto, Duque de Caxias - RJ',
        who_can_request: 'Trabalhadores demitidos sem justa causa com documentação rescisória.',
        waiting_time: 'Imediato',
        max_deadline: '3 dias úteis',
        cost: 'Gratuito',
        regulation_norm: 'Resolução CODEFAT vigente.'
      }
    ]
  },
  {
    name: 'Gabinete do Prefeito',
    code: 'GABINETE_DO_PREFEITO',
    sigla: 'GP',
    titular: 'Jonathas Rego Monteiro Porto Neto',
    email: 'prefeito.duquedecaxias@gmail.com',
    telefone: '(21) 2772-7200',
    categoryName: 'Gabinete do Prefeito',
    services: [
      {
        name: 'Audiências Institucionais e Despachos Oficiais do Prefeito',
        description: 'Agendamento de audiências institucionais, protocolo de correspondências oficiais e representação do Chefe do Executivo Municipal.',
        how_to_access: 'Protocolo geral no Paço Municipal - Alameda Esmeralda, 206, Jardim Primavera.',
        address: 'Alameda Esmeralda, 206 - Jardim Primavera, Duque de Caxias - RJ',
        who_can_request: 'Entidades da sociedade civil organizada, autoridades públicas e cidadãos.',
        waiting_time: '15 dias úteis',
        max_deadline: '30 dias úteis',
        cost: 'Gratuito',
        regulation_norm: 'Lei Orgânica Municipal de Duque de Caxias.'
      }
    ]
  },
  {
    name: 'Gabinete da Vice-Prefeita',
    code: 'GABINETE_DA_VICE_PREFEITA',
    sigla: 'GVP',
    titular: 'Aline Ferreira Batista Ribeiro',
    email: 'viceprefeitaalinedoaureo@gmail.com',
    telefone: '(21) 2772-7200',
    categoryName: 'Gabinete da Vice-Prefeita',
    services: [
      {
        name: 'Articulação Comunitária e Atendimento a Demandas Distritais',
        description: 'Acolhimento de lideranças comunitárias e interlocução junto às secretarias municipais para resolução de demandas regionais.',
        how_to_access: 'Atendimento no Paço Municipal - Alameda Esmeralda, 206, Jardim Primavera.',
        address: 'Alameda Esmeralda, 206 - Jardim Primavera, Duque de Caxias - RJ',
        who_can_request: 'Lideranças de bairros, associações de moradores e munícipes em geral.',
        waiting_time: '10 dias úteis',
        max_deadline: '20 dias úteis',
        cost: 'Gratuito',
        regulation_norm: 'Estrutura Administrativa Municipal.'
      }
    ]
  },
  {
    name: 'Secretaria Municipal de Controle Interno',
    code: 'SECRETARIA_MUNICIPAL_DE_CONTROLE_INTERNO',
    sigla: 'SECIN',
    titular: 'Patrícia Lucia Coll',
    email: 'secoin@duquedecaxias.rj.gov.br',
    telefone: '(21) 2772-7200',
    categoryName: 'Controle Interno',
    services: [
      {
        name: 'Auditoria Cidadã e Orientação sobre Conformidade de Gastos Públicos',
        description: 'Fiscalização da regularidade dos atos da administração direta e indireta e fiscalização preventiva da aplicação de recursos municipais.',
        how_to_access: 'Alameda Esmeralda, 206 - Jardim Primavera ou via e-mail institucional.',
        address: 'Alameda Esmeralda, 206 - Jardim Primavera, Duque de Caxias - RJ',
        who_can_request: 'Cidadãos, órgãos de controle externo e servidores municipais.',
        waiting_time: '15 dias úteis',
        max_deadline: '30 dias úteis',
        cost: 'Gratuito',
        regulation_norm: 'Lei Municipal de Controle Interno e art. 74 da CF/88.'
      }
    ]
  },
  {
    name: 'Secretaria Municipal da Criança, Adolescente e Idoso',
    code: 'SECRETARIA_MUNICIPAL_DA_CRIANCA_ADOLESCENTE_E_IDOSO',
    sigla: 'SMCAI',
    titular: 'Maria Landerleide de Assis Duarte',
    email: 'vereadoraleide@gmail.com',
    telefone: '(21) 98410-5189',
    categoryName: 'Criança, Adolescente e Idoso',
    services: [
      {
        name: 'Acolhimento e Orientação a Vítimas de Violação de Direitos (Criança e Idoso)',
        description: 'Atendimento psicossocial, orientação jurídica inicial e articulação com a rede protetiva e Conselhos Tutelares para proteção integral.',
        how_to_access: 'Atendimento presencial na Rua Major Frazão, 52 - 25 de Agosto.',
        address: 'Rua Major Frazão, 52 - 25 de Agosto, Duque de Caxias - RJ',
        who_can_request: 'Crianças, adolescentes, pessoas idosas e seus familiares ou responsáveis legais.',
        waiting_time: 'Imediato para casos graves',
        max_deadline: '5 dias úteis',
        cost: 'Gratuito',
        regulation_norm: 'Estatuto da Criança e do Adolescente (ECA) e Estatuto da Pessoa Idosa.'
      }
    ]
  },
  {
    name: 'Secretaria Municipal de Atenção à Pessoa com Deficiência',
    code: 'SECRETARIA_MUNICIPAL_DE_ATENCAO_A_PESSOA_COM_DEFICIENCIA',
    sigla: 'SMAPD',
    titular: 'Secretário da Pessoa com Deficiência',
    email: 'pcd@duquedecaxias.rj.gov.br',
    telefone: '(21) 2772-7200',
    categoryName: 'Atenção à Pessoa com Deficiência',
    services: [
      {
        name: 'Carteira de Identificação da Pessoa com Deficiência e Autismo (CIPTEA/PcD)',
        description: 'Emissão da carteira oficial de identificação municipal que garante atendimento prioritário e acesso facilitado aos serviços públicos e privados.',
        how_to_access: 'Presencial na Rua Bernardino Machado, 946 - Parque Lafaiete.',
        address: 'Rua Bernardino Machado, 946 - Parque Lafaiete, Duque de Caxias - RJ',
        who_can_request: 'Pessoas com deficiência física, intelectual, visual, auditiva ou Transtorno do Espectro Autista residentes em Duque de Caxias.',
        waiting_time: '15 dias úteis',
        max_deadline: '30 dias úteis',
        cost: 'Gratuito',
        regulation_norm: 'Lei Federal nº 13.977/2020 (Lei Romeo Mion) e legislação municipal correlata.'
      }
    ]
  },
  {
    name: 'Secretaria Municipal de Comunicação Social e Relações Públicas',
    code: 'SECRETARIA_MUNICIPAL_DE_COMUNICACAO_SOCIAL',
    sigla: 'SMCSRP',
    titular: 'Douglas Rhanieri Machado dos Santos',
    email: 'imprensa@duquedecaxias.rj.gov.br',
    telefone: '(21) 2652-3835',
    categoryName: 'Comunicação Social',
    services: [
      {
        name: 'Credenciamento de Imprensa e Acesso a Notícias Oficiais do Município',
        description: 'Credenciamento de profissionais de comunicação, agendamento de entrevistas com secretários e divulgação dos atos oficiais da PMDC.',
        how_to_access: 'Alameda Esmeralda, 206 - Jardim Primavera ou via e-mail imprensa@duquedecaxias.rj.gov.br.',
        address: 'Alameda Esmeralda, 206 - Jardim Primavera, Duque de Caxias - RJ',
        who_can_request: 'Veículos de comunicação, jornalistas, comunicadores comunitários e sociedade em geral.',
        waiting_time: '2 dias úteis',
        max_deadline: '5 dias úteis',
        cost: 'Gratuito',
        regulation_norm: 'Regimento Interno da PMDC.'
      }
    ]
  },
  {
    name: 'Secretaria Municipal de Articulação Institucional',
    code: 'SECRETARIA_MUNICIPAL_DE_ARTICULACAO_INSTITUCIONAL',
    sigla: 'SMAI',
    titular: 'Douglas Rhanieri Machado dos Santos',
    email: 'gabinete@duquedecaxias.rj.gov.br',
    telefone: '(21) 2772-7200',
    categoryName: 'Articulação Institucional',
    services: [
      {
        name: 'Gestão de Convênios Federativos e Parcerias Interinstitucionais',
        description: 'Acompanhamento de convênios com o Governo Federal e Estadual, consórcios intermunicipais e parcerias público-privadas de grande impacto.',
        how_to_access: 'Alameda Esmeralda, 206 - Jardim Primavera.',
        address: 'Alameda Esmeralda, 206 - Jardim Primavera, Duque de Caxias - RJ',
        who_can_request: 'Órgãos governamentais, entidades conveniadas e concessionárias de serviços públicos.',
        waiting_time: '10 dias úteis',
        max_deadline: '30 dias úteis',
        cost: 'Gratuito',
        regulation_norm: 'Legislação federal e municipal sobre transferências voluntárias.'
      }
    ]
  },
  {
    name: 'Secretaria Municipal de Eficiência e Inovação na Gestão Pública',
    code: 'SECRETARIA_MUNICIPAL_DE_EFICIENCIA_E_INOVACAO',
    sigla: 'SMEI',
    titular: 'Titular da Inovação',
    email: 'inovacao@duquedecaxias.rj.gov.br',
    telefone: '(21) 2772-7200',
    categoryName: 'Eficiência e Inovação',
    services: [
      {
        name: 'Modernização Administrativa e Apoio à Transformação Digital dos Serviços',
        description: 'Projetos de simplificação de rotinas, desburocratização de processos administrativos e integração de canais de atendimento digital.',
        how_to_access: 'Paço Municipal - Alameda Esmeralda, 206, Jardim Primavera.',
        address: 'Alameda Esmeralda, 206 - Jardim Primavera, Duque de Caxias - RJ',
        who_can_request: 'Servidores municipais, órgãos setoriais e gestores de projetos estratégicos.',
        waiting_time: '15 dias úteis',
        max_deadline: '30 dias úteis',
        cost: 'Gratuito',
        regulation_norm: 'Decreto Municipal de Modernização da Gestão Pública.'
      }
    ]
  }
];

// Serviços adicionais para as secretarias 19, 20, 21 e 22 (que existiam mas tinham 0 serviços cadastrados)
const SERVICES_FOR_EXISTING = [
  {
    secretariaId: 19, // PGM
    categoryId: 20,
    services: [
      {
        name: 'Consulta e Parcelamento de Débitos Inscritos em Dívida Ativa',
        description: 'Negociação de débitos tributários e não-tributários ajuizados ou inscritos na Dívida Ativa com emissão de guia de parcelamento e termo de acordo.',
        how_to_access: 'Atendimento presencial na Praça Roberto Silveira, 31 - 3º andar, 25 de Agosto.',
        address: 'Praça Roberto Silveira, 31 - 3º andar - 25 de Agosto, Duque de Caxias - RJ',
        who_can_request: 'Contribuinte titular do imóvel/inscrição ou procurador devidamente habilitado.',
        waiting_time: 'Imediato no atendimento presencial',
        max_deadline: '10 dias úteis',
        cost: 'Gratuito para emissão de guias (sujeito aos acréscimos legais do débito)',
        regulation_norm: 'Código Tributário Municipal e Lei Federal nº 6.830/1980.'
      },
      {
        name: 'Emissão de Certidão de Regularidade Fiscal da Dívida Ativa (PGM)',
        description: 'Expedição de certidão negativa, positiva com efeitos de negativa ou positiva de débitos ajuizados de competência da Procuradoria Municipal.',
        how_to_access: 'Presencialmente ou mediante requerimento eletrônico na PGM.',
        address: 'Praça Roberto Silveira, 31 - 3º andar - 25 de Agosto, Duque de Caxias - RJ',
        who_can_request: 'Pessoas físicas e jurídicas com interesse comprovado.',
        waiting_time: '5 dias úteis',
        max_deadline: '10 dias úteis',
        cost: 'Gratuito',
        regulation_norm: 'Código Tributário Nacional e Código Tributário de Duque de Caxias.'
      }
    ]
  },
  {
    secretariaId: 20, // Ouvidoria Geral
    categoryId: 21,
    services: [
      {
        name: 'Atendimento ao Cidadão e Registro de Manifestações (Fala.BR)',
        description: 'Canal oficial de escuta e participação popular para acolhimento de denúncias, reclamações, sugestões, solicitações e elogios relativos a qualquer serviço público municipal.',
        how_to_access: 'Presencial no Paço Municipal (Alameda Esmeralda, 206), por telefone (21) 2652-3835 ou via Fala.BR.',
        address: 'Alameda Esmeralda, 206 - Jardim Primavera, Duque de Caxias - RJ',
        who_can_request: 'Qualquer cidadão, pessoa física ou jurídica.',
        waiting_time: 'Imediato para registro',
        max_deadline: '30 dias (prorrogáveis por mais 30 mediante justificativa)',
        cost: 'Gratuito',
        regulation_norm: 'Lei Federal nº 13.460/2017 (Código de Defesa dos Direitos do Usuário do Serviço Público).'
      },
      {
        name: 'Pedido de Acesso à Informação Pública (e-SIC / LAI)',
        description: 'Requerimento de documentos, dados e relatórios da administração pública municipal em cumprimento à Lei de Acesso à Informação.',
        how_to_access: 'Pelo portal da Transparência, presencialmente na sede da Ouvidoria ou via Fala.BR.',
        address: 'Alameda Esmeralda, 206 - Jardim Primavera, Duque de Caxias - RJ',
        who_can_request: 'Qualquer cidadão sem necessidade de justificar o motivo do pedido.',
        waiting_time: 'Imediato para registro',
        max_deadline: '20 dias (prorrogáveis por 10 dias)',
        cost: 'Gratuito (cobrança apenas de reprodução de cópias físicas, se houver)',
        regulation_norm: 'Lei Federal nº 12.527/2011 (Lei de Acesso à Informação).'
      }
    ]
  },
  {
    secretariaId: 21, // IPMDC
    categoryId: 22,
    services: [
      {
        name: 'Concessão e Fixação de Aposentadoria Municipal (IPMDC)',
        description: 'Processamento, análise de tempo de contribuição e fixação de proventos de aposentadoria para servidores efetivos vinculados ao Regime Próprio de Previdência.',
        how_to_access: 'Atendimento presencial na sede do IPMDC - Rua Marechal Floriano, 555, 25 de Agosto.',
        address: 'Rua Marechal Floriano, 555 - 25 de Agosto, Duque de Caxias - RJ',
        who_can_request: 'Servidores públicos titulares de cargo efetivo da Prefeitura, Câmara e Autarquias.',
        waiting_time: '30 dias úteis',
        max_deadline: '60 dias úteis',
        cost: 'Gratuito',
        regulation_norm: 'Art. 40 da Constituição Federal e Lei Municipal nº 1.542/2000.'
      },
      {
        name: 'Recadastramento Anual Obrigatório (Prova de Vida) e Contracheque de Inativos',
        description: 'Atualização cadastral obrigatória de aposentados e pensionistas no mês de aniversário e emissão de comprovantes de rendimentos para IRPF.',
        how_to_access: 'Presencialmente na sede do IPMDC ou pelo canal previdenciário oficial.',
        address: 'Rua Marechal Floriano, 555 - 25 de Agosto, Duque de Caxias - RJ',
        who_can_request: 'Aposentados e pensionistas do IPMDC.',
        waiting_time: 'Imediato no atendimento presencial',
        max_deadline: '5 dias úteis',
        cost: 'Gratuito',
        regulation_norm: 'Portarias anuais de recadastramento do IPMDC.'
      }
    ]
  },
  {
    secretariaId: 22, // Segurança Pública
    categoryId: 23,
    services: [
      {
        name: 'Ronda Escolar e Patrulhamento Comunitário da Guarda Municipal (Disque 153)',
        description: 'Patrulhamento preventivo em escolas municipais, praças e corredores comerciais, além de apoio em situações de conflito e ordenamento urbano.',
        how_to_access: 'Acionamento emergencial pelo telefone Disque 153 ou (21) 2676-9600.',
        address: 'Rua Coronel João Teles, s/nº (Vila Olímpica) - 25 de Agosto, Duque de Caxias - RJ',
        who_can_request: 'Comunidade escolar, comerciantes, munícipes e órgãos públicos.',
        waiting_time: 'Imediato (em regime de plantão 24 horas)',
        max_deadline: 'Imediato',
        cost: 'Gratuito',
        regulation_norm: 'Lei Federal nº 13.022/2014 (Estatuto Geral das Guardas Municipais).'
      },
      {
        name: 'Segurança Patrimonial e Monitoramento Integrado de Prédios Públicos',
        description: 'Vigilância patrimonial armada e desarmada em equipamentos municipais e monitoramento através da central de videomonitoramento de Duque de Caxias.',
        how_to_access: 'Solicitação formal de órgãos públicos ou atendimento presencial na sede da SMSEG.',
        address: 'Praça Roberto Silveira, 31 - 4º andar - 25 de Agosto, Duque de Caxias - RJ',
        who_can_request: 'Unidades escolares, postos de saúde e secretarias municipais.',
        waiting_time: '5 dias úteis',
        max_deadline: '15 dias úteis',
        cost: 'Gratuito',
        regulation_norm: 'Regimento Interno da SMSEG.'
      }
    ]
  }
];

async function main() {
  console.log('🚀 Iniciando processo de separação e inclusão de todas as secretarias oficiais...');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'carta_de_servico',
    port: Number(process.env.DB_PORT) || 3306
  });

  const sqliteDb = getSqliteDb();

  // 1. Desmembrar Urbanismo e Habitação
  console.log('1️⃣ Ajustando Secretaria Municipal de Urbanismo (id 5)...');
  await conn.query(`
    UPDATE secretarias 
    SET name = 'Secretaria Municipal de Urbanismo', code = 'SECRETARIA_MUNICIPAL_DE_URBANISMO' 
    WHERE id = 5
  `);
  await conn.query(`
    UPDATE categories 
    SET name = 'Urbanismo' 
    WHERE id = 5
  `);

  sqliteDb.prepare(`
    UPDATE secretarias 
    SET nome = 'Secretaria Municipal de Urbanismo', sigla = 'SMU' 
    WHERE mysql_id = 5 OR sigla = 'SMUH'
  `).run();

  sqliteDb.prepare(`
    UPDATE categorias 
    SET nome = 'Urbanismo' 
    WHERE id = 5
  `).run();

  // 2. Inserir as novas secretarias e suas categorias
  for (const item of NEW_SECRETARIAS) {
    // Verificar se já existe no MySQL
    const [existing] = await conn.query('SELECT id FROM secretarias WHERE code = ? OR name = ?', [item.code, item.name]);
    let secId;
    if (existing.length > 0) {
      secId = existing[0].id;
      console.log(`ℹ️ Secretaria "${item.name}" já existe no MySQL com ID ${secId}`);
    } else {
      const [res] = await conn.query('INSERT INTO secretarias (name, code) VALUES (?, ?)', [item.name, item.code]);
      secId = res.insertId;
      console.log(`✅ Secretaria "${item.name}" inserida no MySQL com ID ${secId}`);
    }

    // Categoria correspondente
    const [existingCat] = await conn.query('SELECT id FROM categories WHERE name = ?', [item.categoryName]);
    let catId;
    if (existingCat.length > 0) {
      catId = existingCat[0].id;
      await conn.query('UPDATE categories SET secretaria_id = ? WHERE id = ?', [secId, catId]);
    } else {
      const [catRes] = await conn.query('INSERT INTO categories (name, secretaria_id) VALUES (?, ?)', [item.categoryName, secId]);
      catId = catRes.insertId;
      console.log(`✅ Categoria "${item.categoryName}" inserida no MySQL com ID ${catId} (secretaria_id=${secId})`);
    }

    // Inserir no SQLite
    const sqSec = sqliteDb.prepare('SELECT id FROM secretarias WHERE mysql_id = ? OR sigla = ?').get(secId, item.sigla);
    if (!sqSec) {
      sqliteDb.prepare(`
        INSERT INTO secretarias (sigla, nome, titular, email_gabinete, telefone_gabinete, mysql_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(item.sigla, item.name, item.titular, item.email, item.telefone, secId);
      console.log(`✅ Secretaria "${item.name}" sincronizada no SQLite com sigla ${item.sigla}`);
    }

    const sqCat = sqliteDb.prepare('SELECT id FROM categorias WHERE nome = ?').get(item.categoryName);
    if (!sqCat) {
      sqliteDb.prepare(`INSERT INTO categorias (nome, macrosetor, icone) VALUES (?, 'Gestão e Governo', 'ri-building-line')`).run(item.categoryName);
    }

    // Inserir serviços oficiais
    if (item.services && item.services.length > 0) {
      for (const s of item.services) {
        const [existingSrv] = await conn.query('SELECT id FROM services WHERE name = ?', [s.name]);
        if (existingSrv.length === 0) {
          const [sRes] = await conn.query(`
            INSERT INTO services 
            (secretaria_id, category_id, name, description, how_to_access, address, who_can_request, waiting_time, max_deadline, cost, regulation_norm, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')
          `, [secId, catId, s.name, s.description, s.how_to_access, s.address, s.who_can_request, s.waiting_time, s.max_deadline, s.cost, s.regulation_norm]);

          const newSrvId = sRes.insertId;
          await conn.query('INSERT IGNORE INTO service_categories (service_id, category_id) VALUES (?, ?)', [newSrvId, catId]);
          console.log(`  ➕ Serviço "${s.name}" adicionado à ${item.name} (ID: ${newSrvId})`);
        }
      }
    }

    // Se for Habitação, mover o serviço 44 ("Minha Casa Minha Vida") para Habitação
    if (item.name === 'Secretaria Municipal de Habitação') {
      await conn.query('UPDATE services SET secretaria_id = ?, category_id = ? WHERE id = 44', [secId, catId]);
      await conn.query('UPDATE service_categories SET category_id = ? WHERE service_id = 44', [catId]);
      console.log(`  🏠 Serviço 44 ("Minha Casa Minha Vida") transferido com sucesso para a Secretaria Municipal de Habitação!`);
    }
  }

  // 3. Inserir serviços para as secretarias 19, 20, 21, 22
  console.log('3️⃣ Adicionando serviços oficiais para PGM, Ouvidoria, IPMDC e Segurança Pública...');
  for (const group of SERVICES_FOR_EXISTING) {
    for (const s of group.services) {
      const [existingSrv] = await conn.query('SELECT id FROM services WHERE name = ?', [s.name]);
      if (existingSrv.length === 0) {
        const [sRes] = await conn.query(`
          INSERT INTO services 
          (secretaria_id, category_id, name, description, how_to_access, address, who_can_request, waiting_time, max_deadline, cost, regulation_norm, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')
        `, [group.secretariaId, group.categoryId, s.name, s.description, s.how_to_access, s.address, s.who_can_request, s.waiting_time, s.max_deadline, s.cost, s.regulation_norm]);

        const newSrvId = sRes.insertId;
        await conn.query('INSERT IGNORE INTO service_categories (service_id, category_id) VALUES (?, ?)', [newSrvId, group.categoryId]);
        console.log(`  ➕ Serviço "${s.name}" adicionado com sucesso (ID: ${newSrvId})`);
      }
    }
  }

  // Verificar contagem final
  const [finalSecs] = await conn.query('SELECT COUNT(*) as c FROM secretarias');
  const [finalCats] = await conn.query('SELECT COUNT(*) as c FROM categories');
  const [finalSrvs] = await conn.query('SELECT COUNT(*) as c FROM services WHERE status = "published" OR status IS NULL');
  const [secsWithServices] = await conn.query('SELECT COUNT(DISTINCT secretaria_id) as c FROM services WHERE status = "published" OR status IS NULL');

  console.log('\n--- RESULTADO FINAL NO MYSQL ---');
  console.log(`Total de Secretarias e Órgãos no MySQL: ${finalSecs[0].c}`);
  console.log(`Total de Categorias no MySQL: ${finalCats[0].c}`);
  console.log(`Total de Serviços Publicados: ${finalSrvs[0].c}`);
  console.log(`Secretarias com Serviços Publicados: ${secsWithServices[0].c} de ${finalSecs[0].c}`);

  const sqFinalSecs = sqliteDb.prepare('SELECT COUNT(*) as c FROM secretarias').get();
  console.log(`Total de Secretarias no SQLite: ${sqFinalSecs.c}`);

  await conn.end();
  console.log('✨ Migração concluída com sucesso!');
}

main().catch(err => {
  console.error('❌ Erro na migração:', err);
  process.exit(1);
});
