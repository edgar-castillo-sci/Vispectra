# Ejemplos

Casos de prueba trabajados para el parser de Vispectra.

**Estado:** pendiente de implementación. Este documento se completará
cuando las fases 02–08 del compilador estén operativas y se puedan
validar los casos contra el código real.

## Casos previstos

- Americano puro (`200.0,0.5`)
- Europeo puro (`200;0,5`)
- Mixto americano-europeo (`0.5,0,6,0,7`)
- Slot vacío (`200,,0.5`)
- Run de comas con `i` como ancla
- Preámbulo y residuo (cuerpo de datos delimitado)

Cada caso incluirá:

- **Entrada**: el fragmento del archivo.
- **Estructura interna**: lo que produce `02_lexer`.
- **Canon**: lo que infiere `04_canon`.
- **Cuerpo**: `{inicio, fin}` del bloque de datos.
- **Columnas**: el resultado final.
