![Status](https://img.shields.io/badge/status-alpha-orange)
![License](https://img.shields.io/badge/license-MIT-blue)

# Vispectra

Un compilador y visualizador de espectros UV-Vis que corre en el navegador.

## Qué es

Vispectra lee archivos de espectroscopía UV-Vis tal como salen del instrumento
—sucios, con dialectos distintos, con encabezados variables— y los convierte
en columnas numéricas limpias, listas para graficar y publicar.

No es otro lector de espectros. Es un compilador que aprende a leerlos.

## Por qué existe

Los archivos de espectroscopía UV-Vis son un caos silencioso. Cada instrumento,
cada software, cada versión, exporta con su propio dialecto: coma o punto
decimal, tabulador o espacio, encabezados de una, dos o tres líneas, valores
faltantes disfrazados de separadores.

La mayoría de las herramientas asumen que el archivo ya está limpio. Vispectra
parte de la premisa opuesta: el archivo es la fuente de verdad, y el parser
debe aprender a leerlo.

## Estado

Alpha. En desarrollo activo. La estructura está definida, la especificación
completa, y la implementación está en curso.

## Estructura
src/
├── compilador/ Parser por fases (lexer, canon, parser maestro)
├── i18n.js Internacionalización
├── main.js Orquestador
├── plot.js Graficador
└── ui.js Interfaz
## Documentación

- [Reglas del parser](docs/reglas.md)
- [Arquitectura](docs/arquitectura.md)
- [Ejemplos](docs/ejemplos.md)

## Licencia

MIT. Ver [LICENSE](LICENSE).
