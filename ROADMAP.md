# Roadmap de Vispectra

## Visión

Convertir Vispectra en un compilador de formatos espectroscópicos de
referencia: una herramienta local, multiplataforma, que lea archivos
sucios de cualquier técnica y los convierta en columnas limpias, sin
depender de servidores ni de servicios externos.

El núcleo del compilador es agnóstico de la técnica. UV-Vis es tan solo
 la primera implementación, no el límite del proyecto.

## Estado actual

Última actualización: 2026-09-30.

- **Implementado**: fases 00 (lectura), 01 (muestreo), 09 (diagnóstico),
  orquestador (`main.js`), especificación completa (R1–R95), arquitectura
  documentada.
- **En desarrollo**: fases 02–08 del compilador.
- **No operativo**: Vispectra aún no parsea archivos.

## Cómo leer este roadmap

Este roadmap está organizado por **áreas temáticas**, no por versiones
lineales. Cada área agrupa un conjunto de trabajo relacionado y tiene su
propia checklist.

El autor puede trabajar en varias áreas en paralelo según la motivación o
la necesidad. No hay un orden estricto entre áreas. Las dependencias se
indican explícitamente cuando existen: por ejemplo, la visualización
editorial asume que la visualización básica funciona.

Las **versiones públicas** (`v0.1`, `v0.2`, ...) se publican cuando un
conjunto coherente de funcionalidades está listo, aunque otras áreas
sigan en exploración. No marcan fases internas de desarrollo; marcan
releases de GitHub y archivos de Zenodo.

Las tallas de esfuerzo son orientativas:

- **Pequeño**: días de trabajo.
- **Mediano**: semanas de trabajo.
- **Grande**: meses de trabajo.

No hay fechas. Los hitos se completan cuando están listos.

## Áreas de trabajo

### Área 1 — Núcleo del compilador
**Esfuerzo: grande**

El objetivo es que el pipeline funcione de punta a punta con archivos
UV-Vis simples, y que aguante archivos sucios.

**Pipeline básico:**
- [x] Fase 00 — lectura y normalización
- [x] Fase 01 — muestreo aleatorio del tercio central
- [x] Fase 09 — acumulador de diagnósticos
- [x] Orquestador (`main.js`)
- [ ] Fase 02 — lexer (clasificación de puntos y comas)
- [ ] Fase 03 — IR (representación intermedia)
- [ ] Fase 04 — canon (inferencia + expansión desde el centro)
- [ ] Fase 05 — fijación (paridad, conversión `c,c,c`)
- [ ] Fase 06 — parser maestro (interpretación de líneas)
- [ ] Fase 07 — semántica (verificación)
- [ ] Fase 08 — codegen (columnas limpias)

**Robustez:**
- [ ] Soporte de preámbulo y residuo (cuerpo de datos delimitado)
- [ ] Soporte de runs de comas con `i` como ancla
- [ ] Soporte de slots vacíos
- [ ] Diagnósticos completos (códigos R60–R69)

**Validación:**
- [ ] Tests del pipeline completo
- [ ] Tests con casos: americano puro, europeo, mixto, run, slot vacío
- [ ] Primer archivo UV-Vis parseado correctamente
- [ ] Documentación de casos límite en `docs/ejemplos.md`

**Criterio de cierre del área**: el parser maneja los cinco casos de
prueba documentados sin intervención manual, con archivos UV-Vis reales.

### Área 2 — UI y visualización
**Esfuerzo: grande**

El objetivo es que el usuario pueda interactuar con Vispectra sin tocar
la consola, ver sus espectros y exportarlos.

**UI mínima:**
- [ ] Zona de drop funcional
- [ ] Procesamiento de archivos múltiples
- [ ] Panel de resultados: columnas detectadas, canon, diagnósticos
- [ ] Manejo de errores visible para el usuario

**Visualización básica** *(depende de UI mínima)*:
- [ ] `plot.js` funcional con Canvas o SVG
- [ ] Ejes etiquetados con nombres genéricos (`columna 0`, `columna 1`)
- [ ] Zoom y paneo básico
- [ ] Exportación a PNG (resolución de pantalla)

**UI híbrida** *(depende de visualización básica)*:
- [ ] Detección de más de 2 columnas
- [ ] Modal de asignación de roles (longitud de onda, absorbancia, etc.)
- [ ] Operaciones básicas: normalización, suavizado
- [ ] Modo estricto / permisivo para diagnósticos

**Visualización editorial** *(depende de UI híbrida; esfuerzo: grande)*:
- [ ] Tipografía y colores configurables
- [ ] Exportación a SVG y PDF vectorial
- [ ] Anotaciones (picos, etiquetas, regiones)
- [ ] Múltiples espectros superpuestos
- [ ] Plantillas de estilo (paper, presentación, tesis)

**Criterio de cierre del área**: un gráfico exportado es aceptable para
una publicación científica sin retoques externos, y el usuario puede
asignar roles a las columnas desde la interfaz.

### Área 3 — Específico de técnica
**Esfuerzo: grande**

El objetivo es que UV-Vis esté completamente pulido, y luego extender el
compilador a otras técnicas sin reescribir el núcleo.

**UV-Vis pulido:**
- [ ] Validación de rangos UV-Vis (190–1100 nm, absorbancia 0–4)
- [ ] Operaciones típicas: línea base, suavizado, detección de picos
- [ ] Exportación a CSV limpio
- [ ] Validación con archivos de instrumentos reales (distintas marcas)
- [ ] Documentación de limitaciones específicas de UV-Vis

**Multi-técnica** *(depende de UV-Vis pulido; esfuerzo: grande)*:
- [ ] Capa de configuración por técnica
- [ ] XRD: rangos propios (2θ, intensidad)
- [ ] Raman: rangos propios (número de onda, intensidad)
- [ ] IR: rangos propios
- [ ] XPS: rangos propios (energía de binding)

**Criterio de cierre del área**: Vispectra maneja UV-Vis de forma completa
y confiable, y al menos dos técnicas distintas se parsean y visualizan
con la misma arquitectura.

### Área 4 — Infraestructura
**Esfuerzo: mediano**

El objetivo es que Vispectra sea usable por terceros, citable y
documentado.

**Internacionalización:**
- [ ] `locales/es.js` completo (todos los códigos de diagnóstico)
- [ ] `locales/en.js` completo
- [ ] Detección automática de idioma del navegador
- [ ] Selector manual de idioma en la UI

**API y exportación:**
- [ ] API pública documentada
- [ ] Exportación a formatos estándar (CSV limpio, JSON)

**Documentación:**
- [ ] Documentación completa para usuarios finales
- [ ] `docs/origen.md` (historia del diseño)
- [ ] Tests de regresión

**Publicación:**
- [ ] Primer release en GitHub (`v0.1.0`)
- [ ] DOI de Zenodo (embargo)
- [ ] DOI conceptual actualizado en README y `package.json`
- [ ] Versión estable `v1.0.0` publicada en Zenodo sin embargo

**Criterio de cierre del área**: Vispectra es usable por terceros sin
asistencia del autor, con documentación completa y DOI citable.

## Releases públicos

Las versiones se publican cuando un conjunto coherente de funcionalidades
está listo. La numeración sigue [SemVer](https://semver.org/lang/es/).

Releases previstos:

| Versión | Contenido mínimo | Áreas involucradas |
| --- | --- | --- |
| `v0.1.0` | Pipeline completo, UV-Vis simple parseado | Área 1 (parcial) |
| `v0.2.0` | Robustez del parser, casos sucios | Área 1 (completa) |
| `v0.3.0` | UI mínima, i18n español | Área 2 (parcial), Área 4 (parcial) |
| `v0.4.0` | Visualización básica | Área 2 (parcial) |
| `v0.5.0` | UI híbrida | Área 2 (parcial) |
| `v0.6.0` | UV-Vis pulido | Área 3 (parcial) |
| `v0.7.0` | i18n completo | Área 4 (parcial) |
| `v1.0.0` | UV-Vis estable, API pública, DOI | Todas las áreas |
| `v2.0.0` | Visualización editorial | Área 2 (completa) |
| `v3.0.0` | Multi-técnica | Área 3 (completa) |

Los releases son **cortes en el tiempo**, no fases de desarrollo. Un
release puede publicarse aunque algunas áreas sigan en exploración.

## Fuera de alcance (por ahora)

- Notación de miles (`1.234,56`).
- Valores faltantes literales (`NaN`, `---`, `>3.0`).
- Filas partidas en varias líneas.
- Unidades pegadas a números (`250nm`).
- Comentarios al final de línea.
- Procesamiento de datasets masivos (>1M puntos).
- Versión de escritorio con procesamiento nativo.

Estos puntos pueden añadirse en versiones posteriores si la demanda lo
justifica. No están descartados.

## Publicación y DOI

El DOI de Zenodo en vez de un hito, es un trámite que se realiza en el primer
release de GitHub (`v0.1.0`). Una vez obtenido:

- Se añade la sección "Cómo citar" al `README.md`.
- Se actualiza el `package.json` con el DOI.
- Se documenta en `docs/origen.md`.

El DOI conceptual de Zenodo siempre apuntará a la última versión
publicada. Los DOI de versión específicos se generan con cada release.

## Cómo seguir el progreso

- **Issues de GitHub**: cada ítem de las áreas se desglosa en issues.
- **Milestones de GitHub**: cada release tiene su milestone asociado.
- **Releases**: cada versión se publica como release etiquetado.
- **Zenodo**: cada release se archiva automáticamente vía la integración
  con GitHub, generando un DOI de versión.

## Notas sobre el alcance

Vispectra es un proyecto de un solo autor en desarrollo activo. Los hitos
no tienen fechas asignadas. La prioridad es la calidad del compilador, no
 la velocidad de entrega.

El autor puede trabajar en varias áreas en paralelo. El roadmap solo describe
hacia dónde va el proyecto..
