# Origen de Vispectra

## El problema

Todo empezó en la computadora de un laboratorio. Curioseando entre los
archivos y el software instalado, me topé con algo que me pareció absurdo:
herramientas que se negaban a leer archivos que, a simple vista, eran
perfectamente comprensibles. Los datos estaban ahí, ordenados en columnas,
con sus números y sus separadores. Pero el software exigía un formato
específico, y si el archivo se desviaba aunque fuera un poco —una coma en
lugar de un punto, un tabulador en lugar de un espacio, una línea de
encabezado de más— la lectura fallaba.

Lo que para un humano era trivial, para la máquina era un muro.

## Las primeras soluciones

No hubo una primera solución. No hubo un `split` y un `float`, ni un
intento fallido que me enseñara por qué el enfoque ingenuo no escala.
Hubo una epifanía.

La idea inicial fue simple: **¿y si en lugar de esperar un separador
específico, cualquier carácter no reservado pudiera ser un dato?** De ahí
surgió la siguiente pregunta: **¿y si todo lo ajeno al número fuera un
carácter, y el número fuera lo que queda cuando se elimina lo ajeno?**
Después vino la representación: **¿y si cada dato se pudiera describir por
sus características decimales, por la presencia de puntos y comas?** Y
luego, el problema de verdad: **¿cómo razonar un proceso que interprete
esos datos sin que el humano le diga qué hacer?**

Cuando terminé de darle forma a esa cadena de preguntas, me di cuenta de
que acababa de describir un compilador. Y mejor aún: no un compilador
cualquiera, sino uno que **infiere su propia gramática**. No sabía cómo se
compilaba, pero ya sabía qué quería construir.

## El momento bisagra

El diseño no vino de golpe. Vino de analizar las diferencias entre filas.
Al comparar líneas de un mismo archivo, noté que las estructuras se
repetían, que había un patrón detrás del ruido. De ahí nació la idea de la
**canonicalización**: si todas las filas representan el mismo tipo de datos,
sus estructuras internas deberían de equivaler.

El **muestreo del tercio central** vino de una intuición y de muchas
revisiones. Si un archivo espectral tiene un encabezado al principio y
residuos al final, entonces el centro del archivo es donde con mayor
probabilidad solo hay datos. Muestrear ahí, y no en los extremos, evita
contaminar el canon con texto que no es dato.

La **expansión desde el centro** fue una solución práctica. En lugar de
analizar todo el archivo de golpe para delimitar el cuerpo de datos,
expandir desde el centro hacia afuera mientras el canon se sostenga. Donde
falla, ahí está el borde. Simple, sin complejidad programacional extra, y
resuelve el problema de separar preámbulo, cuerpo y residuo sin necesidad
de umbrales fijos.

El **elemento `i` como ancla** vino de una observación fina: hay clases de
datos que son equivalentes pero no idénticas. Una posición que en una
línea tiene un valor y en otra está vacía no es lo mismo que una posición
que siempre tiene valor, pero tampoco es una posición sin sentido. `i`
captura esa equivalencia parcial. Es un símbolo que dice "aquí puede haber
un valor, o no, y ambas cosas son válidas". Y al hacerlo, ancla la fase de
las secuencias de comas, que de otro modo serían ambiguas.

## De UV-Vis a espectroscopía

El diseño del compilador vino primero. La idea de que Vispectra no era solo
para UV-Vis vino después. Fue al mirar otros archivos espectrales —XRD,
XPS, Raman, IR— y notar que todos comparten las mismas características:
columnas de números, dialectos distintos según el instrumento, encabezados
variables, separadores mezclados.

El problema no era de UV-Vis. Era de **todos los formatos espectrales
abiertos**. Y el núcleo del compilador, que ya era agnóstico de la técnica
por diseño, podía servir para todos ellos. Solo hacía falta añadir una
capa de configuración por técnica: rangos de validación, operaciones
específicas, etiquetas de ejes. Nada más.

## Visión

Vispectra aspira a ser un compilador de formatos espectroscópicos de
referencia. Una herramienta local, multiplataforma, sin servidor, sin
telemetría. Que lea archivos sucios de cualquier técnica y los convierta
en columnas limpias. Que no dependa de internet ni de servicios externos.
Que sea útil para un laboratorio de investigación, para un estudiante, para
cualquiera que trabaje con espectros y esté cansado de pelear con el
software.

Y hay algo más. Al construir Vispectra descubrí que el problema que estaba
resolviendo —un compilador que se enseña a leer por sí mismo— es un
problema abierto en teoría de la computación. Eso me fascinó. No porque
espere resolverlo, sino porque me recordó que los problemas más
interesantes no son los que ya tienen solución, sino los que te obligan a
pensar de otra manera.

## Sobre el autor

Soy químico. Me gustan las matemáticas, la computación y la fisicoquímica
teórica. Descubrí el proyecto gracias a mis amigos del LMAERPS, un
laboratorio de investigación en la DACB-UJAT, que usaban muchísimo el
espectrofotómetro de UV-Vis y me contaban lo tedioso que era trabajar con
los softwares disponibles. Tantas iteraciones, tantos pasos engorrosos,
tanta fricción para algo que debería ser simple.

La idea original fue de mi amigo Javier: diseñar un graficador. La pensé
durante un tiempo, le di vueltas, y un día llegó la luz. El proyecto iba a
ser un script en Python. Pero la misma curiosidad que me llevó al UV-Vis
me llevó a HTML y JavaScript, y descubrí que una aplicación web podía
hacer todo lo que quería sin instalar nada, sin depender de un sistema
operativo, sin pedir permiso.

Vispectra nace de esa combinación: la curiosidad, el cariño por mis amigos
del laboratorio, el odio por las herramientas privativas, y las ganas de
construir algo útil para mi yo del futuro. Es un proyecto de
autoaprendizaje tanto en programación como en las técnicas espectroscópicas
mismas. Y es, sobre todo, una fascinación: la de construir algo
técnicamente interesante y, al mismo tiempo, genuinamente útil.
