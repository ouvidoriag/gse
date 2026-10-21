import ExcelJS from 'exceljs';

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
    const row = sheet.addRow([
      s.servico,
      orgaoNome,
      s.categoria,
      s.o_que_e,
      s.como_acessar,
      s.endereco,
      s.telefones.join(' | '),
      s.emails.join(' | '),
      s.links.join(' | '),
      s.passos.map((p, i) => `${i + 1}. ${p}`).join('\n'),
      s.quem_pode_solicitar,
      s.documentos.join('; '),
      s.tempo_de_espera,
      s.prazo_maximo,
      s.prioridade_atendimento.join('; '),
      s.quanto_custa,
      s.norma_que_regulamenta,
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
