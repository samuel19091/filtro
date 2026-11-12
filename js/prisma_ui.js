// ===========================================================================
// PRISMA — interfaz de la pagina y arranque del filtro
// Abre la capa del filtro, enciende la camara una sola vez y muestra el sabor
// que el script de la escena va anunciando con el evento 'prisma:sabor'.
// ===========================================================================

// ---------------------------------------------------------------------------
// TEXTURAS DE LA CARA  (esto es lo que sale de studio.html)
//
// Tal como viene, la cara se pinta con unas facetas de prisma que se tiñen del
// color de cada sabor. Si quieres dibujar tu propia cara:
//
//   1. Abre studio.html y pinta la textura.
//   2. Exportar -> "Solo la textura". Te baja un .png.
//   3. Guarda el .png en una carpeta "texturas" junto a index.html.
//   4. Quita las dos barras // de la linea del sabor y pon el nombre del archivo.
//
// El sabor que dejes comentado sigue usando las facetas. Cuando pones una
// textura propia, se muestra con sus colores reales y ya no se tiñe.
// ---------------------------------------------------------------------------
window.PRISMA_TEXTURAS = {
	// ambar:   'texturas/ambar.png',
	// lima:    'texturas/lima.png',
	// indigo:  'texturas/indigo.png',
	// magenta: 'texturas/magenta.png',
};

// El controlador se carga en el momento de abrir el filtro: asi, si la ruta
// esta mal, la pagina sigue funcionando y el aviso dice que falta el archivo.
const CONTROLADOR = '../mediapipe/mediapipe_controller.js';
const ESCENA = 'app_prisma.json';

const cuerpo = document.body;
const capa = document.querySelector('.filtro-ui');
const nombre = document.querySelector('[data-sabor-nombre]');
const receta = document.querySelector('[data-sabor-receta]');
const punto = document.querySelector('.punto');
const pista = document.querySelector('[data-pista]');
const aviso = document.querySelector('[data-aviso]');
const avisoTexto = document.querySelector('[data-aviso-texto]');
const video = document.getElementById('video-renderer');

let arrancado = false;

// ---- Abrir y cerrar -------------------------------------------------------

function mostrarAviso(texto) {
	avisoTexto.textContent = texto;
	aviso.hidden = false;
}

async function abrir() {
	cuerpo.classList.add('filtro-abierto');
	capa.hidden = false;
	aviso.hidden = true;

	// Sin servidor no hay camara ni modulos: es el fallo mas comun.
	if (location.protocol === 'file:') {
		mostrarAviso('Abre la página desde un servidor local (en VS Code, Live Server). ' +
			'Con doble clic el navegador bloquea la cámara y los módulos de JavaScript.');
		return;
	}

	if (arrancado) {
		if (window.player && window.player.setPaused) window.player.setPaused(false, 'interfaz');
		if (video) video.play().catch(() => { });
		return;
	}
	arrancado = true;

	let startFaceFilter;
	try {
		({ startFaceFilter } = await import(CONTROLADOR));
	} catch (error) {
		console.error(error);
		arrancado = false;
		mostrarAviso('No se encontró js/mediapipe/mediapipe_controller.js. ' +
			'Esa carpeta tiene que estar junto a index.html.');
		return;
	}

	try {
		await startFaceFilter(ESCENA);
	} catch (error) {
		console.error(error);
		mostrarAviso('No se pudo encender la cámara. Revisa el permiso en la barra de direcciones ' +
			'y que ninguna otra aplicación la esté usando.');
		return;
	}

	// Si a los 8 segundos no llega imagen, casi siempre es el permiso.
	setTimeout(() => {
		if (!aviso.hidden) return;
		if (!video || video.videoWidth === 0) {
			mostrarAviso('La cámara no está entregando imagen. Revisa el permiso del navegador ' +
				'y vuelve a abrir el filtro.');
		}
	}, 8000);
}

function cerrar() {
	cuerpo.classList.remove('filtro-abierto');
	capa.hidden = true;
	// Se deja la camara en pausa para no gastar bateria.
	if (window.player && window.player.setPaused) window.player.setPaused(true, 'interfaz');
	if (video) video.pause();
}

document.querySelectorAll('[data-abrir-filtro]').forEach(b => b.addEventListener('click', abrir));
document.querySelectorAll('[data-cerrar-filtro]').forEach(b => b.addEventListener('click', cerrar));

document.addEventListener('keydown', (e) => {
	if (e.key === 'Escape' && cuerpo.classList.contains('filtro-abierto')) cerrar();
});

// ---- Sabor en pantalla ----------------------------------------------------

let pistaVista = false;

window.addEventListener('prisma:sabor', (e) => {
	const sabor = e.detail;
	nombre.textContent = sabor.nombre;
	receta.textContent = sabor.receta;
	punto.style.background = sabor.color;
	punto.style.color = sabor.color;

	// La pista se va en cuanto la persona cambia de sabor por primera vez.
	if (!pistaVista) {
		pistaVista = true;
		return;
	}
	pista.style.opacity = '0';
});

// A los 9 segundos la pista se desvanece aunque no haya pasado nada.
setTimeout(() => { if (pista) pista.style.opacity = '0'; }, 9000);
