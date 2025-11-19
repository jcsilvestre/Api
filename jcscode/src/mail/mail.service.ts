import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private transporter: Transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST ?? 'smtp.hostinger.com',
    port: parseInt(process.env.MAIL_PORT ?? '465'),
    secure: true,
    auth: {
      user: process.env.MAIL_USER ?? 'no-reply@jcscode.com',
      pass: process.env.MAIL_PASS ?? '',
    },
  });

  private verificationTemplate(to: string, code: string, link: string) {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Seu Código Token</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box }
    body { font-family: 'Poppins', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px }
    .email-container { max-width: 600px; width: 100%; background: #ffffff; border-radius: 20px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); overflow: hidden; animation: slideIn 0.6s ease-out }
    @keyframes slideIn { from { opacity: 0; transform: translateY(30px) } to { opacity: 1; transform: translateY(0) } }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; position: relative; overflow: hidden }
    .header::before { content: ''; position: absolute; top: -50%; right: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%); animation: pulse 3s ease-in-out infinite }
    @keyframes pulse { 0%, 100% { transform: scale(1) } 50% { transform: scale(1.1) } }
    .logo { width: 80px; height: 80px; background: rgba(255, 255, 255, 0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; backdrop-filter: blur(10px); border: 3px solid rgba(255, 255, 255, 0.3) }
    .logo svg { width: 40px; height: 40px; fill: white }
    .header h1 { color: white; font-size: 28px; font-weight: 700; margin-bottom: 10px; position: relative; z-index: 1 }
    .header p { color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 300; position: relative; z-index: 1 }
    .content { padding: 50px 40px }
    .message { text-align: center; margin-bottom: 40px }
    .message h2 { color: #333; font-size: 22px; font-weight: 600; margin-bottom: 15px }
    .message p { color: #666; font-size: 15px; line-height: 1.6; font-weight: 300 }
    .token-box { background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 15px; padding: 30px; text-align: center; position: relative; overflow: hidden; margin: 30px 0 }
    .token-box::before { content: ''; position: absolute; top: -2px; left: -2px; right: -2px; bottom: -2px; background: linear-gradient(135deg, #667eea, #764ba2, #667eea); border-radius: 15px; z-index: 0; animation: borderRotate 3s linear infinite; background-size: 200% 200% }
    @keyframes borderRotate { 0% { background-position: 0% 50% } 50% { background-position: 100% 50% } 100% { background-position: 0% 50% } }
    .token-inner { background: white; border-radius: 13px; padding: 25px; position: relative; z-index: 1 }
    .token-label { color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px; font-weight: 600 }
    .token-code { font-size: 42px; font-weight: 700; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1) }
    .expiry { margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee }
    .expiry p { color: #999; font-size: 13px }
    .expiry strong { color: #667eea; font-weight: 600 }
    .info-section { background: #f8f9fa; border-radius: 10px; padding: 25px; margin-top: 30px }
    .info-section h3 { color: #333; font-size: 16px; font-weight: 600; margin-bottom: 15px; display: flex; align-items: center; gap: 10px }
    .info-section ul { list-style: none; color: #666; font-size: 14px; line-height: 1.8 }
    .info-section li { padding-left: 25px; position: relative; margin-bottom: 8px }
    .info-section li::before { content: '✓'; position: absolute; left: 0; color: #667eea; font-weight: bold }
    .footer { background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #eee }
    .footer p { color: #999; font-size: 13px; line-height: 1.6; margin-bottom: 15px }
    .footer a { color: #667eea; text-decoration: none; font-weight: 500 }
    .cta { text-align: center; margin-top: 18px }
    .cta a { display: inline-block; background: #667eea; color: #fff; padding: 12px 18px; border-radius: 8px; text-decoration: none }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </div>
      <h1>Código de Verificação</h1>
      <p>Autenticação Segura</p>
    </div>
    <div class="content">
      <div class="message">
        <h2>Olá!</h2>
        <p>Recebemos uma solicitação para acessar sua conta (${to}). Use o código abaixo para completar sua autenticação.</p>
      </div>
      <div class="token-box">
        <div class="token-inner">
          <div class="token-label">Seu Código Token</div>
          <div class="token-code">${code}</div>
          <div class="expiry"><p>Este código expira em <strong>24 horas</strong></p></div>
        </div>
      </div>
      <div class="cta">
        <a href="${link}" target="_blank" rel="noopener">Verificar agora</a>
      </div>
      <div class="info-section">
        <h3>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#667eea" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          Informações Importantes
        </h3>
        <ul>
          <li>Nunca compartilhe este código com ninguém</li>
          <li>Nossa equipe nunca solicitará este código por telefone ou email</li>
          <li>Se você não solicitou este código, ignore este email</li>
          <li>O código pode ser usado apenas uma vez</li>
        </ul>
      </div>
    </div>
    <div class="footer">
      <p>Este é um email automático, por favor não responda.</p>
      <p>Precisa de ajuda? <a href="${link}">Acessar verificação</a></p>
    </div>
  </div>
</body>
</html>`;
  }

  async sendVerificationCode(to: string, code: string) {
    try {
      const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
      const link = `${appUrl}/v1/index.html?email=${encodeURIComponent(to)}&code=${encodeURIComponent(code)}#verificar`;
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM ?? 'JCS Code Auth <no-reply@jcscode.com>',
        to,
        subject: 'Verificação de Conta',
        html: this.verificationTemplate(to, code, link),
      });
      return true;
    } catch (err: unknown) {
      const e = err as Record<string, unknown>;
      const details = {
        message: String(e['message'] ?? ''),
        code: String(e['code'] ?? ''),
        response: String(e['response'] ?? ''),
        stack: String(e['stack'] ?? ''),
      };
      this.logger.error('Erro ao enviar verificação', JSON.stringify(details));
      return false;
    }
  }

  async sendResetPassword(to: string, token: string) {
    try {
      const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
      const link = `${appUrl}/v1/index.html?token=${encodeURIComponent(token)}#reset`;
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM ?? 'JCS Code Auth <no-reply@jcscode.com>',
        to,
        subject: 'Recuperação de Senha',
        html: `<p>Para redefinir sua senha, use o token: <strong>${token}</strong></p><p>Ou clique no link: <a href="${link}">${link}</a></p>`,
      });
      return true;
    } catch (err: unknown) {
      const e = err as Record<string, unknown>;
      const details = {
        message: String(e['message'] ?? ''),
        code: String(e['code'] ?? ''),
        response: String(e['response'] ?? ''),
        stack: String(e['stack'] ?? ''),
      };
      this.logger.error(
        'Erro ao enviar reset password',
        JSON.stringify(details),
      );
      return false;
    }
  }
}
