# Vispectra

> Un compilador y visualizador de espectros que corre en tu navegador. Multiplataforma, 100% local, sin servidor.

## Qué es

Vispectra es un lector de archivos de espectroscopía, los toma tal
como salen del instrumento o de la fusión de archivos, y los convierte 
en columnas numéricas limpias, listas para graficar y publicar.

No es un lector de espectros clásico. Es un compilador que aprende a leerlos.

Vispectra corre enteramente en el navegador. No hay backend, no hay subida
de archivos, no hay telemetría. Tus espectros nunca salen de tu dispositivo.
Y como es una aplicación web, funciona en cualquier sistema operativo con
un navegador moderno: Windows, macOS, Linux, Android, iOS. Incluso sin 
necesidad de internet una vez lo hayas guardado en tu navegador.

## Por qué existe

Los archivos de espectroscopía son un caos silencioso. Cada instrumento,
cada software, cada versión, exporta con su propio dialecto: coma o punto
decimal, tabulador o espacio, encabezados de una, dos o muchas líneas,
valores faltantes disfrazados de separadores.

La mayoría de las herramientas asumen que el archivo ya está limpio.
Vispectra parte de la premisa opuesta: **el archivo es la fuente de verdad,
y el parser debe aprender a leerlo**.

## Privacidad y portabilidad

Vispectra se ejecuta íntegramente en el navegador. Esto tiene dos
consecuencias prácticas:

**Tus datos se quedan contigo.** No hay servidor que reciba tus archivos.
Todo el parsing, la validación y la visualización ocurren en el dispositivo
del usuario. Ningún espectro sale del equipo. Esto es relevante para
laboratorios que trabajan con datos confidenciales: formulaciones no
publicadas, resultados clínicos, investigación propietaria.

**Funciona en cualquier plataforma.** Al ser una aplicación web, no hay
instalación específica para Windows, macOS o Linux. Funciona en cualquier
navegador moderno, en escritorio o en móvil. Sin dependencias del sistema,
sin conflictos de versiones, sin instaladores.

La contrapartida es que el rendimiento depende del navegador del usuario.
Para archivos de espectroscopía típicos (miles de líneas), es más que
suficiente. Para datasets muy masivos (millones de puntos), una versión de
escritorio con procesamiento nativo podría ser más adecuada; queda como
posibilidad futura.

## Cómo funciona

Vispectra nació como un intérprete de espectros UV-Vis. La idea era simple:
leer archivos que salen del instrumento y convertirlos en columnas limpias.
Pero al enfrentarse a los formatos reales —sucios, heterogéneos, con
dialectos mezclados— el problema dejó de ser "leer un archivo" y se
convirtió en "inferir una estructura a partir de datos ambiguos".

Ese cambio de problema es lo que llevó a Vispectra a tener la forma de un
compilador: fases independientes, un contrato explícito (el canon), un
parser guiado por ese contrato, y una capa de diagnóstico que no adivina.
La técnica (UV-Vis primero; XRD, XPS, Raman, IR después) solo añade rangos
de validación y operaciones posteriores al parsing.

**Añadir una técnica nueva es añadir una capa de configuración, no
reescribir el compilador.**

> La historia completa del diseño, desde el problema original hasta la
> arquitectura actual, está en [docs/origen.md](docs/origen.md).

Internamente, el parser es un pipeline de fases independientes:

```
[00_lectura]      → texto normalizado
[01_muestreo]     → líneas + muestra aleatoria del tercio central
[02_lexer]        → estructura por línea
[03_ir]           → representación intermedia
[04_canon]        → inferencia de la clave canónica + expansión
[05_fijacion]     → canon fijo
[06_parser]       → valores por línea
[07_semantica]    → verificación
[08_codegen]      → columnas limpias
[09_diagnostico]  → acumulador de diagnósticos
```

Cada fase es testeable por separado y se comunica con las demás por
contratos explícitos. Lo fantástico es que el compilador nunca adivina: 
cuando no puede decidir, falla con un diagnóstico claro en lugar de 
producir datos corruptos.

## Estado

Fase de diseño y desarrollo temprano.

**Implementado:**
- Fase 00 — lectura y normalización de archivos
- Fase 01 — muestreo aleatorio del tercio central
- Fase 09 — acumulador de diagnósticos
- Orquestador (`main.js`)
- Especificación completa del parser (R1–R95)
- Arquitectura del pipeline documentada

**En desarrollo:**
- Fases 02–08 del compilador

**Planificado:**
- Visualización de espectros
- UI híbrida para asignación de roles de columnas
- Soporte para XRD, XPS, Raman, IR
- Internacionalización (español, inglés)

Vispectra **aún no parsea archivos**. El núcleo del compilador está
especificado pero no implementado por completo. Esta sección se actualizará
a medida que avance el desarrollo.

## Uso

El compilador aún no está operativo. Cuando las fases 02–08 estén
implementadas, esta sección documentará cómo ejecutar Vispectra localmente.

Por ahora, el proyecto puede explorarse leyendo la documentación en `docs/`.

## Estructura

```
src/
├── compilador/     Parser por fases
│   ├── 00_lectura.js
│   ├── 01_muestreo.js
│   ├── ...
│   └── 09_diagnostico.js
├── i18n.js         Internacionalización
├── main.js         Orquestador
├── plot.js         Graficador
└── ui.js           Interfaz
docs/
├── origen.md       Historia del diseño
├── arquitectura.md Pipeline y contratos
├── reglas.md       Especificación del parser (R1–R95)
└── ejemplos.md     Casos de prueba trabajados
locales/
├── es.js           Idioma base
└── en.js
```

## Documentación

- [Origen](docs/origen.md) — historia del diseño, desde el problema
  original hasta la arquitectura actual.
- [Arquitectura](docs/arquitectura.md) — pipeline, contratos entre fases,
  decisiones de diseño.
- [Reglas](docs/reglas.md) — especificación completa del parser (R1–R95).
- [Ejemplos](docs/ejemplos.md) — casos de prueba trabajados.

## Licencia

MIT. Ver [LICENSE](LICENSE).

## Créditos

Desarrollado por Edgar Ramón Hernández Castillo.

Vispectra nace de la necesidad de leer archivos de espectroscopía reales
—sucios, heterogéneos, con dialectos distintos— sin tener que limpiarlos
manualmente antes de cada análisis.
