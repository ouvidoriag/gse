import { Router, Request, Response } from 'express';
import { generateXlsx } from '../services/xlsxGenerator';
import { sendEmail } from '../services/mailer';
import { buildEmailHtml } from '../templates/emailTemplate';
import { config } from '../config';

export const cdsEmailRouter = Router();

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

interface CadastroPayload {
  orgaoNome: string;
  replyTo: string;
  servicos: ServicoData[];
}

cdsEmailRouter.post('/enviar-cadastro', async (req: Request, res: Response) => {
  try {
    const { orgaoNome, replyTo, servicos }: CadastroPayload = req.body;

    if (!orgaoNome || !replyTo || !servicos || !Array.isArray(servicos)) {
      return res.status(400).json({
        error: 'Dados inválidos. "orgaoNome", "replyTo" e array de "servicos" são obrigatórios.',
      });
    }

    if (servicos.length === 0) {
      return res.status(400).json({ error: 'A lista de serviços não pode estar vazia.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(replyTo)) {
      return res.status(400).json({ error: 'O e-mail de resposta ("replyTo") é inválido.' });
    }

    // Gera planilha XLSX
    const xlsxBuffer = await generateXlsx(orgaoNome, servicos);
    const htmlBody = buildEmailHtml(orgaoNome, servicos);

    const safeOrgao = orgaoNome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase();
    const dataIso = new Date().toISOString().slice(0, 10);
    const filename = `carta_servicos_${safeOrgao}_${dataIso}.xlsx`;

    const destinatario = config.smtp.destinatario;

    await sendEmail({
      to: destinatario,
      replyTo,
      subject: `[Carta de Serviços] Novo cadastro — ${orgaoNome}`,
      html: htmlBody,
      attachments: [{ filename, content: xlsxBuffer }],
    });

    return res.status(200).json({
      success: true,
      message: 'Cadastro recebido e e-mail enviado com sucesso!',
      totalServicos: servicos.length,
    });
  } catch (error) {
    console.error('Erro ao processar envio de e-mail:', error);
    return res.status(500).json({ error: 'Erro interno ao enviar o e-mail.' });
  }
});
