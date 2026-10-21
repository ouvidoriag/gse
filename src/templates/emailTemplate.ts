interface ServicoData {
  servico: string;
  categoria: string;
  o_que_e: string;
  como_acessar: string;
  endereco: string;
  telefones: string[];
  emails: string[];
  links: string[];
  passos: string[];
  quem_pode_solicitar: string;
  documentos: string[];
  tempo_de_espera: string;
  prazo_maximo: string;
  prioridade_atendimento: string[];
  quanto_custa: string;
  norma_que_regulamenta: string;
}

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildEmailHtml(
  orgaoNome: string,
  servicos: ServicoData[],
): string {
  const rows = servicos
    .map(
      (s, i) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #eee;color:#003366;font-weight:bold;text-align:center;">${i + 1}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee;color:#1a2a3a;">${esc(s.servico) || 'Sem nome'}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee;color:#555;">${esc(s.categoria) || 'Não informada'}</td>
      </tr>`,
    )
    .join('');

  return `
<div style="font-family:'Barlow',sans-serif,Arial;font-size:14px;color:#333;line-height:1.6;max-width:800px;margin:0 auto;background-color:#ffffff;padding:20px;">

  <div style="background-color:#003366;color:#ffffff;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
    <h2 style="margin:0;font-size:22px;">Novo Cadastro de Serviços Municipais</h2>
    <p style="margin:5px 0 0 0;opacity:0.9;">Prefeitura de Duque de Caxias</p>
  </div>

  <div style="padding:20px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;">
    <p>Olá, equipe da <strong>Ouvidoria Geral</strong>,</p>
    <p>Um novo cadastro de serviços foi recebido com os seguintes dados:</p>

    <div style="margin:20px 0;padding:14px 18px;background-color:#f4f6f8;border-radius:8px;border:1px solid #d0dce8;">
      <p style="margin:0 0 4px 0;font-size:13px;color:#718096;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">Órgão Responsável</p>
      <p style="margin:0;font-size:18px;color:#003366;font-weight:700;">${esc(orgaoNome)}</p>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:14px;text-align:left;margin:20px 0;">
      <thead>
        <tr style="background-color:#003366;">
          <th style="padding:10px 14px;color:#fff;font-weight:700;border-radius:6px 0 0 0;width:40px;">#</th>
          <th style="padding:10px 14px;color:#fff;font-weight:700;">Serviço</th>
          <th style="padding:10px 14px;color:#fff;font-weight:700;border-radius:0 6px 0 0;">Categoria</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <p style="color:#555;font-size:13px;">Total de serviços cadastrados: <strong>${servicos.length}</strong></p>

    <div style="margin-top:20px;padding:12px 16px;background-color:#f0f8ff;border-radius:6px;border:1px solid #d0e0f0;">
      <p style="margin:0;font-size:13px;color:#003366;">
        <strong>Anexo:</strong> A planilha XLSX com todos os dados detalhados de cada serviço está anexada a este e-mail.
      </p>
    </div>

    <div style="margin-top:40px;padding-top:15px;border-top:1px dashed #ccc;font-size:12px;color:#888;text-align:center;">
      <p>Para entrar em contato com o remetente, basta clicar em "Responder" neste e-mail.</p>
      <p>Gerado automaticamente pelo Sistema de Carta de Serviços.</p>
    </div>
  </div>

</div>`;
}
