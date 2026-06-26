// Envio de e-mail via Resend (API HTTP — serverless friendly, sem dependência extra).
// Configurar no ambiente do backend:
//   RESEND_API_KEY  -> chave da conta Resend (obrigatório)
//   EMAIL_FROM      -> remetente verificado, ex: "FinGes <noreply@seudominio.com>"
//   APP_PUBLIC_URL  -> URL do app (opcional) para o botão de ação no e-mail

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'FinGes <onboarding@resend.dev>';
const APP_PUBLIC_URL = process.env.APP_PUBLIC_URL || '';

export const isEmailConfigured = () => !!RESEND_API_KEY;

const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Monta um e-mail HTML com a identidade do FinGes (estilos inline para clientes de e-mail).
export const buildEmailHtml = (subject: string, message: string, recipientName?: string): string => {
    const greeting = recipientName ? `Olá, ${escapeHtml(recipientName.split(' ')[0])}!` : 'Olá!';
    const body = escapeHtml(message).replace(/\n/g, '<br>');
    const cta = APP_PUBLIC_URL
        ? `<tr><td style="padding:8px 0 0;">
             <a href="${APP_PUBLIC_URL}" style="display:inline-block;background:#7C5CFC;color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;padding:14px 28px;border-radius:12px;">Abrir o FinGes</a>
           </td></tr>`
        : '';

    return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f9;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr><td style="background:linear-gradient(135deg,#7C5CFC,#6144ef);padding:28px 32px;">
          <span style="color:#ffffff;font-size:22px;font-weight:900;letter-spacing:-0.5px;">FinGes</span>
          <div style="color:#e9e4ff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;margin-top:2px;">Gestão Financeira</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;color:#0f172a;font-size:16px;font-weight:800;">${greeting}</p>
          <h1 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:900;line-height:1.3;">${escapeHtml(subject)}</h1>
          <div style="color:#334155;font-size:15px;line-height:1.6;">${body}</div>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">${cta}</table>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #eef0f4;color:#94a3b8;font-size:11px;line-height:1.5;">
          Você recebeu este e-mail porque possui uma conta no FinGes.<br>© FinGes — Gestão Financeira.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
};

// Envia um e-mail individual. Lança erro se não configurado ou se a API falhar.
export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
    if (!RESEND_API_KEY) throw new Error('EMAIL_NOT_CONFIGURED');

    const doFetch: any = (globalThis as any).fetch;
    if (!doFetch) throw new Error('FETCH_UNAVAILABLE');

    const res = await doFetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
    });

    if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`Resend ${res.status}: ${detail.slice(0, 200)}`);
    }
};
