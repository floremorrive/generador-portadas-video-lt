// Motor de render: portada vertical 1080x1920 para reels y videos de La Tribuna.

const W = 1080;
const H = 1920;

const COLORS = {
  marfil: '#FAF4F2',
  vinotinto: '#8A3D33',
  dorado: '#C6A465',
  titular: '#272624',
};

const CAJA = {
  x: 80,
  w: 807, // llega hasta x=887, donde empieza la franja de botones de la interfaz (zona no segura)
  padding: 45,
  bottom: 1548, // borde inferior fijo; la caja crece hacia arriba
  lineaW: 70,
  lineaH: 6,
  gapLineaCategoria: 24,
  catSize: 38,
  bannerPadX: 24,
  bannerPadY: 12,
  gapCategoriaTitular: 24,
};

const TITULAR = {
  size: 88,
  minSize: 50,
  maxSize: 120,
  lineHeight: 1.08,
  lineas: 3,
};

// Logo: justo debajo del borde superior del recorte 3:4 (y=240) con el mismo margen de 1,5 cm que a la izquierda
// (1 cm = 37,8 px a 96 ppp), 300 px sobre el dibujo visible.
const LOGO = {
  x: 57,
  y: 240 + 57,
  anchoVisible: 300,
  // Recuadro visible dentro del PNG original de 1080x1080
  bbox: { x: 160, y: 394, w: 784, h: 272 },
};

// Zona segura medida sobre la imagen de referencia (335x597 escalada a 1080x1920).
const ZONA_SEGURA = {
  izq: 45,
  arriba: 113,
  der: 1032,
  abajo: 1548,
  cortaDerX: 887, // desde esta X hacia la derecha, los botones tapan desde cortaDerY
  cortaDerY: 961,
  muesca: { x: 313, y: 132, w: 448, h: 84 },
};

// Recorte central 3:4 de la cuadrícula de Instagram (1080x1440).
const RECORTE_FEED = { y: 240, h: 1440 };

const TEXTURAS = {
  lineas: { src: 'assets/img/lineas.png', opacidad: 0.15 },
  gotas: { src: 'assets/img/gotas.png', opacidad: 0.18 },
};

const ASSETS = { logo: 'assets/img/logo-blanco.png' };

const imageCache = {};
function loadImage(src) {
  if (!imageCache[src]) {
    imageCache[src] = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }
  return imageCache[src];
}

async function cargarFuentes() {
  await Promise.all([
    document.fonts.load(`700 ${TITULAR.size}px Antonio`),
    document.fonts.load(`600 ${CAJA.catSize}px "Source Serif 4"`),
  ]);
}

function dibujarFoto(ctx, img, focal) {
  const { zoom = 1, focalX = 0.5, focalY = 0.5 } = focal || {};
  const dstRatio = W / H;
  let baseW, baseH;
  if (img.width / img.height > dstRatio) {
    baseH = img.height;
    baseW = baseH * dstRatio;
  } else {
    baseW = img.width;
    baseH = baseW / dstRatio;
  }
  const sw = baseW / zoom;
  const sh = baseH / zoom;
  const sx = Math.max(0, Math.min(img.width - sw, focalX * img.width - sw / 2));
  const sy = Math.max(0, Math.min(img.height - sh, focalY * img.height - sh / 2));
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
}

function dibujarCover(ctx, img) {
  const ratio = W / H;
  let sw, sh, sx, sy;
  if (img.width / img.height > ratio) {
    sh = img.height;
    sw = sh * ratio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw / ratio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
}

// Parte el titular en líneas según el ancho útil.
function partirLineas(ctx, texto, anchoMax) {
  const palabras = texto.trim().split(/\s+/).filter(Boolean);
  const lineas = [];
  let actual = '';
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (ctx.measureText(prueba).width <= anchoMax || !actual) actual = prueba;
    else {
      lineas.push(actual);
      actual = p;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

// Ajusta el titular para que ocupe siempre tres líneas: parte de 88 px, baja el tamaño si pasa de tres
// y lo sube (hasta maxSize) si queda en menos de tres.
function ajustarTitular(ctx, texto) {
  const anchoMax = CAJA.w - CAJA.padding * 2;
  const medir = (size) => {
    ctx.font = `700 ${size}px Antonio`;
    return partirLineas(ctx, texto, anchoMax);
  };
  let size = TITULAR.size;
  let lineas = medir(size);
  if (lineas.length > TITULAR.lineas) {
    while (lineas.length > TITULAR.lineas && size > TITULAR.minSize) {
      size -= 2;
      lineas = medir(size);
    }
  } else if (lineas.length < TITULAR.lineas) {
    while (lineas.length < TITULAR.lineas && size < TITULAR.maxSize) {
      size += 2;
      lineas = medir(size);
    }
    if (lineas.length > TITULAR.lineas) {
      size -= 2;
      lineas = medir(size);
    } else if (lineas.length < TITULAR.lineas) {
      // Titular demasiado corto para llegar a tres líneas: se deja en el tamaño estándar.
      size = TITULAR.size;
      lineas = medir(size);
    }
  }
  return { size, lineas, excede: lineas.length > TITULAR.lineas, reducido: size < TITULAR.size, ampliado: size > TITULAR.size };
}

function baselineEnLinea(ctx, top, altoLinea) {
  const m = ctx.measureText('Hg');
  const asc = m.fontBoundingBoxAscent;
  const desc = m.fontBoundingBoxDescent;
  return top + (altoLinea - (asc + desc)) / 2 + asc;
}

function dibujarGuias(ctx) {
  const z = ZONA_SEGURA;
  ctx.save();
  ctx.lineWidth = 3;
  ctx.font = '600 22px sans-serif';

  // Zona segura del reel (contorno de la zona libre y áreas tapadas por la interfaz)
  ctx.strokeStyle = '#00D2D2';
  ctx.beginPath();
  ctx.moveTo(z.izq, z.arriba);
  ctx.lineTo(z.der, z.arriba);
  ctx.lineTo(z.der, z.cortaDerY);
  ctx.lineTo(z.cortaDerX, z.cortaDerY);
  ctx.lineTo(z.cortaDerX, z.abajo);
  ctx.lineTo(z.izq, z.abajo);
  ctx.closePath();
  ctx.stroke();
  ctx.strokeRect(z.muesca.x, z.muesca.y, z.muesca.w, z.muesca.h);
  ctx.fillStyle = '#00D2D2';
  ctx.fillText('zona segura del reel', z.izq + 8, z.arriba - 10);

  // Recorte 3:4 de la cuadrícula
  ctx.strokeStyle = '#FF5DA2';
  ctx.setLineDash([14, 10]);
  ctx.strokeRect(0, RECORTE_FEED.y, W, RECORTE_FEED.h);
  ctx.setLineDash([]);
  ctx.fillStyle = '#FF5DA2';
  ctx.fillText('recorte de la cuadrícula 3:4', 12, RECORTE_FEED.y + 28);
  ctx.restore();
}

// Dibuja la portada completa. Devuelve información del titular (líneas, aviso).
async function dibujarPortada(canvas, opts) {
  const {
    photo,
    categoria = '',
    titular = '',
    focal,
    textura = 'lineas',
    opacidad,
    degradado = false,
    guias = false,
  } = opts;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  await cargarFuentes();

  // 8. Fotograma reemplazable
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, W, H);
  if (photo) dibujarFoto(ctx, photo, focal);

  // 7. Texturas editoriales (una sola a la vez, multiplicar)
  if (textura && TEXTURAS[textura]) {
    const tex = await loadImage(TEXTURAS[textura].src);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = opacidad != null ? opacidad : TEXTURAS[textura].opacidad;
    dibujarCover(ctx, tex);
    ctx.restore();
  }

  // 6. Degradado de contraste (opcional, neutro)
  if (degradado) {
    const g = ctx.createLinearGradient(0, H * 0.45, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, H * 0.45, W, H * 0.55);
  }

  // 5. Logotipo blanco
  const logo = await loadImage(ASSETS.logo);
  const esc = LOGO.anchoVisible / LOGO.bbox.w;
  ctx.drawImage(logo, LOGO.x, LOGO.y, logo.width * esc, logo.height * esc);

  // 4-1. Bloque editorial
  const t = ajustarTitular(ctx, titular);
  const altoTitular = t.lineas.length * t.size * TITULAR.lineHeight;
  const altoLineaCat = CAJA.catSize * 1.2;
  const altoCat = categoria ? altoLineaCat + CAJA.bannerPadY * 2 : 0;
  const cajaH =
    CAJA.padding +
    CAJA.lineaH +
    CAJA.gapLineaCategoria +
    (categoria ? altoCat + CAJA.gapCategoriaTitular : 0) +
    altoTitular +
    CAJA.padding;
  const cajaY = CAJA.bottom - cajaH;
  const textoX = CAJA.x + CAJA.padding;

  ctx.fillStyle = COLORS.marfil;
  ctx.fillRect(CAJA.x, cajaY, CAJA.w, cajaH);

  let y = cajaY + CAJA.padding;
  ctx.fillStyle = COLORS.dorado;
  ctx.fillRect(textoX, y, CAJA.lineaW, CAJA.lineaH);
  y += CAJA.lineaH + CAJA.gapLineaCategoria;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  if (categoria) {
    ctx.font = `600 ${CAJA.catSize}px "Source Serif 4"`;
    const anchoBanner = ctx.measureText(categoria).width + CAJA.bannerPadX * 2;
    ctx.fillStyle = COLORS.vinotinto;
    ctx.fillRect(textoX, y, anchoBanner, altoCat);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(categoria, textoX + CAJA.bannerPadX, baselineEnLinea(ctx, y + CAJA.bannerPadY, altoLineaCat));
    y += altoCat + CAJA.gapCategoriaTitular;
  }

  ctx.font = `700 ${t.size}px Antonio`;
  ctx.fillStyle = COLORS.titular;
  const altoLinea = t.size * TITULAR.lineHeight;
  t.lineas.forEach((l, i) => {
    ctx.fillText(l, textoX, baselineEnLinea(ctx, y + i * altoLinea, altoLinea));
  });

  // 9. Guías (solo vista previa)
  if (guias) dibujarGuias(ctx);

  return { lineas: t.lineas.length, size: t.size, reducido: t.reducido, excede: t.excede, cajaY, cajaH };
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
