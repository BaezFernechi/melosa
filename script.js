/* ============================================================
   TE AMO MELISA — interactividad
   ------------------------------------------------------------
   1. Acordeón de las dedicatorias:
      - Cada fila se abre con su flecha.
      - Solo puede quedar una abierta a la vez.
      - Mantiene aria-expanded / aria-hidden sincronizados.
      - Escape cierra la fila abierta y devuelve el foco.

   2. Cuenta regresiva de las filas bloqueadas (8 a 18):
      - La fecha se configura en data-unlock de cada fila.
      - La máscara oculta toda la información hasta la fecha.
      - Al llegar la fecha, la fila se desbloquea sola, sin recargar.
   ============================================================ */

(() => {
  "use strict";

  const tracks = Array.from(document.querySelectorAll("[data-track]"));

  if (!tracks.length) return;

  const pad = (value) => String(value).padStart(2, "0");

  /**
   * Construye el contador en cuatro bloques: días, horas, min y seg.
   * @param {number} milliseconds
   * @returns {string}
   */
  function countdownMarkup(milliseconds) {
    const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const units = [
      [days, "días"],
      [hours, "horas"],
      [minutes, "min"],
      [seconds, "seg"],
    ];

    return units
      .map(
        ([value, label]) =>
          `<span class="countdown__unit">` +
          `<span class="countdown__value">${pad(value)}</span>` +
          `<span class="countdown__label">${label}</span>` +
          `</span>`
      )
      .join("");
  }

  /**
   * Fecha legible para el aria-label del botón.
   * @param {Date} date
   * @returns {string}
   */
  function formatDate(date) {
    return new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  }

  /**
   * Abre o cierra una fila y actualiza sus estados de accesibilidad.
   * @param {HTMLElement} track
   * @param {boolean} expanded
   */
  function setExpanded(track, expanded) {
    const toggle = track.querySelector(".track__toggle");
    const panel = track.querySelector(".track__panel");

    if (!toggle || !panel) return;

    track.classList.toggle("is-open", expanded);
    toggle.setAttribute("aria-expanded", String(expanded));
    panel.setAttribute("aria-hidden", String(!expanded));

    // Evita que el contenido cerrado reciba foco o sea leído por lectores de pantalla.
    panel.inert = !expanded;

    const song = toggle.dataset.song || "esta canción";
    toggle.setAttribute(
      "aria-label",
      expanded
        ? `Ocultar la dedicatoria de ${song}`
        : `Ver la dedicatoria de ${song}`
    );
  }

  /**
   * Activa una fila que ya ha llegado a su fecha.
   * @param {HTMLElement} track
   */
  function unlockTrack(track) {
    if (!track.classList.contains("track--locked")) return;

    track.classList.remove("track--locked");
    track.classList.add("is-unlocked");

    const toggle = track.querySelector(".track__toggle");
    const title = track.querySelector(".track__title");
    const countdown = track.querySelector("[data-countdown]");
    const song =
      title?.textContent.trim() || toggle?.dataset.song || "esta canción";

    if (toggle) {
      toggle.dataset.song = song;
      toggle.disabled = false;
      toggle.setAttribute("aria-label", `Ver la dedicatoria de ${song}`);
    }

    if (title) {
      const href = title.dataset.href;

      if (href) {
        title.setAttribute("href", href);
        title.setAttribute("target", "_blank");
        title.setAttribute("rel", "noopener noreferrer");
      }

      title.removeAttribute("aria-disabled");
    }

    // El texto de "Se desbloquea el..." vuelve a ser el artista real.
    const artist = track.querySelector(".track__artist");

    if (artist && artist.dataset.artist) {
      artist.textContent = artist.dataset.artist;
    }

    if (countdown) {
      countdown.hidden = true;
    }

    // Aviso para lectores de pantalla (elemento #unlock-status).
    const status = document.getElementById("unlock-status");
    if (status) {
      status.textContent = `${song} ya está disponible.`;
    }
  }

  /**
   * Comprueba la fecha de una fila y actualiza su contador.
   * @param {HTMLElement} track
   * @returns {boolean} true cuando la fila acaba de desbloquearse.
   */
  function updateCountdown(track) {
    const target = new Date(track.dataset.unlock);
    const countdown = track.querySelector("[data-countdown]");
    const toggle = track.querySelector(".track__toggle");

    if (Number.isNaN(target.getTime())) {
      if (countdown) countdown.textContent = "Fecha por confirmar";
      return false;
    }

    const remaining = target.getTime() - Date.now();

    if (remaining <= 0) {
      unlockTrack(track);
      return true;
    }

    if (countdown) {
      countdown.innerHTML = countdownMarkup(remaining);
    }

    if (toggle) {
      const label = `Se desbloquea el ${formatDate(target)}`;
      if (toggle.getAttribute("aria-label") !== label) {
        toggle.setAttribute("aria-label", label);
      }
    }

    return false;
  }

  /* ------------------------------------------------------------
     Acordeón
     ------------------------------------------------------------ */
  tracks.forEach((track) => {
    const toggle = track.querySelector(".track__toggle");
    const panel = track.querySelector(".track__panel");

    if (!toggle || !panel) return;

    // Estado inicial: todo cerrado.
    panel.inert = true;

    toggle.addEventListener("click", () => {
      const willOpen = !track.classList.contains("is-open");

      // Acordeón: cierra cualquier otra fila abierta.
      tracks.forEach((other) => {
        if (other !== track && other.classList.contains("is-open")) {
          setExpanded(other, false);
        }
      });

      setExpanded(track, willOpen);
    });
  });

  /* ------------------------------------------------------------
     Cuentas regresivas de las filas bloqueadas (8 a 18)
     ------------------------------------------------------------ */
  tracks
    .filter((track) => track.dataset.unlock)
    .forEach((track) => {
      const target = new Date(track.dataset.unlock);
      const countdown = track.querySelector("[data-countdown]");

      // Si la fecha no es válida, se avisa y se deja bloqueada.
      if (Number.isNaN(target.getTime())) {
        if (countdown) countdown.textContent = "Fecha por confirmar";
        return;
      }

      // Si la fecha ya pasó, se desbloquea inmediatamente.
      if (updateCountdown(track)) return;

      const timer = window.setInterval(() => {
        if (updateCountdown(track)) {
          window.clearInterval(timer);
        }
      }, 1000);
    });

  // Escape cierra la dedicatoria abierta.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    const openTrack = document.querySelector(".track.is-open");
    if (!openTrack) return;

    setExpanded(openTrack, false);
    openTrack.querySelector(".track__toggle")?.focus();
  });
})();
