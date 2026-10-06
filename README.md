# Vispectra

Compilador de formatos espectroscópicos. Multiplataforma, local, sin servidor.

Vispectra es dos cosas a la vez: una herramienta para el espectroscopista
que necesita leer archivos sucios, y un caso de estudio sobre inferencia
gramatical a partir de presentaciones positivas. La primera es el uso; la
segunda es el problema que aparece cuando se intenta resolver la primera
con rigor.

## Descripción

Vispectra lee archivos de espectroscopía tal como salen del instrumento
—o de la fusión de varios— y los convierte en columnas numéricas limpias.

La arquitectura no es la de un lector de espectros convencional: es la de
un compilador que infiere la gramática del archivo a partir de una muestra
de sus datos, construye un contrato estructural (el *canon*) y lo aplica
al resto. El punto de partida es que el archivo es la fuente de verdad, y
el parser debe aprender a leerlo, no al revés.

Corre íntegramente en el navegador, sin backend, sin subida de archivos,
sin telemetría. Funciona en cualquier sistema operativo con un navegador
moderno, y una vez cargado puede operar sin conexión.

## Arquitectura

El parser es un pipeline de fases independientes, comunicadas por
contratos explícitos:

```
[00_lectura]      → texto normalizado
[01_muestreo]     → líneas + muestra aleatoria del tercio central
[02_lexer]        → estructura por línea
[03_ir]           → representación intermedia
[04_canon]        → inferencia del canon + expansión desde el centro
[05_fijacion]     → canon fijo
[06_parser]       → valores por línea
[07_semantica]    → verificación
[08_codegen]      → columnas limpias
[09_diagnostico]  → acumulador de diagnósticos
```

Cada fase es una función pura que recibe datos y devuelve datos. La única
excepción es `08_codegen`, que muta las columnas por disciplina explícita.
El compilador no adivina: cuando no puede decidir, falla con un diagnóstico
tipado en lugar de producir datos corruptos en silencio.

El núcleo es agnóstico de la técnica. UV-Vis es la primera implementación;
XRD, XPS, Raman e IR añaden únicamente rangos de validación y operaciones
posteriores al parsing.

## El problema

Los archivos de espectroscopía son heterogéneos por naturaleza. Cada
instrumento, software y versión exporta con su propio dialecto: coma o
punto decimal, tabulador o espacio, encabezados de extensión variable,
valores faltantes representados por separadores vacíos.

La mayoría de las herramientas asumen un formato fijo. Vispectra infiere
la estructura a partir de los datos. Lo que empieza como un problema de
parsing se convierte, al formalizarlo, en un caso de inferencia
gramatical: la identificación de gramáticas a partir de presentaciones
positivas, demostrada imposible en el caso general por Gold (1967).
Vispectra no resuelve el problema general; lo restringe a un dominio
tratable mediante sesgos inductivos. Pero la conexión es real, y es lo
que hace que el proyecto sea más que un parser.

## Estado

Diseño y desarrollo temprano.

**Implementado:**
- Fase 00 — lectura y normalización
- Fase 01 — muestreo del tercio central
- Fase 09 — acumulador de diagnósticos
- Orquestador (`main.js`)
- Especificación completa del parser (R1–R95)
- Arquitectura del pipeline documentada

**En desarrollo:**
- Fases 02–08 del compilador

**Planificado:**
- Visualización
- UI híbrida (asignación de roles de columnas)
- Soporte para XRD, XPS, Raman, IR
- Internacionalización (español, inglés)

El compilador **aún no parsea archivos**. Esta sección se actualizará con
cada release.

## Uso

El compilador no está operativo todavía. Por ahora, el proyecto puede
explorarse leyendo la documentación en `docs/`.

## Estructura

```
src/
├── compilador/     Parser por fases (00–09)
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

- [Origen](docs/origen.md) — historia del diseño
- [Arquitectura](docs/arquitectura.md) — pipeline y contratos entre fases
- [Reglas](docs/reglas.md) — especificación del parser (R1–R95)
- [Roadmap](ROADMAP.md) — áreas de trabajo y releases previstos

## Referencias

- Gold, E. M. (1967). *Language identification in the limit*.
  Information and Control, 10(5), 447–474.

## Licencia

MIT. Ver [LICENSE](LICENSE).

## Autor

Edgar Ramón Hernández Castillo · [ORCID 0009-0006-4268-3323](https://orcid.org/0009-0006-4268-3323)
