// Envía al cliente el correo de confirmación tras un envío del formulario de
// contacto: refuerza que la solicitud ha llegado y que se le va a contactar
// pronto, para que no se enfríe mientras espera la llamada. Se manda vía la
// API HTTP de Resend (no SMTP), con el dominio hydropowertecnic.com verificado
// allí -- por eso el remitente puede ser sat@hydropowertecnic.com sin
// necesitar la contraseña de ese buzón.
//
// Es un correo transaccional en respuesta directa a una acción del propio
// usuario (rellenar el formulario), no una comunicación comercial: no lleva
// enlace de baja porque el RGPD no lo exige aquí (art. 6.1.b, ejecución de
// medidas precontractuales a petición del interesado).

var RESEND_API_URL = "https://api.resend.com/emails";
var EMAIL_TIMEOUT_MS = 8000;

var SITE_URL = "https://hydropowertecnicslrovi.vercel.app";
var LOGO_URL = SITE_URL + "/assets/img/logo-full-white.png";
var PRIVACY_URL = SITE_URL + "/politica-privacidad.html";
var COMPANY_LEGAL_NAME = "Hydropower Tecnic SL";
var COMPANY_PHONE_DISPLAY = "+34 683 636 312";
var COMPANY_PHONE_TEL = "+34683636312";
var COMPANY_EMAIL = "sat@hydropowertecnic.com";
var COMPANY_ADDRESS = "Polígono Industrial Casarrubios, C/ Argentina Nº2, Nave A2 · 28806 Alcalá de Henares, Madrid";

var PRESUPUESTO_LABELS = {
  "": "Prefiero no indicarlo",
  "lt500": "Menos de 500€",
  "500-2000": "500€ – 2.000€",
  "2000-10000": "2.000€ – 10.000€",
  "10000-50000": "10.000€ – 50.000€",
  "gt50000": "Más de 50.000€"
};

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function firstName(nombre) {
  var trimmed = String(nombre || "").trim();
  return trimmed.split(/\s+/)[0] || trimmed;
}

// Fila de la "recap box" que confirma al cliente qué hemos entendido de su
// solicitud. Solo aparece si el dato viene relleno -- no tiene sentido mostrar
// "Empresa: (no indicada)" en un correo dirigido al propio cliente.
function recapRow(label, value) {
  if (!value) return "";
  return (
    '<tr>' +
    '<td style="padding:6px 0;font-size:14px;color:#6B7280;font-family:Inter,-apple-system,\'Segoe UI\',Arial,sans-serif;vertical-align:top;width:120px;">' + escapeHtml(label) + '</td>' +
    '<td style="padding:6px 0;font-size:14px;color:#0F172A;font-family:Inter,-apple-system,\'Segoe UI\',Arial,sans-serif;vertical-align:top;">' + escapeHtml(value) + '</td>' +
    '</tr>'
  );
}

function buildHtml(lead) {
  var nombre = firstName(lead.nombre);
  var recapRows = [
    recapRow("Nombre", lead.nombre),
    recapRow("Empresa", lead.empresa),
    recapRow("Presupuesto", lead.presupuesto ? PRESUPUESTO_LABELS[lead.presupuesto] : ""),
    recapRow("Mensaje", lead.mensaje)
  ].join("");

  return (
    '<!DOCTYPE html>' +
    '<html lang="es"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>Solicitud recibida</title>' +
    '<style>' +
    '@media (max-width: 600px) {' +
    '  .container { width: 100% !important; }' +
    '  .px-mobile { padding-left: 20px !important; padding-right: 20px !important; }' +
    '}' +
    '</style>' +
    '</head>' +
    '<body style="margin:0;padding:0;background-color:#F3F4F6;">' +
    '<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;">Te contactaremos en menos de 24 horas laborables. — Hydropower Tecnic</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:32px 12px;">' +
    '<tr><td align="center">' +
    '<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:10px;overflow:hidden;">' +

    // Header
    '<tr><td style="background-color:#0F172A;padding:32px 40px;text-align:center;">' +
    '<img src="' + LOGO_URL + '" alt="Hydropower Tecnic" width="180" style="display:block;margin:0 auto;width:180px;max-width:180px;height:auto;border:0;">' +
    '</td></tr>' +
    '<tr><td style="height:4px;background-color:#EF6D00;line-height:4px;font-size:0;">&nbsp;</td></tr>' +

    // Body
    '<tr><td class="px-mobile" style="padding:40px;font-family:Inter,-apple-system,\'Segoe UI\',Arial,sans-serif;">' +
    '<p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#EF6D00;">Solicitud recibida</p>' +
    '<h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;color:#0F172A;font-weight:700;">Hola ' + escapeHtml(nombre) + ',</h1>' +
    '<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#0F172A;">Gracias por confiar en <strong>Hydropower Tecnic</strong>. Hemos recibido tu solicitud y ya está en manos de nuestro equipo técnico.</p>' +

    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;border-left:4px solid #EF6D00;border-radius:6px;margin:0 0 24px;">' +
    '<tr><td style="padding:16px 20px;">' +
    '<p style="margin:0;font-size:15px;line-height:1.5;color:#0F172A;font-weight:700;">Te contactaremos en menos de 24 horas laborables</p>' +
    '<p style="margin:6px 0 0;font-size:14px;line-height:1.5;color:#6B7280;">Un técnico revisará tu caso y se pondrá en contacto contigo por teléfono o email para darte una respuesta concreta.</p>' +
    '</td></tr>' +
    '</table>' +

    (recapRows ? (
      '<p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.04em;">Esto es lo que nos has contado</p>' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;border-top:1px solid #E5E7EB;border-bottom:1px solid #E5E7EB;">' +
      recapRows +
      '</table>'
    ) : '') +

    '<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#0F172A;">Si necesitas hablar con nosotros antes, puedes llamarnos directamente:</p>' +

    '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">' +
    '<tr><td style="border-radius:6px;background-color:#EF6D00;">' +
    '<a href="tel:' + COMPANY_PHONE_TEL + '" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;font-family:Inter,-apple-system,\'Segoe UI\',Arial,sans-serif;">Llamar ahora · ' + COMPANY_PHONE_DISPLAY + '</a>' +
    '</td></tr>' +
    '</table>' +

    '<p style="margin:0 0 4px;font-size:15px;line-height:1.6;color:#0F172A;">Un saludo,</p>' +
    '<p style="margin:0;font-size:15px;line-height:1.6;color:#0F172A;font-weight:700;">El equipo de Hydropower Tecnic</p>' +
    '</td></tr>' +

    // Footer
    '<tr><td class="px-mobile" style="padding:24px 40px;background-color:#F3F4F6;font-family:Inter,-apple-system,\'Segoe UI\',Arial,sans-serif;">' +
    '<p style="margin:0 0 6px;font-size:12px;line-height:1.6;color:#6B7280;">' + escapeHtml(COMPANY_LEGAL_NAME) + ' · ' + escapeHtml(COMPANY_ADDRESS) + '</p>' +
    '<p style="margin:0;font-size:12px;line-height:1.6;color:#6B7280;">' + escapeHtml(COMPANY_EMAIL) + ' · ' + COMPANY_PHONE_DISPLAY + ' · <a href="' + PRIVACY_URL + '" style="color:#6B7280;">Política de privacidad</a></p>' +
    '<p style="margin:10px 0 0;font-size:11px;line-height:1.5;color:#9CA3AF;">Recibes este mensaje porque has solicitado información a través del formulario de contacto de nuestra web.</p>' +
    '</td></tr>' +

    '</table>' +
    '</td></tr>' +
    '</table>' +
    '</body></html>'
  );
}

function buildText(lead) {
  var nombre = firstName(lead.nombre);
  var lines = [
    "Hola " + nombre + ",",
    "",
    "Gracias por confiar en Hydropower Tecnic. Hemos recibido tu solicitud y ya está en manos de nuestro equipo técnico.",
    "",
    "Te contactaremos en menos de 24 horas laborables por teléfono o email para darte una respuesta concreta.",
    "",
    "¿Necesitas hablar antes? Llámanos al " + COMPANY_PHONE_DISPLAY + ".",
    "",
    "Un saludo,",
    "El equipo de Hydropower Tecnic",
    "",
    "--",
    COMPANY_LEGAL_NAME + " · " + COMPANY_ADDRESS,
    COMPANY_EMAIL + " · " + COMPANY_PHONE_DISPLAY,
    PRIVACY_URL
  ];
  return lines.join("\n");
}

async function sendConfirmationEmail(lead) {
  var apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("missing_resend_api_key");

  var resp = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "Hydropower Tecnic <" + COMPANY_EMAIL + ">",
      to: [lead.email],
      reply_to: COMPANY_EMAIL,
      subject: firstName(lead.nombre) + ", tu solicitud ya está con nuestro equipo técnico",
      html: buildHtml(lead),
      text: buildText(lead)
    }),
    signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS)
  });

  if (!resp.ok) throw new Error("resend_send_failed_" + resp.status);
}

module.exports = { sendConfirmationEmail: sendConfirmationEmail, buildHtml: buildHtml };
