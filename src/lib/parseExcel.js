// ============================================================================
// parseExcel.js
// ----------------------------------------------------------------------------
// ¿PARA QUÉ SIRVE ESTE ARCHIVO?
//
// Es el "traductor": recibe el archivo Excel tal cual lo subiste (un montón
// de bytes que el navegador no entiende todavía) y lo convierte en algo que
// React SÍ puede usar: un arreglo (lista) de objetos simples, uno por cada
// permiso, con esta forma:
//
//     { fecha: "2025-03-14", anio: 2025, mes: "Mar",
//       nombre: "Juan Pérez", concepto: "PERSONAL", tiempoMin: 480 }
//
// Este archivo NO dibuja nada en pantalla — no tiene JSX, no es un
// componente de React. Es pura LÓGICA: reglas y cálculos. Por eso vive en
// la carpeta "lib" (de "library" = librería de funciones), separado de
// "components" (que sí dibujan cosas).
//
// También es el "guardián de calidad": si el Excel no tiene el formato
// correcto, este archivo lo detecta y lanza un error ANTES de dejar
// entrar datos basura al dashboard.
// ============================================================================


// ----------------------------------------------------------------------------
// PARTE 1: Cargar la librería "xlsx" solo cuando hace falta
// ----------------------------------------------------------------------------
//
// "xlsx" es una librería de terceros (no la escribimos nosotros) que sabe
// leer el formato binario de los archivos Excel. Pesa bastante (unos
// 400KB), así que en vez de cargarla apenas se abre la página, la cargamos
// SOLO en el momento en que el usuario realmente sube un archivo. Así la
// pantalla inicial (la de "selecciona tu Excel") aparece más rápido.
//
// "xlsxPromise" guarda el resultado la primera vez que se pide, para que
// si el usuario sube dos archivos seguidos, la segunda vez no se vuelva a
// descargar la librería — ya la tenemos guardada.
// Límites de seguridad: protegen la pestaña de archivos gigantes o
// manipulados que la dejarían congelada.
const MAX_FILAS = 100000;
const MAX_COLUMNAS = 50;

let xlsxPromise = null;
function cargarXLSX() {
  if (!xlsxPromise) xlsxPromise = import("xlsx");
  return xlsxPromise;
}


// ----------------------------------------------------------------------------
// PARTE 2: Funciones pequeñas de conversión y limpieza
// ----------------------------------------------------------------------------

// Excel no guarda las "horas" como texto tipo "08:00" — internamente las
// guarda como un NÚMERO decimal que representa una fracción de un día
// completo. Por ejemplo: medio día (12:00) se guarda como 0.5.
// Esta función convierte ese número (o un objeto Date) a minutos totales,
// que es una unidad mucho más fácil de sumar y promediar después.
function tiempoAMinutos(valor) {
  if (valor == null || valor === "") return null;

  if (typeof valor === "number") {
    // Descartamos valores imposibles (negativos, NaN o de más de 31 días)
    // para que un dato mal digitado no dispare los totales de horas.
    if (!Number.isFinite(valor) || valor < 0 || valor > 31) return null;
    // 1 día completo = 24 horas x 60 minutos = 1440 minutos.
    // Si el valor es, por ejemplo, 0.5 (medio día) → 0.5 x 1440 = 720 minutos.
    return Math.round(valor * 24 * 60);
  }

  if (valor instanceof Date) {
    // Si Excel ya nos dio un objeto de fecha/hora real, sacamos
    // directamente sus horas y minutos.
    return valor.getHours() * 60 + valor.getMinutes();
  }

  return null; // no supimos interpretar el valor
}

// El concepto del permiso (Personal, Cita médica, etc.) puede venir escrito
// de formas distintas en el Excel: "personal", "Personal", "PERSONAL...".
// Esta función lo deja siempre en MAYÚSCULA y sin espacios sobrantes, para
// que "Personal" y "personal " se traten como el mismo concepto en las
// gráficas (si no hiciéramos esto, aparecerían como dos barras distintas).
function normalizarConcepto(valor) {
  return (valor || "").toString().trim().toUpperCase();
}

// Nombres cortos de los 12 meses, en el mismo orden que los usa el resto
// de la app (gráficas, filtros, etc.). El índice 0 es Enero, el 11 es
// Diciembre — por eso más abajo usamos "m - 1" para ubicar el mes correcto.
const MESES_ABREV = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// Convierte el valor de la columna "Fecha" (que puede venir como objeto
// Date de JavaScript, o como número raro de Excel) en tres datos ya
// separados y listos para usar: el año, el mes (en texto corto) y una
// fecha en formato ISO "AAAA-MM-DD" (el estándar internacional, fácil de
// ordenar y comparar).
//
// ¿Por qué no confiamos en las columnas de texto "Año" o "Mes" que trae
// el Excel? Porque descubrimos que tenían errores de digitación (por
// ejemplo "Agt" en vez de "Ago"), lo que hacía que algunos meses
// desaparecieran de las gráficas. Calcularlo siempre desde la fecha real
// es mucho más confiable.
function excelFechaAPartes(valor, XLSX) {
  let y, m, d; // year (año), month (mes), day (día)

  if (valor instanceof Date) {
    // Caso simple: Excel ya nos dio una fecha "de verdad".
    y = valor.getFullYear();
    m = valor.getMonth() + 1; // getMonth() devuelve 0-11, por eso sumamos 1
    d = valor.getDate();
  } else if (typeof valor === "number") {
    // Caso raro: Excel guardó la fecha como un número (su forma interna
    // de contar los días desde 1900). XLSX.SSF.parse_date_code sabe
    // traducir ese número a año/mes/día reales.
    const parsed = XLSX.SSF.parse_date_code(valor);
    if (!parsed) return null; // el número no correspondía a ninguna fecha válida
    y = parsed.y; m = parsed.m; d = parsed.d;
  } else {
    return null; // no era ni fecha ni número — no se puede interpretar
  }

  // Arma el texto "AAAA-MM-DD", rellenando con un cero adelante si el
  // mes o el día son de un solo dígito (por ejemplo, "3" se vuelve "03").
  const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return { iso, anio: y, mes: MESES_ABREV[m - 1] };
}


// ----------------------------------------------------------------------------
// PARTE 3: Validaciones — el "guardián de calidad" del Excel
// ----------------------------------------------------------------------------

// Busca en la fila de encabezados (los títulos de columna) cuál posición
// tiene una palabra dada. Por ejemplo, si el encabezado dice
// ["FECHA", "NOMBRE", "CONCEPTO"], buscar "nombre" devuelve 1 (la segunda
// posición, empezando a contar desde 0).
// Si no la encuentra en ninguna columna, devuelve -1.
function headerIncluye(headers, palabra) {
  return headers.findIndex(h => h.includes(palabra));
}

// Encuentra en QUÉ COLUMNA está cada dato que necesitamos, buscando por el
// NOMBRE del encabezado (no por su posición fija). Esto es importante:
// antes, el código asumía que "la fecha siempre está en la columna A, el
// nombre en la D", etc. Pero si alguien reordena las columnas del Excel,
// eso rompería todo silenciosamente. Ahora, sin importar el orden, buscamos
// la columna que DICE "fecha", la que DICE "nombre", etc.
function ubicarColumnas(filas) {
  if (!filas || filas.length < 2) {
    // filas[0] serían los encabezados; si no hay ni una fila más después,
    // no hay datos que procesar.
    throw new Error("El archivo está vacío o no tiene registros.");
  }

  // Tomamos la primera fila (los encabezados) y la limpiamos: quitamos
  // espacios sobrantes y pasamos todo a minúscula, para comparar más fácil
  // (así "Fecha", "FECHA" y " fecha " se detectan igual).
  const headers = (filas[0] || []).map(h => (h || "").toString().trim().toLowerCase());

  const idxFecha = headerIncluye(headers, "fecha");
  const idxNombre = headerIncluye(headers, "nombre");
  // Buscamos solo "conc" (no "concepto" completo) para que también
  // reconozca encabezados con errores de tipeo como "CONCPETO DEL PERMISO".
  const idxConcepto = headerIncluye(headers, "conc");
  const idxTiempo = headerIncluye(headers, "tiempo"); // esta es opcional

  // Revisamos cuáles de las columnas OBLIGATORIAS no se encontraron.
  const faltantes = [];
  if (idxFecha === -1) faltantes.push("Fecha");
  if (idxNombre === -1) faltantes.push("Nombre");
  if (idxConcepto === -1) faltantes.push("Concepto");

  if (faltantes.length > 0) {
    // Si falta alguna, no seguimos: lanzamos un error con un mensaje
    // claro que dice EXACTAMENTE qué columnas faltan.
    throw new Error(
      `El archivo no tiene el formato esperado. Faltan las columnas: ${faltantes.join(", ")}.`
    );
  }

  return { idxFecha, idxNombre, idxConcepto, idxTiempo };
}

// No basta con que el ENCABEZADO diga "Fecha" — hay que confirmar que lo
// que hay DEBAJO de ese encabezado realmente parezcan fechas, y no, por
// ejemplo, números de teléfono o texto random. Esta función revisa una
// muestra de hasta 20 filas para hacer esa comprobación de sentido común.
function validarContenido(filas, cols) {
  // .slice(1, ...) porque la fila 0 son los encabezados, no datos.
  const muestra = filas.slice(1, Math.min(filas.length, 21));
  if (muestra.length === 0) {
    throw new Error("El archivo no tiene filas de datos para validar.");
  }

  let fechasValidas = 0;
  let nombresValidos = 0;

  muestra.forEach(fila => {
    const valFecha = fila[cols.idxFecha];
    const valNombre = fila[cols.idxNombre];

    // Una fecha "válida" es un objeto Date real, o un número dentro de un
    // rango razonable (Excel representa las fechas como números grandes;
    // 20000-90000 corresponde aproximadamente a los años 1954-2146, un
    // rango de sobra para descartar números que claramente no son fechas).
    if (valFecha instanceof Date || (typeof valFecha === "number" && valFecha > 20000 && valFecha < 90000)) {
      fechasValidas++;
    }

    // Un nombre "válido" es texto de al menos 3 letras que contenga al
    // menos una letra del alfabeto (esto descarta celdas vacías, números
    // sueltos, o símbolos raros).
    if (typeof valNombre === "string" && valNombre.trim().length >= 3 && /[a-zA-Záéíóúñ]/.test(valNombre)) {
      nombresValidos++;
    }
  });

  // Si menos del 70% de la muestra tiene fechas/nombres que parecen
  // reales, algo está mal con el archivo (aunque los encabezados dijeran
  // lo correcto) — mejor avisar antes que mostrar un dashboard con
  // basura.
  if (fechasValidas / muestra.length < 0.7) {
    throw new Error(
      "La columna de Fecha no contiene fechas válidas. Verifica que el archivo sea el correcto."
    );
  }
  if (nombresValidos / muestra.length < 0.7) {
    throw new Error(
      "La columna de Nombre no contiene nombres de personas válidos. Verifica que el archivo sea el correcto."
    );
  }
}


// ----------------------------------------------------------------------------
// PARTE 4: La función principal — la que se usa desde afuera
// ----------------------------------------------------------------------------
//
// Esta es la ÚNICA función de este archivo que FileUploader.jsx llama
// directamente. Todo lo de arriba son "ayudantes" que ella usa por dentro.
//
// "export" significa que otros archivos SÍ pueden importar y usar esta
// función (a diferencia de las de arriba, que no tienen "export" y solo
// existen para uso interno de este archivo).
//
// "async" significa que esta función hace cosas que toman tiempo (leer un
// archivo, cargar una librería) y por eso se debe usar con "await" desde
// donde se llama.
export async function parseExcel(file) {

  // Cargamos la librería xlsx (ver PARTE 1) justo cuando la necesitamos.
  const XLSX = await cargarXLSX();

  // file.arrayBuffer() lee el contenido crudo (en bytes) del archivo que
  // seleccionó el usuario.
  const buffer = await file.arrayBuffer();

  // XLSX.read() interpreta esos bytes como un archivo Excel real.
  // cellDates: true le pide a la librería que, cuando pueda, nos entregue
  // las fechas como objetos Date de JavaScript en vez de números raros.
  // sheetRows: solo lee las primeras MAX_FILAS filas (+1 por el encabezado).
  // Un Excel pequeño puede "decir" que ocupa un millón de filas y congelar
  // la pestaña; así cortamos antes de procesar todo eso.
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true, sheetRows: MAX_FILAS + 1 });

  // Un Excel puede tener varias hojas (pestañas); tomamos la primera.
  const hoja = workbook.Sheets[workbook.SheetNames[0]];
  if (!hoja) throw new Error("El archivo no tiene hojas con datos.");

  // Solo necesitamos unas pocas columnas: solo necesitamos unas pocas, así que recortamos
  // el rango a MAX_COLUMNAS para no recorrer miles de celdas vacías.
  if (hoja["!ref"]) {
    const rango = XLSX.utils.decode_range(hoja["!ref"]);
    rango.e.c = Math.min(rango.e.c, MAX_COLUMNAS - 1);
    hoja["!ref"] = XLSX.utils.encode_range(rango);
  }

  // Convierte esa hoja en un arreglo de arreglos: cada elemento de "filas"
  // es una fila del Excel, y cada elemento DENTRO de esa fila es el valor
  // de una celda. header: 1 le dice "no me arregles nada, dame las filas
  // en crudo, tal como están" (nosotros nos encargamos de interpretar los
  // encabezados manualmente en ubicarColumnas).
  // blankrows: false omite filas vacías (p. ej. un formato aplicado a toda
  // la columna), así solo contamos filas que de verdad tienen datos.
  const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: null, blankrows: false });

  // Si se llenó el cupo de lectura, el archivo trae más filas de las
  // permitidas: avisamos en vez de mostrar datos incompletos sin decir nada.
  if (filas.length > MAX_FILAS) {
    throw new Error(
      `El archivo tiene demasiadas filas (máximo ${MAX_FILAS.toLocaleString("es-CO")}). Verifica que sea el archivo correcto.`
    );
  }

  // Aquí es donde entra el "guardián de calidad": si algo no cuadra,
  // estas dos funciones lanzan un error y la ejecución se detiene aquí
  // mismo (el error sube hasta FileUploader.jsx, que lo atrapa y lo
  // muestra en pantalla).
  const cols = ubicarColumnas(filas);
  validarContenido(filas, cols);

  // A partir de aquí, ya confiamos en que el archivo tiene el formato
  // correcto. Recorremos fila por fila (empezando en la 1, no en la 0,
  // porque la 0 son los encabezados) y armamos la lista final.
  const registros = [];
  let filasConDatos = 0; // cuenta cuántas filas tenían al menos fecha y nombre

  for (let i = 1; i < filas.length; i++) {
    const fila = filas[i];
    const fecha = fila[cols.idxFecha];
    const nombre = fila[cols.idxNombre];
    const concepto = fila[cols.idxConcepto];
    // La columna de tiempo es opcional: si no existe (idxTiempo === -1),
    // simplemente dejamos ese dato como null.
    const tiempo = cols.idxTiempo !== -1 ? fila[cols.idxTiempo] : null;

    // Si la fila no tiene fecha o no tiene nombre, la saltamos por
    // completo (probablemente es una fila vacía o de separación).
    if (!fecha || !nombre) continue;
    filasConDatos++;

    // Traducimos la fecha cruda a año/mes/iso (ver PARTE 2).
    const partes = excelFechaAPartes(fecha, XLSX);
    if (!partes) continue; // la fecha no se pudo interpretar; saltamos la fila

    // Agregamos el registro ya limpio y normalizado a la lista final.
    registros.push({
      fecha: partes.iso,
      anio: partes.anio,
      mes: partes.mes,
      nombre: (nombre || "").toString().trim(),
      concepto: normalizarConcepto(concepto),
      tiempoMin: tiempoAMinutos(tiempo),
    });
  }

  // Última red de seguridad: si después de todo el proceso no quedó
  // NINGÚN registro válido, es mejor avisar claramente que mostrar un
  // dashboard completamente vacío sin explicación.
  if (registros.length === 0) {
    throw new Error(
      "No se encontraron registros válidos. Verifica que la columna de Fecha tenga fechas reales."
    );
  }

  // Si más de la mitad de las filas que SÍ tenían datos se descartaron
  // porque su fecha no se pudo interpretar, algo raro está pasando con el
  // archivo (quizás la columna de fecha no es realmente de fechas) —
  // avisamos en vez de mostrar un dashboard con la mitad de los datos
  // faltando silenciosamente.
  if (filasConDatos > 0 && registros.length / filasConDatos < 0.5) {
    throw new Error(
      "Muchas filas tienen fechas inválidas. Revisa el formato de la columna Fecha en el Excel."
    );
  }

  // Si llegamos hasta aquí, todo salió bien: devolvemos la lista de
  // permisos ya lista para que App.jsx la use en gráficas y KPIs.
  return registros;
}