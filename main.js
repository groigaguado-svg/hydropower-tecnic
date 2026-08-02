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
    // catalogo.html, que no tiene las secciones de la home), respetamos el
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
  /* Mapa de Google: usa la Maps Embed API oficial si hay API key         */
  /* configurada (data-maps-api-key en #mapEmbed); si no, se mantiene el  */
  /* iframe de solo-dirección ya presente en el HTML como alternativa sin */
  /* clave. La API oficial evita el error de "esta página no puede       */
  /* cargar Google Maps" que da el truco de embeber la búsqueda a pelo.   */
  /* -------------------------------------------------------------------- */
  function initGoogleMap() {
    var wrap = document.getElementById("mapEmbed");
    if (!wrap) return;

    var apiKey = wrap.getAttribute("data-maps-api-key");
    var address = wrap.getAttribute("data-address");
    if (!apiKey || !address) return;

    var iframe = wrap.querySelector("iframe");
    if (!iframe) return;
    iframe.src = "https://www.google.com/maps/embed/v1/place?key=" + encodeURIComponent(apiKey) + "&q=" + encodeURIComponent(address);
  }

  /* -------------------------------------------------------------------- */
  /* Carrusel de imágenes del catálogo: autoplay hacia la derecha en      */
  /* bucle infinito + flechas manuales. Todo el movimiento se calcula a   */
  /* mano con requestAnimationFrame sobre una única variable "offset" en  */
  /* vez de mezclar una animación CSS con transform por JS: son dos       */
  /* dueños distintos de la misma propiedad y el que pierde deja de       */
  /* pintarse, que es la causa típica de que estos carruseles se rompan.  */
  /* -------------------------------------------------------------------- */
  function initCatalogCarousels() {
    var roots = document.querySelectorAll(".catalog-carousel");
    if (!roots.length) return;

    roots.forEach(function (root) {
      var track = root.querySelector(".catalog-carousel__track");
      var prevBtn = root.querySelector(".catalog-carousel__arrow--prev");
      var nextBtn = root.querySelector(".catalog-carousel__arrow--next");
      if (!track) return;

      // El track contiene el set de imágenes duplicado x2 (la copia con
      // aria-hidden) para poder recolocar el offset sin que se note el salto.
      var setWidth = 0;

      function measure() {
        setWidth = track.scrollWidth / 2;
      }

      function apply() {
        if (!setWidth) return;
        track.style.transform = "translateX(" + (offset - setWidth) + "px)";
      }

      var offset = 0;
      var speed = 0.45;
      var hovering = false;
      var paused = false;
      var resumeTimer = null;
      var rafId = null;

      function wrap(value) {
        if (setWidth <= 0) return 0;
        value = value % setWidth;
        if (value < 0) value += setWidth;
        return value;
      }

      function tick() {
        if (!paused && setWidth > 0) {
          offset = wrap(offset + speed);
          apply();
        }
        rafId = requestAnimationFrame(tick);
      }

      function nudge(direction) {
        if (setWidth <= 0) return;
        var step = Math.min(320, setWidth / 2);
        offset = wrap(offset + direction * step);
        apply();
        paused = true;
        clearTimeout(resumeTimer);
        resumeTimer = setTimeout(function () {
          if (!hovering) paused = false;
        }, 2600);
      }

      measure();
      apply();

      if (prevBtn) {
        prevBtn.addEventListener("click", function () { nudge(-1); });
      }
      if (nextBtn) {
        nextBtn.addEventListener("click", function () { nudge(1); });
      }

      root.addEventListener("mouseenter", function () {
        hovering = true;
        paused = true;
      });
      root.addEventListener("mouseleave", function () {
        hovering = false;
        paused = false;
      });

      window.addEventListener("resize", function () {
        measure();
        // Con "movimiento reducido" no hay un rAF corriendo que recoja el
        // nuevo setWidth por sí solo, así que hay que repintar aquí.
        apply();
      });
      window.addEventListener("load", function () {
        measure();
        apply();
      });

      if (!prefersReducedMotion) {
        rafId = requestAnimationFrame(tick);
      }
    });
  }

  /* -------------------------------------------------------------------- */
  /* Reseñas de Google: puntuación en vivo vía Places API (New)          */
  /* Requiere un Place ID y una API key restringida al dominio en los    */
  /* atributos data-place-id / data-api-key del elemento #googleRating.  */
  /* Sin esas credenciales, la tarjeta se queda oculta en vez de mostrar */
  /* datos inventados.                                                   */
  /* -------------------------------------------------------------------- */
  function initGoogleReviews() {
    var card = document.getElementById("googleRating");
    if (!card) return;

    var placeId = card.getAttribute("data-place-id");
    var apiKey = card.getAttribute("data-api-key");
    if (!placeId || !apiKey) return;

    fetch("https://places.googleapis.com/v1/places/" + placeId + "?fields=rating,userRatingCount", {
      headers: { "X-Goog-Api-Key": apiKey }
    })
      .then(function (res) {
        if (!res.ok) return Promise.reject(new Error("HTTP " + res.status));
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.rating) return;
        var full = Math.max(0, Math.min(5, Math.round(data.rating)));
        var starsEl = document.getElementById("googleRatingStars");
        var scoreEl = document.getElementById("googleRatingScore");
        var countEl = document.getElementById("googleRatingCount");
        if (starsEl) starsEl.textContent = "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full);
        if (scoreEl) scoreEl.textContent = data.rating.toFixed(1);
        if (countEl) countEl.textContent = "(" + (data.userRatingCount || 0) + " reseñas)";
        card.hidden = false;
      })
      .catch(function (err) {
        console.error("[HydropowerTecnic] No se pudo cargar la puntuación de Google:", err);
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
    var value = (field.value || "").trim();
    var valid = true;

    if (field.hasAttribute("required") && !value) {
      valid = false;
    } else if (field.type === "email" && value && !EMAIL_RE.test(value)) {
      valid = false;
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
    var rejectBtn = document.getElementById("cookieReject");
    var customizeBtn = document.getElementById("cookieCustomize");
    var modalBackdrop = document.getElementById("cookieModalBackdrop");
    var modalClose = document.getElementById("cookieModalClose");
    var modalSave = document.getElementById("cookieModalSave");
    var modalRejectAll = document.getElementById("cookieModalRejectAll");
    var analyticsToggle = document.getElementById("cookieAnalytics");
    var marketingToggle = document.getElementById("cookieMarketing");
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
      var consent = getCookieConsent();
      analyticsToggle.checked = !!(consent && consent.analytics);
      marketingToggle.checked = !!(consent && consent.marketing);
      modal.hidden = false;
      document.body.style.overflow = "hidden";
    }

    function closeModal() {
      modal.hidden = true;
      document.body.style.overflow = "";
    }

    function applyConsent(consent) {
      saveCookieConsent(
        Object.assign({ necessary: true, timestamp: new Date().toISOString() }, consent)
      );
      hideBanner();
      closeModal();
    }

    acceptAllBtn.addEventListener("click", function () {
      applyConsent({ analytics: true, marketing: true });
    });

    rejectBtn.addEventListener("click", function () {
      applyConsent({ analytics: false, marketing: false });
    });

    customizeBtn.addEventListener("click", openModal);
    footerLink.addEventListener("click", openModal);

    var inlineOpenBtn = document.getElementById("cookiePolicyOpenModal");
    if (inlineOpenBtn) inlineOpenBtn.addEventListener("click", openModal);
    modalClose.addEventListener("click", closeModal);
    modalBackdrop.addEventListener("click", closeModal);

    modalRejectAll.addEventListener("click", function () {
      analyticsToggle.checked = false;
      marketingToggle.checked = false;
      applyConsent({ analytics: false, marketing: false });
    });

    modalSave.addEventListener("click", function () {
      applyConsent({ analytics: analyticsToggle.checked, marketing: marketingToggle.checked });
    });

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
    safe(initCatalogCarousels, "initCatalogCarousels");
    safe(initGoogleMap, "initGoogleMap");
    safe(initGoogleReviews, "initGoogleReviews");
    safe(initHeroSwipe, "initHeroSwipe");
    safe(initHeroParallax, "initHeroParallax");
    safe(initReveal, "initReveal");
    safe(initContactForm, "initContactForm");
    safe(initCookieConsent, "initCookieConsent");
  });
})();
