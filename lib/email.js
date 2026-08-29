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

var SITE_URL = "https://www.hydropowertecnic.com";
// Versión del logo con el fondo azul marino ya "horneado" en el propio PNG
// (no transparente): el logo original es transparente y solo se lee bien
// sobre ese azul exacto, así que si un cliente de correo reprocesa el fondo
// del bloque de cabecera (el modo oscuro de Gmail/Apple Mail en móvil, o
// Outlook de escritorio) el logo queda flotando sobre un color que no le
// corresponde. Con el fondo ya incluido en la imagen, se ve igual pase lo
// que pase con el color que decida poner el cliente alrededor.
var LOGO_URL = SITE_URL + "/assets/img/logo-email-header.png";
var PRIVACY_URL = SITE_URL + "/politica-privacidad.html";
var COMPANY_LEGAL_NAME = "Hydropower Tecnic";
var COMPANY_PHONE_DISPLAY = "+34 683 636 312";
var COMPANY_PHONE_TEL = "+34683636312";
var COMPANY_EMAIL = "sat@hydropowertecnic.com";
var COMPANY_ADDRESS = "Polígono Industrial Casarrubios, C/ Argentina Nº2, Nave A2 · 28806 Alcalá de Henares, Madrid";

// A quién llega el aviso interno de "nuevo presupuesto" -- separado de
// COMPANY_EMAIL (que es la identidad de cara al cliente, remitente y
// reply-to de su correo de confirmación) porque durante el desarrollo del
// sitio conviene que llegue a quien lo está probando, no al buzón real del
// cliente. Cuando el cliente esté listo para recibirlos, basta con cambiar
// esta variable en Vercel, sin tocar código.
var NOTIFICATION_EMAIL = process.env.LEAD_NOTIFICATION_EMAIL || COMPANY_EMAIL;

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
    // Le dice a los clientes que lo soportan (Apple Mail, Outlook.com, Yahoo...)
    // que este correo está diseñado solo para modo claro y no debe reprocesar
    // sus colores en modo oscuro -- la causa de que el fondo de la cabecera
    // cambiara a un color que no combinaba con el logo.
    '<meta name="color-scheme" content="light">' +
    '<meta name="supported-color-schemes" content="light">' +
    '<title>Solicitud recibida</title>' +
    '<style>' +
    '@media (max-width: 600px) {' +
    '  .container { width: 100% !important; }' +
    '  .px-mobile { padding-left: 20px !important; padding-right: 20px !important; }' +
    '}' +
    // Red de seguridad para clientes que aplican modo oscuro igualmente pese al
    // meta de arriba (algunas versiones de Gmail lo ignoran): se repiten los
    // mismos colores del diseño en modo claro con !important, así que si el
    // cliente entra en modo oscuro el correo se ve exactamente igual en vez de
    // con colores adivinados por el cliente.
    '@media (prefers-color-scheme: dark) {' +
    '  .email-bg { background-color:#F3F4F6 !important; }' +
    '  .card-bg { background-color:#FFFFFF !important; }' +
    '  .header-bg { background-color:#0F172A !important; }' +
    '  .accent-bar { background-color:#EF6D00 !important; }' +
    '  .footer-bg { background-color:#F3F4F6 !important; }' +
    '  .highlight-box { background-color:#F3F4F6 !important; }' +
    '  .text-dark { color:#0F172A !important; }' +
    '  .text-muted { color:#6B7280 !important; }' +
    '  .text-faint { color:#9CA3AF !important; }' +
    '}' +
    '</style>' +
    '</head>' +
    '<body style="margin:0;padding:0;background-color:#F3F4F6;">' +
    '<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;">Te contactaremos en menos de 24 horas laborables. — Hydropower Tecnic</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-bg" style="background-color:#F3F4F6;padding:32px 12px;">' +
    '<tr><td align="center">' +
    '<table role="presentation" class="container card-bg" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:10px;overflow:hidden;">' +

    // Header
    '<tr><td class="header-bg" bgcolor="#0F172A" style="background-color:#0F172A;padding:32px 40px;text-align:center;">' +
    '<img src="' + LOGO_URL + '" alt="Hydropower Tecnic" width="180" style="display:block;margin:0 auto;width:180px;max-width:180px;height:auto;border:0;">' +
    '</td></tr>' +
    '<tr><td class="accent-bar" bgcolor="#EF6D00" style="height:4px;background-color:#EF6D00;line-height:4px;font-size:0;">&nbsp;</td></tr>' +

    // Body
    '<tr><td class="px-mobile card-bg" style="padding:40px;font-family:Inter,-apple-system,\'Segoe UI\',Arial,sans-serif;">' +
    '<p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#EF6D00;">Solicitud recibida</p>' +
    '<h1 class="text-dark" style="margin:0 0 20px;font-size:24px;line-height:1.3;color:#0F172A;font-weight:700;">Hola ' + escapeHtml(nombre) + ',</h1>' +
    '<p class="text-dark" style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#0F172A;">Gracias por confiar en <strong>Hydropower Tecnic</strong>. Hemos recibido tu solicitud y ya está en manos de nuestro equipo técnico.</p>' +

    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="highlight-box" style="background-color:#F3F4F6;border-left:4px solid #EF6D00;border-radius:6px;margin:0 0 24px;">' +
    '<tr><td style="padding:16px 20px;">' +
    '<p class="text-dark" style="margin:0;font-size:15px;line-height:1.5;color:#0F172A;font-weight:700;">Te contactaremos en menos de 24 horas laborables</p>' +
    '<p class="text-muted" style="margin:6px 0 0;font-size:14px;line-height:1.5;color:#6B7280;">Un técnico revisará tu caso y se pondrá en contacto contigo por teléfono o email para darte una respuesta concreta.</p>' +
    '</td></tr>' +
    '</table>' +

    (recapRows ? (
      '<p class="text-muted" style="margin:0 0 8px;font-size:13px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.04em;">Esto es lo que nos has contado</p>' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;border-top:1px solid #E5E7EB;border-bottom:1px solid #E5E7EB;">' +
      recapRows +
      '</table>'
    ) : '') +

    '<p class="text-dark" style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#0F172A;">Si necesitas hablar con nosotros antes, puedes llamarnos directamente:</p>' +

    '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">' +
    '<tr><td class="accent-bar" bgcolor="#EF6D00" style="border-radius:6px;background-color:#EF6D00;">' +
    '<a href="tel:' + COMPANY_PHONE_TEL + '" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;font-family:Inter,-apple-system,\'Segoe UI\',Arial,sans-serif;">Llamar ahora · ' + COMPANY_PHONE_DISPLAY + '</a>' +
    '</td></tr>' +
    '</table>' +

    '<p class="text-dark" style="margin:0 0 4px;font-size:15px;line-height:1.6;color:#0F172A;">Un saludo,</p>' +
    '<p class="text-dark" style="margin:0;font-size:15px;line-height:1.6;color:#0F172A;font-weight:700;">El equipo de Hydropower Tecnic</p>' +
    '</td></tr>' +

    // Footer
    '<tr><td class="px-mobile footer-bg" bgcolor="#F3F4F6" style="padding:24px 40px;background-color:#F3F4F6;font-family:Inter,-apple-system,\'Segoe UI\',Arial,sans-serif;">' +
    '<p class="text-muted" style="margin:0 0 6px;font-size:12px;line-height:1.6;color:#6B7280;">' + escapeHtml(COMPANY_LEGAL_NAME) + ' · ' + escapeHtml(COMPANY_ADDRESS) + '</p>' +
    '<p class="text-muted" style="margin:0;font-size:12px;line-height:1.6;color:#6B7280;">' + escapeHtml(COMPANY_EMAIL) + ' · ' + COMPANY_PHONE_DISPLAY + ' · <a href="' + PRIVACY_URL + '" style="color:#6B7280;">Política de privacidad</a></p>' +
    '<p class="text-faint" style="margin:10px 0 0;font-size:11px;line-height:1.5;color:#9CA3AF;">Recibes este mensaje porque has solicitado información a través del formulario de contacto de nuestra web.</p>' +
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

async function sendViaResend(payload) {
  var apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("missing_resend_api_key");

  var resp = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS)
  });

  if (!resp.ok) throw new Error("resend_send_failed_" + resp.status);
}

async function sendConfirmationEmail(lead) {
  await sendViaResend({
    from: "Hydropower Tecnic <" + COMPANY_EMAIL + ">",
    to: [lead.email],
    reply_to: COMPANY_EMAIL,
    subject: firstName(lead.nombre) + ", tu solicitud ya está con nuestro equipo técnico",
    html: buildHtml(lead),
    text: buildText(lead)
  });
}

var PRIORITY_LABELS = { alta: "Prioridad alta", media: "Prioridad media", baja: "Prioridad baja" };
var PRIORITY_COLORS = { alta: "#DC2626", media: "#EF6D00", baja: "#6B7280" };

// Aviso interno a la propia empresa (sat@hydropowertecnic.com) cada vez que
// entra un presupuesto -- distinto del correo de confirmación al cliente. Se
// manda desde una dirección "de sistema" (no sat@) para que se distinga a
// simple vista de un correo real de un cliente, y el reply-to es el email del
// propio lead: contestar este aviso escribe directamente al cliente, sin
// tener que copiar su dirección a mano.
function buildInternalNotificationHtml(lead, ai) {
  var priorityColor = ai.priority ? (PRIORITY_COLORS[ai.priority] || "#6B7280") : "#6B7280";
  var priorityLabel = ai.priority ? (PRIORITY_LABELS[ai.priority] || ai.priority) : "Sin puntuar";
  var recapRows = [
    recapRow("Nombre", lead.nombre),
    recapRow("Empresa", lead.empresa),
    recapRow("Email", lead.email),
    recapRow("Web", lead.web),
    recapRow("Presupuesto", lead.presupuesto ? PRESUPUESTO_LABELS[lead.presupuesto] : ""),
    recapRow("Mensaje", lead.mensaje)
  ].join("");

  return (
    '<!DOCTYPE html>' +
    '<html lang="es"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<meta name="color-scheme" content="light">' +
    '<meta name="supported-color-schemes" content="light">' +
    '<title>Nuevo presupuesto</title>' +
    '</head>' +
    '<body style="margin:0;padding:0;background-color:#F3F4F6;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:32px 12px;">' +
    '<tr><td align="center">' +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:10px;overflow:hidden;font-family:Inter,-apple-system,\'Segoe UI\',Arial,sans-serif;">' +

    '<tr><td bgcolor="#0F172A" style="background-color:#0F172A;padding:24px 32px;">' +
    '<p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#FFFFFF;">Formulario web · Nuevo presupuesto</p>' +
    '</td></tr>' +

    '<tr><td style="padding:32px;">' +
    '<h1 style="margin:0 0 4px;font-size:22px;color:#0F172A;font-weight:700;">' + escapeHtml(lead.nombre) + (lead.empresa ? ' <span style="font-weight:400;color:#6B7280;">· ' + escapeHtml(lead.empresa) + '</span>' : '') + '</h1>' +
    '<p style="margin:0 0 20px;font-size:13px;color:#6B7280;">Ha solicitado presupuesto a través de la web.</p>' +

    '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">' +
    '<tr><td bgcolor="' + priorityColor + '" style="background-color:' + priorityColor + ';border-radius:4px;padding:6px 14px;">' +
    '<span style="font-size:13px;font-weight:700;color:#FFFFFF;">' + escapeHtml(priorityLabel) + (ai.score !== null ? ' · ' + ai.score + '/100' : '') + '</span>' +
    '</td></tr>' +
    '</table>' +

    (ai.priority && ai.reasoning ? '<p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#0F172A;font-style:italic;">"' + escapeHtml(ai.reasoning) + '"</p>' : '') +

    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-top:1px solid #E5E7EB;border-bottom:1px solid #E5E7EB;">' +
    recapRows +
    '</table>' +

    '<table role="presentation" cellpadding="0" cellspacing="0">' +
    '<tr><td bgcolor="#EF6D00" style="border-radius:6px;background-color:#EF6D00;">' +
    '<a href="mailto:' + encodeURIComponent(lead.email) + '" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;">Responder al cliente</a>' +
    '</td></tr>' +
    '</table>' +

    '<p style="margin:20px 0 0;font-size:12px;color:#9CA3AF;">Consejo: responder directamente a este correo también le escribe a él, sin tener que copiar su email.</p>' +
    '</td></tr>' +

    '</table>' +
    '</td></tr>' +
    '</table>' +
    '</body></html>'
  );
}

function buildInternalNotificationText(lead, ai) {
  var priorityLabel = ai.priority ? (PRIORITY_LABELS[ai.priority] || ai.priority) : "Sin puntuar";
  var lines = [
    "Nuevo presupuesto solicitado a través de la web.",
    "",
    "Nombre: " + lead.nombre,
    lead.empresa ? "Empresa: " + lead.empresa : null,
    "Email: " + lead.email,
    lead.web ? "Web: " + lead.web : null,
    lead.presupuesto ? "Presupuesto: " + PRESUPUESTO_LABELS[lead.presupuesto] : null,
    lead.mensaje ? "Mensaje: " + lead.mensaje : null,
    "",
    priorityLabel + (ai.score !== null ? " (" + ai.score + "/100)" : ""),
    (ai.priority && ai.reasoning) ? ai.reasoning : null,
    "",
    "Responde a este correo para escribir directamente al cliente."
  ].filter(function (line) { return line !== null; });
  return lines.join("\n");
}

async function sendInternalNotification(lead, ai) {
  await sendViaResend({
    from: "Formulario Web <formulario@hydropowertecnic.com>",
    to: [NOTIFICATION_EMAIL],
    reply_to: lead.email,
    subject: "Nuevo presupuesto solicitado — " + lead.nombre + (lead.empresa ? " (" + lead.empresa + ")" : ""),
    html: buildInternalNotificationHtml(lead, ai),
    text: buildInternalNotificationText(lead, ai)
  });
}

module.exports = {
  sendConfirmationEmail: sendConfirmationEmail,
  sendInternalNotification: sendInternalNotification,
  buildHtml: buildHtml,
  buildInternalNotificationHtml: buildInternalNotificationHtml
};
