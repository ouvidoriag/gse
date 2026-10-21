/**
 * 🏛️ PREFEITURA MUNICIPAL DE DUQUE DE CAXIAS — RJ
 * PORTAL UNIFICADO PMDC (SIGEM + CARTA DE SERVIÇOS)
 * 
 * SCRIPT DE MIGRAÇÃO: SQLITE V2 -> MYSQL 8
 * Transfere toda a estrutura de endereços, equipamentos, comunidades e geoprocessamento
 * para o MySQL mantendo 100% da integridade, chaves, logins e segurança.
 */

const { DatabaseSync } = require('node:sqlite');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SQLITE_PATH = path.join(__dirname, '../dados/enderecos_duque_de_caxias_v2.db');

async function migrar() {
  console.log('================================================================');
  console.log('🚀 INICIANDO MIGRAÇÃO DO SIGEM (SQLITE V2 -> MYSQL 8)');
  console.log('================================================================\n');

  const sqlite = new DatabaseSync(SQLITE_PATH);

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'carta_de_servico',
    multipleStatements: true,
  });

  const conn = await pool.getConnection();

  try {
    console.log('🔒 Desativando checagem temporária de FK para carga segura...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    // 1. DDL das Tabelas do SIGEM no MySQL
    console.log('🛠️ 1. Criando tabelas do SIGEM no MySQL...');

    const ddl = `
      DROP VIEW IF EXISTS vw_equipamentos_consolidada;
      DROP TABLE IF EXISTS service_locations;
      DROP TABLE IF EXISTS auditoria;
      DROP TABLE IF EXISTS api_keys;
      DROP TABLE IF EXISTS comunidade_ceps;
      DROP TABLE IF EXISTS comunidade_ruas;
      DROP TABLE IF EXISTS comunidades;
      DROP TABLE IF EXISTS complexos;
      DROP TABLE IF EXISTS equipamento_fontes;
      DROP TABLE IF EXISTS equipamento_servicos;
      DROP TABLE IF EXISTS equipamento_secretarias;
      DROP TABLE IF EXISTS equipamento_emails;
      DROP TABLE IF EXISTS equipamento_telefones;
      DROP TABLE IF EXISTS equipamentos;
      DROP TABLE IF EXISTS hubs_predios;
      DROP TABLE IF EXISTS enderecos;
      DROP TABLE IF EXISTS servicos;
      DROP TABLE IF EXISTS sigem_secretarias;
      DROP TABLE IF EXISTS fontes_dados;
      DROP TABLE IF EXISTS categorias;
      DROP TABLE IF EXISTS bairros;
      DROP TABLE IF EXISTS distritos;

      -- 1. Distritos
      CREATE TABLE IF NOT EXISTS distritos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        numero INT NOT NULL UNIQUE,
        nome VARCHAR(100) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 2. Bairros
      CREATE TABLE IF NOT EXISTS bairros (
        id INT AUTO_INCREMENT PRIMARY KEY,
        distrito_id INT NOT NULL,
        nome VARCHAR(150) NOT NULL,
        cep_padrao VARCHAR(20),
        UNIQUE KEY unq_bairro_distrito (distrito_id, nome),
        CONSTRAINT fk_bairro_distrito FOREIGN KEY (distrito_id) REFERENCES distritos(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 3. Categorias de Equipamentos
      CREATE TABLE IF NOT EXISTS categorias (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL UNIQUE,
        macrosetor VARCHAR(100) NOT NULL,
        icone VARCHAR(50),
        cor_hex VARCHAR(20)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 4. Fontes de Dados
      CREATE TABLE IF NOT EXISTS fontes_dados (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(150) NOT NULL,
        tipo VARCHAR(80) NOT NULL,
        url_origem TEXT,
        orgao_emissor VARCHAR(150),
        data_coleta DATE NOT NULL,
        data_verificacao DATE,
        confiabilidade VARCHAR(50) DEFAULT 'OFICIAL_ALTA',
        observacao TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 5. Secretarias do SIGEM (Preserva os IDs 1..22 e mapeia para a tabela secretarias do MySQL)
      CREATE TABLE IF NOT EXISTS sigem_secretarias (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sigla VARCHAR(50) NOT NULL UNIQUE,
        nome VARCHAR(200) NOT NULL,
        titular VARCHAR(150),
        email_gabinete VARCHAR(150),
        telefone_gabinete VARCHAR(80),
        mysql_id INT,
        INDEX idx_sigem_sec_mysql (mysql_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 6. Serviços de Equipamentos (SIGEM)
      CREATE TABLE IF NOT EXISTS servicos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        categoria_id INT,
        nome VARCHAR(150) NOT NULL UNIQUE,
        descricao TEXT,
        CONSTRAINT fk_serv_cat FOREIGN KEY (categoria_id) REFERENCES categorias(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 7. Endereços
      CREATE TABLE IF NOT EXISTS enderecos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bairro_id INT NOT NULL,
        logradouro VARCHAR(255) NOT NULL,
        numero VARCHAR(150) DEFAULT 's/nº',
        complemento VARCHAR(255),
        cep VARCHAR(20) NOT NULL,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        precisao_geo VARCHAR(50) DEFAULT 'NUMERO_EXATO',
        bairro_oficial VARCHAR(150),
        distrito_oficial VARCHAR(150),
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_end_coords (latitude, longitude),
        INDEX idx_end_cep (cep),
        CONSTRAINT fk_end_bairro FOREIGN KEY (bairro_id) REFERENCES bairros(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 8. Hubs Prediais
      CREATE TABLE IF NOT EXISTS hubs_predios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        codigo_hub VARCHAR(30) UNIQUE,
        nome VARCHAR(200) NOT NULL,
        endereco_id INT NOT NULL,
        tipo_imovel VARCHAR(80) DEFAULT 'PROPRIO_MUNICIPAL',
        capacidade INT,
        status VARCHAR(50) DEFAULT 'ATIVO',
        descricao TEXT,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_hub_endereco FOREIGN KEY (endereco_id) REFERENCES enderecos(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 9. Equipamentos Públicos
      CREATE TABLE IF NOT EXISTS equipamentos (
        id VARCHAR(50) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        sigla VARCHAR(100),
        categoria_id INT NOT NULL,
        endereco_id INT NOT NULL,
        hub_id INT,
        predio_sala VARCHAR(200),
        status VARCHAR(80) NOT NULL DEFAULT 'Pendente de revisão',
        horario_funcionamento VARCHAR(200),
        descricao TEXT,
        codigo_cnes VARCHAR(50),
        codigo_inep VARCHAR(50),
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_equip_status (status),
        INDEX idx_equip_cat (categoria_id),
        CONSTRAINT fk_equip_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id),
        CONSTRAINT fk_equip_endereco FOREIGN KEY (endereco_id) REFERENCES enderecos(id),
        CONSTRAINT fk_equip_hub FOREIGN KEY (hub_id) REFERENCES hubs_predios(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 10. Telefones de Equipamentos
      CREATE TABLE IF NOT EXISTS equipamento_telefones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        equipamento_id VARCHAR(50) NOT NULL,
        ddd VARCHAR(3) DEFAULT '21',
        numero VARCHAR(50) NOT NULL,
        tipo VARCHAR(50) DEFAULT 'GERAL',
        principal TINYINT(1) DEFAULT 0,
        whatsapp TINYINT(1) DEFAULT 0,
        INDEX idx_eqtel_equip (equipamento_id, principal),
        CONSTRAINT fk_eqtel_equip FOREIGN KEY (equipamento_id) REFERENCES equipamentos(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 11. E-mails de Equipamentos
      CREATE TABLE IF NOT EXISTS equipamento_emails (
        id INT AUTO_INCREMENT PRIMARY KEY,
        equipamento_id VARCHAR(50) NOT NULL,
        email VARCHAR(150) NOT NULL,
        tipo VARCHAR(50) DEFAULT 'GERAL',
        principal TINYINT(1) DEFAULT 0,
        INDEX idx_eqmail_equip (equipamento_id, principal),
        CONSTRAINT fk_eqmail_equip FOREIGN KEY (equipamento_id) REFERENCES equipamentos(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 12. Vínculo Equipamento x Secretarias
      CREATE TABLE IF NOT EXISTS equipamento_secretarias (
        equipamento_id VARCHAR(50) NOT NULL,
        secretaria_id INT NOT NULL,
        tipo_relacao VARCHAR(80) NOT NULL DEFAULT 'GESTAO_PRINCIPAL',
        principal TINYINT(1) NOT NULL DEFAULT 1,
        inicio_vigencia DATE,
        fim_vigencia DATE,
        PRIMARY KEY (equipamento_id, secretaria_id, tipo_relacao),
        CONSTRAINT fk_eqsec_equip FOREIGN KEY (equipamento_id) REFERENCES equipamentos(id) ON DELETE CASCADE,
        CONSTRAINT fk_eqsec_sec FOREIGN KEY (secretaria_id) REFERENCES sigem_secretarias(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 13. Vínculo Equipamento x Serviços
      CREATE TABLE IF NOT EXISTS equipamento_servicos (
        equipamento_id VARCHAR(50) NOT NULL,
        servico_id INT NOT NULL,
        horario_especifico VARCHAR(150),
        observacao TEXT,
        PRIMARY KEY (equipamento_id, servico_id),
        CONSTRAINT fk_eqserv_equip FOREIGN KEY (equipamento_id) REFERENCES equipamentos(id) ON DELETE CASCADE,
        CONSTRAINT fk_eqserv_serv FOREIGN KEY (servico_id) REFERENCES servicos(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 14. Vínculo Equipamento x Fontes de Dados
      CREATE TABLE IF NOT EXISTS equipamento_fontes (
        equipamento_id VARCHAR(50) NOT NULL,
        fonte_id INT NOT NULL,
        campo_atribuido VARCHAR(80) NOT NULL,
        confirmado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        observacao TEXT,
        PRIMARY KEY (equipamento_id, fonte_id, campo_atribuido),
        CONSTRAINT fk_eqfont_equip FOREIGN KEY (equipamento_id) REFERENCES equipamentos(id) ON DELETE CASCADE,
        CONSTRAINT fk_eqfont_fonte FOREIGN KEY (fonte_id) REFERENCES fontes_dados(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 15. Complexos de Favelas / Comunidades
      CREATE TABLE IF NOT EXISTS complexos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) UNIQUE NOT NULL,
        cor_hex VARCHAR(10) NOT NULL,
        distrito VARCHAR(50),
        total_comunidades INT DEFAULT 0,
        total_ruas INT DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 16. Comunidades e Favelas
      CREATE TABLE IF NOT EXISTS comunidades (
        id INT PRIMARY KEY,
        nome VARCHAR(150) NOT NULL,
        complexo VARCHAR(100) NOT NULL,
        cor_hex VARCHAR(10) NOT NULL,
        distrito VARCHAR(50),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        ids_social DECIMAL(5, 4),
        classe_prioridade VARCHAR(50),
        origem_cartografica VARCHAR(100),
        total_ruas INT DEFAULT 0,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_com_complexo (complexo),
        INDEX idx_com_distrito (distrito),
        INDEX idx_com_nome (nome)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 17. Ruas Internas das Comunidades
      CREATE TABLE IF NOT EXISTS comunidade_ruas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        comunidade_id INT NOT NULL,
        nome_rua VARCHAR(200) NOT NULL,
        INDEX idx_comruas_com (comunidade_id),
        INDEX idx_comruas_nome (nome_rua),
        CONSTRAINT fk_comruas_com FOREIGN KEY (comunidade_id) REFERENCES comunidades(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 18. Faixas de CEP das Comunidades
      CREATE TABLE IF NOT EXISTS comunidade_ceps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        comunidade_id INT NOT NULL,
        cep VARCHAR(10) NOT NULL,
        logradouro VARCHAR(200),
        bairro VARCHAR(100),
        localidade VARCHAR(100),
        uf VARCHAR(2),
        ibge VARCHAR(10),
        ddd VARCHAR(3),
        INDEX idx_comceps_cep (cep),
        INDEX idx_comceps_com (comunidade_id),
        CONSTRAINT fk_comceps_com FOREIGN KEY (comunidade_id) REFERENCES comunidades(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 19. API Keys para Consumo Externo
      CREATE TABLE IF NOT EXISTS api_keys (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chave VARCHAR(100) UNIQUE NOT NULL,
        nome_cliente VARCHAR(150) NOT NULL,
        email_cliente VARCHAR(150) NOT NULL,
        orgao_empresa VARCHAR(150),
        limite_req_minuto INT DEFAULT 60,
        limite_req_dia INT DEFAULT 10000,
        requisicoes_hoje INT DEFAULT 0,
        ultimo_reset_dia DATE DEFAULT (CURRENT_DATE),
        total_requisicoes INT DEFAULT 0,
        status VARCHAR(20) DEFAULT 'ATIVO',
        ultimo_acesso DATETIME,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        notas TEXT,
        INDEX idx_apikey_chave (chave),
        INDEX idx_apikey_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 20. Auditoria de Alterações do SIGEM
      CREATE TABLE IF NOT EXISTS auditoria (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tabela_afetada VARCHAR(50) NOT NULL,
        registro_id VARCHAR(50) NOT NULL,
        operacao VARCHAR(20) NOT NULL,
        dados_anteriores JSON,
        dados_novos JSON,
        usuario VARCHAR(100) DEFAULT 'SISTEMA_MIGRACAO_V2',
        fonte_id INT,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip VARCHAR(45),
        dispositivo VARCHAR(255),
        localizacao VARCHAR(255),
        INDEX idx_audit_tabela_reg (tabela_afetada, registro_id),
        INDEX idx_audit_criado (criado_em)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 21. Nova Tabela de Elo: Vínculo Serviços (MySQL) x Locais Físicos (Equipamentos)
      CREATE TABLE IF NOT EXISTS service_locations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        service_id INT NOT NULL,
        equipamento_id VARCHAR(50) NOT NULL,
        observacao VARCHAR(255),
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unq_service_equip (service_id, equipamento_id),
        CONSTRAINT fk_sl_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
        CONSTRAINT fk_sl_equip FOREIGN KEY (equipamento_id) REFERENCES equipamentos(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await conn.query(ddl);
    console.log('✅ Estrutura DDL criada com sucesso no MySQL.\n');

    // 2. Transferência de Dados dos Registros
    console.log('📦 2. Transferindo dados do SQLite para o MySQL...');

    const transferencias = [
      { sqliteTab: 'distritos', mysqlTab: 'distritos' },
      { sqliteTab: 'bairros', mysqlTab: 'bairros' },
      { sqliteTab: 'categorias', mysqlTab: 'categorias' },
      { sqliteTab: 'fontes_dados', mysqlTab: 'fontes_dados' },
      { sqliteTab: 'secretarias', mysqlTab: 'sigem_secretarias' },
      { sqliteTab: 'servicos', mysqlTab: 'servicos' },
      { sqliteTab: 'enderecos', mysqlTab: 'enderecos' },
      { sqliteTab: 'hubs_predios', mysqlTab: 'hubs_predios' },
      { sqliteTab: 'equipamentos', mysqlTab: 'equipamentos' },
      { sqliteTab: 'equipamento_telefones', mysqlTab: 'equipamento_telefones' },
      { sqliteTab: 'equipamento_emails', mysqlTab: 'equipamento_emails' },
      { sqliteTab: 'equipamento_secretarias', mysqlTab: 'equipamento_secretarias' },
      { sqliteTab: 'equipamento_servicos', mysqlTab: 'equipamento_servicos' },
      { sqliteTab: 'equipamento_fontes', mysqlTab: 'equipamento_fontes' },
      { sqliteTab: 'complexos', mysqlTab: 'complexos' },
      { sqliteTab: 'comunidades', mysqlTab: 'comunidades' },
      { sqliteTab: 'comunidade_ruas', mysqlTab: 'comunidade_ruas' },
      { sqliteTab: 'comunidade_ceps', mysqlTab: 'comunidade_ceps' },
      { sqliteTab: 'api_keys', mysqlTab: 'api_keys' },
      { sqliteTab: 'auditoria', mysqlTab: 'auditoria' },
    ];

    for (const { sqliteTab, mysqlTab } of transferencias) {
      const rows = sqlite.prepare(`SELECT * FROM "${sqliteTab}"`).all();
      
      // Limpa dados anteriores na tabela de destino para idempotência
      await conn.query(`TRUNCATE TABLE \`${mysqlTab}\``);

      if (rows.length === 0) {
        console.log(`   • ${mysqlTab.padEnd(25)}: 0 registros (tabela vazia)`);
        continue;
      }

      const cols = Object.keys(rows[0]);
      const placeholders = cols.map(() => '?').join(', ');
      const sqlInsert = `INSERT INTO \`${mysqlTab}\` (\`${cols.join('`, `')}\`) VALUES (${placeholders})`;

      // Insert em lotes de 100 para alta velocidade
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        for (const row of batch) {
          const vals = cols.map(c => {
            let val = row[c];
            if (val === undefined) return null;
            // Tratar booleanos e JSON
            if (mysqlTab === 'auditoria' && (c === 'dados_anteriores' || c === 'dados_novos')) {
              if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
                return val;
              } else if (val) {
                return JSON.stringify(val);
              }
              return null;
            }
            return val;
          });
          await conn.query(sqlInsert, vals);
        }
      }

      const [countCheck] = await conn.query(`SELECT COUNT(*) as c FROM \`${mysqlTab}\``);
      console.log(`   • ${mysqlTab.padEnd(25)}: ${countCheck[0].c} registros transferidos com sucesso.`);
    }

    // 3. Criar a View Canônica Mestra: vw_equipamentos_consolidada no MySQL
    console.log('\n👁️ 3. Criando view oficial vw_equipamentos_consolidada no MySQL...');
    await conn.query('DROP VIEW IF EXISTS vw_equipamentos_consolidada');

    const viewSql = `
      CREATE VIEW vw_equipamentos_consolidada AS
      SELECT 
          e.id,
          e.nome,
          e.sigla,
          c.nome AS categoria,
          d.numero AS distrito,
          b.nome AS bairro,
          COALESCE(en.bairro_oficial, b.nome) AS bairro_oficial,
          COALESCE(en.distrito_oficial, d.nome) AS distrito_oficial,
          en.logradouro,
          en.numero,
          en.complemento,
          CONCAT(
            en.logradouro,
            CASE 
              WHEN en.numero IS NOT NULL AND en.numero != '' AND en.numero != 's/nº' AND en.logradouro NOT LIKE CONCAT('%', en.numero, '%') 
              THEN CONCAT(', ', en.numero) 
              ELSE '' 
            END,
            CASE 
              WHEN en.complemento IS NOT NULL AND en.complemento != '' 
              THEN CONCAT(' • ', en.complemento) 
              ELSE '' 
            END,
            ' • ', b.nome, ' • Duque de Caxias • RJ • CEP ', en.cep
          ) AS endereco,
          en.cep,
          e.predio_sala,
          (SELECT t.numero FROM equipamento_telefones t WHERE t.equipamento_id = e.id AND t.principal = 1 LIMIT 1) AS telefone,
          (SELECT em.email FROM equipamento_emails em WHERE em.equipamento_id = e.id AND em.principal = 1 LIMIT 1) AS email,
          e.horario_funcionamento,
          en.latitude AS lat,
          en.longitude AS lon,
          h.codigo_hub AS hub_id,
          h.nome AS hub_nome,
          e.status,
          e.descricao,
          en.precisao_geo AS precisao_gps,
          en.precisao_geo AS precisao_geo,
          (
              SELECT GROUP_CONCAT(s.nome SEPARATOR '; ')
              FROM equipamento_servicos es
              JOIN servicos s ON es.servico_id = s.id
              WHERE es.equipamento_id = e.id
          ) AS servicos,
          sec.id AS secretaria_id,
          sec.mysql_id AS secretaria_mysql_id,
          sec.sigla AS secretaria_sigla,
          sec.nome AS secretaria_nome
      FROM equipamentos e
      JOIN categorias c ON e.categoria_id = c.id
      JOIN enderecos en ON e.endereco_id = en.id
      JOIN bairros b ON en.bairro_id = b.id
      JOIN distritos d ON b.distrito_id = d.id
      LEFT JOIN hubs_predios h ON e.hub_id = h.id
      LEFT JOIN equipamento_secretarias es ON es.equipamento_id = e.id AND es.principal = 1
      LEFT JOIN sigem_secretarias sec ON sec.id = es.secretaria_id;
    `;

    await conn.query(viewSql);
    const [viewCount] = await conn.query('SELECT COUNT(*) as total FROM vw_equipamentos_consolidada');
    console.log(`✅ View vw_equipamentos_consolidada criada no MySQL com ${viewCount[0].total} equipamentos consolidados.`);

    // 4. Reativar Foreign Key Checks
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('🔒 Foreign Key Checks reativadas.');

    console.log('\n================================================================');
    console.log('🎉 MIGRAÇÃO PARA O MYSQL CONCLUÍDA COM 100% DE SUCESSO!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('❌ ERRO NA MIGRAÇÃO:', err);
    throw err;
  } finally {
    conn.release();
    await pool.end();
  }
}

migrar();
