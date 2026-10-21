import nodemailer from 'nodemailer';
import { config } from '../config';

export interface EmailOptions {
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: false,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });

  await transporter.sendMail({
    from: `"Portal Unificado PMDC" <${config.smtp.user}>`,
    to: options.to,
    replyTo: options.replyTo || config.smtp.user,
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
