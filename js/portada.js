"use strict";

/* Portada pública de GananciaPro: calculadora, pasos, planes y aparición al desplazarse.
   Solo mueve transform y opacidad. Con "reducir movimiento" todo se muestra sin animación.
   Todo el texto dinámico se escribe con textContent (nunca innerHTML). */
(function () {
    const raiz = document.documentElement;
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const config = window.GANANCIAPRO_CONFIG || {};

    function $(id) { return document.getElementById(id); }
    const locale = () => (window.GP_IDIOMA ? window.GP_IDIOMA.locale() : "es-PE");

    /* ---------- Precio desde la configuración ---------- */
    const precio = typeof config.PRECIO_LANDING === "string" ? config.PRECIO_LANDING.trim() : "";
    if (precio) {
        const m = precio.match(/^(.+?)\s+(al mes|\/\s*mes|por mes)$/i);
        if ($("planCifra")) $("planCifra").textContent = m ? m[1] : precio;
        if ($("planPeriodo") && m) $("planPeriodo").textContent = "al mes";
    }

    /* ---------- Botones "Empezar gratis" / "Iniciar sesión" ---------- */
    document.querySelectorAll("[data-cta]").forEach((boton) => {
        boton.addEventListener("click", () => {
            const pestana = $(boton.getAttribute("data-cta") === "entrar" ? "tabEntrar" : "tabCrear");
            if (pestana) pestana.click();
            const acceso = $("acceso");
            if (!acceso) return;
            acceso.scrollIntoView({ behavior: reducido ? "auto" : "smooth", block: "start" });
            const campo = acceso.querySelector("form:not([hidden]) input");
            if (campo) campo.focus({ preventScroll: true });
        });
    });

    /* ---------- Calculadora de la portada ---------- */
    const calc = document.querySelector(".lp-calc");
    if (calc) {
        calc.addEventListener("submit", (e) => e.preventDefault());
        const entra = $("calcIngreso");
        const sale = $("calcGasto");
        const salida = $("calcGanancia");
        const etiqueta = $("calcEtiqueta");
        /* Lee un importe escrito a mano o venido de Excel: "1,500" y "1.500" son mil quinientos
           (grupo de 3 cifras = miles); "12,5", "0,125" y "1240.50" son decimales; con los dos
           separadores ("1,240.50" o "1.240,50") el último es el decimal. Devuelve NaN si no es número. */
        function leerImporte(txt) {
            const s = String(txt).replace(/[^\d.,]/g, "");
            if (!s) return NaN;
            const ultimoPunto = s.lastIndexOf("."), ultimaComa = s.lastIndexOf(",");
            let entero = s, decimal = "";
            if (ultimoPunto !== -1 && ultimaComa !== -1) {
                const i = Math.max(ultimoPunto, ultimaComa);
                entero = s.slice(0, i); decimal = s.slice(i + 1);
            } else if (ultimoPunto !== -1 || ultimaComa !== -1) {
                const partes = s.split(ultimoPunto !== -1 ? "." : ",");
                const miles = partes.length > 2 ||
                    (partes[1].length === 3 && /^[1-9]\d{0,2}$/.test(partes[0]));
                if (!miles) { entero = partes[0]; decimal = partes[1]; }
            }
            entero = entero.replace(/[.,]/g, "");
            if (/[.,]/.test(decimal)) return NaN;
            return Number(decimal ? `${entero || "0"}.${decimal}` : entero);
        }
        // Antes "1,500" y "1.500" daban S/ 1.50: el separador de miles se leía como decimal.
        const numero = (txt) => {
            const v = leerImporte(txt);
            return Number.isFinite(v) ? Math.min(Math.max(v, 0), 999999999) : 0;
        };
        const pintar = () => {
            const g = numero(entra.value) - numero(sale.value);
            const fmt = new Intl.NumberFormat(locale(), { minimumFractionDigits: Number.isInteger(g) ? 0 : 2, maximumFractionDigits: 2 });
            salida.textContent = (g < 0 ? "−" : "") + "S/ " + fmt.format(Math.abs(g));
            etiqueta.textContent = g < 0 ? "Te falta" : "Te queda";
        };
        entra.addEventListener("input", pintar);
        sale.addEventListener("input", pintar);
        document.addEventListener("gp-idioma", pintar);
        pintar();
    }

    /* ---------- Cómo funciona: un control, tres pasos ---------- */
    const rango = $("comoRango");
    if (rango) {
        const frases = ["Primero, crea tu cuenta.", "Luego, registra tu día.", "Al final, mira tu ganancia."];
        const vistas = document.querySelectorAll("#comoVista [data-vp]");
        const nombres = document.querySelectorAll(".lp-pasos li");
        const cambiar = () => {
            const n = Math.min(Math.max(Number(rango.value) || 0, 0), 2);
            const clausula = $("comoClausula");
            clausula.textContent = frases[n];
            /* Reinicia la animación de cruce */
            clausula.style.animation = "none"; void clausula.offsetWidth; clausula.style.animation = "";
            vistas.forEach((v) => { v.hidden = Number(v.dataset.vp) !== n; });
            nombres.forEach((li) => li.setAttribute("aria-current", String(Number(li.dataset.n) === n)));
            rango.setAttribute("aria-valuetext", nombres[n] ? nombres[n].textContent : String(n + 1));
        };
        rango.addEventListener("input", cambiar);
        nombres.forEach((li) => li.addEventListener("click", () => { rango.value = li.dataset.n; cambiar(); }));
        cambiar();
    }

    /* ---------- Precio: dos planes, una sola cifra ---------- */
    const botonesPlan = document.querySelectorAll(".lp-plan");
    if (botonesPlan.length) {
        const datos = {
            prueba: { cifra: "0 USD", periodo: "14 días", texto: "Usa todo sin tarjeta. Al terminar puedes seguir viendo y descargando tus datos; para seguir registrando te suscribes.", boton: "Empezar gratis" },
            mensual: { cifra: null, periodo: "al mes", texto: "Finanzas y almacén completos. Cancela cuando quieras y conserva el acceso hasta el final del periodo pagado. Exporta o borra tus datos en cualquier momento.", boton: "Empezar gratis" }
        };
        const cifraMensual = $("planCifra").textContent;
        const escena = $("planEscena");
        const elegir = (id, animar) => {
            const d = datos[id];
            botonesPlan.forEach((b) => b.setAttribute("aria-selected", String(b.dataset.plan === id)));
            $("planCifra").textContent = d.cifra || cifraMensual;
            $("planPeriodo").textContent = d.periodo;
            $("planTexto").textContent = d.texto;
            $("planBoton").textContent = d.boton;
            escena.setAttribute("aria-labelledby", id === "prueba" ? "planPrueba" : "planMensual");
            if (animar && !reducido) {
                Array.from(escena.children).forEach((h) => { h.style.animation = "none"; void h.offsetWidth; h.style.animation = ""; });
            }
        };
        botonesPlan.forEach((b) => b.addEventListener("click", () => elegir(b.dataset.plan, true)));
    }

    if (reducido || !("IntersectionObserver" in window)) return;

    /* ---------- Aparición una sola vez ---------- */
    raiz.classList.add("js-portada");
    const observador = new IntersectionObserver((entradas) => {
        entradas.forEach((entrada) => {
            if (entrada.isIntersecting) {
                entrada.target.classList.add("visible");
                observador.unobserve(entrada.target);
            }
        });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    document.querySelectorAll("[data-aparece]").forEach((el) => observador.observe(el));

    /* ---------- Tarjeta de acceso: se "enciende" al llegar a ella (una sola vez) ---------- */
    const tarjeta = document.querySelector("body[data-sesion=\"no\"] .acceso-tarjeta");
    if (tarjeta) {
        tarjeta.classList.add("lista");
        const encender = () => { tarjeta.classList.add("enciende"); luz.disconnect(); };
        const luz = new IntersectionObserver((entradas) => {
            if (entradas.some((e) => e.isIntersecting)) encender();
        }, { threshold: 0.08 });
        luz.observe(tarjeta);
        /* Si alguien pulsa "Empezar gratis" / "Iniciar sesión", se enciende de inmediato */
        document.querySelectorAll("[data-cta]").forEach((b) => b.addEventListener("click", encender));
        /* Seguro: nunca debe quedar invisible */
        setTimeout(() => { if (!tarjeta.classList.contains("enciende")) encender(); }, 6000);
    }
})();
