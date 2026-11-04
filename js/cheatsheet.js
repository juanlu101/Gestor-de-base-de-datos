/* SGBD: resumen de SQL y ayuda. Creada por Juan Luis Torralbo Muñoz. */
(function () {
  'use strict';

  /* Resumen de las instrucciones básicas de SQL. Solo la forma general de cada instrucción,
     sin consultas resueltas sobre ninguna base de datos, para que no coincida con los ejercicios. */
  const T = (rows, head) => `<div class="doc-table-wrap"><table class="ref"><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr>` +
    rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('') + '</table></div>';
  const S = (code) => `<pre class="sum-syntax">${CodeEditor.highlight(code)}</pre>`;

  const RESUMEN = [
    { id: 'select', title: 'Consultar datos: SELECT', html: () =>
      '<p>Muestra columnas de una tabla. Es la instrucción que más vas a usar.</p>' +
      S('SELECT columna1, columna2\nFROM tabla;') +
      T([
        ['<code>SELECT *</code>', 'Todas las columnas de la tabla.'],
        ['<code>columna AS alias</code>', 'Cambia el título de la columna en el resultado.'],
        ['<code>SELECT DISTINCT columna</code>', 'Quita los valores repetidos.'],
        ['<code>+  -  *  /</code>', 'Operaciones con columnas numéricas, por ejemplo <code>precio * 2</code>.']
      ], ['Se escribe', 'Para qué sirve']) },

    { id: 'where', title: 'Filtrar filas: WHERE', html: () =>
      '<p>Se queda solo con las filas que cumplen una condición. Los textos y las fechas van entre comillas simples (<code>\'Sevilla\'</code>, <code>\'2025-09-15\'</code>); los números, sin comillas.</p>' +
      S('SELECT columna1, columna2\nFROM tabla\nWHERE condición;') +
      T([
        ['<code>=  &lt;&gt;  &lt;  &gt;  &lt;=  &gt;=</code>', 'Igual, distinto, menor, mayor, menor o igual, mayor o igual.'],
        ['<code>AND</code>, <code>OR</code>, <code>NOT</code>', 'Unir condiciones: se cumplen las dos, se cumple alguna, no se cumple. Usa paréntesis para agrupar.'],
        ['<code>columna BETWEEN a AND b</code>', 'Entre dos valores, incluidos los extremos.'],
        ['<code>columna IN (v1, v2, v3)</code>', 'Igual a alguno de los valores de la lista.'],
        ['<code>columna LIKE \'patrón\'</code>', 'Texto que sigue un patrón: <code>%</code> son varios caracteres cualesquiera y <code>_</code>, uno solo. <code>\'A%\'</code> empieza por A.'],
        ['<code>columna IS NULL</code>', 'La casilla está vacía. Nunca se escribe <code>= NULL</code>. Lo contrario es <code>IS NOT NULL</code>.']
      ], ['Se escribe', 'Significa']) },

    { id: 'order', title: 'Ordenar y limitar: ORDER BY y LIMIT', html: () =>
      S('SELECT columna1, columna2\nFROM tabla\nORDER BY columna1 DESC, columna2\nLIMIT n;') +
      T([
        ['<code>ORDER BY columna</code>', 'Ordena de menor a mayor (o de la A a la Z). Es lo mismo que <code>ASC</code>.'],
        ['<code>ORDER BY columna DESC</code>', 'Ordena de mayor a menor.'],
        ['<code>ORDER BY c1, c2</code>', 'Ordena por c1 y, si empatan, por c2.'],
        ['<code>LIMIT n</code>', 'Muestra solo las n primeras filas. Va siempre al final.']
      ], ['Se escribe', 'Para qué sirve']) },

    { id: 'agg', title: 'Funciones de agregado', html: () =>
      '<p>Resumen muchas filas en un solo valor.</p>' +
      S('SELECT COUNT(*), AVG(columna), MAX(columna)\nFROM tabla\nWHERE condición;') +
      T([
        ['<code>COUNT(*)</code>', 'Número de filas.'],
        ['<code>COUNT(columna)</code>', 'Número de filas en las que esa columna no está vacía (no cuenta los NULL).'],
        ['<code>SUM(columna)</code>', 'Suma.'],
        ['<code>AVG(columna)</code>', 'Media.'],
        ['<code>MAX(columna)</code>, <code>MIN(columna)</code>', 'Valor más alto y más bajo.'],
        ['<code>ROUND(valor, n)</code>', 'Redondea a n decimales.']
      ], ['Función', 'Calcula']) },

    { id: 'group', title: 'Agrupar: GROUP BY y HAVING', html: () =>
      '<p>Calcula un agregado para cada grupo de filas que tienen el mismo valor en una columna.</p>' +
      S('SELECT columna, COUNT(*)\nFROM tabla\nGROUP BY columna\nHAVING condición_sobre_el_grupo;') +
      T([
        ['<code>GROUP BY columna</code>', 'Forma un grupo por cada valor distinto de la columna.'],
        ['<code>HAVING condición</code>', 'Filtra grupos, por ejemplo <code>HAVING COUNT(*) &gt; 3</code>.'],
        ['<code>WHERE</code> frente a <code>HAVING</code>', '<code>WHERE</code> filtra filas antes de agrupar; <code>HAVING</code> filtra los grupos ya formados.']
      ], ['Se escribe', 'Para qué sirve']) },

    { id: 'sub', title: 'Subconsultas', html: () =>
      '<p>Una consulta dentro de otra, entre paréntesis. La de dentro se calcula primero y su resultado se usa en la condición de la de fuera.</p>' +
      S('-- La subconsulta devuelve un solo valor\nSELECT columna\nFROM tabla\nWHERE columna > (SELECT AVG(columna) FROM tabla);\n\n-- La subconsulta devuelve una lista de valores\nSELECT columna\nFROM tabla1\nWHERE columna IN (SELECT columna FROM tabla2 WHERE condición);') +
      T([
        ['<code>= (SELECT …)</code>, <code>&gt; (SELECT …)</code>…', 'Cuando la subconsulta devuelve un solo valor, por ejemplo una media o un máximo.'],
        ['<code>IN (SELECT …)</code>', 'Cuando devuelve una lista: el valor está en esa lista.'],
        ['<code>NOT IN (SELECT …)</code>', 'El valor no está en la lista.']
      ], ['Se escribe', 'Cuándo se usa']) },

    { id: 'func', title: 'Funciones de texto y fecha', html: () =>
      T([
        ['<code>UPPER(texto)</code>, <code>LOWER(texto)</code>', 'Pasa a mayúsculas o minúsculas.'],
        ['<code>LENGTH(texto)</code>', 'Número de caracteres.'],
        ['<code>texto1 || texto2</code>', 'Une dos textos.'],
        ['<code>SUBSTR(texto, inicio, n)</code>', 'Trozo de n caracteres a partir de la posición inicio.'],
        ['<code>IFNULL(columna, valor)</code>', 'Pone ese valor cuando la casilla está vacía.'],
        ['<code>strftime(\'%Y\', fecha)</code>', 'Año de una fecha (<code>%m</code> es el mes y <code>%d</code>, el día).'],
        ['<code>date(\'now\')</code>', 'Fecha de hoy.']
      ], ['Función', 'Para qué sirve']) },

    { id: 'dml', title: 'Insertar, modificar y borrar datos', html: () =>
      S('INSERT INTO tabla (columna1, columna2)\nVALUES (valor1, valor2);\n\nUPDATE tabla\nSET columna = valor\nWHERE condición;\n\nDELETE FROM tabla\nWHERE condición;') +
      '<p class="cheat-note"><strong>Cuidado:</strong> un <code>UPDATE</code> o un <code>DELETE</code> sin <code>WHERE</code> cambia o borra <em>todas</em> las filas de la tabla.</p>' },

    { id: 'ddl', title: 'Crear, modificar y borrar tablas', html: () =>
      S('CREATE TABLE tabla (\n  columna1 TIPO PRIMARY KEY,\n  columna2 TIPO NOT NULL,\n  columna3 TIPO,\n  FOREIGN KEY (columna3) REFERENCES otra_tabla (su_clave_primaria)\n);\n\nALTER TABLE tabla ADD COLUMN columna TIPO;\n\nDROP TABLE tabla;') +
      '<p>Si la clave primaria tiene varias columnas, se escribe una sola vez al final: <code>PRIMARY KEY (columna1, columna2)</code>. Crea siempre primero las tablas a las que apuntan las claves ajenas.</p>' }
  ];

  function renderCheat() {
    const idx = document.getElementById('cheatIndex');
    const body = document.getElementById('cheatBody');
    idx.innerHTML = RESUMEN.map((s) => `<a href="#ch-${s.id}">${U.esc(s.title)}</a>`).join('') + '<a href="#ch-ref">Referencia rápida</a>';
    let h = '';
    RESUMEN.forEach((sec) => { h += `<section class="sum-sec"><h2 id="ch-${sec.id}">${U.esc(sec.title)}</h2>${sec.html()}</section>`; });
    h += `<h2 id="ch-ref">Referencia rápida</h2>
      <h3>Orden en que se escribe una consulta</h3>
      <div class="doc-table-wrap"><table class="ref"><tr><th>Cláusula</th><th>Para qué sirve</th><th>¿Obligatoria?</th></tr>
        <tr><td><code>SELECT</code></td><td>Columnas que se muestran</td><td>Sí</td></tr>
        <tr><td><code>FROM</code></td><td>Tabla de la que salen los datos</td><td>Casi siempre</td></tr>
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
      <p>Se usa la notación de Chen. Cada elemento se crea desde la barra de herramientas y se edita en el panel de la derecha al seleccionarlo.</p>
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
      <p>Una vez terminado el diagrama, tienes que transformarlo tú en tablas aplicando estas reglas. Hazlo en la pestaña <strong>Paso a tablas</strong>:</p>
      <ol class="steps">
        <li>Pulsa <strong>Tabla</strong> para crear una tabla por cada entidad. En el panel de la derecha, añade sus columnas, elige el tipo de dato de cada una y marca la <strong>clave primaria</strong>.</li>
        <li>Para una relación <strong>1:N</strong>, selecciona la tabla del lado N y usa <strong>Pasar una clave primaria</strong>: se copia la clave primaria del lado 1 como clave ajena.</li>
        <li>Para una relación <strong>N:M</strong>, crea una tabla nueva, pasa las claves primarias de las dos tablas, márcalas como clave primaria y añade los atributos de la relación.</li>
        <li>También puedes convertir una columna en clave ajena arrastrando su punto azul hasta la clave primaria de otra tabla, o eligiendo en <em>Apunta a</em> la columna a la que apunta.</li>
        <li>Cada clave ajena se dibuja como una flecha hasta su clave primaria. Si los tipos de dato no coinciden, la flecha sale roja y discontinua.</li>
        <li>Pulsa <strong>Llevar a SQL</strong>: el código <code>CREATE TABLE</code> de tus tablas aparece en la pestaña <strong>Base de datos SQL</strong>, en el orden correcto, listo para ejecutarlo.</li>
      </ol>
      <p>Las tablas se pueden guardar y abrir desde <em>Archivo</em> (.json) y exportar como imagen para entregarlas.</p>
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
      <p>Cuando tengas las tablas, créalas en una base de datos vacía (<strong>Abrir base de datos</strong>, <em>Nueva base de datos vacía</em>) y comprueba que funcionan insertando datos y haciendo consultas. Tienes la forma general de <code>CREATE TABLE</code> en el <strong>Resumen SQL</strong>.</p>

      <h2>3. La base de datos SQL</h2>
      <p>El motor es SQLite, el mismo que usan muchas aplicaciones del móvil. Puedes:</p>
      <ul>
        <li>Cargar una de las bases de datos de ejemplo (Instituto, Biblioteca, Tienda o Empresa).</li>
        <li>Cargar un script <code>.sql</code>. Si viene de MySQL o phpMyAdmin, deja marcada la opción <strong>Adaptar MySQL</strong> para convertirlo automáticamente.</li>
        <li>Abrir un archivo <code>.db</code> o <code>.sqlite</code>.</li>
        <li>Escribir cualquier sentencia en el editor y ejecutarla con <strong>Ctrl + Intro</strong>. Si escribes varias, sepáralas con punto y coma.</li>
        <li>Pulsar <strong>Mostrar esquema</strong>, en el panel izquierdo, para ver todas las tablas con sus claves primarias y ajenas, y una flecha desde cada clave ajena hasta la clave primaria a la que apunta. Puedes mover las tablas y descargar el esquema como imagen.</li>
        <li>Pulsar el nombre de una tabla en el panel izquierdo para ver sus datos, o una columna para escribir su nombre en el editor.</li>
        <li>Descargar la base de datos como script <code>.sql</code> o como archivo <code>.db</code>.</li>
      </ul>
      <p>El diagrama, las tablas, la base de datos y lo que escribes en el editor SQL se conservan mientras la pestaña está abierta, aunque recargues la página. <strong>Al cerrar la pestaña o el navegador se borran</strong>, para que el siguiente grupo empiece de cero. Descarga tu trabajo para entregarlo o guardarlo: el diagrama y las tablas desde <em>Archivo</em> (.json o imagen) y la base de datos desde <em>Exportar</em> (.sql o .db). El botón <strong>Empezar de cero</strong>, arriba a la derecha, lo borra todo en cualquier momento.</p>

      <h2>4. Atajos de teclado</h2>
      <div class="doc-table-wrap"><table class="ref">
        <tr><th>Tecla</th><th>Acción</th></tr>
        <tr><td>Arrastrar una línea de relación</td><td>Curvarla, por ejemplo para separar las dos líneas de una relación reflexiva</td></tr>
        <tr><td>Doble clic en una línea curvada</td><td>Devolverla a su forma original</td></tr>
        <tr><td>Arrastrar el punto azul de una columna</td><td>En Paso a tablas, convertirla en clave ajena soltándola sobre una clave primaria</td></tr>
        <tr><td>Supr o Retroceso</td><td>Eliminar el elemento seleccionado</td></tr>
        <tr><td>Ctrl + Z / Ctrl + Y</td><td>Deshacer y rehacer en el diagrama y en las tablas</td></tr>
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
