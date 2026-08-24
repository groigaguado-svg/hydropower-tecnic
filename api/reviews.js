// Vercel Serverless Function: expone las reseñas de Google del negocio.
//
// La API key de Google NUNCA llega al navegador: vive solo en las variables
// de entorno del servidor (.env / Vercel Environment Variables) y esta función
// actúa de proxy, devolviendo únicamente los campos que la web necesita
// pintar. Además cachea el resultado (memoria + CDN) para que el tráfico
// del sitio no se traduzca en una llamada facturable por visita.

var PLACES_ENDPOINT = "https://places.googleapis.com/v1/places/";
var SEARCH_ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

var MAX_REVIEWS = 5;
var UPSTREAM_TIMEOUT_MS = 8000;
var MEMORY_TTL_MS = 6 * 60 * 60 * 1000;   // 6 h en la memoria del lambda
var CDN_MAX_AGE_S = 6 * 60 * 60;          // 6 h en el edge de Vercel
var CDN_SWR_S = 24 * 60 * 60;             // 24 h sirviendo copia obsoleta
var TEXT_MAX_CHARS = 1200;

// Consulta por defecto para resolver el Place ID cuando en el .env se ha
// guardado el identificador hexadecimal que aparece en las URLs de Maps.
var DEFAULT_PLACE_QUERY =
  "Hydropower Tecnic, Polígono Industrial Casarrubios, C/ Argentina 2, 28806 Alcalá de Henares, Madrid";

// Caché en memoria del lambda: sobrevive entre invocaciones en caliente.
var payloadCache = null;      // { data: {...}, expiresAt: <ms> }
var resolvedPlaceId = null;   // Place ID canónico ("ChIJ...") ya resuelto

function isCanonicalPlaceId(value) {
  // Los Place ID de la Places API son cadenas base64url-ish sin ":".
  // El formato "0x...:0x..." es el par FID:CID que aparece en las URLs de Maps.
  return !!value && value.indexOf(":") === -1 && !/^0x/i.test(value);
}

// Extrae el CID decimal del par hexadecimal "0x<fid>:0x<cid>" de Google Maps.
function cidFromHexPair(value) {
  var match = /^0x[0-9a-f]+:0x([0-9a-f]+)$/i.exec(String(value).trim());
  if (!match) return null;
  try {
    return BigInt("0x" + match[1]).toString();
  } catch (err) {
    return null;
  }
}

function fetchGoogle(url, options) {
  var opts = options || {};
  return fetch(url, {
    method: opts.method || "GET",
    headers: opts.headers,
    body: opts.body,
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
  });
}

// Traduce el identificador hexadecimal de Maps a un Place ID canónico
// buscando el negocio por texto y comparando el CID que Google devuelve
// dentro de googleMapsUri. Sin coincidencia exacta no se devuelve nada:
// preferimos no mostrar reseñas antes que mostrar las de otro negocio.
async function resolvePlaceId(configuredId, apiKey) {
  if (isCanonicalPlaceId(configuredId)) return configuredId;
  if (resolvedPlaceId) return resolvedPlaceId;

  var targetCid = cidFromHexPair(configuredId);
  if (!targetCid) throw new Error("invalid_place_id_format");

  var resp = await fetchGoogle(SEARCH_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.googleMapsUri"
    },
    body: JSON.stringify({
      textQuery: process.env.GOOGLE_PLACE_QUERY || DEFAULT_PLACE_QUERY,
      languageCode: "es",
      regionCode: "ES",
      maxResultCount: 10
    })
  });

  if (!resp.ok) throw new Error("places_search_http_" + resp.status);

  var json = await resp.json();
  var places = (json && json.places) || [];

  for (var i = 0; i < places.length; i++) {
    var uri = places[i].googleMapsUri || "";
    var cidMatch = /[?&]cid=(\d+)/.exec(uri);
    if (cidMatch && cidMatch[1] === targetCid && places[i].id) {
      resolvedPlaceId = places[i].id;
      return resolvedPlaceId;
    }
  }

  throw new Error("place_id_not_resolved");
}

// La foto de perfil del autor NO se reenvía al navegador a propósito. Pintarla
// significa cargar una imagen desde googleusercontent.com, es decir, que el
// navegador de cada visitante conecte con Google y le entregue su IP nada más
// abrir la página, sin aviso ni consentimiento previo. La web sustituye la foto
// por las iniciales del autor (ver buildReviewCard en main.js), con lo que el
// sitio no hace ni una sola petición a terceros al cargar y el CSP puede
// prescindir de googleusercontent.com en img-src.

function httpsUrlOrNull(value) {
  if (typeof value !== "string") return null;
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch (err) {
    return null;
  }
}

function normalizeReview(raw) {
  var author = raw.authorAttribution || {};
  var name = String(author.displayName || "").trim();
  var text = String((raw.text && raw.text.text) || (raw.originalText && raw.originalText.text) || "").trim();

  if (!name || !text) return null;

  var rating = Number(raw.rating);
  if (!isFinite(rating)) rating = 0;
  rating = Math.max(0, Math.min(5, Math.round(rating)));

  return {
    author: name.slice(0, 120),
    authorUrl: httpsUrlOrNull(author.uri),
    rating: rating,
    text: text.slice(0, TEXT_MAX_CHARS),
    truncated: text.length > TEXT_MAX_CHARS,
    publishTime: raw.publishTime || null,
    relativeTime: raw.relativePublishTimeDescription || null
  };
}

// Google no permite pedir las reseñas ordenadas por fecha en la Places API
// (New), así que las ordenamos aquí: más recientes primero, y recortamos a 5.
function sortAndTrim(reviews) {
  return reviews
    .map(normalizeReview)
    .filter(Boolean)
    .sort(function (a, b) {
      var ta = a.publishTime ? Date.parse(a.publishTime) : 0;
      var tb = b.publishTime ? Date.parse(b.publishTime) : 0;
      return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
    })
    .slice(0, MAX_REVIEWS);
}

async function loadPlace(placeId, apiKey) {
  var url = PLACES_ENDPOINT + encodeURIComponent(placeId) + "?languageCode=es&regionCode=ES";

  var resp = await fetchGoogle(url, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "id,displayName,rating,userRatingCount,googleMapsUri,reviews"
    }
  });

  if (!resp.ok) throw new Error("place_details_http_" + resp.status);

  var place = await resp.json();

  return {
    rating: typeof place.rating === "number" ? Math.round(place.rating * 10) / 10 : null,
    total: typeof place.userRatingCount === "number" ? place.userRatingCount : 0,
    // El enlace se pinta tal cual en un href del navegador. Aunque venga de la
    // propia API de Google, se comprueba que sea https: un href que no lo fuera
    // (javascript:, data:) sería código ejecutable en la página.
    mapsUrl: httpsUrlOrNull(place.googleMapsUri),
    reviews: sortAndTrim(place.reviews || []),
    updatedAt: new Date().toISOString()
  };
}

// Se separan explícitamente las dos cachés en vez de dejar que Vercel
// interprete un único "Cache-Control: s-maxage=...":
//   - Vercel-CDN-Cache-Control manda en el edge y no llega al navegador.
//   - Cache-Control queda solo para el cliente, que revalida siempre, para
//     que un visitante no se quede 6 h con una copia vieja en su navegador.
// Con esto el edge absorbe el tráfico y solo los arranques en frío del
// lambda llegan a gastar una llamada facturable a la Places API.
// Verificado en producción: peticiones GET seguidas devuelven
// X-Vercel-Cache: HIT con Age creciente (ojo: con HEAD siempre sale MISS,
// porque Vercel no sirve HEAD desde la caché del CDN).
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

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false, error: "method_not_allowed" });
  }

  var apiKey = process.env.GOOGLE_PLACES_API_KEY;
  var placeId = process.env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId) {
    console.error("[api/reviews] Faltan GOOGLE_PLACES_API_KEY o GOOGLE_PLACE_ID en el entorno.");
    setCacheHeaders(res, 0);
    return res.status(503).json({ success: false, error: "not_configured" });
  }

  var now = Date.now();
  if (payloadCache && payloadCache.expiresAt > now) {
    setCacheHeaders(res, CDN_MAX_AGE_S, CDN_SWR_S);
    return res.status(200).json(payloadCache.data);
  }

  try {
    var canonicalId = await resolvePlaceId(placeId, apiKey);
    var place = await loadPlace(canonicalId, apiKey);
    var data = { success: true, place: place };

    payloadCache = { data: data, expiresAt: now + MEMORY_TTL_MS };

    setCacheHeaders(res, CDN_MAX_AGE_S, CDN_SWR_S);
    return res.status(200).json(data);
  } catch (err) {
    // El mensaje puede contener detalles del upstream; se registra en el
    // servidor pero al navegador solo le llega un código genérico.
    console.error("[api/reviews] No se pudieron obtener las reseñas de Google:", err);

    if (payloadCache) {
      setCacheHeaders(res, 60);
      return res.status(200).json(payloadCache.data);
    }

    setCacheHeaders(res, 0);
    return res.status(502).json({ success: false, error: "upstream_unavailable" });
  }
};

module.exports.config = { maxDuration: 15 };
