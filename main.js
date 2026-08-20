/* ==========================================================================
   HYDROPOWER TECNIC SL — Interacciones del sitio
   Patrón IIFE clásico, sin módulos ES, cada init aislado con safe().
   ========================================================================== */

(function () {
  "use strict";

  function safe(fn, name) {
    try {
      fn();
    } catch (err) {
      console.error("[HydropowerTecnic] Error en init '" + name + "':", err);
    }
  }

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia("(hover: hover)").matches;

  /* -------------------------------------------------------------------- */
  /* Navbar: sombra al hacer scroll + menú móvil                          */
  /* -------------------------------------------------------------------- */
  function initNavbar() {
    var navbar = document.getElementById("navbar");
    var toggle = document.getElementById("navbarToggle");
    var nav = document.getElementById("navbarNav");
    if (!navbar || !toggle || !nav) return;

    function onScroll() {
      navbar.classList.toggle("is-scrolled", window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    function closeMenu() {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Abrir menú de navegación");
      document.body.style.overflow = "";
    }

    function openMenu() {
      nav.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Cerrar menú de navegación");
      document.body.style.overflow = "hidden";
    }

    toggle.addEventListener("click", function () {
      var isOpen = nav.classList.contains("is-open");
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    nav.querySelectorAll(".navbar__link, .navbar__cta a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });

    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 1040) closeMenu();
    });
  }

  /* -------------------------------------------------------------------- */
  /* Scroll suave nativo a anclas (compensa navbar sticky)                */
  /* -------------------------------------------------------------------- */
  function initSmoothAnchors() {
    var links = document.querySelectorAll('a[href^="#"]');
    links.forEach(function (link) {
      link.addEventListener("click", function (e) {
        var id = link.getAttribute("href");
        if (!id || id === "#" || id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        var navbarHeight = document.getElementById("navbar").offsetHeight;
        var top = target.getBoundingClientRect().top + window.pageYOffset - navbarHeight - 12;
        window.scrollTo({ top: top, behavior: "smooth" });
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      });
    });
  }

  /* -------------------------------------------------------------------- */
  /* Barra de progreso de scroll                                          */
  /* -------------------------------------------------------------------- */
  function initScrollProgress() {
    var bar = document.getElementById("scrollProgress");
    if (!bar) return;

    function update() {
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var pct = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
      bar.style.width = pct + "%";
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  }

  /* -------------------------------------------------------------------- */
  /* Burbuja líquida del navbar: scroll-spy + hover, al estilo iOS 26     */
  /* -------------------------------------------------------------------- */
  function initNavLiquidPill() {
    var navbar = document.getElementById("navbar");
    var nav = document.getElementById("navbarNav");
    var pill = document.getElementById("navLiquidPill");
    if (!navbar || !nav || !pill) return;

    var links = Array.prototype.slice.call(nav.querySelectorAll(".navbar__link"));
    if (!links.length) return;

    // En páginas que no son la home, algunos enlaces apuntan a anclas de otra
    // página (p. ej. "index.html#contacto"); eso no es un selector CSS válido
    // y document.querySelector lanzaría una excepción que abortaría toda la
    // función. Los tratamos como "sin sección propia" en vez de romper la
    // burbuja entera.
    var sections = links.map(function (link) {
      var id = link.getAttribute("href");
      if (!id || id.charAt(0) !== "#" || id.length < 2) return null;
      try {
        return document.querySelector(id);
      } catch (err) {
        return null;
      }
    });

    var currentLink = null;
    var hoverActive = false;

    // Si ninguna sección de la propia página coincide con el scroll (p. ej. en
    // servicios.html, que no tiene las secciones de la home), respetamos el
    // enlace marcado como "is-current" en el propio HTML para que la burbuja
    // arranque igualmente sobre él.
    var preset = links.filter(function (link) {
      return link.classList.contains("is-current");
    })[0];
    if (preset) currentLink = preset;

    function setCurrent(link) {
      if (currentLink === link) return;
      if (currentLink) currentLink.classList.remove("is-current");
      currentLink = link;
      if (currentLink) currentLink.classList.add("is-current");
    }

    function movePillTo(link) {
      if (!link || window.innerWidth <= 1040) {
        pill.classList.remove("is-active");
        return;
      }
      var navRect = nav.getBoundingClientRect();
      var linkRect = link.getBoundingClientRect();
      pill.style.width = linkRect.width + "px";
      pill.style.height = linkRect.height + "px";
      pill.style.transform = "translate(" + (linkRect.left - navRect.left) + "px, -50%)";
      pill.classList.add("is-active");
    }

    function updateSpy() {
      var scrollPos = window.scrollY + navbar.offsetHeight + 60;
      var activeIndex = -1;
      var activeTop = -Infinity;
      sections.forEach(function (sec, i) {
        if (sec && sec.offsetTop <= scrollPos && sec.offsetTop > activeTop) {
          activeIndex = i;
          activeTop = sec.offsetTop;
        }
      });
      if (activeIndex >= 0) setCurrent(links[activeIndex]);
      if (!hoverActive) movePillTo(currentLink);
    }

    links.forEach(function (link) {
      link.addEventListener("mouseenter", function () {
        hoverActive = true;
        movePillTo(link);
      });
      link.addEventListener("focus", function () {
        hoverActive = true;
        movePillTo(link);
      });
    });

    nav.addEventListener("mouseleave", function () {
      hoverActive = false;
      movePillTo(currentLink);
    });

    window.addEventListener("scroll", updateSpy, { passive: true });
    window.addEventListener("resize", function () {
      hoverActive = false;
      updateSpy();
    });

    updateSpy();

    // El ancho/posición del enlace depende de la tipografía Inter cargada vía
    // Google Fonts: en la carga inicial el texto aún mide con la fuente de
    // sistema, así que la burbuja queda mal encajada hasta el primer scroll.
    // Recalculamos en cuanto las fuentes y el resto de recursos terminan de
    // cargar para que arranque ya centrada.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        hoverActive = false;
        updateSpy();
      });
    }
    window.addEventListener("load", function () {
      hoverActive = false;
      updateSpy();
    });
  }

  /* -------------------------------------------------------------------- */
  /* Tilt 3D + brillo especular en tarjetas (pilares, productos)          */
  /* -------------------------------------------------------------------- */
  function initCardTilt() {
    if (!canHover) return;
    var cards = document.querySelectorAll(".pilar-card, .product-card, .spec-card");
    cards.forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        card.style.setProperty("--mx", (x / rect.width) * 100 + "%");
        card.style.setProperty("--my", (y / rect.height) * 100 + "%");
        card.style.setProperty("--tilt-x", ((y / rect.height) - 0.5) * -6 + "deg");
        card.style.setProperty("--tilt-y", ((x / rect.width) - 0.5) * 6 + "deg");
      });
      card.addEventListener("mouseleave", function () {
        card.style.setProperty("--tilt-x", "0deg");
        card.style.setProperty("--tilt-y", "0deg");
      });
    });
  }

  /* -------------------------------------------------------------------- */
  /* Dock flotante: magnificación al estilo macOS/iOS                     */
  /* -------------------------------------------------------------------- */
  function initDock() {
    var dock = document.getElementById("floatingDock");
    if (!dock) return;
    var items = Array.prototype.slice.call(dock.querySelectorAll(".dock__item"));
    if (!items.length || !canHover) return;

    dock.addEventListener("mousemove", function (e) {
      items.forEach(function (item) {
        var rect = item.getBoundingClientRect();
        var center = rect.left + rect.width / 2;
        var dist = Math.abs(e.clientX - center);
        var scale = Math.max(1, 1.35 - dist / 220);
        var lift = Math.max(0, (scale - 1) * 22);
        item.style.transform = "scale(" + scale + ") translateY(" + -lift + "px)";
      });
    });

    dock.addEventListener("mouseleave", function () {
      items.forEach(function (item) {
        item.style.transform = "";
      });
    });
  }

  /* -------------------------------------------------------------------- */
  /* Botón volver arriba                                                  */
  /* -------------------------------------------------------------------- */
  function initBackToTop() {
    var btn = document.getElementById("backToTop");
    if (!btn) return;

    function toggle() {
      btn.classList.toggle("is-visible", window.scrollY > 480);
    }
    toggle();
    window.addEventListener("scroll", toggle, { passive: true });

    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
  }

  /* -------------------------------------------------------------------- */
  /* Mapa de Google: Maps JavaScript API con marca y estilo propios.      */
  /* La clave se pide a /api/maps-key en vez de escribirla en el HTML --  */
  /* este repositorio es público en GitHub, y esta clave (a diferencia de */
  /* la de /api/reviews) sí tiene que llegar al navegador para funcionar; */
  /* así al menos no queda nunca en el historial de git. Si algo falla   */
  /* (red, la clave, el propio script de Google), se cae al iframe de    */
  /* solo-dirección de siempre en vez de dejar un hueco vacío.           */
  /* -------------------------------------------------------------------- */

  // Estilo del mapa ajustado a la marca: fondo en el mismo gris que
  // --color-light, agua con un tinte del azul corporativo, autovías
  // resaltadas en azul suave y puntos de interés / transporte ocultos
  // para que nada compita visualmente con el marcador propio.
  var MAP_STYLE = [
    { elementType: "geometry", stylers: [{ color: "#f3f4f6" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#f3f4f6" }] },
    { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#c7ccd6" }] },
    { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
    { featureType: "administrative.neighborhood", stylers: [{ visibility: "off" }] },
    { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f3f4f6" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#dfe3ea" }] },
    { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#8891a1" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#c3cfea" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#1e3a8a" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#c7d3e8" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#8891a1" }] }
  ];

  // Glifo "place" (pin con hueco circular) en el naranja corporativo.
  var MAP_PIN_PATH = "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5.5z";

  function loadGoogleMapsScript(apiKey) {
    return new Promise(function (resolve, reject) {
      if (window.google && window.google.maps && window.google.maps.Map) {
        resolve();
        return;
      }
      var callbackName = "__hydropowerMapsReady";
      window[callbackName] = function () {
        delete window[callbackName];
        resolve();
      };
      var script = document.createElement("script");
      script.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(apiKey) +
        "&v=weekly&loading=async&callback=" + callbackName;
      script.async = true;
      script.onerror = function () {
        delete window[callbackName];
        reject(new Error("maps_script_load_failed"));
      };
      document.head.appendChild(script);
    });
  }

  // Contenido del InfoWindow por DOM, nunca por HTML de texto -- aunque
  // aquí todo el texto es propio y fijo, se mantiene el mismo criterio que
  // en las tarjetas de reseñas.
  function buildMapInfoContent(address, directionsUrl) {
    var wrap = document.createElement("div");
    wrap.className = "map-infowindow";

    var title = document.createElement("strong");
    title.className = "map-infowindow__title";
    title.textContent = "Hydropower Tecnic";
    wrap.appendChild(title);

    var addr = document.createElement("p");
    addr.className = "map-infowindow__address";
    addr.textContent = address;
    wrap.appendChild(addr);

    var link = document.createElement("a");
    link.className = "map-infowindow__link";
    link.href = directionsUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Cómo llegar →";
    wrap.appendChild(link);

    return wrap;
  }

  function baseMapOptions(center) {
    return {
      center: center,
      zoom: 17,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: true,
      fullscreenControl: true,
      clickableIcons: false,
      // "cooperative": hace falta Ctrl/Cmd + rueda para hacer zoom, así el
      // mapa no le roba el scroll de la página a quien solo quiere seguir
      // bajando -- un mapa "greedy" es la típica mala experiencia de mapas
      // incrustados.
      gestureHandling: "cooperative"
    };
  }

  function attachMarkerAndInfo(map, center, address) {
    var marker = new google.maps.Marker({
      position: center,
      map: map,
      title: "Hydropower Tecnic",
      icon: {
        path: MAP_PIN_PATH,
        fillColor: "#EF6D00",
        fillOpacity: 1,
        strokeColor: "#0F172A",
        strokeWeight: 1.5,
        scale: 1.7,
        anchor: new google.maps.Point(12, 22)
      }
    });

    var directionsUrl = "https://www.google.com/maps/dir/?api=1&destination=" + center.lat + "," + center.lng;
    var infoWindow = new google.maps.InfoWindow({
      content: buildMapInfoContent(address, directionsUrl),
      maxWidth: 280
    });

    marker.addListener("click", function () {
      infoWindow.open({ anchor: marker, map: map });
    });

    // Abierto de entrada: la mayoría de visitantes no llega a hacer clic
    // en el marcador, y el nombre + "cómo llegar" es justo lo que buscan.
    infoWindow.open({ anchor: marker, map: map });
  }

  // Maps siempre inserta un div propio dentro del contenedor, incluso
  // cuando no ha pintado nada -- por eso "¿ha pintado algo?" se comprueba
  // por si hay ALGO más ahí dentro (imagen de vista previa, tiles,
  // controles), no por si el contenedor está vacío del todo.
  function hasRenderedContent(canvas) {
    return canvas.querySelectorAll("*").length > 1;
  }

  function renderInteractiveMap(wrap, lat, lng, address) {
    var canvas = document.createElement("div");
    canvas.className = "ubicacion__map-canvas";
    wrap.textContent = "";
    wrap.appendChild(canvas);

    var center = { lat: lat, lng: lng };

    var styledOptions = baseMapOptions(center);
    styledOptions.styles = MAP_STYLE;
    var map = new google.maps.Map(canvas, styledOptions);
    attachMarkerAndInfo(map, center, address);

    // El estilo personalizado a veces se queda colgado sin pintar nada --
    // comprobado en producción: sin excepción, sin aviso de CSP, sin que
    // lleguen a disparar ni "idle" ni "tilesloaded" en varios segundos.
    // Si a los 2,5s solo está el div vacío que Maps siempre inserta, se
    // descarta el intento y se reconstruye sin estilo: un mapa interactivo
    // sin colorear es mucho mejor que uno en blanco. Si ni eso llega a
    // pintar nada, se cae al iframe de toda la vida.
    window.setTimeout(function () {
      if (hasRenderedContent(canvas)) return;

      canvas.textContent = "";
      var plainMap = new google.maps.Map(canvas, baseMapOptions(center));
      attachMarkerAndInfo(plainMap, center, address);

      window.setTimeout(function () {
        if (hasRenderedContent(canvas)) return;
        buildAddressOnlyIframe(wrap, address);
      }, 2500);
    }, 2500);
  }

  function buildAddressOnlyIframe(wrap, address) {
    var iframe = document.createElement("iframe");
    iframe.src = "https://maps.google.com/maps?q=" + encodeURIComponent(address) + "&z=16&output=embed";
    iframe.title = "Ubicación de Hydropower Tecnic en el mapa";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "no-referrer-when-downgrade";
    iframe.allowFullscreen = true;
    wrap.textContent = "";
    wrap.appendChild(iframe);
  }

  function initGoogleMap() {
    var wrap = document.getElementById("mapEmbed");
    var placeholder = document.getElementById("mapPlaceholder");
    var loadBtn = document.getElementById("mapLoadBtn");
    if (!wrap || !placeholder || !loadBtn) return;

    var lat = parseFloat(wrap.getAttribute("data-lat"));
    var lng = parseFloat(wrap.getAttribute("data-lng"));
    var address = wrap.getAttribute("data-address") || "";
    var endpoint = wrap.getAttribute("data-endpoint") || "/api/maps-key";
    if (!address) return;

    // El mapa no se carga hasta que el visitante lo pide expresamente: al
    // insertarlo, Google puede instalar sus propias cookies (fuera de
    // nuestro control), así que no lo cargamos de antemano sin esa acción.
    loadBtn.addEventListener("click", function () {
      loadBtn.disabled = true;
      loadBtn.textContent = "Cargando mapa…";

      if (!isFinite(lat) || !isFinite(lng)) {
        buildAddressOnlyIframe(wrap, address);
        return;
      }

      fetch(endpoint, { headers: { "Accept": "application/json" } })
        .then(function (res) {
          if (!res.ok) return Promise.reject(new Error("HTTP " + res.status));
          return res.json();
        })
        .then(function (data) {
          if (!data || !data.success || !data.key) return Promise.reject(new Error("respuesta sin clave"));
          return loadGoogleMapsScript(data.key);
        })
        .then(function () {
          renderInteractiveMap(wrap, lat, lng, address);
        })
        .catch(function (err) {
          console.error("[HydropowerTecnic] No se pudo cargar el mapa interactivo, se usa el mapa básico:", err);
          buildAddressOnlyIframe(wrap, address);
        });
    });
  }

  /* -------------------------------------------------------------------- */
  /* Slideshow de imágenes de cada servicio: crossfade automático +       */
  /* flechas y puntos manuales. Cada slide es una capa apilada a la que   */
  /* solo se le cambia opacity/clase, así que no hay medidas de ancho ni  */
  /* transforms que puedan desincronizarse: el índice "current" es la     */
  /* única fuente de verdad y wrap() hace el módulo en ambas direcciones. */
  /* -------------------------------------------------------------------- */
  function initServiceSlideshows() {
    var roots = document.querySelectorAll("[data-slideshow]");
    if (!roots.length) return;

    roots.forEach(function (root) {
      var slides = Array.prototype.slice.call(root.querySelectorAll(".service-slideshow__slide"));
      var dots = Array.prototype.slice.call(root.querySelectorAll(".service-slideshow__dots button"));
      var prevBtn = root.querySelector(".service-slideshow__arrow--prev");
      var nextBtn = root.querySelector(".service-slideshow__arrow--next");
      if (slides.length < 2) return;

      var current = 0;
      var timer = null;
      var AUTOPLAY_MS = 4500;

      function wrap(index) {
        return ((index % slides.length) + slides.length) % slides.length;
      }

      function show(index) {
        index = wrap(index);
        if (index === current) return;
        slides[current].classList.remove("is-active");
        if (dots[current]) dots[current].classList.remove("is-active");
        current = index;
        slides[current].classList.add("is-active");
        if (dots[current]) dots[current].classList.add("is-active");
      }

      function next() { show(current + 1); }
      function prev() { show(current - 1); }

      function stopAutoplay() {
        if (timer) {
          window.clearInterval(timer);
          timer = null;
        }
      }

      function startAutoplay() {
        stopAutoplay();
        if (prefersReducedMotion) return;
        timer = window.setInterval(next, AUTOPLAY_MS);
      }

      if (prevBtn) {
        prevBtn.addEventListener("click", function () { prev(); startAutoplay(); });
      }
      if (nextBtn) {
        nextBtn.addEventListener("click", function () { next(); startAutoplay(); });
      }
      dots.forEach(function (dot, i) {
        dot.addEventListener("click", function () { show(i); startAutoplay(); });
      });

      root.addEventListener("mouseenter", stopAutoplay);
      root.addEventListener("mouseleave", startAutoplay);

      startAutoplay();
    });
  }

  /* -------------------------------------------------------------------- */
  /* Reseñas de Google: puntuación y últimas opiniones en vivo.            */
  /* Los datos llegan de /api/reviews, una función serverless que consulta */
  /* la Places API con la clave guardada en variables de entorno: la API   */
  /* key nunca viaja al navegador. Si el endpoint no responde, el bloque   */
  /* de reseñas se retira en lugar de mostrar contenido inventado.         */
  /* -------------------------------------------------------------------- */
  var REVIEWS_MAX = 5;

  // Logotipo "G" de Google, reconstruido con createElementNS para poder
  // insertarlo sin recurrir a innerHTML.
  var GOOGLE_GLYPH = [
    ["#4285F4", "M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"],
    ["#34A853", "M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"],
    ["#FBBC05", "M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"],
    ["#EA4335", "M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"]
  ];

  var SVG_NS = "http://www.w3.org/2000/svg";

  function buildGoogleGlyph(className) {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", className);
    svg.setAttribute("viewBox", "0 0 48 48");
    svg.setAttribute("aria-hidden", "true");
    GOOGLE_GLYPH.forEach(function (entry) {
      var path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("fill", entry[0]);
      path.setAttribute("d", entry[1]);
      svg.appendChild(path);
    });
    return svg;
  }

  function starsFor(rating) {
    var full = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    return "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full);
  }

  // Fisher-Yates in-place, para no dejar sesgo hacia ninguna posición.
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function initialsFor(name) {
    var parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  function formatReviewDate(review) {
    if (review.relativeTime) return review.relativeTime;
    if (!review.publishTime) return "";
    var date = new Date(review.publishTime);
    if (isNaN(date.getTime())) return "";
    try {
      return date.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    } catch (err) {
      return String(date.getFullYear());
    }
  }

  // El texto de la reseña es contenido de terceros: se inserta siempre con
  // textContent, nunca con innerHTML.
  function buildReviewCard(review, index) {
    var card = document.createElement("article");
    card.className = "review-card review-card--enter";
    card.style.transitionDelay = (index * 70) + "ms";

    var head = document.createElement("div");
    head.className = "review-card__head";

    var avatar = document.createElement("span");
    avatar.className = "review-card__avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = initialsFor(review.author);
    head.appendChild(avatar);

    // Las iniciales de arriba quedan pintadas como base; si hay foto, se
    // superpone encima. Si falla la carga (o el CSP bloquea el host), se
    // retira y las iniciales quedan como si nunca hubiera habido foto.
    // Sin loading="lazy" a propósito: en Chromium, un <img> creado por JS y
    // metido al DOM junto a otros en el mismo lote (aquí, hasta 5 seguidos)
    // puede quedarse con la carga diferida para siempre -- el navegador
    // calcula mal la distancia al viewport en ese instante y nunca lo
    // reconsidera. Comprobado en producción: cambiar ese mismo <img> ya
    // insertado de "lazy" a "eager" lo destrababa al momento. Con avatares
    // de 44px y un máximo de 5 por página no hay nada que optimizar aquí,
    // así que se cargan directos.
    if (review.photoUrl) {
      var photo = document.createElement("img");
      photo.className = "review-card__avatar-img";
      photo.src = review.photoUrl;
      photo.alt = "";
      photo.decoding = "async";
      photo.referrerPolicy = "no-referrer";
      photo.addEventListener("error", function () {
        photo.remove();
      });
      avatar.appendChild(photo);
    }

    var meta = document.createElement("div");
    meta.className = "review-card__meta";

    var author;
    if (review.authorUrl) {
      author = document.createElement("a");
      author.href = review.authorUrl;
      author.target = "_blank";
      author.rel = "noopener noreferrer nofollow";
    } else {
      author = document.createElement("span");
    }
    author.className = "review-card__author";
    author.textContent = review.author;
    meta.appendChild(author);

    var dateText = formatReviewDate(review);
    if (dateText) {
      var time = document.createElement("time");
      time.className = "review-card__date";
      if (review.publishTime) time.setAttribute("datetime", review.publishTime);
      time.textContent = dateText;
      meta.appendChild(time);
    }
    head.appendChild(meta);
    head.appendChild(buildGoogleGlyph("review-card__badge"));
    card.appendChild(head);

    var stars = document.createElement("div");
    stars.className = "review-card__stars";
    stars.setAttribute("role", "img");
    stars.setAttribute("aria-label", review.rating + " de 5 estrellas");
    stars.textContent = starsFor(review.rating);
    card.appendChild(stars);

    var text = document.createElement("p");
    text.className = "review-card__text";
    text.textContent = review.text;
    card.appendChild(text);

    // Las reseñas largas se recortan visualmente con line-clamp para que las
    // tarjetas queden a la misma altura; el botón muestra el texto íntegro,
    // que es lo que exigen las condiciones de atribución de Google.
    var more = document.createElement("button");
    more.type = "button";
    more.className = "review-card__more";
    more.textContent = "Leer más";
    more.hidden = true;
    more.addEventListener("click", function () {
      var expanded = card.classList.toggle("is-expanded");
      more.textContent = expanded ? "Leer menos" : "Leer más";
    });
    card.appendChild(more);

    return { card: card, text: text, more: more };
  }

  function renderGoogleReviews(place, wrap) {
    var grid = document.getElementById("googleReviewsGrid");
    if (!grid) return;

    // El servidor ya entrega como mucho las REVIEWS_MAX más recientes; aquí
    // solo se baraja el ORDEN de presentación (Fisher-Yates), para que cada
    // recarga muestre una combinación distinta en vez de clavar siempre la
    // misma reseña en primer lugar.
    var reviews = shuffle((place.reviews || []).slice(0, REVIEWS_MAX));
    if (!reviews.length) {
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      return;
    }

    var built = reviews.map(buildReviewCard);

    grid.textContent = "";
    grid.classList.remove("is-loading");
    grid.setAttribute("aria-busy", "false");
    grid.setAttribute("data-count", String(reviews.length));
    built.forEach(function (item) {
      grid.appendChild(item.card);
    });

    var legal = document.getElementById("googleReviewsLegal");
    if (legal) legal.hidden = false;

    // scrollHeight > clientHeight => el line-clamp está recortando texto. Hay
    // que medir con la tipografía ya cargada (si no, el alto de línea cambia
    // después y el botón no aparece) y repetir al cambiar el ancho, porque
    // una reseña que cabe en escritorio puede no caber en móvil.
    function refreshReadMore() {
      built.forEach(function (item) {
        if (item.card.classList.contains("is-expanded")) return;
        item.more.hidden = item.text.scrollHeight - item.text.clientHeight <= 4;
      });
    }

    window.requestAnimationFrame(function () {
      built.forEach(function (item) {
        item.card.classList.add("is-visible");
      });
      refreshReadMore();
    });

    if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === "function") {
      document.fonts.ready.then(refreshReadMore).catch(function () { /* noop */ });
    }

    var resizeTimer = null;
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(refreshReadMore, 150);
    }, { passive: true });
  }

  function renderGoogleRating(place) {
    var card = document.getElementById("googleRating");
    if (!card || !place.rating) return;

    var starsEl = document.getElementById("googleRatingStars");
    var scoreEl = document.getElementById("googleRatingScore");
    var countEl = document.getElementById("googleRatingCount");

    if (starsEl) starsEl.textContent = starsFor(place.rating);
    if (scoreEl) scoreEl.textContent = place.rating.toFixed(1);
    if (countEl) {
      countEl.textContent = place.total === 1
        ? "(1 reseña)"
        : "(" + (place.total || 0) + " reseñas)";
    }
    card.setAttribute("aria-label", "Valoración media de " + place.rating.toFixed(1) + " sobre 5 en Google");
    card.hidden = false;
  }

  // El JSON-LD estático no declara aggregateRating a propósito: es un dato
  // que solo tiene sentido si es real, y solo se sabe al llamar a la Places
  // API. Se inyecta aquí, reaprovechando la misma respuesta que ya alimenta
  // las tarjetas de reseñas -- sin llamada extra. Con 0 reseñas no se añade
  // nada: una valoración sin reseñas detrás no significa nada y Google
  // desaconseja declarar aggregateRating en ese caso.
  function updateSchemaAggregateRating(place) {
    if (!place || typeof place.rating !== "number" || !place.total) return;

    var script = document.getElementById("schemaOrg");
    if (!script) return;

    var data;
    try {
      data = JSON.parse(script.textContent);
    } catch (err) {
      return;
    }

    data.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": place.rating,
      "reviewCount": place.total,
      "bestRating": 5,
      "worstRating": 1
    };
    script.textContent = JSON.stringify(data);
  }

  function initGoogleReviews() {
    var wrap = document.getElementById("googleReviews");
    if (!wrap) return;

    var endpoint = wrap.getAttribute("data-endpoint") || "/api/reviews";

    fetch(endpoint, { headers: { "Accept": "application/json" } })
      .then(function (res) {
        if (!res.ok) return Promise.reject(new Error("HTTP " + res.status));
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.success || !data.place) return Promise.reject(new Error("respuesta sin datos"));

        var place = data.place;
        renderGoogleRating(place);
        updateSchemaAggregateRating(place);

        var link = document.getElementById("googleReviewsLink");
        if (link && place.mapsUrl) link.href = place.mapsUrl;

        renderGoogleReviews(place, wrap);
      })
      .catch(function (err) {
        console.error("[HydropowerTecnic] No se pudieron cargar las reseñas de Google:", err);
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      });
  }

  /* -------------------------------------------------------------------- */
  /* Indicador "desliza" del hero: se desvanece al hacer scroll           */
  /* -------------------------------------------------------------------- */
  function initHeroSwipe() {
    var swipe = document.getElementById("heroSwipe");
    if (!swipe) return;

    function toggle() {
      swipe.classList.toggle("is-hidden", window.scrollY > 60);
    }
    toggle();
    window.addEventListener("scroll", toggle, { passive: true });
  }


  /* -------------------------------------------------------------------- */
  /* Parallax sutil en la imagen del hero                                 */
  /* -------------------------------------------------------------------- */
  function initHeroParallax() {
    if (prefersReducedMotion) return;
    var el = document.querySelector("[data-parallax]");
    if (!el) return;
    var ticking = false;

    function update() {
      var rect = el.getBoundingClientRect();
      el.style.transform = "translateY(" + rect.top * 0.06 + "px)";
      ticking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
    update();
  }

  /* -------------------------------------------------------------------- */
  /* Reveal on scroll + contadores de estadísticas                        */
  /* -------------------------------------------------------------------- */
  function animateCounter(el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    var suffix = el.getAttribute("data-suffix") || "";
    var duration = 1200;
    var start = null;

    function step(timestamp) {
      if (start === null) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target) + suffix;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    }
    window.requestAnimationFrame(step);
  }

  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    var counted = new WeakSet();

    function reveal(el) {
      el.classList.add("is-visible");
      if (el.classList.contains("stats__item") && !counted.has(el)) {
        var counter = el.querySelector("[data-count]");
        if (counter) {
          counted.add(el);
          animateCounter(counter);
        }
      }
      if (el.classList.contains("spec-card") && !counted.has(el)) {
        var bar = el.querySelector(".spec-card__bar-fill");
        if (bar) {
          counted.add(el);
          var fill = bar.getAttribute("data-fill") || "0";
          window.setTimeout(function () {
            bar.style.width = fill + "%";
          }, 150);
        }
      }
    }

    if (!("IntersectionObserver" in window)) {
      items.forEach(reveal);
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            reveal(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -40px 0px" }
    );

    items.forEach(function (el) {
      observer.observe(el);
    });

    // Red de seguridad: si algo queda oculto pasados 6s, se revela igualmente.
    window.setTimeout(function () {
      items.forEach(reveal);
    }, 6000);
  }

  /* -------------------------------------------------------------------- */
  /* Confeti de éxito al enviar el formulario                              */
  /* -------------------------------------------------------------------- */
  function launchConfetti(originEl) {
    if (!originEl) return;
    var rect = originEl.getBoundingClientRect();
    var originX = rect.left + rect.width / 2;
    var originY = rect.top + rect.height / 2;
    var colors = ["#EF6D00", "#1E3A8A", "#10B981", "#ffffff"];

    for (var i = 0; i < 22; i++) {
      var piece = document.createElement("span");
      piece.className = "confetti-piece";
      var angle = Math.random() * Math.PI * 2;
      var distance = 60 + Math.random() * 90;
      piece.style.setProperty("--dx", Math.cos(angle) * distance + "px");
      piece.style.setProperty("--dy", Math.sin(angle) * distance - 20 + "px");
      piece.style.setProperty("--rot", Math.random() * 360 + "deg");
      piece.style.left = originX + "px";
      piece.style.top = originY + "px";
      piece.style.background = colors[i % colors.length];
      document.body.appendChild(piece);
      (function (p) {
        window.setTimeout(function () {
          p.remove();
        }, 1200);
      })(piece);
    }
  }

  /* -------------------------------------------------------------------- */
  /* Formulario de contacto: validación + envío a /api/lead              */
  /* -------------------------------------------------------------------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validateField(field) {
    var wrapper = field.closest(".form-field");
    if (!wrapper) return true;
    var valid = true;

    if (field.type === "checkbox") {
      if (field.hasAttribute("required") && !field.checked) valid = false;
    } else {
      var value = (field.value || "").trim();
      if (field.hasAttribute("required") && !value) {
        valid = false;
      } else if (field.type === "email" && value && !EMAIL_RE.test(value)) {
        valid = false;
      }
    }

    wrapper.classList.toggle("has-error", !valid);
    return valid;
  }

  function initContactForm() {
    var form = document.getElementById("contactForm");
    if (!form) return;

    var mensaje = document.getElementById("mensaje");
    var mensajeCount = document.getElementById("mensajeCount");
    if (mensaje && mensajeCount) {
      mensaje.addEventListener("input", function () {
        mensajeCount.textContent = mensaje.value.length;
      });
    }

    var requiredFields = form.querySelectorAll("[required]");
    requiredFields.forEach(function (field) {
      field.addEventListener("blur", function () {
        validateField(field);
      });
      field.addEventListener("input", function () {
        if (field.closest(".form-field").classList.contains("has-error")) {
          validateField(field);
        }
      });
    });

    var submitBtn = document.getElementById("submitBtn");
    var statusEl = document.getElementById("formStatus");

    function showStatus(type, message) {
      statusEl.className = "form-status is-visible form-status--" + type;
      statusEl.textContent = message;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var allValid = true;
      requiredFields.forEach(function (field) {
        if (!validateField(field)) allValid = false;
      });

      if (!allValid) {
        showStatus("error", "Revisa los campos marcados en rojo antes de enviar.");
        var firstError = form.querySelector(".form-field.has-error input, .form-field.has-error select, .form-field.has-error textarea");
        if (firstError) firstError.focus();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.classList.add("btn--loading");

      var data = {
        nombre: form.nombre.value.trim(),
        empresa: form.empresa.value.trim(),
        email: form.email.value.trim(),
        web: form.web.value.trim(),
        presupuesto: form.presupuesto.value,
        mensaje: form.mensaje.value.trim()
      };

      fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(15000)
      })
        .then(function (res) {
          return res.json().then(function (json) {
            return { ok: res.ok, json: json };
          });
        })
        .then(function (result) {
          submitBtn.disabled = false;
          submitBtn.classList.remove("btn--loading");
          if (result.ok && result.json && result.json.success) {
            showStatus("success", "¡Gracias, " + data.nombre.split(" ")[0] + "! Hemos recibido tu solicitud y te responderemos en menos de 24 horas.");
            launchConfetti(submitBtn);
            form.reset();
            if (mensajeCount) mensajeCount.textContent = "0";
          } else {
            showStatus("error", "No hemos podido enviar tu solicitud. Inténtalo de nuevo o llámanos directamente.");
          }
        })
        .catch(function (err) {
          console.error("[HydropowerTecnic] Error al enviar el formulario:", err);
          submitBtn.disabled = false;
          submitBtn.classList.remove("btn--loading");
          showStatus("error", "No hemos podido enviar tu solicitud. Inténtalo de nuevo o llámanos directamente.");
        });
    });
  }

  /* -------------------------------------------------------------------- */
  /* Consentimiento de cookies (banner + panel de personalización)        */
  /* -------------------------------------------------------------------- */
  var COOKIE_KEY = "hydropowertecnic_cookie_consent";

  function getCookieConsent() {
    try {
      return JSON.parse(window.localStorage.getItem(COOKIE_KEY));
    } catch (err) {
      return null;
    }
  }

  function saveCookieConsent(consent) {
    try {
      window.localStorage.setItem(COOKIE_KEY, JSON.stringify(consent));
    } catch (err) {
      console.warn("[HydropowerTecnic] No se pudo guardar el consentimiento:", err);
    }
  }

  function initCookieConsent() {
    var banner = document.getElementById("cookieBanner");
    var modal = document.getElementById("cookieModal");
    if (!banner || !modal) return;

    var dock = document.getElementById("floatingDock");
    var backToTop = document.getElementById("backToTop");
    var acceptAllBtn = document.getElementById("cookieAcceptAll");
    var modalBackdrop = document.getElementById("cookieModalBackdrop");
    var modalClose = document.getElementById("cookieModalClose");
    var modalSave = document.getElementById("cookieModalSave");
    var footerLink = document.getElementById("footerCookiePrefs");

    function setRaised(isRaised) {
      var offset = banner.offsetHeight + 24;
      document.documentElement.style.setProperty("--cookie-offset", offset + "px");
      if (dock) dock.classList.toggle("is-raised", isRaised);
      if (backToTop) backToTop.classList.toggle("is-raised", isRaised);
    }

    function showBanner() {
      banner.hidden = false;
      window.setTimeout(function () {
        banner.classList.add("is-visible");
        setRaised(true);
      }, 20);
    }

    function hideBanner() {
      banner.classList.remove("is-visible");
      setRaised(false);
      window.setTimeout(function () {
        banner.hidden = true;
      }, 500);
    }

    function openModal() {
      modal.hidden = false;
      document.body.style.overflow = "hidden";
    }

    function closeModal() {
      modal.hidden = true;
      document.body.style.overflow = "";
    }

    // El sitio solo usa almacenamiento técnico necesario (ninguna cookie de
    // analítica ni de marketing), así que no hay categorías opcionales que
    // aceptar/rechazar: un único gesto de "entendido" basta para registrar
    // que el aviso ya se ha mostrado.
    function acknowledge() {
      saveCookieConsent({ necessary: true, timestamp: new Date().toISOString() });
      hideBanner();
      closeModal();
    }

    acceptAllBtn.addEventListener("click", acknowledge);
    footerLink.addEventListener("click", openModal);

    var inlineOpenBtn = document.getElementById("cookiePolicyOpenModal");
    if (inlineOpenBtn) inlineOpenBtn.addEventListener("click", openModal);
    modalClose.addEventListener("click", closeModal);
    modalBackdrop.addEventListener("click", closeModal);
    modalSave.addEventListener("click", acknowledge);

    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hidden) closeModal();
    });

    if (!getCookieConsent()) {
      window.setTimeout(showBanner, 900);
    }
  }

  /* -------------------------------------------------------------------- */
  /* Arranque                                                              */
  /* -------------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    safe(initNavbar, "initNavbar");
    safe(initSmoothAnchors, "initSmoothAnchors");
    safe(initScrollProgress, "initScrollProgress");
    safe(initNavLiquidPill, "initNavLiquidPill");
    safe(initCardTilt, "initCardTilt");
    safe(initDock, "initDock");
    safe(initBackToTop, "initBackToTop");
    safe(initServiceSlideshows, "initServiceSlideshows");
    safe(initGoogleMap, "initGoogleMap");
    safe(initGoogleReviews, "initGoogleReviews");
    safe(initHeroSwipe, "initHeroSwipe");
    safe(initHeroParallax, "initHeroParallax");
    safe(initReveal, "initReveal");
    safe(initContactForm, "initContactForm");
    safe(initCookieConsent, "initCookieConsent");
  });
})();
