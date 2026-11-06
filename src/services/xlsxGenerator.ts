import ExcelJS from 'exceljs';

export interface ServicoData {
  servico: string;
  orgao?: string;
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

export async function generateXlsx(
  orgaoNome: string,
  servicos: ServicoData[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Servicos');

  const headers = [
    'Serviço',
    'Órgão',
    'Categoria',
    'O que é o serviço',
    'Como acessar',
    'Endereço',
    'Telefone',
    'E-mail(s)',
    'Link(s)',
    'Passo a passo',
    'Quem pode solicitar',
    'Documentação necessária',
    'Tempo de espera',
    'Prazo máximo',
    'Prioridade de atendimento',
    'Quanto custa',
    'Norma que regulamenta',
  ];

  const NCOLS = headers.length;
  const dataHoje = new Date().toLocaleString('pt-BR');

  // Linha 1: Título
  const titleRow = sheet.addRow([
    `Carta de Serviço Municipal — ${orgaoNome}`,
  ]);
  sheet.mergeCells(1, 1, 1, NCOLS);
  titleRow.height = 32;
  titleRow.getCell(1).font = {
    bold: true,
    size: 16,
    color: { argb: 'FF003366' },
  };
  titleRow.getCell(1).alignment = { vertical: 'middle' };

  // Linha 2: Meta
  const metaRow = sheet.addRow([
    `Gerado em: ${dataHoje}   |   Total de serviços: ${servicos.length}`,
  ]);
  sheet.mergeCells(2, 1, 2, NCOLS);
  metaRow.height = 20;
  metaRow.getCell(1).font = {
    italic: true,
    size: 10,
    color: { argb: 'FF666666' },
  };

  // Linha 3: Cabeçalhos
  const headerRow = sheet.addRow(headers);
  headerRow.height = 34;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF003366' },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
    };
  });

  // Linhas de dados
  for (const s of servicos) {
    const orgaoFinal = s.orgao && s.orgao.trim() ? s.orgao.trim() : (orgaoNome && orgaoNome !== 'Consolidado' ? orgaoNome : 'Prefeitura Municipal de Duque de Caxias');
    const categoriaFinal = s.categoria && s.categoria.trim() ? s.categoria.trim() : 'Geral';
    const descFinal = s.o_que_e && s.o_que_e.trim() ? s.o_que_e.trim() : 'Serviço público oficial prestado pelo Município de Duque de Caxias.';
    const acessoFinal = s.como_acessar && s.como_acessar.trim() ? s.como_acessar.trim() : 'Atendimento presencial na sede do órgão ou canais oficiais.';
    const enderecoFinal = s.endereco && s.endereco.trim() ? s.endereco.trim() : 'Sede da Secretaria / Conforme unidade de atendimento informada';
    const telefonesFinal = s.telefones && s.telefones.length > 0 ? s.telefones.join(' | ') : 'Central de Atendimento PMDC: (21) 2773-6200';
    const emailsFinal = s.emails && s.emails.length > 0 ? s.emails.join(' | ') : 'ouvidoria@duquedecaxias.rj.gov.br';
    const linksFinal = s.links && s.links.length > 0 ? s.links.join(' | ') : 'https://www.duquedecaxias.rj.gov.br';
    const passosFinal = s.passos && s.passos.length > 0 
      ? s.passos.map((p, i) => `${i + 1}. ${p}`).join('\n')
      : '1. Comparecer ao posto ou canal oficial indicado portando documento de identificação com foto.\n2. Solicitar abertura de atendimento ou protocolo do serviço.';
    const quemFinal = s.quem_pode_solicitar && s.quem_pode_solicitar.trim() ? s.quem_pode_solicitar.trim() : 'Cidadãos residentes, domiciliados ou atuantes no Município de Duque de Caxias.';
    const docsFinal = s.documentos && s.documentos.length > 0 ? s.documentos.join('; ') : 'Documento de identificação oficial com foto (RG ou CNH) e CPF.';
    const esperaFinal = s.tempo_de_espera && s.tempo_de_espera.trim() ? s.tempo_de_espera.trim() : 'Conforme ordem de chegada e prioridades legais';
    const prazoFinal = s.prazo_maximo && s.prazo_maximo.trim() ? s.prazo_maximo.trim() : 'Conforme procedimento e análise processual do órgão';
    const prioridadesFinal = s.prioridade_atendimento && s.prioridade_atendimento.length > 0 ? s.prioridade_atendimento.join('; ') : 'Prioridades legais (Lei Federal nº 10.048/2000)';
    const custoFinal = s.quanto_custa && s.quanto_custa.trim() ? s.quanto_custa.trim() : 'Gratuito';
    const normaFinal = s.norma_que_regulamenta && s.norma_que_regulamenta.trim() ? s.norma_que_regulamenta.trim() : 'Lei Federal nº 13.460/2017 e legislação municipal vigente';

    const row = sheet.addRow([
      s.servico,
      orgaoFinal,
      categoriaFinal,
      descFinal,
      acessoFinal,
      enderecoFinal,
      telefonesFinal,
      emailsFinal,
      linksFinal,
      passosFinal,
      quemFinal,
      docsFinal,
      esperaFinal,
      prazoFinal,
      prioridadesFinal,
      custoFinal,
      normaFinal,
    ]);
    row.height = 55;
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.font = { size: 10 };
    });
  }

  // Largura das colunas
  const widths = [
    32, 36, 20, 42, 38, 42, 20, 32, 38, 46, 38, 42, 20, 20, 38, 18, 32,
  ];
  widths.forEach((w, i) => {
    sheet.getColumn(i + 1).width = w;
  });

  // Congelar as 3 primeiras linhas
  sheet.views = [{ state: 'frozen', ySplit: 3 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
