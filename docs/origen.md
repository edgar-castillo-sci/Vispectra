# Origen de Vispectra

## El problema

Todo empezó entre computadoras en un laboratorio. Curioseando entre los
archivos y el software instalado, me topé con algo que me pareció absurdo:
herramientas que se negaban a leer archivos que, a simple vista, eran
perfectamente comprensibles. Los datos estaban ahí, ordenados en columnas,
con sus números y sus separadores. Pero el software exigía un formato
específico, y si el archivo se desviaba aunque fuera un poco —una coma en
lugar de un punto, un tabulador en lugar de un espacio, una línea de
encabezado de más— la lectura fallaba.

Lo que para un humano era trivial, para la máquina era un muro.

## La cadena de preguntas

No hubo una primera solución ni algo como un `split` o un `float` que
diera luz sobre por qué el enfoque ingenuo no escala. Entonces surgió una
serie de preguntas encadenadas.

¿Y si en lugar de esperar un separador específico, cualquier carácter no
reservado pudiera ser un dato?
¿Y si todo lo ajeno al número fuera un carácter, y el número fuera lo que 
queda cuando se elimina lo ajeno? ¿Y si cada dato se pudiera describir 
por sus características decimales, por la presencia de puntos y comas?
¿Y cómo razonar un proceso que interprete esos datos sin que el humano 
le diga qué hacer?

Cuando terminé de darle forma a esa cadena, noté que había
descrito un compilador. Y no de los convencionales, sino uno que infiere su
propia gramática.

## La estructura del problema

El diseño no vino de golpe: al comparar líneas de un mismo archivo, las estructuras se repetían.
Diferían cuando faltaba un número, pero existía por lógica un patrón detrás del ruido.
De ahí surgió la **canonicalización**: si todas las filas representan el
mismo tipo de datos (mismo número de columnas, por ejemplo), 
sus estructuras internas deberían equivaler.

El **muestreo del tercio central** surgió de una intuición sobre la
estructura de los archivos espectrales. Si un archivo tiene un encabezado
al principio y residuos al final, entonces el centro es donde con mayor
probabilidad solo hay datos. Muestrear ahí, y no en los extremos, evita
contaminar el canon con texto que no es dato.

La **expansión desde el centro** fue una solución práctica. En lugar de
analizar todo el archivo de golpe para delimitar el cuerpo de datos,
expandir desde el centro hacia afuera mientras el canon se sostenga. Donde
falla, ahí está el borde. Sin complejidad programacional extra, y resuelve
el problema de separar preámbulo, cuerpo y residuo sin necesidad de
umbrales fijos.

El **elemento `i` como ancla** surgió de una observación más fina: hay
clases de datos que son equivalentes pero no idénticas. Una posición que
en una línea tiene un valor y en otra está vacía no es lo mismo que una
posición que siempre tiene valor, pero tampoco es una posición sin
sentido. `i` captura esa equivalencia parcial. Es un símbolo que dice
"aquí puede haber un valor, o no, y ambas cosas son válidas". Y al
hacerlo, ancla la fase de las secuencias de comas (decimal y separadora),
que de otro modo serían ambiguas.

En algún punto de este proceso caí en la cuenta de lo que estaba haciendo:
me estoy enseñando a enseñarle a una máquina de silicio cómo enseñarse a
comprender una gramática que no conoce y que nadie más que ella se va a
poder enseñar. Era eso o programar un parser para cada tipo de formato, y
seguiría aportando lo mismo que las decenas de lectores de formatos que ya
existen. Vispectra es mi primer proyecto de programación a largo plazo, y
mi primera aproximación seria al ecosistema JavaScript/HTML.

## De UV-Vis a espectroscopía

El diseño del compilador vino primero. La idea de que Vispectra no era
solo para UV-Vis vino después. Fue al mirar otros archivos espectrales
—XRD, XPS, Raman, IR— y notar que todos comparten las mismas
características: columnas de números, dialectos distintos según el
instrumento, encabezados variables, separadores mezclados.

El problema era de todos los formatos espectrales abiertos. Y el núcleo
del compilador, que ya era agnóstico de la técnica por diseño, podía
servir para todos ellos. Solo hacía falta añadir una capa de configuración
por técnica: rangos de validación, operaciones específicas, etiquetas de
ejes. Nada más.

## Visión

Vispectra aspira a ser un compilador de formatos espectroscópicos de
referencia. Una herramienta local, multiplataforma, sin servidor, sin
telemetría. Que lea archivos sucios de cualquier técnica y los convierta
en columnas limpias sin depender de internet (después de la primera vez)
ni de servicios externos.

Al construir Vispectra descubrí que el problema que estaba resolviendo
—un compilador que se enseña a leer por sí mismo— es un problema abierto
en teoría de la computación. Sin duda, los problemas más interesantes no
son los que ya tienen solución, sino los que te obligan a pensar de otra
manera.

## Sobre el autor

Soy estudiante de Química. Me gustan las matemáticas, la informática, y mi área de
interés es la fisicoquímica teórica con métodos computacionales. El
proyecto nació del contexto del LMAERPS, un laboratorio de investigación
en la DACB-UJAT, donde mis amigos usan muchísimo el espectrofotómetro de
UV-Vis y me llegaron a contar (y llegué a ver) lo tedioso que era trabajar con los softwares
disponibles.

Atribuyo la idea original a mi amigo Javier: diseñar un graficador que 
corriera en el teléfono. La pensé durante un tiempo, le di vueltas. 
El proyecto iba a ser un script en Python. Pero la misma curiosidad me 
llevó a descubrir que una aplicación web podía hacer todo lo que quería
sin instalación y sin dependencia de un sistema operativo.

Vispectra nace de esa combinación: la curiosidad, el contexto del
laboratorio, el rechazo a las herramientas privativas, y las ganas de
construir algo útil. Es un proyecto de autoaprendizaje en programación y
en las técnicas espectroscópicas mismas.
