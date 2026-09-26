# Arquitectura de Vispectra

## Visión general

Vispectra lee archivos UV-Vis sucios —con dialectos distintos, encabezados
variables, separadores mezclados— y los convierte en columnas numéricas
limpias, listas para graficar y publicar.

Lo hace en fases independientes, cada una con una responsabilidad clara,
comunicadas por contratos explícitos. El compilador no adivina: infiere
estructura, valida contra un contrato, y cuando no puede decidir, falla
con un diagnóstico claro en lugar de producir datos corruptos en silencio.

Todas las fases devuelven un objeto con nombre. Las fases que pueden
emitir diagnósticos los incluyen en su salida bajo la clave
`diagnosticos`. Las fases que no emiten nada (00_lectura, si no
detecta nada relevante; 08_codegen) también devuelven `diagnosticos`
por uniformidad, aunque sea un array vacío.

## Pipeline
| [Archivo]         | Producto                                |
| ---               | ---                                     |
| [00_lectura]      | texto normalizado                       |
| [01_muestreo]     | líneas + muestra                        |
| [02_lexer]        | estructura por línea + diagnósticos     |
| [03_ir]           | IR ensamblado                           |
| [04_canon]        | canon generalizado con i + diagnósticos |
| [05_fijacion]  | canon fijo + diagnósticos               |
| [06_parser]       | valores por línea + diagnósticos        |
| [07_semantica]    | valores verificados + diagnósticos      |
| [08_codegen]      | columnas llenas (mutación)              |
| [09_diagnostico]  | acumulador de diagnósticos              |
|                   | [Datos normalizados + diagnósticos]     |


`main.js` orquesta el pipeline. Cada fase es una función pura (excepto
`08_codegen`, que muta `columnas` por disciplina explícita) y devuelve
un objeto con nombre. Los diagnósticos se acumulan en `09_diagnostico`.

## Contratos por fase

### 00_lectura
- Función: leerArchivo(file)
- Entrada: File
- Salida: { texto: string, diagnosticos: [diag] }
- Hace: leer y normalizar.
- Diagnósticos posibles: BOM_DETECTADO (info).
- No hace: partir en líneas, filtrar, interpretar.

### 01_muestreo
- Función: muestrear(texto)
- Entrada: string
- Salida: { lineas, terciolineas, muestra, diagnosticos: [diag] }
- Hace: partir en líneas, calcular terciolineas, muestrear.
- Diagnósticos posibles: MUESTREO (info).
- No hace: limpiar caracteres, const

### 02_lexer

- **Función**: `lexear(linea)`
- **Entrada**: `string` (una línea cruda)
- **Salida**: `{ estructura: string, diagnosticos: [diag] }`
- **Hace**: eliminar dígitos y símbolos reservados, clasificar puntos y comas, emitir `estructura` con símbolos `n`, `c`, `,`.
- **No hace**: aplicar paridad, generalizar, interpretar valores, congelar.
- **Reglas**: R7–R28.

### 03_ir
- Función: construirIR(estructuras)
- Entrada: [{indice, estructura}]
- Salida: { porLinea, frecuencias, longitudes, diagnosticos: [diag] }
- Hace: agrupar y contar estructuras.
- Diagnósticos posibles: ESTRUCTURAS_HETEROGENEAS (warn) si todas las
  estructuras son distintas y no hay patrón claro.
- No hace: generalizar, interpretar, validar.

### 04_canon

- **Función**: `construirCanon(ir)`
- **Entrada**: IR
- **Salida**: `{ canon: string, diagnosticos: [diag] }`
- **Hace**: generalizar posiciones a `i` cuando hay `n` en alguna línea. Aplicar R44 (prohibiciones estructurales) a nivel canon.
- **No hace**: aplicar paridad, congelar, interpretar valores.
- **Reglas**: R29–R46.

### 05_fijacion

- **Funciones**: `fijarCanon(canon)`, `contarColumnas(canonFijo)`
- **Entrada**: `string` (canon generalizado)
- **Salida**: `{ canonFijo: [token], diagnosticos: [diag] }`
- **Hace**: aplicar paridad base (R24) y conversión `c,c,c` (R26), congelar el canon como array de tokens. `contarColumnas` cuenta los símbolos de valor (`n`, `c`, `i`) más 1.
- **No hace**: generalizar más, interpretar valores.
- **Reglas**: R24, R26, R78.

### 06_parser

- **Función**: `interpretarLinea(linea, canonFijo)`
- **Entrada**: `{indice, contenido}`, `[token]`
- **Salida**: `{ indice, ok, valores, diagnosticos }`
  - `valores`: `[number | null]`. Los `null` indican ausencia.
  - Si `ok: false`, `valores` no se usa.
- **Hace**: recorrer `canonFijo` y extraer valores de la línea según R48–R56. Clasificación local de comas (R57–R59) solo cuando el canon dice `i`.
- **No hace**: validar, inyectar 0, llenar columnas.
- **Reglas**: R1–R6, R48–R59.

### 07_semantica

- **Función**: `verificar(interpretada, canonFijo)`
- **Entrada**: `{indice, ok, valores}`, `[token]`
- **Salida**: `{ indice, ok, valores, diagnosticos }`
- **Hace**: validar que los valores cumplan el canon. Detectar R44 a nivel línea, R45, R46. Política de ambigüedad (R70–R74).
- **No hace**: interpretar, inyectar 0, llenar columnas.
- **Reglas**: R30, R31, R44–R46, R70–R74.

### 08_codegen

- **Funciones**: `crearColumnas(numColumn)`, `inyectar(valores, columnas)`
- **Entrada**: `numColumn` (número de columnas); `[number | null]`, `[[number]]`
- **Salida**: `columnas` (mutadas). `inyectar` no devuelve nada.
- **Hace**: crear las columnas vacías. Convertir `null` a 0. Avanzar el índice de columna solo cuando se produce un valor.
- **No hace**: interpretar, validar.
- **Reglas**: R31, R52–R56.
- **Contrato de mutación**: esta fase es la **única** que muta `columnas`. Su contrato es: recibe valores verificados, los inyecta, no devuelve nada. Ninguna otra fase toca `columnas`.

### 09_diagnostico

- **Función**: `crearLog()`
- **Entrada**: diagnósticos `{severity, code, params}`
- **Salida**: acumulador con `agregar(d)`, `todos()`, `porSeveridad(s)`, `hayErrores()`
- **Hace**: acumular diagnósticos. No traduce, no formatea, no muestra.
- **No hace**: decidir la lógica de parsing, modificar datos.
- **Reglas**: R60–R69 (definen qué diagnósticos se emiten, no cómo se acumulan).

## Estructura del acumulador de diagnósticos
```js
// 09_diagnostico.js
export function crearLog() {
  const entradas = [];
  return {
    agregar(d) { entradas.push(d); },
    todos() { return entradas; },
    porSeveridad(s) { return entradas.filter(e => e.severity === s); },
    hayErrores() { return entradas.some(e => e.severity === 'error'); },
  };
}
```

Cada diagnóstico tiene la forma:

```js
{
  severity: 'info' | 'warn' | 'error',
  code: 'MIXED_NOTATION',
  params: { linea: 47, columna: 2, valor: '0,7' }
}
```

El compilador nunca emite strings localizados. Emite códigos estables y
parámetros. La traducción a texto humano ocurre en la capa de UI, vía
`i18n.js` y `locales/`.

## Capas fuera del compilador
### main.js
Orquesta el pipeline. No implementa lógica. Recoge los diagnósticos de cada
fase y los acumula en el log. Guarda los resultados intermedios en variables
sueltas (no en un objeto de estado global).

### ui.js
Captura archivos, llama a main.js, muestra resultados. Implementa la capa
híbrida (R80–R83): cuando el compilador detecta más de 2 columnas, la UI
pregunta al usuario qué significa cada una. Esta capa no vive dentro del
compilador; consume sus resultados y actúa.

### i18n.js
Traduce códigos de diagnóstico a strings localizados. Consume
`locales/{es,en}.js`. No vive en el compilador. El idioma base es es.

### plot.js
Grafica las columnas normalizadas. Consume columnas y, si la UI asignó
roles, los usa para etiquetar ejes y series.

## Invariantes del sistema
El punto es siempre decimal, nunca separador de columna.

La coma es el único carácter que puede ser valor o estructura.

El número de comas es constante entre líneas de un mismo archivo.

El canon se fija después de `04_canon` y no cambia durante el parsing.

Cada símbolo del canon consume exactamente un token, un separador, o nada
(solo i vacío).

Los diagnósticos son códigos + parámetros, nunca strings localizados.

Solo `08_codegen` muta columnas.

## Decisiones de diseño
### ¿Por qué un pipeline de fases?
Cada fase es testeable por separado. Los errores se localizan en la fase que
los produce. El pegamento entre fases vive en `main.js` y es trivial.

### ¿Por qué el canon se fija?
Para que el parser sea determinista. Un canon que cambia entre líneas es
impredecible y propenso a errores silenciosos. La fase de generalización
(04_canon) corre sobre la muestra; una vez fijada, se aplica a todas las
líneas.

### ¿Por qué `i` como ancla?
Porque la paridad global no basta cuando hay slots vacíos o runs con fase
ambigua. `i` fija la fase localmente: la coma adyacente a un i es
separadora por definición, y de ahí se propaga la paridad.

### ¿Por qué códigos de diagnóstico en lugar de strings?
Para que el compilador sea agnóstico de idioma. La UI traduce. Añadir un
idioma es añadir un archivo en `locales/`, no tocar el núcleo.

### ¿Por qué mutar columnas en lugar de devolver nuevas?
Eficiencia y simplicidad. Mutar un array de arrays es O(1) por línea;
devolver nuevos es O(n) por línea. La disciplina está en que solo
`08_codegen` muta. Documentado en el contrato de la fase.

### ¿Por qué el log es un acumulador inyectado y no un estado global?
Las fases son puras: reciben entrada, devuelven salida. Los diagnósticos van
en la salida (diagnosticos: [...]). main.js los acumula. Así una fase se
puede testear sin construir un log, y el log no contamina el contrato.

### ¿Por qué nombres en español para funciones y variables?
El flujo mental del proyecto es en español. Los nombres de archivo siguen
convenciones técnicas (`06_parser.js`, `07_semantica.js`) pero el código
interno se lee como español: interpretarLinea, verificar, inyectar,
canonFijo.

### ¿Por qué no notación de miles?
Fuera de alcance (R84). Se puede añadir como capa previa si hace falta.
Rompe el conteo de comas y requiere una fase de normalización antes del
lexer.

Fuera de alcance
R84: notación de miles (1.234,56).

R85: valores faltantes literales (NaN, ---, >3.0).

R86: filas partidas en varias líneas.

R87: unidades pegadas a números (250nm).

R88: comentarios al final de línea.