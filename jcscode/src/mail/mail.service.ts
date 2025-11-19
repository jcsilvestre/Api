import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST ?? 'smtp.hostinger.com',
    port: parseInt(process.env.MAIL_PORT ?? '465'),
    secure: true,
    auth: {
      user: process.env.MAIL_USER ?? 'no-reply@jcscode.com',
      pass: process.env.MAIL_PASS ?? '',
    },
  });

  async sendVerificationCode(to: string, code: string) {
    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM ?? 'JCS Code Auth <no-reply@jcscode.com>',
        to,
        subject: 'Verificação de Conta',
        html: `<p>Seu código de verificação é: <strong>${code}</strong></p><p>Expira em 24 horas.</p>`,
      });
      return true;
    } catch (err: any) {
      this.logger.error('Erro ao enviar verificação', err?.message);
      return false;
    }
  }
}
