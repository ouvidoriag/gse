// ─────────────────────────────────────────────────────────────────────────────
// Carta de Serviço — Frontend (conectado ao backend Express)
// ─────────────────────────────────────────────────────────────────────────────
const EMAIL_DESTINATARIO_DISPLAY = 'ouvgeral.gestao@gmail.com';

let servicoCount = 0;

/* ── MULTI ENTRY ────────────────────────────────────────────────────────── */
function addEntry(listId, type, placeholder) {
  const list = document.getElementById(listId);
  const row = document.createElement('div');
  row.className = 'multi-entry-row';
  row.style.flexDirection = 'column';
  row.style.alignItems = 'stretch';

  const inner = document.createElement('div');
  inner.style.cssText = 'display:flex;gap:8px;align-items:center;';

  const input = document.createElement('input');
  input.type = type;
  input.placeholder = placeholder;
  input.style.flex = '1';
  input.addEventListener('input', () => { updateProgress(); applyMask(input, type); });
  input.addEventListener('blur', () => validateInput(input, type));

  const hint = document.createElement('span');
  hint.className = 'input-hint';
  hint.textContent = type === 'tel' ? 'Apenas números, espaços, ( ) e -' :
    type === 'email' ? 'E-mail inválido — deve conter @' : '';

  const btn = document.createElement('button');
  btn.className = 'btn-remove-entry';
  btn.innerHTML = '&#10005;';
  btn.title = 'Remover';
  btn.onclick = () => { row.remove(); updateProgress(); };

  inner.appendChild(input);
  inner.appendChild(btn);
  row.appendChild(inner);
  if (hint.textContent) row.appendChild(hint);

  list.appendChild(row);
  input.focus();
  updateProgress();
}

function removeRow(btn) {
  btn.closest('.multi-entry-row').remove();
  updateProgress();
}

function applyMask(input, type) {
  if (type !== 'tel') return;
  const prev = input.selectionStart;
  const clean = input.value.replace(/[^0-9\s\+\(\)\-]/g, '');
  if (input.value !== clean) {
    input.value = clean;
    input.setSelectionRange(prev - 1, prev - 1);
  }
}

function validateInput(input, type) {
  const hint = input.closest('.multi-entry-row')?.querySelector('.input-hint');
  if (!hint) return;
  const val = input.value.trim();
  if (!val) { input.classList.remove('input-error'); hint.classList.remove('visible'); return; }

  let invalid = false;
  if (type === 'tel') invalid = /[^0-9\s\+\(\)\-]/.test(val);
  if (type === 'email') invalid = !val.includes('@') || val.indexOf('@') === 0 || val.lastIndexOf('@') === val.length - 1;

  input.classList.toggle('input-error', invalid);
  hint.classList.toggle('visible', invalid);
}

/* ── ADICIONAR SERVICO ──────────────────────────────────────────────────── */
function addServico() {
  document.querySelectorAll('.servico-card.open').forEach(c => c.classList.remove('open'));
  servicoCount++;
  const id = 'servico-' + servicoCount;
  const wrapper = document.getElementById('servicosWrapper');
  const card = document.createElement('div');
  card.className = 'servico-card open';
  card.id = id;

  card.innerHTML = `
    <button class="servico-toggle" onclick="toggleServico('${id}')">
      <div class="servico-toggle-left">
        <span class="servico-num">${servicoCount}</span>
        <div class="servico-toggle-info">
          <span class="servico-toggle-name" id="${id}-label">Novo Servico ${servicoCount}</span>
          <span class="servico-toggle-cat"  id="${id}-cat-label">Categoria nao definida</span>
        </div>
      </div>
      <div class="servico-toggle-actions">
        <button class="btn-delete-servico" onclick="deleteServico(event,'${id}')" title="Excluir Serviço">Excluir Serviço</button>
        <span class="chevron">&#9660;</span>
      </div>
    </button>

    <div class="servico-body">
      <div class="form-section-title">Identificação</div>
      <div class="form-grid">
        <div class="form-group full">
          <label>Serviço <span class="required">*</span></label>
          <input type="text" id="${id}-nome" placeholder="Nome do serviço" oninput="updateServicoLabel('${id}'); updateProgress()">
        </div>
        <div class="form-group">
          <label>Categoria</label>
          <input type="text" id="${id}-categoria" placeholder="Ex: Saúde, Educação, Habitação..." oninput="updateCatLabel('${id}'); updateProgress()">
        </div>
        <div class="form-group">
          <label>O que é o serviço</label>
          <textarea id="${id}-descricao" placeholder="Descrição resumida do que é este serviço..." oninput="updateProgress()"></textarea>
        </div>
        <div class="form-group full">
          <label>Como acessar</label>
          <textarea id="${id}-como-acessar" placeholder="Ex: Presencialmente na unidade, pelo site, pelo telefone..." oninput="updateProgress()"></textarea>
        </div>
      </div>

      <div class="form-divider"></div>

      <div class="form-section-title">Contato e Localização</div>
      <div class="form-grid">
        <div class="form-group full">
          <label>Endereço</label>
          <input type="text" id="${id}-endereco" placeholder="Rua, número, bairro, CEP" oninput="updateProgress()">
        </div>
        <div class="form-group">
          <label>Telefone(s)</label>
          <div class="multi-entry" id="${id}-telefones">
            <div class="multi-entry-row" style="flex-direction:column;align-items:stretch;">
              <div style="display:flex;gap:8px;align-items:center;">
                <input type="tel" placeholder="(21) 00000-0000" style="flex:1" oninput="updateProgress(); applyMask(this,'tel')" onblur="validateInput(this,'tel')">
              </div>
              <span class="input-hint">Apenas números, espaços, ( ) e -</span>
            </div>
          </div>
          <button class="btn-add-entry" onclick="addEntry('${id}-telefones','tel','(21) 00000-0000')">+ Adicionar telefone</button>
        </div>
        <div class="form-group">
          <label>E-mail(s)</label>
          <div class="multi-entry" id="${id}-emails">
            <div class="multi-entry-row" style="flex-direction:column;align-items:stretch;">
              <div style="display:flex;gap:8px;align-items:center;">
                <input type="email" placeholder="secretaria@duquedecaxias.rj.gov.br" style="flex:1" oninput="updateProgress()" onblur="validateInput(this,'email')">
              </div>
              <span class="input-hint">E-mail inválido — deve conter @</span>
            </div>
          </div>
          <button class="btn-add-entry" onclick="addEntry('${id}-emails','email','secretaria@duquedecaxias.rj.gov.br')">+ Adicionar e-mail</button>
        </div>
        <div class="form-group full">
          <label>Link(s)</label>
          <div class="multi-entry" id="${id}-links">
            <div class="multi-entry-row">
              <input type="url" placeholder="https://www.duquedecaxias.rj.gov.br/..." oninput="updateProgress()">
            </div>
          </div>
          <button class="btn-add-entry" onclick="addEntry('${id}-links','url','https://www.duquedecaxias.rj.gov.br/...')">+ Adicionar link</button>
        </div>
      </div>

      <div class="form-divider"></div>

      <div class="form-section-title">Detalhes do Serviço</div>
      <div class="form-grid">
        <div class="form-group full">
          <label>Passo a Passo</label>
          <div class="passos-list" id="${id}-passos">
            <div class="passo-row">
              <div class="passo-num-badge">1</div>
              <input type="text" placeholder="Descreva o 1º passo..." oninput="updateProgress()">
              <button class="btn-remove-entry" onclick="removePasso(this,'${id}')">&#10005;</button>
            </div>
          </div>
          <button class="btn-add-entry" onclick="addPasso('${id}')">+ Adicionar passo</button>
        </div>
        <div class="form-group full">
          <label>Quem pode solicitar</label>
          <textarea id="${id}-quem" placeholder="Ex: Pessoa física ou jurídica, maiores de 18 anos..." oninput="updateProgress()"></textarea>
        </div>
        <div class="form-group full">
          <label>Documentação necessária</label>
          <div class="multi-entry" id="${id}-docs">
            <div class="multi-entry-row">
              <input type="text" placeholder="Ex: RG e CPF originais" oninput="updateProgress()">
            </div>
          </div>
          <button class="btn-add-entry" onclick="addEntry('${id}-docs','text','Ex: Comprovante de residência')">+ Adicionar documento</button>
        </div>
        <div class="form-group">
          <label>Tempo de espera</label>
          <input type="text" id="${id}-espera" placeholder="Ex: Atendimento imediato / 3 dias úteis" oninput="updateProgress()">
        </div>
        <div class="form-group">
          <label>Prazo máximo</label>
          <input type="text" id="${id}-prazo" placeholder="Ex: 30 dias corridos" oninput="updateProgress()">
        </div>
        <div class="form-group">
          <label>Quanto custa</label>
          <input type="text" id="${id}-custo" placeholder="Ex: Gratuito / R$ 50,00" oninput="updateProgress()">
        </div>
        <div class="form-group">
          <label>Norma que regulamenta</label>
          <input type="text" id="${id}-norma" placeholder="Ex: Lei Municipal n. 2.960/2007" oninput="updateProgress()">
        </div>
        <div class="form-group full">
          <label>Prioridade de atendimento</label>
          <div class="prioridade-grid" id="${id}-prioridade">
            ${[
      'Sem prioridade',
      'Idosos com idade igual ou superior a 80 anos',
      'Pessoas com deficiência',
      'Pessoas com Transtorno do Espectro Autista (TEA)',
      'Idosos com idade entre 60 e 79 anos',
      'Gestantes e lactantes',
      'Pessoas com crianças de colo',
      'Pessoas com obesidade',
      'Pessoas com mobilidade reduzida'
    ].map((op) => `
              <label class="prioridade-option">
                <input type="checkbox" value="${op}" onchange="handlePrioridadeChange(this)">
                <span class="prioridade-check"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></span>
                ${op}
              </label>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  wrapper.appendChild(card);
  card.querySelector(`#${id}-nome`).focus();
  updateProgress();
}

function toggleServico(id) {
  const card = document.getElementById(id);
  const isOpen = card.classList.contains('open');
  document.querySelectorAll('.servico-card.open').forEach(c => c.classList.remove('open'));
  if (!isOpen) card.classList.add('open');
}

function deleteServico(e, id) {
  e.stopPropagation();
  if (!confirm('Excluir este serviço?')) return;
  document.getElementById(id).remove();
  updateProgress();
}

function updateServicoLabel(id) {
  const v = document.getElementById(`${id}-nome`).value.trim();
  document.getElementById(`${id}-label`).textContent = v || 'Serviço sem nome';
}

function updateCatLabel(id) {
  const v = document.getElementById(`${id}-categoria`).value.trim();
  document.getElementById(`${id}-cat-label`).textContent = v || 'Categoria não definida';
}

/* ── PASSOS ─────────────────────────────────────────────────────────────── */
function addPasso(servicoId) {
  const list = document.getElementById(`${servicoId}-passos`);
  const num = list.querySelectorAll('.passo-row').length + 1;
  const row = document.createElement('div');
  row.className = 'passo-row';
  row.innerHTML = `
    <div class="passo-num-badge">${num}</div>
    <input type="text" placeholder="Descreva o ${num}º passo..." oninput="updateProgress()">
    <button class="btn-remove-entry" onclick="removePasso(this,'${servicoId}')">&#10005;</button>
  `;
  list.appendChild(row);
  row.querySelector('input').focus();
}

function removePasso(btn, servicoId) {
  btn.closest('.passo-row').remove();
  renumPassos(servicoId);
}

function renumPassos(servicoId) {
  document.querySelectorAll(`#${servicoId}-passos .passo-row`).forEach((r, i) => {
    r.querySelector('.passo-num-badge').textContent = i + 1;
  });
}

/* ── PRIORIDADE ─────────────────────────────────────────────────────────── */
function handlePrioridadeChange(input) {
  const label = input.closest('.prioridade-option');
  if (label) {
    label.classList.toggle('checked', input.checked);
  }
}

function getPrioridades(id) {
  return [...document.querySelectorAll(`#${id}-prioridade input:checked`)]
    .map(cb => cb.value);
}

/* ── PROGRESS ───────────────────────────────────────────────────────────── */
function updateProgress() {
  const all = [...document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="url"], textarea')]
    .filter(el => !el.closest('#configModal'));
  let filled = 0;
  all.forEach(el => { if (el.value.trim()) filled++; });
  const pct = all.length ? Math.round((filled / all.length) * 100) : 0;
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressCount').textContent = `${filled} de ${all.length} campos`;
}

/* ── COLETA DE DADOS ────────────────────────────────────────────────────── */
function getMulti(listId) {
  return [...document.querySelectorAll(`#${listId} input`)].map(i => i.value.trim()).filter(Boolean);
}

function collectData() {
  const orgaoNome = document.getElementById('sec-nome')?.value.trim() || '';

  const servicos = [];
  document.querySelectorAll('.servico-card').forEach(card => {
    const id = card.id;
    const passos = [...card.querySelectorAll(`#${id}-passos input`)].map(i => i.value.trim()).filter(Boolean);
    const docs = getMulti(`${id}-docs`);
    const fones = getMulti(`${id}-telefones`);
    const emails = getMulti(`${id}-emails`);
    const links = getMulti(`${id}-links`);

    servicos.push({
      servico: document.getElementById(`${id}-nome`)?.value.trim() || '',
      categoria: document.getElementById(`${id}-categoria`)?.value.trim() || '',
      o_que_e: document.getElementById(`${id}-descricao`)?.value.trim() || '',
      como_acessar: document.getElementById(`${id}-como-acessar`)?.value.trim() || '',
      endereco: document.getElementById(`${id}-endereco`)?.value.trim() || '',
      telefones: fones,
      emails: emails,
      links: links,
      passos: passos,
      quem_pode_solicitar: document.getElementById(`${id}-quem`)?.value.trim() || '',
      documentos: docs,
      tempo_de_espera: document.getElementById(`${id}-espera`)?.value.trim() || '',
      prazo_maximo: document.getElementById(`${id}-prazo`)?.value.trim() || '',
      prioridade_atendimento: getPrioridades(id),
      quanto_custa: document.getElementById(`${id}-custo`)?.value.trim() || '',
      norma_que_regulamenta: document.getElementById(`${id}-norma`)?.value.trim() || '',
    });
  });

  return { orgaoNome, servicos };
}

/* ── ENVIAR EMAIL (via Backend) ─────────────────────────────────────────── */
function exportEmail() {
  const data = collectData();

  if (!data.orgaoNome) {
    showToast('Preencha o nome do órgão antes de enviar.', 'error');
    return;
  }
  if (data.servicos.length === 0) {
    showToast('Adicione pelo menos um serviço antes de enviar.', 'error');
    return;
  }

  openConfigModal();
}

function openConfigModal() {
  document.getElementById('configModal').classList.add('show');
  document.getElementById('configReplyTo').value = '';
  document.getElementById('configReplyTo').focus();
}

function closeConfigModal() {
  document.getElementById('configModal').classList.remove('show');
}

async function sendEmail() {
  const data = collectData();
  const replyTo = document.getElementById('configReplyTo').value.trim();
  const sendBtn = document.getElementById('configSendBtn');

  if (!replyTo || !replyTo.includes('@')) {
    showToast('Informe um e-mail de resposta válido.', 'error');
    return;
  }

  sendBtn.disabled = true;
  sendBtn.innerHTML = '<span class="config-spinner"></span> Enviando...';

  try {
    const response = await fetch('/cds/api/enviar-cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgaoNome: data.orgaoNome,
        replyTo,
        servicos: data.servicos,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Erro ao enviar e-mail.');
    }

    closeConfigModal();
    showSuccessModal();

  } catch (err) {
    console.error('Erro no envio:', err);
    showToast(err.message || 'Erro ao enviar e-mail. Tente novamente.', 'error');
  } finally {
    sendBtn.disabled = false;
    sendBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
      Enviar agora`;
  }
}

/* ── SUCCESS MODAL ──────────────────────────────────────────────────────── */
function showSuccessModal() {
  document.getElementById('successModalDest').textContent = EMAIL_DESTINATARIO_DISPLAY;
  document.getElementById('successModal').classList.add('show');
}

function closeSuccessModal() {
  document.getElementById('successModal').classList.remove('show');
}

/* ── TOAST ──────────────────────────────────────────────────────────────── */
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3500);
}

/* ── INIT ───────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  updateProgress();

  document.getElementById('configModal').addEventListener('click', e => {
    if (e.target === document.getElementById('configModal')) closeConfigModal();
  });
  document.getElementById('successModal').addEventListener('click', e => {
    if (e.target === document.getElementById('successModal')) closeSuccessModal();
  });
});
