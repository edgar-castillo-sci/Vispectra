# Vispectra

> 🇬🇧 [English](README.md) · 🇲🇽🇦🇷🇨🇴🇪🇸🇨🇱🇵🇦🇵🇪🇨🇺… Español · 📅 Last synced: 2026-11-11

## Resumen

Vispectra es un compilador de formatos de archivo espectroscópicos (UV-Vis, XRD, XPS, Raman, IR). Está diseñado para ingerir salidas de instrumento heterogéneas y sin formato, y transformarlas en matrices numéricas estrictas.

En lugar de depender de parsers codificados a mano para formatos propietarios específicos, Vispectra infiere la estructura gramatical del archivo a partir de una muestra estadística de su contenido. Opera completamente del lado del cliente dentro de un navegador web, garantizando cero telemetría, sin dependencias de backend y privacidad total de los datos.

**Versión actual:** `v0.1.1-alpha` (2026-11-11). Ver el [CHANGELOG](CHANGELOG.md) para más detalles.

## Antecedentes teóricos

Leer un formato de archivo desconocido sin una especificación previa es equivalente a la **identificación de gramáticas a partir de presentaciones positivas**. En 1967, E. M. Gold demostró que este problema es formalmente imposible de resolver en el caso general usando solo ejemplos positivos.

Vispectra no intenta resolver el problema general. En su lugar, restringe el dominio a datos espectroscópicos y aplica **sesgos inductivos** (heurísticas) para hacer el problema tratable:

1.  **Muestreo del bloque central:** Asume que los preámbulos y los residuos ocupan los extremos del archivo, mientras que el bloque central contiene los datos crudos.
2.  **Canonicalización:** Extrae un contrato estructural (el *canon*) comparando las estructuras de las líneas.
3.  **El separador duro (`|`):** Distingue separadores duros (punto y coma, espacios) de comas literales, lo que permite resolver formatos europeos y americanos sin adivinar.

Cuando el compilador no puede decidir sobre una estructura válida, falla de forma explícita emitiendo diagnósticos tipados en lugar de producir silenciosamente datos corruptos. Cuando la estructura es genuinamente ambigua, degrada a intervención del usuario mediante un modal interactivo. Cuando es inequívoca, se compromete con una resolución determinista: sin adivinación silenciosa.

## Arquitectura del sistema

Cuatro capas independientes:

**1. Compilador (`src/compiler/`)**
Pipeline de funciones puras (00-09) que transforma texto en columnas numéricas limpias.
- `00_reading`, `01_sampling`, `01b_trailing_comma`, `02_lexer`, `03_ir`,
  `04_canon`, `04b_disambiguation`, `04c_block_canon`, `05_fixation`,
  `06_parser`, `07_semantics`, `08_codegen`, `09_diagnostics`.

**2. Motor de visualización (`src/plot/`)**
Renderizador híbrido SVG/Canvas.
- `state.js` — estado centralizado del grafo
- `axes.js` — generación de ticks + formateo de etiquetas (con soporte de super-exponente)
- `renderer.js` — dibujo híbrido SVG/Canvas, marco, ticks, cuadrícula, leyenda
- `downsampler.js` — algoritmo MinMaxLTTB para datasets masivos
- `interaction.js` — crosshair al pasar el ratón, pin, zoom de caja, doble clic para reset
- `index.js` — orquestador (drawPlot + panel de rango)

**3. Servicios (`src/services/`)**
Lógica pura que consume la UI.
- `columns.js` — deduplicación consciente de nulos
- `pipeline.js` — pipeline matemático (inmutable)
- `export.js` — SVG/PNG/JPEG/PDF/CSV
- `yaml.js` — parser/stringifier YAML minimalista (Vanilla JS)
- `config.js` — lectores puros entre objetos de estado y parches YAML

**4. Interfaz de usuario (`src/ui/` + `ui.js`)**
Componentes DOM modulares.
- `rolePanel.js` — selección de series Y, colores, estilos, grosores, etiquetas inline
- `pipelinePanel.js` — constructor de pipeline matemático
- `axesPanel.js` — escala de eje, modo, formato, menores, invertir
- `framePanel.js` — presets de canvas, dimensiones personalizadas, modos de marco
- `configPanel.js` — guardar/cargar/aplicar YAML
- `rangePanel.js` — límites de vista editables, desplazamiento por eje, undo/reset
- `appearancePanel.js` — fuente, marco, ticks, cuadrícula, marco de leyenda, super-exponente
- `disambiguationModal.js` / `columnsModal.js` — modales de decisión

## Estructura del repositorio

    Vispectra/
    ├── src/
    │   ├── compiler/       # Fases 00-09 (pipeline del compilador)
    │   ├── plot/           # Motor de visualización (híbrido SVG/Canvas)
    │   ├── services/       # Lógica pura (config, export, pipeline)
    │   └── ui/             # Componentes DOM modulares
    ├── tests/
    │   ├── compiler/       # Tests unitarios de las fases del compilador
    │   ├── services/       # Tests unitarios de la capa de servicios
    │   └── main.test.js    # Tests de integración del orquestador
    ├── examples/
    │   ├── cary60_pvdf_hfp_40pctgo_2025-05-13.csv
    │   ├── CNNi.csv
    │   ├── L1Ref.txt
    │   ├── 26032024_Characterisation_UV_T2.3_FORTH.csv
    │   ├── curvedata_opticaldensity.csv
    │   └── generate_test_data.js
    ├── docs/
    │   ├── architecture.md
    │   ├── rules.md
    │   ├── processing_rules.md
    │   ├── origen.md
    │   └── ejemplos.md
    ├── CHANGELOG.md
    ├── ROADMAP.md
    ├── README.md           # (versión en inglés)
    ├── README.es.md        # (este archivo, español)
    └── package.json

## Estado de implementación

**Versión actual:** `v0.1.1-alpha` (2026-11-11)

**Modelo canónico:** Canon de dos niveles.
- **Literal (por fila):** `n` (decimal con punto), `z` (entero), `v` (slot vacío), `|` (separador duro), `,` (coma literal).
- **Abstracto (por bloque):** `n` / `z` / `i` / `v`, un símbolo por columna.

**Estado:**
- **Compilador:** Estable (00-09). Maneja archivos americanos, europeos, dispersos y de formato ancho con filtrado automático de basura y exclusión de columnas vacías. La notación mixta dentro de una misma fila parsea correctamente (e.g. `800,010376` junto a `8.915989893E-4`).
- **Motor de visualización:** Listo para publicación. Híbrido SVG/Canvas, downsampling MinMaxLTTB, aislamiento por búsqueda binaria durante el zoom, invertir por eje (sin `flip`), opciones de marco/ticks/cuadrícula/marco de leyenda/Computer-Modern/super-exponente.
- **Configuración (YAML v2):** Serialización completa del estado visual (columnas, marco, eje, grafo, series, vista). Round-trip fiel.
- **UI:** Modular. Modales personalizados, bloqueo de grosor por serie, compactación de color/estilo con bloqueo, leyenda con valores en vivo al pasar el ratón, tooltip flotante de X.
- **Tests:** 112 pasando (`npm test`), cubriendo fases del compilador, servicios y orquestador.
- **Fixtures:** 5 archivos UV-Vis reales en `examples/`, incluyendo una exportación del Cary 60 con notación mixta.

## Características principales

**Parseo robusto:**
- Formatos americano (`.` decimal, `,` separador) y europeo (`,` decimal, `;` separador).
- Notación mixta dentro de una misma fila: `800,010376` (europeo) junto a `8.915989893E-4` (científico) parsea correctamente.
- Filtrado automático de metadatos/encabezados.
- Columnas faltantes rellenadas con `null` (nunca `0`).
- Columnas vacías excluidas del plot y la leyenda automáticamente.
- Detección heurística de X: omite columnas de índice entero secuencial y elige la primera columna numérica monotónica.
- Desambiguación interactiva cuando la estructura es genuinamente ambigua.

**Visualización lista para publicación:**
- **Escalas:** Linear y Log10 por eje.
- **Ticks:** Auto (nice numbers), Conteo fijo, Paso exacto, Paso nice forzado; hacia adentro/afuera/adentro+afuera; espejados en arriba/derecha.
- **Marco:** Caja completa alrededor del plot (estilo LaTeX), activada por defecto.
- **Cuadrícula:** `none` / `major` / `both`.
- **Fuente:** Computer Modern (vía KaTeX webfont), Times, o sans del sistema.
- **Super-exponente:** `1.5e-3` renderizado como `1.5x10^-3`, ticks logarítmicos como `10^-2`, `10^-1`, `1`, `10`.
- **Leyenda:** 6 posiciones (4 esquinas de caja + derecha + abajo), 3 estilos de marco (`none`, `thin`, `default`).
- **Interacción hover:** Crosshair sigue al ratón; valores de sidebar y leyenda se actualizan en vivo; tooltip flotante `X = ...` sobre el plot.
- **Pin (clic):** Congela crosshair, valores de sidebar, valores de leyenda y tooltip X. Clic de nuevo para soltar.
- **Zoom de caja:** Arrastra sobre el plot para hacer zoom; doble clic para reset.
- **Panel de rango:** Edición directa de min/max, desplazamiento determinista (Δ) por eje, undo por eje, reset por eje.
- **Presets de marco:** 7 layouts + custom (200-3000px), 3 modos de redimensionado (stretch, extend, crop).
- **Estilado por serie:** Color/estilo/grosor por serie; color y estilo se auto-compactan entre series activas no vacías; "Lock styles" opcional para congelar elecciones manuales; grosor por serie con slider maestro y toggle "Lock all".
- **Rendimiento:** La búsqueda binaria aísla los puntos visibles durante el zoom; MinMaxLTTB hace downsampling de datasets >2,000 puntos preservando la forma de los picos; modo de exportación forzado a SVG para salida vectorial en archivos masivos.

**Calibración (planeada para v0.3.0):**
- Ajustes lineales, cuadráticos y lineales por el cero.
- LOD, LOQ, residuales, errores estándar por muestra.
- Sin decisiones automáticas: Vispectra calcula y reporta; el usuario decide qué significan los datos.

## Uso y despliegue

    git clone https://github.com/edgar-castillo-sci/Vispectra.git
    cd Vispectra
    npm run dev

Abre la URL local, arrastra un archivo espectroscópico a la interfaz. Se soporta drag and drop.

Hay archivos de ejemplo en `examples/`. Para verificar el pipeline del compilador:

    npm test

La documentación completa vive en `docs/`:
- [`docs/architecture.md`](docs/architecture.md) — fases del pipeline, contratos, decisiones de diseño
- [`docs/rules.md`](docs/rules.md) — reglas del parser (R1–R109)
- [`docs/processing_rules.md`](docs/processing_rules.md) — pipeline científico planeado
- [`docs/origen.md`](docs/origen.md) — origen y motivación del proyecto

Versión en inglés: [`README.md`](README.md).

## Licencia y ciencia abierta

Bajo la **GNU Affero General Public License v3.0 (AGPL-3.0)**. La AGPL-3.0 protege el núcleo científico de forks propietarios. Para integración comercial o propietaria, hay negociaciones de doble licenciamiento disponibles contactando al autor.

## Referencias

- Gold, E. M. (1967). *Language identification in the limit*. Information and Control, 10(5), 447-474. https://doi.org/10.1016/S0019-9958\(67\)91165-5

## Citación

Si usas Vispectra en trabajo académico, por favor cita el **DOI
específico de la versión que usaste** (identificador estable,
reproducible) o el **DOI conceptual** (siempre apunta a la última
versión archivada).

**Esta versión (`v0.1.1-alpha`):**
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.24153400.svg)](https://doi.org/10.5281/zenodo.24153400)

**DOI conceptual (siempre la última versión):**
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23177822.svg)](https://doi.org/10.5281/zenodo.23177822)

BibTeX para esta versión:

    @software{castillo_vispectra_v011,
      author       = {Castillo, Edgar},
      title        = {Vispectra: A compiler for spectroscopic file formats},
      year         = {2026},
      version      = {v0.1.1-alpha},
      publisher    = {Zenodo},
      doi          = {10.5281/zenodo.24153400},
      url          = {https://github.com/edgar-castillo-sci/Vispectra}
    }

BibTeX para la última versión (DOI conceptual):

    @software{castillo_vispectra,
      author       = {Castillo, Edgar},
      title        = {Vispectra: A compiler for spectroscopic file formats},
      year         = {2026},
      publisher    = {Zenodo},
      doi          = {10.5281/zenodo.23177822},
      url          = {https://github.com/edgar-castillo-sci/Vispectra}
    }

## Autor

**Edgar Castillo**
Investigador Independiente
[ORCID: 0009-0006-4268-3323](https://orcid.org/0009-0006-4268-3323)

