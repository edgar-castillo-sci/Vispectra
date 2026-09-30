# Reglas de Vispectra

## 1. Tokens y números

- **R1.** Todo token numérico se parsea como real. No se distingue "entero" de "decimal" como tipos separados.
- **R2.** Sintaxis de `token_n`: `[+-]? dígitos ( '.' dígitos? )? ( [eE] [+-]? dígitos )?`
- **R3.** Sintaxis de `token_c`: `[+-]? dígitos ( ',' dígitos? )? ( [eE] [+-]? dígitos )?`
- **R4.** `token_c` consume la coma solo si va seguida de dígitos.
- **R5.** El punto es siempre decimal, nunca separador de columna.
- **R6.** La notación científica se trata como unidad indivisible.

## 2. Construcción de `estructura_interna`

- **R7.** Se eliminan dígitos, `e`, `E`, `+`, `-`, y letras. No se eliminan espacios ni tabs.
- **R8.** Los caracteres restantes se concatenan en `caracteres`.
- **R9.** La lectura es de izquierda a derecha, índice por índice.
- **R10.** `fei` = último carácter emitido a `estructura_interna`.
- **R11.** `sc` = siguiente carácter en `caracteres` después del actual.

## 3. Reglas del punto

- **R12.** Si el carácter es `.` y `fei ∈ tipos_num` → log + error (falta separador entre dos valores).
- **R13.** Si el carácter es `.` y `fei ∉ tipos_num` o es null → concatenar `n` a `estructura_interna`.
- **R14.** Secuencia pura de puntos `.....` → se puede leer con el algoritmo de paridad, pero con advertencia severa.
- **R15.** Secuencia `..` dentro de otra secuencia (`..$.%..#.`) → error (implica número con dos decimales).
- **R16.** Puntos separados por otros caracteres (`. .$./;.`) → no pasa nada, son puntos independientes.

## 4. Reglas de la coma

- **R17.** Si `fei ∈ tipos_num` → la coma es separadora de columna. Concatenar `,`. Avanzar `i += 1`.
- **R18.** Si (`fei = ,` o null) y (`sc = ,` o null) → run detection.
- **R19.** Si `fei = ,` y `sc ∉ {,, null}` → cierre de run: separador de columna. Concatenar `,`. Avanzar `i += 1`.
- **R20.** Si `fei = ,` y (`sc = null` o (`sc ≠ ,` y `sc ≠ .`)) → coma decimal. Concatenar `c`. Avanzar `i += 1`.
- **R21.** Las ramas de la coma deben estar al mismo nivel, no anidadas.
- **R22.** La coma es el único carácter que puede ser valor o estructura.

## 5. Run detection y paridad

- **R23.** Un run de `L` comas se captura en `comas`. (La paridad se aplica en `05_fijacion`.)
- **R24.** Paridad base: índices pares (0,2,4…) → `c`; impares (1,3,5…) → `,`. **(Se aplica en `05_fijacion.js`, no en `02_lexer.js`.)**
- **R25.** Esta paridad asume que el run empieza con decimal. Si empieza con separador, el parser maestro lo detecta.
- **R26.** La conversión `c,c,c` ocurre solo después de que aparecieron todas las `i` y todas las `n`. **(Se aplica en `05_fijacion.js`.)**
- **R27.** Las comas son invariantes entre líneas, independientemente de la presencia de `i` o `n`. Solo se redefine su uso.
- **R28.** Alrededor de `n` e `i`, solo puede haber separadores de columna. Recursivamente, las comas laterales se vuelven columnares.

## 6. Reglas de `i` (ancla)

- **R29.** `i` = posición que admite: nada, entero sin decimal, o `n`. **No admite `c`.**
- **R30.** `i` es una posición en canon, no un valor. Aunque esté vacío, sigue siendo ancla.
- **R31.** Si `i` no tiene valor → se inyecta 0 a la columna correspondiente. **(Detección en `07_semantica.js`, inyección en `08_codegen.js`.)**
- **R32.** `i` corta la run de comas. La run se divide en fragmentos alrededor de cada `i`.
- **R33.** Cada fragmento se analiza con paridad local desde el ancla del `i`.
- **R34.** La coma adyacente a `i` es separadora por definición.
- **R35.** En `,,i,...`:
  - Si precedido por `n` o `i`: ambas comas son separadoras, con slot (entero o vacío → 0).
  - Si `,` es el carácter inicial: la primera coma se asume decimal (forma `c`), la segunda es separadora (anclada por `i`).
- **R36.** Múltiples `i` en una run: cada uno ancla localmente. El fragmento entre dos `i` se analiza desde ambos bordes.

## 7. Generalización del diccionario

- **R37.** Se mantiene un diccionario de claves canónicas vistas.
- **R38.** Si llega una clave nueva que difiere en una posición donde hay un `n` (o un valor), esa posición se promueve a `i`.
- **R39.** Criterio de promoción: basta una línea con `n` en esa posición para promover a `i`. No hay otra condición.
- **R40.** `i` valida tanto la versión con valor como la versión sin valor.
- **R41.** Ejemplo: `,,,,,` + `,n,,,,` → `,i,,,,`.
- **R42.** Ejemplo: `n;n,,,,,n` + `n;n,,n,,,n` → `n;n,,i,,,n`.
- **R43.** Si aparece otra clave que generaliza más, se actualiza el canon.

## 8. Prohibiciones estructurales

- **R44.** `in`, `cn`, `ci`, `ic` → error inmediato. **Detección en canon: `04_canon.js`. Detección a nivel línea: `07_semantica.js`.**
- **R45.** Entre dos símbolos de valor (`n`, `c`, `i`) siempre debe haber al menos un separador.
- **R46.** Número de comas variable o distinto entre líneas → error. **(Fusiona las antiguas R46 y R47.)**

## 9. Parser maestro

- **R48.** `canon` le indica al parser qué buscar y en qué orden, de izquierda a derecha.
- **R49.** `n` → busca float con punto decimal.
- **R50.** `c` → busca float con coma decimal y lo convierte a punto.
- **R51.** `c` + encuentra coma → error por conflicto con algoritmo `c,c,c`.
- **R52.** `c` + encuentra separador distinto de `,` → **detecta ausencia y devuelve `null`**. (La inyección de 0 es en `08_codegen.js`.)
- **R53.** `i` → busca entero, `n`, o nada. Si nada → **devuelve `null`**. (La inyección de 0 es en `08_codegen.js`.)
- **R54.** Separador → lo consume. Si el siguiente símbolo de canon también es separador → **devuelve `null` en la columna intermedia**. (La inyección de 0 es en `08_codegen.js`.)
- **R55.** El índice de columna avanza solo cuando se produce un valor, no con cada símbolo de canon.
- **R56.** Cada símbolo de canon consume **un token, un separador, o nada (solo `i` vacío)**.

## 10. Clasificación local de comas (en parser maestro)

- **Precedencia:** el canon manda. Cuando el canon dice `c` o `,`, el parser obedece al canon y valida. Si la línea no cuadra → error (R63). R57–R59 se usan **solo cuando el canon dice `i`**, para decidir si ese `i` se resuelve como `n`, entero o vacío.
- **R57.** Para cada coma en la línea original: si está entre dígitos → decimal; si no → separadora.
- **R58.** Esta clasificación es local y directa. No necesita paridad ni fase.
- **R59.** El parser maestro tiene la línea original, así que puede aplicarla.

## 11. Errores y logs

- **R60.** Error si `fei ∈ tipos_num` y llega un punto (R12).
- **R61.** Error si aparece `in`, `cn`, `ci`, `ic` (R44).
- **R62.** Error si el número de comas varía entre líneas (R46).
- **R63.** Error si el canon no se cumple en una línea.
- **R64.** Error si hay `..` dentro de otra secuencia (R15).
- **R65.** Advertencia severa si hay secuencia pura de puntos `......`.
- **R66.** Log al detectar secuencia de comas continuas, explicando el algoritmo de paridad.
- **R67.** Log si los separadores varían entre filas pero el número es consistente.
- **R68.** Log de error de sintaxis con recomendación de normalizar cuando hay ambigüedad.
- **R69.** Recomendación explícita de normalizar el archivo antes de operar.

## 12. Política de ambigüedad

- **R70.** No adivinar en silencio.
- **R71.** Si hay mezcla de notaciones → alertar, mostrar interpretación usada, recomendar normalizar.
- **R72.** Modo estricto (aborta) y modo permisivo (parsea, marca sospechosas).
- **R73.** Si la ambigüedad persiste → error o consulta al usuario.
- **R74.** Degradación a intervención del usuario en versiones futuras para desambiguación de `c`.

## 13. Muestreo, expansión y fijación

- **R75.** `terciolineas = numlineas / 3`, redondeado hacia arriba.
- **R76.** Si `numlineas < 3` → `terciolineas = numlineas`.
- **R77.** Muestreo aleatorio de `terciolineas` líneas dentro del tercio central `[terciolineas, 2*terciolineas)`. Los tercios extremos se reservan: el primero como preámbulo, el último como residuo.
- **R78.** Fijación del canon **después de la generalización y la expansión (`04_canon`)**. El canon no cambia durante el parsing.
- **R79.** El `rng` del muestreo es inyectable para permitir tests reproducibles sin sacrificar aleatoriedad en producción.

## 14. Expansión desde el centro

- **R89.** El canon tentativo se construye a partir de las líneas del tercio central.
- **R90.** El canon se expande desde el centro hacia afuera: se evalúan las líneas inmediatamente anteriores y posteriores al tercio central. Si son compatibles con el canon, se incorporan y la expansión continúa. Si no, se detiene en ese lado.
- **R91.** La expansión usa `lexear` para obtener la estructura de cada línea y verifica compatibilidad estructural contra el canon tentativo. No invoca `06_parser`, para no crear dependencia hacia adelante.
- **R92.** El cuerpo de datos es la región contigua `[inicio, fin]` donde el canon se sostiene. Las líneas fuera de ese rango son preámbulo (antes) o residuo (después).
- **R93.** Los fallos del canon en el tercio central son error (`DIVERGENCIA_CENTRAL`). Los fallos en los extremos definen el borde del cuerpo (`PREAMBULO_DETECTADO`, `RESIDUO_DETECTADO`).
- **R94.** Si el cuerpo de datos resultante es demasiado pequeño (por ejemplo, menos de `terciolineas` líneas), se emite `LIMITACION_CUERPO_DATOS` (warn).
- **R95.** Las cotas de expansión avanzan simétricamente: `cota_inferior -= 1` baja hacia 0, `cota_superior += 1` sube hacia `numlineas`. La expansión se detiene cuando alguna cota falla (o cuando ambas fallan, según configuración).

## 15. UI híbrida (futuro)

- **R80.** Si se detectan más de 2 columnas, la UI pregunta al usuario qué significa cada una.
- **R81.** Roles posibles: longitud de onda, absorbancia, transmitancia, absorbancia adicional, otro parámetro, ignorar.
- **R82.** Según la respuesta, el parser aplica operaciones correspondientes.
- **R83.** Ni automatización absoluta ni control absoluto: el parser deduce lo que puede, pregunta cuando no.

**(R80–R83 viven en `10_ui.js` o en `src/ui/`, no dentro del compilador.)**

## 16. Fuera de alcance

- **R84.** Notación de miles (`1.234,56`).
- **R85.** Valores faltantes literales (`NaN`, `---`, `>3.0`).
- **R86.** Filas partidas en varias líneas.
- **R87.** Unidades pegadas a números (`250nm`).
- **R88.** Comentarios al final de línea.

---

## Correcciones aplicadas respecto a la primera versión

| Regla | Cambio |
|---|---|
| R24 | Movida a `05_fijacion.js`. |
| R26 | Movida a `05_fijacion.js`. |
| R31 | Detección en `07`, inyección en `08`. |
| R44 | Doble: canon en `04`, línea en `07`. |
| R46 y R47 | Fusionadas en R46. |
| R56 | Añadido "o nada (solo `i` vacío)". |
| R57–R59 | Precedencia: canon manda; R57–R59 solo para `i`. |
| R52–R54 | Detección en `06`, inyección en `08`. |
| R78 | "Después de la generalización y la expansión", no del muestreo. |
| R80–R83 | Asignadas a UI (`10_ui.js` o `src/ui/`). |

## Correcciones aplicadas respecto a la segunda versión

| Regla | Cambio |
|---|---|
| R23, R24, R26 | `05_congelacion` → `05_fijacion`. |
| R77 | Reescrita: muestreo aleatorio del tercio central, no del inferior. |
| R78 | Reescrita: fijación después de generalización y expansión. |
| R79 | Reescrita: `rng` inyectable. |
| R89–R95 | Añadidas: expansión desde el centro, cuerpo de datos, cotas simétricas. |
| Sección 13 | Renombrada de "Muestreo y congelación" a "Muestreo, expansión y fijación". |
| Sección 14 | Nueva: "Expansión desde el centro". |
| Sección 15 | Renumerada (antes era 14). |
| Sección 16 | Renumerada (antes era 15). |
