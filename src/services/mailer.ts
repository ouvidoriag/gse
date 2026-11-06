import nodemailer from 'nodemailer';
import { config } from '../config';
import { getAllSystemSettingsMap } from '../routes/adminSettings';

export interface EmailOptions {
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const settings = await getAllSystemSettingsMap();
  const host = settings.smtp_host || config.smtp.host;
  const port = Number(settings.smtp_port || config.smtp.port || 587);
  const user = settings.smtp_user || config.smtp.user;
  const pass = settings.smtp_pass || config.smtp.pass;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from: `"Portal Unificado PMDC" <${user}>`,
    to: options.to,
    replyTo: options.replyTo || user,
    subject: options.subject,
    html: options.html,
    attachments: (options.attachments || []).map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType:
        a.contentType ||
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })),
  });
}
