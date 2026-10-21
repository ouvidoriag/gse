/* ==========================================================================
   SIGEM — Módulo 1: Estado Mestre, Conectividade, Sessão & API
   Prefeitura Municipal de Duque de Caxias
   ========================================================================== */

// --- ESTADO GLOBAL & CONSTANTES DA BASE MUNICIPAL ---
// Base embutida descontinuada em favor da API central do SQLite e contingência via arquivo JSON
    const DEFAULT_EQUIP = [];
    const DEFAULT_HUBS = [{"id": "hub_1", "nome": "Centro Cívico / Paço Municipal (Prefeitura)", "tipo": "Complexo Administrativo Central", "endereco": "Alameda Esmeralda, 206 (ou Alameda Dona Esmeralda, nº 206)", "bairro": "Jardim Primavera", "distrito": "2", "cep": "25215-260", "lat": -22.68515, "lon": -43.28399, "descricao": "Sede principal do Poder Executivo Municipal, abrigando o Gabinete e os principais centros de gestão fiscal, orçamentária e administrativa.", "orgaos": [{"id": "org_1_1", "nome": "Gabinete do Prefeito", "andar_sala": "Prédio Principal - Gabinete", "ramal": "Gabinete / 2773-5500"}, {"id": "org_1_2", "nome": "Secretaria Municipal de Governo (SMG)", "andar_sala": "Prédio Principal - 2º Andar", "ramal": "2773-5500"}, {"id": "org_1_3", "nome": "Secretaria Municipal de Administração, Planejamento e Orçamento (SMAPO)", "andar_sala": "Prédio A - Térreo e 1º Andar", "ramal": "2773-5510"}, {"id": "org_1_4", "nome": "Secretaria Municipal de Fazenda (SMF)", "andar_sala": "Prédio Principal - Térreo (Arrecadação)", "ramal": "2773-5520"}, {"id": "org_1_5", "nome": "Secretaria Municipal de Comunicação Social e Relações Públicas (SMCSRP)", "andar_sala": "Prédio Principal - 2º Andar", "ramal": "2773-5530"}, {"id": "org_1_6", "nome": "Secretaria Municipal de Articulação Institucional (SMAI)", "andar_sala": "Prédio Principal - Sala 12", "ramal": "2773-5500"}, {"id": "org_1_7", "nome": "Ouvidoria Geral do Município", "andar_sala": "Prédio de Atendimento ao Cidadão", "ramal": "2773-5540"}, {"id": "org_1_8", "nome": "FUNDEC — Sede Administrativa Central", "andar_sala": "Prédio Anexo FUNDEC", "ramal": "2773-5500"}]}, {"id": "hub_2", "nome": "Edifício Barão de Mauá / Polo Parque Duque", "tipo": "Complexo do Trabalho, Assistência e Ensino Técnico", "endereco": "Av. Brigadeiro Lima e Silva, 131", "bairro": "Parque Duque", "distrito": "1", "cep": "25085-131", "lat": -22.7954, "lon": -43.2982, "descricao": "Hub integrado de capacitação profissional, geração de emprego, assistência social e inovação tecnológica.", "orgaos": [{"id": "org_2_1", "nome": "FUNDEC — Sede Operacional e Presidência", "andar_sala": "Prédio Principal", "ramal": "2672-5650"}, {"id": "org_2_2", "nome": "FUNDEC Polo Inclusão e Trabalho", "andar_sala": "Térreo - Acessibilidade", "ramal": "2672-5650"}, {"id": "org_2_3", "nome": "FUNDEC Cisco Networking Academy & Polo Marcenaria", "andar_sala": "Laboratórios Técnicos", "ramal": "2672-5650"}, {"id": "org_2_4", "nome": "Secretaria Municipal de Trabalho, Emprego e Renda (SMTER)", "andar_sala": "2º Andar / Balcão de Empregos", "ramal": "2672-5660"}, {"id": "org_2_5", "nome": "Secretaria Municipal de Assistência Social e Direitos Humanos (SMASDH)", "andar_sala": "3º Andar / Gestão do SUAS", "ramal": "2672-5670"}]}, {"id": "hub_3", "nome": "Complexo Hospitalar Beira Mar", "tipo": "Complexo de Alta Complexidade e Urgência", "endereco": "Rodovia Washington Luiz, 3200", "bairro": "Parque Beira Mar", "distrito": "1", "cep": "25085-009", "lat": -22.799, "lon": -43.295, "descricao": "O maior polo de urgência, emergência e cirurgias do município de Duque de Caxias.", "orgaos": [{"id": "org_3_1", "nome": "Hospital Municipal Dr. Moacyr Rodrigues do Carmo (HMMRC)", "andar_sala": "Bloco Hospitalar Principal, UTI e Maternidade", "ramal": "0800-025-1080"}, {"id": "org_3_2", "nome": "UPA 24h Parque Beira Mar", "andar_sala": "Prédio Anexo de Pronto Atendimento 24 Horas", "ramal": "2772-8800"}]}, {"id": "hub_4", "nome": "Complexo Pediátrico do Centro", "tipo": "Complexo de Urgência e Internação Infantil", "endereco": "Avenida Presidente Kennedy, s/nº", "bairro": "Centro", "distrito": "1", "cep": "25010-001", "lat": -22.787, "lon": -43.307, "descricao": "Polo exclusivo de saúde e emergência materno-infantil de Duque de Caxias.", "orgaos": [{"id": "org_4_1", "nome": "Hospital Infantil Ismália da Silveira", "andar_sala": "Bloco Cirúrgico e Enfermarias Pediátricas", "ramal": "2671-5500"}, {"id": "org_4_2", "nome": "UPA Infantil Walter Garcia", "andar_sala": "Pronto Socorro Pediátrico 24h", "ramal": "2671-5510"}]}, {"id": "hub_5", "nome": "Complexo Sarapuí de Saúde, Reabilitação e Educação", "tipo": "Polo Multidisciplinar Integrado", "endereco": "Av. República do Paraguai, s/nº", "bairro": "Vila Sarapuí", "distrito": "1", "cep": "25050-100", "lat": -22.775, "lon": -43.295, "descricao": "Área integrada que reúne pronto socorro de urgência, centro de reabilitação e equipamentos de ensino fundamental.", "orgaos": [{"id": "org_5_1", "nome": "UPA 24h Sarapuí", "andar_sala": "Prédio de Urgência e Emergência 24h", "ramal": "2771-8800"}, {"id": "org_5_2", "nome": "Centro Especializado em Reabilitação — CER IV", "andar_sala": "Pavilhão de Reabilitação Auditiva, Física, Intelectual e Visual", "ramal": "2771-8820"}, {"id": "org_5_3", "nome": "CIEP Brizolão Municipalizado 097 - Carlos Chagas", "andar_sala": "Módulo Escolar CIEP", "ramal": "SMEDC"}, {"id": "org_5_4", "nome": "Creche e E.M. Poetisa Cecília Meireles", "andar_sala": "Módulo de Educação Infantil", "ramal": "SMEDC"}]}, {"id": "hub_6", "nome": "Polo Integrado Jardim Primavera — Alameda James Franco", "tipo": "Sede Administrativa Setorial", "endereco": "Alameda James Franco, 03", "bairro": "Jardim Primavera", "distrito": "2", "cep": "25215-265", "lat": -22.6855, "lon": -43.284, "descricao": "Prédio administrativo que centraliza as decisões da Saúde Pública e Políticas Ambientais.", "orgaos": [{"id": "org_6_1", "nome": "Secretaria Municipal de Saúde (SMS)", "andar_sala": "1º e 2º Pavimentos", "ramal": "2773-5560"}, {"id": "org_6_2", "nome": "Secretaria Municipal de Meio Ambiente (SMMA)", "andar_sala": "Térreo", "ramal": "2773-5570"}, {"id": "org_6_3", "nome": "Conselho Tutelar do 2º Distrito", "andar_sala": "Anexo de Atendimento", "ramal": "2773-4455"}]}, {"id": "hub_7", "nome": "Polo Integrado Jardim Primavera — Bartolomeu Gusmão", "tipo": "Polo de Urbanismo e Proteção Animal", "endereco": "Alameda Bartolomeu Gusmão, 85", "bairro": "Jardim Primavera", "distrito": "2", "cep": "25215-320", "lat": -22.6865, "lon": -43.285, "descricao": "Complexo de licenciamento urbanístico, obras particulares, habitação e bem-estar animal.", "orgaos": [{"id": "org_7_1", "nome": "Secretaria Municipal de Urbanismo e Habitação (SMUH)", "andar_sala": "Prédio Principal", "ramal": "2773-5580"}, {"id": "org_7_2", "nome": "Secretaria Municipal de Proteção Animal (SMPA)", "andar_sala": "Prédio Anexo / Atendimento", "ramal": "2773-5590"}]}, {"id": "hub_8", "nome": "Complexo de Saúde e Especialidades Parque Bonfim", "tipo": "Polo de Especialidades Ambulatoriais", "endereco": "Rua Manoel Lucas, s/nº", "bairro": "Parque Senhor do Bonfim", "distrito": "1", "cep": "25025-140", "lat": -22.784, "lon": -43.312, "descricao": "Polo especializado de cirurgias ambulatoriais, especialidades médicas e atendimento à juventude.", "orgaos": [{"id": "org_8_1", "nome": "Policlínica Hospital Duque de Caxias", "andar_sala": "Pavilhão Ambulatorial", "ramal": "2671-8800"}, {"id": "org_8_2", "nome": "Centro de Atenção Total ao Adolescente — CEATA", "andar_sala": "Ala Especializada da Juventude", "ramal": "2671-8810"}]}, {"id": "hub_9", "nome": "Complexo de Atenção Psicossocial e Reabilitação do Centro", "tipo": "Polo de Saúde Mental e Reabilitação Especial", "endereco": "Rua Nilo Vieira, 353", "bairro": "Centro", "distrito": "1", "cep": "25010-140", "lat": -22.788, "lon": -43.3065, "descricao": "Centro integrado de acolhimento em dependência química e reabilitação auditiva/física.", "orgaos": [{"id": "org_9_1", "nome": "CAPS AD Renato Russo (Álcool e Outras Drogas)", "andar_sala": "Acolhimento Térreo e Leitos Dia", "ramal": "2673-6144"}, {"id": "org_9_2", "nome": "Centro de Atenção ao Portador de Deficiências — CEAPD (CER II)", "andar_sala": "Pavilhão de Fisioterapia e Fonoaudiologia", "ramal": "2673-6150"}]}, {"id": "hub_10", "nome": "Campus Integrado Educacional São Bento (Antiga FEUDUC)", "tipo": "Pólo Universitário e Escolar Municipal", "endereco": "Avenida Presidente Kennedy, s/nº - São Bento", "bairro": "São Bento / Chácaras Rio-Petrópolis", "distrito": "2", "cep": "25040-004", "lat": -22.715, "lon": -43.285, "descricao": "Campus educacional que reúne 3 escolas municipais e 1 creche comunitária no espaço integrado.", "orgaos": [{"id": "org_10_1", "nome": "E.M. José Camilo dos Santos", "andar_sala": "Bloco Escolar A", "ramal": "SMEDC"}, {"id": "org_10_2", "nome": "E.M. Nísia Vilela Fernandes", "andar_sala": "Bloco Escolar B", "ramal": "SMEDC"}, {"id": "org_10_3", "nome": "E.M. Paulo Roberto de Moraes Loureiro", "andar_sala": "Bloco Escolar C", "ramal": "SMEDC"}, {"id": "org_10_4", "nome": "CCAIC — Creche Parque Muísa", "andar_sala": "Bloco de Educação Infantil", "ramal": "SMEDC"}]}, {"id": "hub_11", "nome": "Complexo Social e Comunitário Centenário", "tipo": "Polo de Assistência Social e Convivência", "endereco": "Rua Manoel Vieira, s/nº", "bairro": "Centenário", "distrito": "1", "cep": "25030-000", "lat": -22.782, "lon": -43.315, "descricao": "Central de acolhimento social que abriga a proteção básica (CRAS), média (CREAS) e terceira idade.", "orgaos": [{"id": "org_11_1", "nome": "CRAS Centenário (Proteção Social Básica)", "andar_sala": "Térreo - Recepção Geral", "ramal": "2673-4422"}, {"id": "org_11_2", "nome": "CREAS Centenário (Proteção Social Especial)", "andar_sala": "1º Andar - Equipe Técnica", "ramal": "2673-4455"}, {"id": "org_11_3", "nome": "Centro de Convivência do Idoso", "andar_sala": "Salão de Oficinas e Convivência", "ramal": "2673-4422"}]}, {"id": "hub_12", "nome": "Polo Cívico e Histórico da 25 de Agosto", "tipo": "Sede Administrativa e Segurança", "endereco": "Praça Governador Roberto Silveira, 31", "bairro": "25 de Agosto", "distrito": "1", "cep": "25075-010", "lat": -22.7895, "lon": -43.306, "descricao": "Prédio histórico da Prefeitura abrigando a Segurança Pública e atendimento institucional.", "orgaos": [{"id": "org_12_1", "nome": "Sede Histórica da Prefeitura de Caxias", "andar_sala": "Térreo e Salão Nobre", "ramal": "2773-6200"}, {"id": "org_12_2", "nome": "Secretaria Municipal de Segurança Pública", "andar_sala": "4º Andar", "ramal": "2676-9600"}]}];
    const PMDC_DB_VERSION = '2026_v11_oficial_466_dedup';
    const BAIRROS_COORDENADAS = {"centro": [-22.7905, -43.308, "1"], "25 de agosto": [-22.7885, -43.3045, "1"], "jardim vinte e cinco de agosto": [-22.7885, -43.3045, "1"], "parque duque": [-22.7895, -43.306, "1"], "beira mar": [-22.7843, -43.2842, "1"], "parque beira mar": [-22.7843, -43.2842, "1"], "vila sao luis": [-22.7805, -43.295, "1"], "doutor laureano": [-22.7666, -43.2955, "1"], "bar dos cavaleiros": [-22.786, -43.298, "1"], "centenario": [-22.776, -43.308, "1"], "vila centenario": [-22.777, -43.309, "1"], "jardim gramacho": [-22.7569, -43.2842, "1"], "gramacho": [-22.7569, -43.2842, "1"], "olavo bilac": [-22.768, -43.318, "1"], "parque lafaiete": [-22.782, -43.315, "1"], "parque fluminense": [-22.765, -43.312, "1"], "vila sarapui": [-22.76, -43.305, "1"], "sarapui": [-22.76, -43.305, "1"], "vila ideal": [-22.787, -43.302, "1"], "engenho do porto": [-22.793, -43.299, "1"], "corte oito": [-22.775, -43.301, "1"], "trevo das missoes": [-22.812, -43.292, "1"], "parque das missoes": [-22.812, -43.292, "1"], "pauliceia": [-22.784, -43.291, "1"], "periquitos": [-22.792, -43.288, "1"], "prainha": [-22.792, -43.288, "1"], "chacrinha": [-22.779, -43.303, "1"], "vila leopoldina": [-22.785, -43.293, "1"], "vila operaria": [-22.777, -43.298, "1"], "vila meriti": [-22.788, -43.314, "1"], "vila guanabara": [-22.798, -43.295, "1"], "vila itamarati": [-22.774, -43.299, "1"], "vila flavia": [-22.781, -43.307, "1"], "vila sao sebastiao": [-22.771, -43.302, "1"], "parque felicidade": [-22.773, -43.311, "1"], "parque santa marta": [-22.778, -43.313, "1"], "parque senhor do bonfim": [-22.772, -43.309, "1"], "jardim leal": [-22.771, -43.294, "1"], "copacabana": [-22.778, -43.29, "1"], "itatiaia": [-22.782, -43.295, "1"], "lagunas e dourados": [-22.769, -43.289, "1"], "campos eliseos": [-22.7058, -43.2745, "2"], "jardim primavera": [-22.6851, -43.2839, "2"], "saracuruna": [-22.6778, -43.2472, "2"], "cangulo": [-22.695, -43.242, "2"], "pilar": [-22.712, -43.285, "2"], "figueira": [-22.735, -43.268, "2"], "sao bento": [-22.748, -43.283, "2"], "chacaras rio-petropolis": [-22.718, -43.265, "2"], "chacaras arcampo": [-22.668, -43.248, "2"], "cidade dos meninos": [-22.688, -43.272, "2"], "vila maria helena": [-22.665, -43.241, "2"], "sao judas tadeu": [-22.702, -43.265, "2"], "pantanal": [-22.723, -43.281, "2"], "vila rosario": [-22.695, -43.26, "2"], "vila santo antonio": [-22.689, -43.255, "2"], "jardim balneario ana clara": [-22.682, -43.262, "2"], "jardim santa rita": [-22.679, -43.251, "2"], "jardim vila nova": [-22.675, -43.255, "2"], "jardim das oliveiras": [-22.691, -43.248, "2"], "parque comercial": [-22.687, -43.258, "2"], "parque independencia": [-22.68, -43.249, "2"], "parque nossa senhora do carmo": [-22.684, -43.253, "2"], "nossa senhora do carmo": [-22.684, -43.253, "2"], "bom retiro": [-22.712, -43.258, "2"], "conjunto nova esperanca": [-22.685, -43.268, "2"], "santa isabel": [-22.692, -43.263, "2"], "imbarie": [-22.6299, -43.2564, "3"], "santa cruz da serra": [-22.6428, -43.281, "3"], "santa lucia": [-22.6269, -43.2118, "3"], "nova campinas": [-22.6466, -43.2481, "3"], "parada angelica": [-22.6183, -43.2045, "3"], "parada morabi": [-22.622, -43.219, "3"], "jardim anhanga": [-22.6464, -43.2317, "3"], "parque paulista": [-22.619, -43.242, "3"], "parque equitativa": [-22.6352, -43.2659, "3"], "taquara": [-22.631, -43.275, "3"], "jardim barro branco": [-22.641, -43.245, "3"], "jardim rotsen": [-22.638, -43.239, "3"], "parque capivari": [-22.628, -43.268, "3"], "parque eldorado": [-22.625, -43.249, "3"], "vila araci": [-22.632, -43.243, "3"], "vila canaa": [-22.63, -43.238, "3"], "cristovao colombo": [-22.634, -43.246, "3"], "conjunto 22 de abril": [-22.633, -43.251, "3"], "xerem": [-22.5757, -43.3063, "4"], "mantiquira": [-22.5881, -43.3048, "4"], "amapa": [-22.605, -43.3, "4"], "barao do amapa": [-22.605, -43.3, "4"], "capivari": [-22.598, -43.312, "4"], "santo antonio": [-22.591, -43.298, "4"], "tabuleiro": [-22.582, -43.31, "4"], "parque xerem": [-22.573, -43.308, "4"], "barreiro": [-22.589, -43.292, "4"], "chapeu do sol": [-22.584, -43.301, "4"], "fazenda piranema": [-22.602, -43.288, "4"], "fazenda sao lourenco": [-22.609, -43.295, "4"], "igreja velha": [-22.579, -43.297, "4"], "jardim olimpo": [-22.586, -43.303, "4"], "pedreira": [-22.593, -43.295, "4"], "vila bonanca": [-22.581, -43.306, "4"], "vila nossa senhora das gracas": [-22.587, -43.302, "4"]};

    function deduplicateEquipData(list) {
      if (!Array.isArray(list)) return [];
      const seenIds = new Set();
      const seenNames = new Set();
      const result = [];
      list.forEach(item => {
        if (!item || !item.id) return;
        const nameKey = (item.nome || '').trim().toLowerCase();
        const idKey = String(item.id);
        if (!seenIds.has(idKey) && !seenNames.has(nameKey)) {
          seenIds.add(idKey);
          seenNames.add(nameKey);
          result.push(item);
        }
      });
      return result;
    }
    window.deduplicateEquipData = deduplicateEquipData;

    let equipData = [];
    window.equipData = equipData;
    let hubsData = [];
    window.hubsData = hubsData;
    let filteredEquipList = [];
    let currentPage = 1;
    const itemsPerPage = 25;
    let isSpreadsheetMode = false;
    let currentViewingEquipId = null;

    // Leaflet Maps
    let map = null;
    let hubsMapLayer = null;
    let equipsMapLayer = null;
    let bairrosGeoLayer = null;
    let distritosGeoLayer = null;
    let tremGeoLayer = null;
    let ucsGeoLayer = null;
    let hidroGeoLayer = null;
    let onibusGeoLayer = null;
    let onibusParadasLayer = null;
    let comunidadesGeoLayer = null;
    let limiteCaxiasGeoLayer = null;
    const vectorDataCache = {};
    let modalMap = null;
    let modalMarker = null;

    // INICIALIZAÇÃO DE DADOS

// --- FUNÇÕES DE CONECTIVIDADE, SESSÃO, UTILITÁRIOS & API ---
    function showToast(msg) {
      const t = document.getElementById('toastMsg');
      const txt = document.getElementById('toastText');
      if (!t || !txt) return;
      txt.innerText = msg.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
      t.classList.add('active');
      setTimeout(() => {
        t.classList.remove('active');
      }, 3200);
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function escapeStr(str) {
      return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    function getAuthToken() {
      try {
        const session = localStorage.getItem('simac_auth_session');
        if (!session) return null;
        const parsed = JSON.parse(session);
        return parsed.token || null;
      } catch (e) {
        return null;
      }
    }

    function updateApiStatusBadge(status, text) {
      const badge = document.getElementById('apiSyncBadge');
      const dot = document.getElementById('apiSyncDot');
      const label = document.getElementById('apiSyncText');
      if (!badge || !dot || !label) return;

      if (status === 'online') {
        dot.style.background = '#10b981';
        badge.style.background = '#ecfdf5';
        badge.style.color = '#059669';
        badge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        label.textContent = text || `SQLite Conectado (${equipData.length})`;
      } else if (status === 'syncing') {
        dot.style.background = '#f59e0b';
        badge.style.background = '#fffbeb';
        badge.style.color = '#d97706';
        badge.style.borderColor = 'rgba(245, 158, 11, 0.3)';
        label.textContent = text || 'Sincronizando...';
      } else {
        dot.style.background = '#94a3b8';
        badge.style.background = '#f8fafc';
        badge.style.color = '#64748b';
        badge.style.borderColor = 'rgba(148, 163, 184, 0.3)';
        label.textContent = text || `Modo Offline (${equipData.length})`;
      }
    }

    function initUserSession() {
      try {
        const session = localStorage.getItem('simac_auth_session');
        let name = 'Wellington Ribeiro';
        let role = 'Membro';
        if (session) {
          const parsed = JSON.parse(session);
          if (parsed.name) name = parsed.name;
          else if (parsed.user === 'admin') name = 'Wellington Ribeiro';
          if (parsed.role) role = parsed.role;
        }

        // Atualiza Sidebar
        const sidebarNameEl = document.getElementById('sidebarUserName');
        if (sidebarNameEl) sidebarNameEl.textContent = name;

        const sidebarRoleEl = document.getElementById('sidebarUserRole');
        if (sidebarRoleEl) sidebarRoleEl.textContent = role;

        const sidebarAvatarEl = document.getElementById('sidebarAvatar');
        if (sidebarAvatarEl) sidebarAvatarEl.textContent = (name.charAt(0) || 'W').toUpperCase();

        // Atualiza Barra Superior
        const topGreetingEl = document.getElementById('topGreetingUser');
        if (topGreetingEl) topGreetingEl.textContent = name;

        // Atualiza Configurações
        const configUserEl = document.getElementById('configUserName');
        if (configUserEl) configUserEl.textContent = name;
        const configRoleEl = document.getElementById('configUserRole');
        if (configRoleEl) configRoleEl.textContent = role;

        // Ativa painel restrito exclusivo para Administrador (ADM)
        const isAdmin = checkIsAdmin();
        const btnMinhaSec = document.getElementById('btnMinhaSecretaria');
        if (btnMinhaSec) {
          const sessionObj = JSON.parse(localStorage.getItem('simac_auth_session') || '{}');
          const secNome = (sessionObj.secretariaNome || '').toLowerCase();
          let sigla = '';
          if (secNome.includes('saúde') || secNome.includes('saude')) sigla = 'SMS';
          else if (secNome.includes('educação') || secNome.includes('educacao')) sigla = 'SMEDC';
          else if (secNome.includes('assistência')) sigla = 'SEASDIH';
          else if (secNome.includes('fundec')) sigla = 'FUNDEC';
          else if (secNome.includes('governo')) sigla = 'SMG';
          else if (secNome.includes('obras')) sigla = 'SMO';
          else if (secNome.includes('defesa civil')) sigla = 'SMDC';

          if (!isAdmin && sigla) {
            btnMinhaSec.style.display = 'inline-flex';
            btnMinhaSec.innerHTML = `<i class="ri-user-star-line"></i> Meus Equipamentos (${sigla})`;
          } else {
            btnMinhaSec.style.display = 'none';
          }
        }
        const adminSection = document.getElementById('adminConfigSection');
        if (adminSection) {
          adminSection.style.display = isAdmin ? 'flex' : 'none';
        }
        if (isAdmin) {
          carregarAuditoriaResumo();
        }

        // Saudação contextual por turno (Bom dia / Boa tarde / Boa noite)
        const hour = new Date().getHours();
        let greeting = 'Bom dia';
        if (hour >= 12 && hour < 18) greeting = 'Boa tarde';
        else if (hour >= 18 || hour < 5) greeting = 'Boa noite';

        const heroTitleEl = document.getElementById('heroGreetingTitle');
        if (heroTitleEl) {
          const firstName = name.split(' ')[0];
          heroTitleEl.textContent = `${greeting}, ${firstName}!`;
        }

        const heroDateEl = document.getElementById('heroGreetingDate');
        if (heroDateEl) {
          const today = new Date();
          const day = String(today.getDate()).padStart(2, '0');
          const month = String(today.getMonth() + 1).padStart(2, '0');
          const year = today.getFullYear();
          heroDateEl.textContent = `${day}/${month}/${year} · Sistema Integrado de Gestão de Endereços Municipais`;
        }
      } catch (e) {
        console.warn('Erro ao inicializar sessão:', e);
      }
    }

    function checkIsAdmin() {
      try {
        const session = JSON.parse(localStorage.getItem('simac_auth_session') || '{}');
        const role = session.role || '';
        const user = session.user || '';
        return (role && (role.toLowerCase().includes('admin') || role.toLowerCase().includes('gestor'))) || user === 'admin';
      } catch (e) {
        return false;
      }
    }

    function canUserEditEquip(item) {
      if (!item) return false;
      try {
        const session = JSON.parse(localStorage.getItem('simac_auth_session') || '{}');
        const role = (session.role || '').toLowerCase();
        const user = session.user || '';
        if (role.includes('admin') || role.includes('gestor') || user === 'admin') {
          return true;
        }

        // Se for editor de secretaria:
        if (session.secretariaId && item.secretaria_mysql_id) {
          if (Number(session.secretariaId) === Number(item.secretaria_mysql_id)) return true;
        }

        if (session.secretariaNome && item.secretaria_nome) {
          if (session.secretariaNome.toLowerCase().trim() === item.secretaria_nome.toLowerCase().trim()) return true;
        }

        const secNome = (session.secretariaNome || '').toLowerCase();
        if (secNome.includes('saúde') || secNome.includes('saude')) {
          if (item.secretaria_sigla === 'SMS' || (item.categoria && item.categoria.includes('Saúde'))) return true;
        }
        if (secNome.includes('educação') || secNome.includes('educacao')) {
          if (item.secretaria_sigla === 'SMEDC' || (item.categoria && item.categoria.includes('Educação'))) return true;
        }
        if (secNome.includes('assistência social') || secNome.includes('direitos humanos')) {
          if (item.secretaria_sigla === 'SEASDIH' || (item.categoria && item.categoria.includes('Assistência'))) return true;
        }
        if (secNome.includes('fundec')) {
          if (item.secretaria_sigla === 'FUNDEC' || (item.categoria && item.categoria.includes('FUNDEC'))) return true;
        }
        if (secNome.includes('governo')) {
          if (item.secretaria_sigla === 'SMG') return true;
        }
        if (secNome.includes('obras')) {
          if (item.secretaria_sigla === 'SMO') return true;
        }
        if (secNome.includes('defesa civil')) {
          if (item.secretaria_sigla === 'SMDC') return true;
        }

        return false;
      } catch (e) {
        return false;
      }
    }

    function simacLogout() {
      if (confirm('Deseja realmente encerrar sua sessão e sair do sistema?')) {
        localStorage.removeItem('simac_auth_session');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        const base = typeof window.getAppBasePath === 'function' ? window.getAppBasePath() : (window.location.pathname.startsWith('/gse') ? '/gse' : '');
        window.location.href = (base || '') + '/login?logout=1';
      }
    }

    async function apiRequest(endpoint, method = 'GET', body = null) {
      const token = getAuthToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      try { const platform = (window.navigator && (window.navigator.userAgentData?.platform || window.navigator.platform)) || ''; if (platform) headers['x-client-device'] = platform; } catch (e) {}
      const options = { method, headers };
      if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
      }
      try {
        const res = await fetch(endpoint, options);
        let data = null;
        try {
          data = await res.json();
        } catch (e) {}
        return { ok: res.ok, status: res.status, data };
      } catch (err) {
        return { ok: false, status: 0, error: err.message };
      }
    }

    async function loadEquipamentosFromApi() {
      updateApiStatusBadge('syncing', 'Conectando ao SQLite...');
      const res = await apiRequest('./api/equipamentos');
      if (res.ok && res.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        equipData = res.data.data;
        window.equipData = equipData;
        filteredEquipList = equipData;
        localStorage.setItem('pmdc_equipamentos_db', JSON.stringify(equipData));
        localStorage.setItem('pmdc_db_version', PMDC_DB_VERSION);
        updateKPIs();
        applyFilters();
        renderHubsCards();
        if (map) updateMapLayers();
        updateApiStatusBadge('online', `SQLite Conectado (${equipData.length})`);
        console.log(`[SIGEM API] ${equipData.length} equipamentos carregados do SQLite central.`);
      } else {
        // Fallback de contingência: carregar da base oficial JSON exportada pelo SQLite
        try {
          const fallbackRes = await fetch('./dados/todos_os_enderecos_duque_de_caxias.json');
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            if (Array.isArray(fallbackData) && fallbackData.length > 0) {
              equipData = fallbackData;
              window.equipData = equipData;
              filteredEquipList = equipData;
              localStorage.setItem('pmdc_equipamentos_db', JSON.stringify(equipData));
              updateKPIs();
              applyFilters();
              renderHubsCards();
              if (map) updateMapLayers();
              updateApiStatusBadge('offline', `Base Estática Mestre (${equipData.length})`);
              console.log(`[SIGEM Contingência] Carregado da base mestre JSON (${equipData.length} equipamentos).`);
              return;
            }
          }
        } catch (fbErr) {
          console.warn('[SIGEM] Falha ao ler arquivo de contingência:', fbErr.message);
        }
        updateApiStatusBadge('offline', `Modo Offline (${equipData.length})`);
      }
    }

    async function manualSyncFromApi() {
      showToast('Sincronizando dados com o banco SQLite central...');
      await loadEquipamentosFromApi();
      showToast('Sincronização com SQLite concluída com sucesso!');
    }

    function getGoogleApiKey() {
      return (localStorage.getItem('google_maps_api_key') || '').trim();
    }

    function saveGoogleApiKey() {
      const input = document.getElementById('inputGoogleApiKey');
      const key = input ? input.value.trim() : '';
      if (!key) {
        localStorage.removeItem('google_maps_api_key');
        updateGoogleKeyStatusBadge();
      carregarCategorias();
        closeGoogleKeyModal();
        showToast('Chave Google removida. Usando geocodificação padrão.');
        return;
      }
      localStorage.setItem('google_maps_api_key', key);
      updateGoogleKeyStatusBadge();
      closeGoogleKeyModal();
      showToast('Chave da Google Geocoding API salva com sucesso!');
    }

    function removeGoogleApiKey() {
      localStorage.removeItem('google_maps_api_key');
      const input = document.getElementById('inputGoogleApiKey');
      if (input) input.value = '';
      updateGoogleKeyStatusBadge();
      closeGoogleKeyModal();
      showToast('Chave da Google Maps API removida.');
    }

    async function testGoogleApiKey() {
      const input = document.getElementById('inputGoogleApiKey');
      const key = input ? input.value.trim() : '';
      const statusEl = document.getElementById('googleKeyStatusMessage');
      if (!key) {
        if (statusEl) {
          statusEl.style.display = 'block';
          statusEl.style.background = '#fee2e2';
          statusEl.style.color = '#dc2626';
          statusEl.innerHTML = '<i class="ri-error-warning-line"></i> Digite ou cole sua Chave de API antes de testar.';
        }
        return;
      }
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.background = '#e0f2fe';
        statusEl.style.color = '#0284c7';
        statusEl.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Testando consulta em Duque de Caxias...';
      }

      try {
        statusEl.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Testando consulta via servidor seguro...';
        const res = await apiRequest(`./api/geocode?address=${encodeURIComponent('Praça do Pacificador, Centro, Duque de Caxias, RJ')}&key=${encodeURIComponent(key)}`);
        if (res.ok && res.data && res.data.source === 'google') {
          statusEl.style.background = '#dcfce7';
          statusEl.style.color = '#15803d';
          const locType = res.data.location_type || 'ROOFTOP';
          statusEl.innerHTML = `<i class="ri-checkbox-circle-fill"></i> <strong>Chave Válida e Operacional!</strong> Conexão confirmada em Duque de Caxias (Precisão: <strong>${locType}</strong>).`;
        } else {
          statusEl.style.background = '#fee2e2';
          statusEl.style.color = '#dc2626';
          statusEl.innerHTML = `<i class="ri-close-circle-line"></i> <strong>Aviso:</strong> A chave informada não retornou dados de Geocoding do Google. Verifique se a Geocoding API está ativada no Google Cloud Console.`;
        }
      } catch (err) {
        statusEl.style.background = '#fee2e2';
        statusEl.style.color = '#dc2626';
        statusEl.innerHTML = `<i class="ri-close-circle-line"></i> Falha na requisição: ${err.message}`;
      }
    }

    function updateGoogleKeyStatusBadge() {
      const key = getGoogleApiKey();
      const topBadge = document.getElementById('topGoogleKeyBtn');
      const topText = document.getElementById('topGoogleKeyStatusText');
      const modalBtn = document.getElementById('btnConfigGoogleKeyInModal');
      const configBadge = document.getElementById('configGoogleKeyBadge');
      const configDesc = document.getElementById('configGoogleKeyDesc');

      if (key) {
        if (topBadge) {
          topBadge.classList.add('active-key');
          topBadge.title = 'Google Geocoding API Ativa (Precisão ROOFTOP pronta)';
        }
        if (topText) topText.innerHTML = 'Google API <strong style="color: #16a34a;">(ROOFTOP Ativa)</strong>';
        if (modalBtn) {
          modalBtn.innerHTML = '<i class="ri-google-fill" style="color: #16a34a;"></i> Google API Conectada';
          modalBtn.style.color = '#16a34a';
          modalBtn.style.borderColor = '#bbf7d0';
        }
        if (configBadge) {
          configBadge.className = 'badge-status badge-status-ativo';
          configBadge.innerText = 'ROOFTOP Ativa';
        }
        if (configDesc) {
          configDesc.innerHTML = 'Sua Chave de API Google está <strong>conectada e operacional</strong>. Todas as buscas e calibrações de endereço utilizam a precisão máxima de telhado (ROOFTOP).';
        }
      } else {
        if (topBadge) {
          topBadge.classList.remove('active-key');
          topBadge.title = 'Clique para configurar sua Google Maps API Key e ter precisão ROOFTOP';
        }
        if (topText) topText.innerHTML = 'Google API <strong>(ROOFTOP)</strong>';
        if (modalBtn) {
          modalBtn.innerHTML = '<i class="ri-google-fill" style="color: #ea4335;"></i> Configurar Chave Google';
          modalBtn.style.color = '';
          modalBtn.style.borderColor = '';
        }
        if (configBadge) {
          configBadge.className = 'badge-status badge-status-pendente';
          configBadge.innerText = 'Padrão Municipal';
        }
        if (configDesc) {
          configDesc.innerHTML = 'Nenhuma chave Google configurada. O sistema está utilizando a <strong>base cartográfica municipal</strong> e OpenStreetMap para localização.';
        }
      }
    }

    function buscarCepModal() {
      let cep = document.getElementById('editEquipCep').value.replace(/\D/g, '');
      if (cep.length !== 8) {
        alert('Digite um CEP válido com 8 dígitos numéricos.');
        return;
      }

      const badge = document.getElementById('geocodeStatusBadge');
      badge.style.display = 'inline-block';
      badge.style.background = '#e0f2fe';
      badge.style.color = '#0284c7';
      badge.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Consultando ViaCEP...';

      fetch(`https://viacep.com.br/ws/${cep}/json/`)
        .then(res => res.json())
        .then(data => {
          if (data.erro) {
            badge.style.background = '#fee2e2';
            badge.style.color = '#dc2626';
            badge.innerHTML = '<i class="ri-close-circle-line"></i> CEP não localizado nos Correios.';
            return;
          }

          if (data.logradouro) document.getElementById('editEquipLogradouro').value = data.logradouro;
          if (data.bairro) {
            document.getElementById('editEquipBairro').value = data.bairro;
            const bNorm = data.bairro.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
            if (BAIRROS_COORDENADAS[bNorm]) {
              document.getElementById('editEquipDist').value = BAIRROS_COORDENADAS[bNorm][2];
            }
          }

          badge.style.background = '#dcfce7';
          badge.style.color = '#15803d';
          badge.innerHTML = '<i class="ri-checkbox-circle-line"></i> Endereço preenchido! Agora informe o NÚMERO.';

          const numInput = document.getElementById('editEquipNumero');
          numInput.focus();
          numInput.style.borderColor = '#0284c7';
          setTimeout(() => { numInput.style.borderColor = ''; }, 2500);

          showToast('ViaCEP: Logradouro e Bairro preenchidos! Informe o Número.');
        })
        .catch(() => {
          badge.style.background = '#fee2e2';
          badge.style.color = '#dc2626';
          badge.innerHTML = '<i class="ri-close-circle-line"></i> Erro ao conectar ao ViaCEP.';
        });
    }

    async function geolocalizarEnderecoCompletoModal() {
      const logradouro = document.getElementById('editEquipLogradouro').value.trim();
      const numero = document.getElementById('editEquipNumero').value.trim();
      const bairro = document.getElementById('editEquipBairro').value.trim();
      const distrito = document.getElementById('editEquipDist').value;

      if (!logradouro || !bairro) {
        alert('Para geocodificar, preencha ao menos o Logradouro e o Bairro.');
        return;
      }

      const badge = document.getElementById('geocodeStatusBadge');
      badge.style.display = 'inline-block';
      badge.style.background = '#e0f2fe';
      badge.style.color = '#0284c7';
      badge.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Consultando serviço de geoprocessamento...';

      const googleKey = getGoogleApiKey();
      const params = new URLSearchParams({
        logradouro,
        numero,
        bairro,
        distrito
      });
      if (googleKey) params.append('key', googleKey);

      try {
        const res = await apiRequest('./api/geocode?' + params.toString());
        if (res.ok && res.data && res.data.success) {
          const d = res.data;
          const rawLat = Number(d.lat);
          const rawLon = Number(d.lon);
          const lat = (!isNaN(rawLat) && rawLat !== 0) ? rawLat : -22.785000;
          const lon = (!isNaN(rawLon) && rawLon !== 0) ? rawLon : -43.305000;
          const locType = d.location_type || 'APROXIMADO_LOGRADOURO';
          const precisao = d.precisao_geo || (locType === 'ROOFTOP' ? 'NUMERO_EXATO' : 'APROXIMADO_LOGRADOURO');

          document.getElementById('editEquipLat').value = lat.toFixed(6);
          document.getElementById('editEquipLon').value = lon.toFixed(6);
          if (typeof window.setModalPrecisaoGeo === 'function') {
            window.setModalPrecisaoGeo(precisao);
          }

          const zoom = locType === 'ROOFTOP' ? 18 : 17;
          initOrUpdateModalMiniMap(lat, lon, zoom);

          if (d.source === 'google' && locType === 'ROOFTOP') {
            badge.style.background = '#dcfce7';
            badge.style.color = '#15803d';
            badge.innerHTML = '<i class="ri-focus-3-line"></i> <strong>ROOFTOP (Google):</strong> Ponto cravado na fachada/telhado!';
            showToast('Google Geocoding: Precisão ROOFTOP (Lote Exato)!');
          } else if (d.source === 'google') {
            badge.style.background = '#e0f2fe';
            badge.style.color = '#0284c7';
            badge.innerHTML = `<i class="ri-compass-3-line"></i> <strong>Google (${locType}):</strong> Posição aproximada na via. Ajuste no satélite.`;
            showToast('Google Geocoding: Posição interpolada na via. Ajuste no satélite.');
          } else if (d.source === 'nominatim') {
            badge.style.background = '#dcfce7';
            badge.style.color = '#15803d';
            badge.innerHTML = '<i class="ri-checkbox-circle-line"></i> Coordenadas localizadas na via (OpenStreetMap)!';
            showToast('Coordenadas localizadas na via pelo OpenStreetMap.');
          } else {
            badge.style.background = '#fef3c7';
            badge.style.color = '#b45309';
            badge.innerHTML = '<i class="ri-alert-line"></i> Posição pelo centróide do bairro. Use [Satélite] para calibrar.';
            ativarAjusteManualModal();
            showToast('Posição pelo bairro. Alterne para Satélite e posicione o pino na portaria.');
          }

          if (d.warning) {
            badge.innerHTML += `<br><small style="color: #b45309;">⚠️ ${d.warning}</small>`;
          }
          return;
        }
        executarFallbackCentroidLocal(bairro);
      } catch (err) {
        console.warn('Falha no geocoding do servidor, usando fallback local:', err);
        executarFallbackCentroidLocal(bairro);
      }
    }

    async function buscarNomePredioNoGoogle() {
      const nome = document.getElementById('editEquipNome').value.trim();
      const bairro = document.getElementById('editEquipBairro').value.trim();
      const distrito = document.getElementById('editEquipDist').value;

      if (!nome) {
        alert('Informe o Nome Oficial do Equipamento para buscar pelo Google.');
        return;
      }

      const googleKey = getGoogleApiKey();
      const badge = document.getElementById('geocodeStatusBadge');
      badge.style.display = 'inline-block';
      badge.style.background = '#e0f2fe';
      badge.style.color = '#0284c7';
      badge.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Localizando prédio oficial via servidor...';

      const params = new URLSearchParams({ name: nome, bairro, distrito });
      if (googleKey) params.append('key', googleKey);

      try {
        const res = await apiRequest('./api/geocode?' + params.toString());
        if (res.ok && res.data && res.data.success && res.data.source === 'google') {
          const d = res.data;
          const dLat = Number(d.lat);
          const dLon = Number(d.lon);
          const safeLat = (!isNaN(dLat) && dLat !== 0) ? dLat : -22.785000;
          const safeLon = (!isNaN(dLon) && dLon !== 0) ? dLon : -43.305000;
          document.getElementById('editEquipLat').value = safeLat.toFixed(6);
          document.getElementById('editEquipLon').value = safeLon.toFixed(6);
          if (typeof window.setModalPrecisaoGeo === 'function') {
            window.setModalPrecisaoGeo(d.precisao_geo || 'NUMERO_EXATO');
          }

          initOrUpdateModalMiniMap(safeLat, safeLon, 18);

          badge.style.background = '#dcfce7';
          badge.style.color = '#15803d';
          badge.innerHTML = `<i class="ri-building-line"></i> <strong>Prédio Oficial Encontrado (${d.location_type}):</strong> ${d.formatted_address}`;
          showToast('Google: Prédio público localizado com precisão!');
        } else {
          badge.style.background = '#fee2e2';
          badge.style.color = '#dc2626';
          badge.innerHTML = '<i class="ri-close-circle-line"></i> Prédio não encontrado pelo nome no Google. Tente pelo endereço ou ajuste no satélite.';
        }
      } catch (err) {
        badge.style.background = '#fee2e2';
        badge.style.color = '#dc2626';
        badge.innerHTML = '<i class="ri-close-circle-line"></i> Erro ao conectar ao serviço: ' + err.message;
      }
    }

    function executarFallbackCentroidLocal(bairro) {
      const badge = document.getElementById('geocodeStatusBadge');
      const bNorm = (bairro || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      let coord = BAIRROS_COORDENADAS[bNorm];

      if (!coord) {
        for (let k in BAIRROS_COORDENADAS) {
          if (k.includes(bNorm) || bNorm.includes(k)) {
            coord = BAIRROS_COORDENADAS[k];
            break;
          }
        }
      }

      if (!coord) {
        const dist = document.getElementById('editEquipDist').value;
        if (dist === '4') coord = [-22.5850, -43.3000];
        else if (dist === '3') coord = [-22.6350, -43.2350];
        else if (dist === '2') coord = [-22.7000, -43.2700];
        else coord = [-22.7850, -43.3050];
      }

      const lat = Number(coord[0]) || -22.785000;
      const lon = Number(coord[1]) || -43.305000;
      document.getElementById('editEquipLat').value = lat.toFixed(6);
      document.getElementById('editEquipLon').value = lon.toFixed(6);
      if (typeof window.setModalPrecisaoGeo === 'function') {
        window.setModalPrecisaoGeo('CENTROIDE_BAIRRO');
      }

      initOrUpdateModalMiniMap(lat, lon, 15);

      badge.style.background = '#fef3c7';
      badge.style.color = '#b45309';
      badge.innerHTML = '<i class="ri-alert-line"></i> Posição aproximada (Bairro). Alterne para [Satélite] para posicionar no portão.';

      ativarAjusteManualModal();
      showToast('Posição pelo bairro. Alterne para Satélite e arraste o pino para a portaria.');
    }
