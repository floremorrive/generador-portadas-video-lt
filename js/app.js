const estado = {
  photo: null,
  focal: { zoom: 1, focalX: 0.5, focalY: 0.5 },
};

const previewCanvas = document.getElementById('canvas-preview');
const previewWrap = document.getElementById('preview-wrap');
const exportCanvas = document.getElementById('canvas-export');
const elEstado = document.getElementById('estado');
const elCategoria = document.getElementById('input-categoria');
const elCategoriaOtra = document.getElementById('input-categoria-otra');

// Categorías de La Tribuna (las mismas de los generadores de imágenes y carruseles).
const CATEGORIAS_PRINCIPALES = [
  'Pasa en el mundo', '¿Qué está pasando?', 'Puntos de vista', 'Especiales',
  'Pasa en las regiones', 'Pura paja', 'Le pasa a las Mujeres',
];
const CATEGORIAS_TEMAS = [
  'Agro', 'Arte y Cultura', 'Economía', 'Educación', 'Industria', 'Magisterio', 'Medio ambiente',
  'Minería', 'Mujeres', 'Salud', 'Servicios públicos', 'Mercado Laboral', 'Trabajadores', 'Género',
  'Petróleo', 'Ciencia y Tecnología', 'Pensiones', 'Historia', 'Energía',
];

function llenarCategorias() {
  const grupo = (etiqueta, lista) => {
    const g = document.createElement('optgroup');
    g.label = etiqueta;
    lista.forEach((c) => g.appendChild(new Option(c, c)));
    return g;
  };
  elCategoria.appendChild(grupo('Secciones', CATEGORIAS_PRINCIPALES));
  elCategoria.appendChild(grupo('Temas', CATEGORIAS_TEMAS));
  elCategoria.appendChild(new Option('Otra (escribir)…', '__otra'));
  elCategoria.value = 'Pasa en el mundo';
}
llenarCategorias();

function categoriaActual() {
  return elCategoria.value === '__otra' ? elCategoriaOtra.value : elCategoria.value;
}
const elTitular = document.getElementById('input-titular');
const elOpacidad = document.getElementById('input-opacidad');
const elOpacidadVal = document.getElementById('opacidad-valor');

function setEstado(msg) { elEstado.textContent = msg || ''; }

function valorRadio(nombre) {
  return document.querySelector(`input[name="${nombre}"]:checked`).value;
}

function opciones(guias) {
  const textura = valorRadio('textura');
  return {
    photo: estado.photo,
    focal: estado.focal,
    categoria: categoriaActual(),
    titular: elTitular.value,
    textura: textura === 'ninguna' ? null : textura,
    opacidad: parseFloat(elOpacidad.value) / 100,
    degradado: document.getElementById('input-degradado').checked,
    guias,
  };
}

async function actualizarPreview() {
  const info = await dibujarPortada(previewCanvas, opciones(document.getElementById('input-guias').checked));
  if (info.excede) setEstado('El titular pasa de 3 líneas incluso con la letra más pequeña permitida. Acórtelo.');
  else if (info.reducido) setEstado(`Titular largo: se redujo a ${info.size} px para mantener 3 líneas.`);
  else if (info.ampliado) setEstado(`Titular corto: se amplió a ${info.size} px para llenar 3 líneas.`);
  else setEstado(`Titular en ${info.lineas} línea${info.lineas === 1 ? '' : 's'}, ${info.size} px.`);
}

document.getElementById('input-foto').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const img = new Image();
  img.onload = async () => {
    estado.photo = img;
    estado.focal = { zoom: 1, focalX: 0.5, focalY: 0.5 };
    document.getElementById('input-zoom').value = 1;
    await actualizarPreview();
  };
  img.src = URL.createObjectURL(file);
});

document.getElementById('input-zoom').addEventListener('input', async (e) => {
  estado.focal.zoom = parseFloat(e.target.value);
  await actualizarPreview();
});

[elCategoria, elCategoriaOtra, elTitular, document.getElementById('input-degradado'), document.getElementById('input-guias')].forEach(
  (el) => el.addEventListener('input', actualizarPreview)
);

elCategoria.addEventListener('change', () => {
  elCategoriaOtra.hidden = elCategoria.value !== '__otra';
  if (!elCategoriaOtra.hidden) elCategoriaOtra.focus();
});

elOpacidad.addEventListener('input', () => {
  elOpacidadVal.textContent = `${elOpacidad.value}%`;
  actualizarPreview();
});

document.querySelectorAll('input[name="textura"]').forEach((r) => {
  r.addEventListener('change', () => {
    const t = r.value;
    if (t !== 'ninguna') {
      elOpacidad.value = Math.round(TEXTURAS[t].opacidad * 100);
      elOpacidadVal.textContent = `${elOpacidad.value}%`;
    }
    actualizarPreview();
  });
});

// Arrastrar la foto en la vista previa para reencuadrar.
let arrastrando = false;
let inicio = { x: 0, y: 0, focalX: 0.5, focalY: 0.5 };

previewWrap.addEventListener('mousedown', (e) => {
  if (!estado.photo) return;
  arrastrando = true;
  previewWrap.classList.add('arrastrando');
  inicio = { x: e.clientX, y: e.clientY, focalX: estado.focal.focalX, focalY: estado.focal.focalY };
});

window.addEventListener('mousemove', async (e) => {
  if (!arrastrando) return;
  const rect = previewWrap.getBoundingClientRect();
  const zoom = estado.focal.zoom;
  const dx = (e.clientX - inicio.x) / rect.width / zoom;
  const dy = (e.clientY - inicio.y) / rect.height / zoom;
  estado.focal.focalX = Math.max(0, Math.min(1, inicio.focalX - dx));
  estado.focal.focalY = Math.max(0, Math.min(1, inicio.focalY - dy));
  await actualizarPreview();
});

window.addEventListener('mouseup', () => {
  arrastrando = false;
  previewWrap.classList.remove('arrastrando');
});

document.getElementById('btn-descargar').addEventListener('click', async () => {
  setEstado('Generando portada…');
  await dibujarPortada(exportCanvas, opciones(false));
  const blob = await canvasToBlob(exportCanvas, 'image/png');
  descargarBlob(blob, 'portada-video.png');
  setEstado(`Portada lista (${Math.round(blob.size / 1024)} KB).`);
});

actualizarPreview();
