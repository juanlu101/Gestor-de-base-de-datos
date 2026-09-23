# DatAula

Aplicación web para aprender bases de datos en 1º de Bachillerato: diseño de diagramas entidad-relación (notación de Chen), paso automático a tablas y gestor de bases de datos SQL que funciona dentro del navegador.

**Creada por Juan Luis Torralbo Muñoz.**

## Qué incluye

- **Diagrama E/R**: entidades (fuertes y débiles), relaciones (binarias, reflexivas, de grado 3 o más, de identificación), atributos clave, clave parcial, multivaluados, derivados y compuestos. Participaciones (mín, máx) y cardinalidad 1:1, 1:N, N:M. Deshacer y rehacer, zoom, guardado automático, exportación a PNG, SVG y JSON.
- **Paso a tablas**: genera el modelo relacional y el código `CREATE TABLE`, explicando cada decisión y avisando de los errores del diagrama.
- **Base de datos SQL**: motor SQLite (sql.js), cuatro bases de datos de ejemplo (Instituto, Biblioteca, Tienda y Empresa), carga de scripts `.sql` (con adaptación automática de volcados de MySQL y phpMyAdmin) y de archivos `.db`, errores explicados en español, historial y exportación a `.sql`, `.db` y CSV.
- **Chuleta SQL** con ejemplos que se ejecutan con un clic, y **Ayuda** con las reglas de transformación.

## Publicar en GitHub Pages

1. Crea un repositorio público en GitHub (por ejemplo, `dataula`).
2. Sube el contenido de esta carpeta respetando la estructura: `index.html`, `css/`, `js/` y `.nojekyll`. Desde la web: *Add file → Upload files* y arrastra las carpetas.
3. Ve a **Settings → Pages**.
4. En **Source** elige *Deploy from a branch*, rama `main`, carpeta `/ (root)`, y pulsa *Save*.
5. En un par de minutos estará disponible en `https://TU-USUARIO.github.io/dataula/`.

## Estructura

```
index.html
.nojekyll
css/styles.css
js/util.js            utilidades
js/examples.js        bases de datos y diagramas de ejemplo
js/er-editor.js       editor de diagramas E/R
js/er-transform.js    paso del modelo E/R al relacional y SQL
js/db.js              motor SQLite, adaptación de MySQL, exportación
js/code-editor.js     editor SQL con resaltado
js/cheatsheet.js      chuleta SQL y ayuda
js/app.js             lógica principal
js/lib/sql-wasm.js    sql.js 1.10.3 (licencia MIT)
js/lib/sql-wasm.wasm
```

## Notas

- No necesita servidor ni base de datos externa: todo se ejecuta en el navegador del alumno.
- El diagrama y la base de datos se guardan automáticamente en el navegador (localStorage). Para entregar trabajos o cambiar de equipo conviene descargarlos.
- Si se abre `index.html` con doble clic (sin publicarla), el navegador bloquea el archivo `.wasm` local y el motor se descarga de cdnjs, así que hace falta conexión a Internet. Publicada en GitHub Pages funciona sin depender de ningún servicio externo, salvo las fuentes tipográficas.

## Créditos

DatAula ha sido creada por **Juan Luis Torralbo Muñoz**. Motor SQL: [sql.js](https://github.com/sql-js/sql.js) (SQLite compilado a WebAssembly, licencia MIT).
