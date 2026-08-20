// Vercel Serverless Function: entrega la API key de Google Maps al
// navegador para inicializar el mapa interactivo.
//
// A diferencia de la clave de api/reviews.js, esta SÍ tiene que llegar al
// cliente -- la Maps JavaScript API se ejecuta en el navegador del
// visitante, no hay forma de evitarlo. Por eso se sirve desde aquí en vez
// de escribirla directamente en index.html o main.js: el repositorio de
// este proyecto es público en GitHub, y hay bots que rastrean repos
// públicos en busca de claves con el prefijo "AIzaSy" para explotarlas.
// Sirviéndola así, la clave nunca queda en el historial de git -- solo en
// las variables de entorno de Vercel, de donde se puede rotar sin tocar
// código. Sigue siendo visible en el tráfico de red de cualquiera que
// visite la web (es inevitable con esta API); la protección real frente a
// un uso indebido es la cuota diaria y la restricción de APIs permitidas
// que se configuran en Google Cloud, no el ocultamiento.
var CDN_MAX_AGE_S = 60 * 60;       // 1 h en el edge de Vercel
var CDN_SWR_S = 6 * 60 * 60;       // 6 h sirviendo copia obsoleta

function setCacheHeaders(res, edgeSeconds, swrSeconds) {
  if (!edgeSeconds) {
    res.setHeader("Cache-Control", "no-store");
    return;
  }
  var edge = "public, s-maxage=" + edgeSeconds +
    (swrSeconds ? ", stale-while-revalidate=" + swrSeconds : "");
  res.setHeader("Vercel-CDN-Cache-Control", edge);
  res.setHeader("CDN-Cache-Control", edge);
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
}

module.exports = function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false, error: "method_not_allowed" });
  }

  var apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error("[api/maps-key] Falta GOOGLE_MAPS_API_KEY en el entorno.");
    setCacheHeaders(res, 0);
    return res.status(503).json({ success: false, error: "not_configured" });
  }

  setCacheHeaders(res, CDN_MAX_AGE_S, CDN_SWR_S);
  return res.status(200).json({ success: true, key: apiKey });
};
