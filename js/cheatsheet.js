/* SGBD: chuleta SQL y ayuda. Creada por Juan Luis Torralbo Muñoz. */
(function () {
  'use strict';

  const CHEAT = [
    { id: 'select', title: 'Consultar datos', items: [
      { d: 'Todas las columnas y filas de una tabla.', s: 'SELECT *\nFROM alumnos;' },
      { d: 'Solo algunas columnas, con un alias para el título.', s: 'SELECT nombre, apellidos AS "Apellidos del alumno"\nFROM alumnos;' },
      { d: 'Valores sin repetir con DISTINCT.', s: 'SELECT DISTINCT localidad\nFROM alumnos;' },
      { d: 'Columnas calculadas: el salario anual en 14 pagas.', s: 'SELECT nombre, salario, salario * 14 AS salario_anual\nFROM profesores;' }
    ] },
    { id: 'where', title: 'Filtrar filas (WHERE)', items: [
      { d: 'Comparaciones: =, <> (distinto), <, >, <=, >=.', s: "SELECT nombre, apellidos\nFROM alumnos\nWHERE localidad = 'Sevilla';" },
      { d: 'Varias condiciones con AND y OR (usa paréntesis para agrupar).', s: "SELECT *\nFROM asignaturas\nWHERE tipo = 'Troncal' AND horas_semana >= 4;" },
      { d: 'Un rango con BETWEEN (incluye los extremos).', s: 'SELECT nia, cod_asig, nota\nFROM matriculas\nWHERE nota BETWEEN 5 AND 7;' },
      { d: 'Una lista de valores con IN.', s: "SELECT nombre, localidad\nFROM alumnos\nWHERE localidad IN ('Málaga', 'Cádiz', 'Huelva');" },
      { d: 'Patrones con LIKE: % son varios caracteres y _ uno solo.', s: "SELECT nombre, apellidos\nFROM alumnos\nWHERE apellidos LIKE '%ez%';" },
      { d: 'Valores vacíos: se comparan con IS NULL, nunca con = NULL.', s: 'SELECT nombre, apellidos\nFROM alumnos\nWHERE email IS NULL;' }
    ] },
    { id: 'order', title: 'Ordenar y limitar', items: [
      { d: 'Ordenar de mayor a menor con DESC (ASC es el orden por defecto).', s: 'SELECT nombre, salario\nFROM profesores\nORDER BY salario DESC;' },
      { d: 'Ordenar por varias columnas.', s: 'SELECT apellidos, nombre, id_curso\nFROM alumnos\nORDER BY id_curso, apellidos;' },
      { d: 'Quedarse con las primeras filas con LIMIT.', s: 'SELECT nia, cod_asig, nota\nFROM matriculas\nORDER BY nota DESC\nLIMIT 5;' }
    ] },
    { id: 'agg', title: 'Funciones de agregado', items: [
      { d: 'Contar filas con COUNT.', s: 'SELECT COUNT(*) AS total_alumnos\nFROM alumnos;' },
      { d: 'Media, máximo y mínimo. ROUND redondea los decimales.', s: 'SELECT ROUND(AVG(nota), 2) AS media,\n       MAX(nota) AS maxima,\n       MIN(nota) AS minima\nFROM matriculas;' },
      { d: 'COUNT(columna) no cuenta los NULL; COUNT(*) sí.', s: 'SELECT COUNT(*) AS filas, COUNT(email) AS con_email\nFROM alumnos;' },
      { d: 'Sumar valores con SUM.', s: 'SELECT SUM(horas_semana) AS horas_totales\nFROM asignaturas;' }
    ] },
    { id: 'group', title: 'Agrupar (GROUP BY y HAVING)', items: [
      { d: 'Un resultado por cada grupo: número de alumnos por localidad.', s: 'SELECT localidad, COUNT(*) AS alumnos\nFROM alumnos\nGROUP BY localidad\nORDER BY alumnos DESC;' },
      { d: 'Nota media de cada asignatura.', s: 'SELECT cod_asig, ROUND(AVG(nota), 2) AS media\nFROM matriculas\nGROUP BY cod_asig;' },
      { d: 'HAVING filtra grupos (WHERE filtra filas antes de agrupar).', s: 'SELECT cod_asig, COUNT(*) AS matriculados\nFROM matriculas\nGROUP BY cod_asig\nHAVING COUNT(*) > 10;' }
    ] },
    { id: 'join', title: 'Combinar tablas (JOIN)', items: [
      { d: 'INNER JOIN: une las filas que coinciden en ambas tablas.', s: 'SELECT a.nombre, a.apellidos, c.nombre AS curso\nFROM alumnos a\nINNER JOIN cursos c ON a.id_curso = c.id_curso;' },
      { d: 'Tres tablas: notas con el nombre del alumno y de la asignatura.', s: 'SELECT al.nombre, al.apellidos, asg.nombre AS asignatura, m.nota\nFROM matriculas m\nJOIN alumnos al ON m.nia = al.nia\nJOIN asignaturas asg ON m.cod_asig = asg.cod_asig\nORDER BY al.apellidos;' },
      { d: 'LEFT JOIN: todas las filas de la izquierda, aunque no tengan pareja. Aquí, profesorado sin asignatura.', s: 'SELECT p.nombre, p.apellidos, a.nombre AS asignatura\nFROM profesores p\nLEFT JOIN asignaturas a ON a.dni_profesor = p.dni\nWHERE a.cod_asig IS NULL;' },
      { d: 'La forma clásica, uniendo en el WHERE, da el mismo resultado que INNER JOIN.', s: 'SELECT asignaturas.nombre, profesores.nombre, profesores.apellidos\nFROM asignaturas, profesores\nWHERE asignaturas.dni_profesor = profesores.dni;' }
    ] },
    { id: 'sub', title: 'Subconsultas', items: [
      { d: 'Comparar con un valor calculado: notas por encima de la media.', s: 'SELECT nia, cod_asig, nota\nFROM matriculas\nWHERE nota > (SELECT AVG(nota) FROM matriculas)\nORDER BY nota DESC;' },
      { d: 'IN con subconsulta: alumnado matriculado en Programación.', s: "SELECT nombre, apellidos\nFROM alumnos\nWHERE nia IN (SELECT nia FROM matriculas WHERE cod_asig = 'PRO1');" },
      { d: 'NOT EXISTS: asignaturas sin nadie matriculado.', s: 'SELECT cod_asig, nombre\nFROM asignaturas s\nWHERE NOT EXISTS (SELECT 1 FROM matriculas m WHERE m.cod_asig = s.cod_asig);' }
    ] },
    { id: 'func', title: 'Texto y fechas', items: [
      { d: 'Mayúsculas, longitud y unir textos con ||.', s: "SELECT UPPER(apellidos) || ', ' || nombre AS alumno,\n       LENGTH(nombre) AS letras\nFROM alumnos;" },
      { d: 'Extraer partes de una fecha con strftime.', s: "SELECT nombre, strftime('%Y', fecha_nacimiento) AS anio_nacimiento\nFROM alumnos;" },
      { d: 'Calcular la edad (un atributo derivado) a partir de la fecha de nacimiento.', s: "SELECT nombre, fecha_nacimiento,\n       CAST((julianday('now') - julianday(fecha_nacimiento)) / 365.25 AS INTEGER) AS edad\nFROM alumnos;" },
      { d: 'Sustituir los NULL por otro valor con IFNULL.', s: "SELECT nombre, IFNULL(email, 'sin correo') AS email\nFROM alumnos;" }
    ] },
    { id: 'dml', title: 'Insertar, modificar y borrar', note: 'Estos ejemplos cambian los datos. Puedes volver a cargar el ejemplo Instituto cuando quieras.', items: [
      { d: 'INSERT: añadir una fila indicando las columnas.', s: "INSERT INTO alumnos (nia, nombre, apellidos, fecha_nacimiento, localidad, email, id_curso)\nVALUES (1021, 'Rocío', 'Pineda Arroyo', '2009-05-14', 'Jaén', 'rocio.pineda@alumnos.es', 1);" },
      { d: 'UPDATE: cambiar valores. Sin WHERE se cambiarían todas las filas.', s: "UPDATE alumnos\nSET localidad = 'Córdoba'\nWHERE nia = 1021;" },
      { d: 'DELETE: borrar filas. Sin WHERE se borraría toda la tabla.', s: 'DELETE FROM alumnos\nWHERE nia = 1021;' },
      { d: 'La clave ajena impide usar un curso que no existe.', s: "INSERT INTO alumnos (nia, nombre, apellidos, id_curso)\nVALUES (1022, 'Prueba', 'Error', 99);" }
    ] },
    { id: 'ddl', title: 'Crear y modificar tablas', items: [
      { d: 'CREATE TABLE con clave primaria, clave ajena y restricciones.', s: "CREATE TABLE tutorias (\n  id_tutoria INTEGER PRIMARY KEY,\n  nia INTEGER NOT NULL,\n  dni_profesor VARCHAR(9) NOT NULL,\n  fecha DATE DEFAULT CURRENT_DATE,\n  motivo VARCHAR(200),\n  FOREIGN KEY (nia) REFERENCES alumnos (nia),\n  FOREIGN KEY (dni_profesor) REFERENCES profesores (dni)\n);" },
      { d: 'Añadir una columna a una tabla existente.', s: 'ALTER TABLE alumnos ADD COLUMN telefono VARCHAR(15);' },
      { d: 'Una vista guarda una consulta con nombre para reutilizarla.', s: 'CREATE VIEW notas_completas AS\nSELECT al.nombre, al.apellidos, asg.nombre AS asignatura, m.nota\nFROM matriculas m\nJOIN alumnos al ON m.nia = al.nia\nJOIN asignaturas asg ON m.cod_asig = asg.cod_asig;\n\nSELECT * FROM notas_completas WHERE nota >= 9;' },
      { d: 'Borrar una tabla completa (estructura y datos).', s: 'DROP TABLE IF EXISTS tutorias;' }
    ] }
  ];

  function renderCheat(onTry) {
    const idx = document.getElementById('cheatIndex');
    const body = document.getElementById('cheatBody');
    idx.innerHTML = CHEAT.map((s) => `<a href="#ch-${s.id}">${U.esc(s.title)}</a>`).join('') + '<a href="#ch-ref">Referencia rápida</a>';
    let h = '';
    CHEAT.forEach((sec) => {
      h += `<h2 id="ch-${sec.id}">${U.esc(sec.title)}</h2>`;
      if (sec.note) h += `<p class="cheat-note">${U.esc(sec.note)}</p>`;
      sec.items.forEach((it, i) => {
        h += `<div class="cheat-item"><p>${U.esc(it.d)}</p><pre>${CodeEditor.highlight(it.s)}</pre>
          <button class="btn" data-try="${sec.id}:${i}">Probar</button></div>`;
      });
    });
    h += `<h2 id="ch-ref">Referencia rápida</h2>
      <h3>Orden en que se escribe una consulta</h3>
      <div class="doc-table-wrap"><table class="ref"><tr><th>Cláusula</th><th>Para qué sirve</th><th>¿Obligatoria?</th></tr>
        <tr><td><code>SELECT</code></td><td>Columnas que se muestran</td><td>Sí</td></tr>
        <tr><td><code>FROM</code> / <code>JOIN</code></td><td>Tablas de las que salen los datos</td><td>Casi siempre</td></tr>
        <tr><td><code>WHERE</code></td><td>Filtra filas</td><td>No</td></tr>
        <tr><td><code>GROUP BY</code></td><td>Forma grupos para los agregados</td><td>No</td></tr>
        <tr><td><code>HAVING</code></td><td>Filtra grupos</td><td>No</td></tr>
        <tr><td><code>ORDER BY</code></td><td>Ordena el resultado</td><td>No</td></tr>
        <tr><td><code>LIMIT</code></td><td>Limita el número de filas</td><td>No</td></tr>
      </table></div>
      <p>El motor la ejecuta en otro orden: FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY y LIMIT. Por eso un alias del SELECT no se puede usar en el WHERE, pero sí en el ORDER BY.</p>
      <h3>Tipos de datos más usados</h3>
      <div class="doc-table-wrap"><table class="ref"><tr><th>Tipo</th><th>Guarda</th><th>Ejemplo</th></tr>
        <tr><td><code>INTEGER</code></td><td>Números enteros</td><td><code>17</code></td></tr>
        <tr><td><code>DECIMAL(10,2)</code></td><td>Números con decimales</td><td><code>12.50</code></td></tr>
        <tr><td><code>VARCHAR(n)</code></td><td>Texto de hasta n caracteres</td><td><code>'Granada'</code></td></tr>
        <tr><td><code>TEXT</code></td><td>Texto largo</td><td><code>'Observaciones…'</code></td></tr>
        <tr><td><code>DATE</code></td><td>Fechas en formato AAAA-MM-DD</td><td><code>'2025-09-15'</code></td></tr>
        <tr><td><code>BOOLEAN</code></td><td>Verdadero o falso (1 o 0)</td><td><code>1</code></td></tr>
      </table></div>
      <h3>Restricciones</h3>
      <div class="doc-table-wrap"><table class="ref"><tr><th>Restricción</th><th>Significado</th></tr>
        <tr><td><code>PRIMARY KEY</code></td><td>Identifica cada fila: no se repite ni puede ser NULL.</td></tr>
        <tr><td><code>FOREIGN KEY … REFERENCES</code></td><td>El valor debe existir en la clave de otra tabla.</td></tr>
        <tr><td><code>NOT NULL</code></td><td>La columna es obligatoria.</td></tr>
        <tr><td><code>UNIQUE</code></td><td>No admite valores repetidos.</td></tr>
        <tr><td><code>DEFAULT valor</code></td><td>Valor que se pone si no se indica ninguno.</td></tr>
        <tr><td><code>CHECK (condición)</code></td><td>Solo admite valores que cumplan la condición.</td></tr>
      </table></div>
      <h3>Diferencias con MySQL</h3>
      <p>SGBD usa SQLite, que sigue el estándar SQL casi igual que MySQL. Las diferencias que más se notan: la fecha actual es <code>CURRENT_DATE</code> o <code>date('now')</code> en vez de <code>NOW()</code>; para unir textos se usa <code>||</code> en vez de <code>CONCAT()</code>; y los números autoincrementales se consiguen con <code>INTEGER PRIMARY KEY</code> sin escribir <code>AUTO_INCREMENT</code>.</p>`;
    body.innerHTML = h;
    body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-try]');
      if (!b) return;
      const [sid, i] = b.dataset.try.split(':');
      const sec = CHEAT.find((s) => s.id === sid);
      onTry(sec.items[+i].s);
    });
    idx.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      e.preventDefault();
      const t = document.querySelector(a.getAttribute('href'));
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function renderHelp() {
    document.getElementById('helpBody').innerHTML = `
      <h1>Ayuda de SGBD</h1>
      <p>SGBD es un sistema gestor de bases de datos que reúne en una sola página las dos partes del tema: diseñar el modelo entidad-relación y trabajar con una base de datos real mediante SQL. Todo funciona dentro del navegador; no hace falta instalar nada ni crear una cuenta.</p>

      <h2>1. El diagrama entidad-relación</h2>
      <p>Se usa la notación de Chen. Cada elemento se crea desde la barra de herramientas o haciendo doble clic en la cuadrícula, y se edita en el panel de la derecha al seleccionarlo.</p>
      <div class="doc-table-wrap"><table class="ref">
        <tr><th>Elemento</th><th>Forma</th><th>Para qué sirve</th></tr>
        <tr><td>Entidad</td><td>Rectángulo</td><td>Algo sobre lo que guardamos datos: Alumno, Libro, Pedido…</td></tr>
        <tr><td>Entidad débil</td><td>Doble rectángulo</td><td>Solo se identifica junto a otra entidad. Ejemplo: Ejemplar de un Libro.</td></tr>
        <tr><td>Relación</td><td>Rombo</td><td>Asociación entre entidades: Alumno <em>se matricula</em> en Asignatura.</td></tr>
        <tr><td>Relación de identificación</td><td>Doble rombo</td><td>Une una entidad débil con la entidad de la que depende.</td></tr>
        <tr><td>Atributo</td><td>Elipse</td><td>Una propiedad. Si es clave primaria aparece subrayado.</td></tr>
        <tr><td>Clave parcial</td><td>Subrayado discontinuo</td><td>Identifica a la entidad débil junto con la clave de la fuerte.</td></tr>
        <tr><td>Multivaluado</td><td>Doble elipse</td><td>Puede tener varios valores, como varios teléfonos.</td></tr>
        <tr><td>Derivado</td><td>Elipse discontinua</td><td>Se calcula a partir de otros datos, como la edad.</td></tr>
        <tr><td>Compuesto</td><td>Elipse con subatributos</td><td>Se divide en partes, como la dirección en calle, número y código postal.</td></tr>
      </table></div>
      <h3>Participación y cardinalidad</h3>
      <p>Junto a cada entidad aparece un par <strong>(mín, máx)</strong>: indica con cuántas ocurrencias de <em>esa</em> entidad puede relacionarse <em>una</em> ocurrencia de la otra. En «Profesor (0,1) imparte Asignatura (0,N)», cada asignatura la imparte como mucho un profesor, y cada profesor imparte de cero a N asignaturas.</p>
      <p>Encima del rombo se muestra la cardinalidad de la relación (1:1, 1:N o N:M), que se obtiene de los máximos.</p>

      <h2>2. Del diagrama a las tablas</h2>
      <p>Una vez terminado el diagrama, tienes que transformarlo tú en el modelo relacional aplicando estas reglas, y después escribir el código <code>CREATE TABLE</code> en la pestaña <strong>Base de datos SQL</strong>.</p>
      <div class="doc-table-wrap"><table class="ref">
        <tr><th>En el diagrama</th><th>En las tablas</th></tr>
        <tr><td>Entidad</td><td>Una tabla con sus atributos. El identificador es la clave primaria.</td></tr>
        <tr><td>Relación 1:N</td><td>La clave de la entidad del lado 1 pasa como clave ajena a la tabla del lado N.</td></tr>
        <tr><td>Relación 1:1</td><td>La clave de una entidad pasa a la otra como clave ajena única. Si una participación es obligatoria, se lleva a esa tabla para evitar valores NULL.</td></tr>
        <tr><td>Relación N:M</td><td>Una tabla nueva cuya clave primaria une las claves de las dos entidades, más los atributos de la relación.</td></tr>
        <tr><td>Relación de grado 3 o más</td><td>Una tabla nueva con las claves de todas las entidades.</td></tr>
        <tr><td>Relación reflexiva</td><td>Igual que las demás, pero la clave ajena apunta a la misma tabla y se nombra con el rol.</td></tr>
        <tr><td>Entidad débil</td><td>Su tabla incluye la clave de la entidad fuerte, que forma parte de su clave primaria.</td></tr>
        <tr><td>Atributo multivaluado</td><td>Una tabla nueva con la clave de la entidad y el valor.</td></tr>
        <tr><td>Atributo compuesto</td><td>Se guardan solo sus partes.</td></tr>
        <tr><td>Atributo derivado</td><td>No se guarda; se calcula en las consultas.</td></tr>
      </table></div>
      <p>Cuando tengas las tablas, créalas en una base de datos vacía (<strong>Abrir base de datos</strong>, <em>Nueva base de datos vacía</em>) y comprueba que funcionan insertando datos y haciendo consultas. Tienes ejemplos de <code>CREATE TABLE</code> en la <strong>Chuleta SQL</strong>.</p>

      <h2>3. La base de datos SQL</h2>
      <p>El motor es SQLite, el mismo que usan muchas aplicaciones del móvil. Puedes:</p>
      <ul>
        <li>Cargar una de las bases de datos de ejemplo (Instituto, Biblioteca, Tienda o Empresa).</li>
        <li>Cargar un script <code>.sql</code>. Si viene de MySQL o phpMyAdmin, deja marcada la opción <strong>Adaptar MySQL</strong> para convertirlo automáticamente.</li>
        <li>Abrir un archivo <code>.db</code> o <code>.sqlite</code>.</li>
        <li>Escribir cualquier sentencia en el editor y ejecutarla con <strong>Ctrl + Intro</strong>. Si escribes varias, sepáralas con punto y coma.</li>
        <li>Pulsar el nombre de una tabla en el panel izquierdo para ver sus datos, o una columna para escribir su nombre en el editor.</li>
        <li>Descargar la base de datos como script <code>.sql</code> o como archivo <code>.db</code>.</li>
      </ul>
      <p>El diagrama y la base de datos se guardan solos en este navegador. Si cambias de ordenador o borras los datos del navegador se perderán, así que descarga tu trabajo para entregarlo o guardarlo.</p>

      <h2>4. Atajos de teclado</h2>
      <div class="doc-table-wrap"><table class="ref">
        <tr><th>Tecla</th><th>Acción</th></tr>
        <tr><td>Doble clic en la cuadrícula</td><td>Crear una entidad en ese punto</td></tr>
        <tr><td>Supr o Retroceso</td><td>Eliminar el elemento seleccionado</td></tr>
        <tr><td>Ctrl + Z / Ctrl + Y</td><td>Deshacer y rehacer en el diagrama</td></tr>
        <tr><td>Rueda del ratón</td><td>Acercar y alejar el diagrama</td></tr>
        <tr><td>Esc</td><td>Quitar la selección</td></tr>
        <tr><td>Ctrl + Intro</td><td>Ejecutar el SQL</td></tr>
        <tr><td>Ctrl + Mayús + Intro</td><td>Ejecutar solo el texto seleccionado</td></tr>
      </table></div>

      <h2>5. Publicarla en GitHub Pages</h2>
      <ol class="steps">
        <li>Crea un repositorio público en GitHub, por ejemplo <code>sgbd</code>.</li>
        <li>Sube todos los archivos manteniendo las carpetas: <code>index.html</code>, <code>css/</code>, <code>js/</code> y <code>.nojekyll</code>.</li>
        <li>En el repositorio ve a <strong>Settings</strong> y después a <strong>Pages</strong>.</li>
        <li>En <strong>Source</strong> elige <em>Deploy from a branch</em>, la rama <code>main</code> y la carpeta <code>/ (root)</code>. Guarda.</li>
        <li>En uno o dos minutos la aplicación estará en <code>https://TU-USUARIO.github.io/sgbd/</code>.</li>
      </ol>

      <div class="credit-card">
        <svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="9" width="14" height="14" class="bm-rect"/><path d="M23 6 L30 16 L23 26 L16 16 Z" class="bm-rhomb"/></svg>
        <div><p><strong>SGBD</strong> ha sido creada por <strong>Juan Luis Torralbo Muñoz</strong> para el alumnado de 1º de Bachillerato.</p>
        <p style="color:var(--muted);font-size:14px">Motor SQL: SQLite compilado para navegador (sql.js, licencia MIT).</p></div>
      </div>`;
  }

  window.Cheat = { renderCheat, renderHelp };
})();
