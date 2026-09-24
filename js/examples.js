/* SGBD: ejemplos de bases de datos y diagramas. Creada por Juan Luis Torralbo Muñoz. */
window.EXAMPLES = {
 "db": [
  {
   "id": "instituto",
   "name": "Instituto",
   "desc": "Cursos, alumnado, profesorado, asignaturas y matrículas con notas.",
   "sql": "-- Base de datos de ejemplo de SGBD (creada por Juan Luis Torralbo Muñoz)\n-- Instituto: cursos, alumnado, profesorado, asignaturas y matrículas\n\nPRAGMA foreign_keys = ON;\n\nCREATE TABLE cursos (\n  id_curso INTEGER PRIMARY KEY,\n  nombre VARCHAR(30) NOT NULL,\n  etapa VARCHAR(20) NOT NULL,\n  aula VARCHAR(10)\n);\n\nCREATE TABLE profesores (\n  dni VARCHAR(9) PRIMARY KEY,\n  nombre VARCHAR(50) NOT NULL,\n  apellidos VARCHAR(100) NOT NULL,\n  departamento VARCHAR(50),\n  email VARCHAR(100) UNIQUE,\n  fecha_alta DATE,\n  salario DECIMAL(10,2)\n);\n\nCREATE TABLE alumnos (\n  nia INTEGER PRIMARY KEY,\n  nombre VARCHAR(50) NOT NULL,\n  apellidos VARCHAR(100) NOT NULL,\n  fecha_nacimiento DATE,\n  localidad VARCHAR(50),\n  email VARCHAR(100),\n  id_curso INTEGER NOT NULL,\n  FOREIGN KEY (id_curso) REFERENCES cursos (id_curso)\n);\n\nCREATE TABLE asignaturas (\n  cod_asig VARCHAR(6) PRIMARY KEY,\n  nombre VARCHAR(100) NOT NULL,\n  horas_semana INTEGER CHECK (horas_semana > 0),\n  dni_profesor VARCHAR(9),\n  tipo VARCHAR(10) CHECK (tipo IN ('Troncal', 'Optativa')),\n  FOREIGN KEY (dni_profesor) REFERENCES profesores (dni)\n);\n\nCREATE TABLE matriculas (\n  nia INTEGER NOT NULL,\n  cod_asig VARCHAR(6) NOT NULL,\n  nota DECIMAL(4,2) CHECK (nota BETWEEN 0 AND 10),\n  PRIMARY KEY (nia, cod_asig),\n  FOREIGN KEY (nia) REFERENCES alumnos (nia) ON DELETE CASCADE,\n  FOREIGN KEY (cod_asig) REFERENCES asignaturas (cod_asig)\n);\n\nINSERT INTO cursos (id_curso, nombre, etapa, aula) VALUES\n  (1, '1º Bachillerato A', 'Bachillerato', 'A-12'),\n  (2, '1º Bachillerato B', 'Bachillerato', 'A-14'),\n  (3, '2º Bachillerato A', 'Bachillerato', 'B-03'),\n  (4, '4º ESO A', 'ESO', 'C-21');\n\nINSERT INTO profesores (dni, nombre, apellidos, departamento, email, fecha_alta, salario) VALUES\n  ('11111111A', 'Carmen', 'Ruiz Ortega', 'Matemáticas', 'cruiz@instituto.es', '2012-09-01', 2450.0),\n  ('22222222B', 'Antonio', 'López Marín', 'Lengua', 'alopez@instituto.es', '2008-09-01', 2610.5),\n  ('33333333C', 'Lucía', 'Fernández Gil', 'Informática', 'lfernandez@instituto.es', '2019-09-01', 2300.0),\n  ('44444444D', 'Miguel', 'Sánchez Vera', 'Física y Química', 'msanchez@instituto.es', '2015-09-01', 2380.0),\n  ('55555555E', 'Rosa', 'Moreno Castillo', 'Inglés', 'rmoreno@instituto.es', '2010-09-01', 2520.0),\n  ('66666666F', 'Javier', 'Navarro Pérez', 'Filosofía', 'jnavarro@instituto.es', '2021-09-01', 2250.0),\n  ('77777777G', 'Elena', 'García Romero', 'Biología', 'egarcia@instituto.es', '2017-09-01', 2340.0),\n  ('88888888H', 'Pablo', 'Jiménez Soto', 'Dibujo', 'pjimenez@instituto.es', '2023-09-01', 2200.0);\n\nINSERT INTO alumnos (nia, nombre, apellidos, fecha_nacimiento, localidad, email, id_curso) VALUES\n  (1001, 'Lucía', 'Martín Díaz', '2009-06-05', 'Cádiz', 'lucia.martin0@alumnos.es', 1),\n  (1002, 'Hugo', 'Romero Gil', '2009-11-02', 'Córdoba', 'hugo.romero1@alumnos.es', 1),\n  (1003, 'Martina', 'Torres Vega', '2009-09-04', 'Almería', 'martina.torres2@alumnos.es', 1),\n  (1004, 'Daniel', 'Castro Molina', '2009-10-02', 'Jaén', 'daniel.castro3@alumnos.es', 1),\n  (1005, 'Sofía', 'Ortiz Rubio', '2009-01-03', 'Cádiz', 'sofia.ortiz4@alumnos.es', 1),\n  (1006, 'Mateo', 'Delgado Serrano', '2009-07-03', 'Jaén', 'mateo.delgado5@alumnos.es', 1),\n  (1007, 'Paula', 'Ramos Iglesias', '2009-02-18', 'Cádiz', NULL, 1),\n  (1008, 'Álvaro', 'Guerrero Cano', '2009-01-27', 'Córdoba', 'alvaro.guerrero7@alumnos.es', 1),\n  (1009, 'Valeria', 'Medina Prieto', '2009-04-21', 'Sevilla', 'valeria.medina8@alumnos.es', 2),\n  (1010, 'Pablo', 'Herrera León', '2009-10-19', 'Cádiz', 'pablo.herrera9@alumnos.es', 2),\n  (1011, 'Julia', 'Márquez Peña', '2009-01-08', 'Sevilla', 'julia.marquez10@alumnos.es', 2),\n  (1012, 'Adrián', 'Vidal Campos', '2009-09-28', 'Málaga', 'adrian.vidal11@alumnos.es', 2),\n  (1013, 'Carla', 'Santos Fuentes', '2009-05-14', 'Málaga', 'carla.santos12@alumnos.es', 2),\n  (1014, 'Marcos', 'Calvo Reyes', '2009-09-04', 'Granada', NULL, 2),\n  (1015, 'Noa', 'Domínguez Lara', '2009-09-27', 'Málaga', 'noa.dominguez14@alumnos.es', 2),\n  (1016, 'David', 'Pastor Nieto', '2008-02-19', 'Jaén', 'david.pastor15@alumnos.es', 3),\n  (1017, 'Irene', 'Vargas Soler', '2008-06-04', 'Córdoba', 'irene.vargas16@alumnos.es', 3),\n  (1018, 'Sergio', 'Cabrera Muñoz', '2008-10-02', 'Jaén', 'sergio.cabrera17@alumnos.es', 3),\n  (1019, 'Alba', 'Gallego Rojas', '2010-08-22', 'Cádiz', 'alba.gallego18@alumnos.es', 4),\n  (1020, 'Iván', 'Mora Crespo', '2010-06-15', 'Huelva', 'ivan.mora19@alumnos.es', 4);\n\nINSERT INTO asignaturas (cod_asig, nombre, horas_semana, dni_profesor, tipo) VALUES\n  ('MAT1', 'Matemáticas I', 4, '11111111A', 'Troncal'),\n  ('LEN1', 'Lengua Castellana y Literatura I', 3, '22222222B', 'Troncal'),\n  ('ING1', 'Inglés I', 3, '55555555E', 'Troncal'),\n  ('FIL1', 'Filosofía', 3, '66666666F', 'Troncal'),\n  ('FIQ1', 'Física y Química', 4, '44444444D', 'Troncal'),\n  ('BIO1', 'Biología y Geología', 4, '77777777G', 'Troncal'),\n  ('TIC1', 'Tecnologías de la Información I', 2, '33333333C', 'Optativa'),\n  ('PRO1', 'Programación y Computación', 2, '33333333C', 'Optativa'),\n  ('ANA1', 'Anatomía Aplicada', 2, '77777777G', 'Optativa'),\n  ('ECO1', 'Economía', 4, NULL, 'Troncal');\n\nINSERT INTO matriculas (nia, cod_asig, nota) VALUES\n  (1001, 'MAT1', 7.75),\n  (1001, 'LEN1', 6.75),\n  (1001, 'ING1', 9.0),\n  (1001, 'FIL1', 4.75),\n  (1001, 'BIO1', 3.5),\n  (1001, 'ECO1', 8.25),\n  (1001, 'TIC1', 6.25),\n  (1002, 'MAT1', 9.0),\n  (1002, 'LEN1', 7.75),\n  (1002, 'ING1', 6.75),\n  (1002, 'FIL1', 8.75),\n  (1002, 'FIQ1', 6.0),\n  (1002, 'ECO1', 3.0),\n  (1002, 'ANA1', 7.25),\n  (1003, 'MAT1', 9.25),\n  (1003, 'LEN1', 9.5),\n  (1003, 'ING1', 7.0),\n  (1003, 'FIL1', 4.25),\n  (1003, 'ECO1', 8.0),\n  (1003, 'BIO1', 9.5),\n  (1003, 'PRO1', 3.75),\n  (1004, 'MAT1', 9.0),\n  (1004, 'LEN1', 5.5),\n  (1004, 'ING1', 9.25),\n  (1004, 'FIL1', 3.75),\n  (1004, 'BIO1', 4.25),\n  (1004, 'ECO1', 6.25),\n  (1004, 'TIC1', 4.5),\n  (1005, 'MAT1', 7.0),\n  (1005, 'LEN1', 3.5),\n  (1005, 'ING1', 9.75),\n  (1005, 'FIL1', 8.0),\n  (1005, 'FIQ1', 9.0),\n  (1005, 'ECO1', 7.5),\n  (1005, 'PRO1', 5.5),\n  (1006, 'MAT1', 3.0),\n  (1006, 'LEN1', 4.0),\n  (1006, 'ING1', 5.0),\n  (1006, 'FIL1', NULL),\n  (1006, 'BIO1', NULL),\n  (1006, 'FIQ1', 3.25),\n  (1006, 'PRO1', 2.75),\n  (1007, 'MAT1', 9.75),\n  (1007, 'LEN1', 6.0),\n  (1007, 'ING1', 6.25),\n  (1007, 'FIL1', 6.0),\n  (1007, 'FIQ1', 3.5),\n  (1007, 'BIO1', 8.0),\n  (1007, 'TIC1', 7.75),\n  (1008, 'MAT1', 6.5),\n  (1008, 'LEN1', 6.5),\n  (1008, 'ING1', NULL),\n  (1008, 'FIL1', 9.75),\n  (1008, 'ECO1', 7.75),\n  (1008, 'FIQ1', 5.25),\n  (1008, 'TIC1', 8.25),\n  (1009, 'MAT1', 8.5),\n  (1009, 'LEN1', 9.0),\n  (1009, 'ING1', 8.75),\n  (1009, 'FIL1', 4.25),\n  (1009, 'ECO1', 5.25),\n  (1009, 'BIO1', NULL),\n  (1009, 'ANA1', NULL),\n  (1010, 'MAT1', 7.0),\n  (1010, 'LEN1', 8.5),\n  (1010, 'ING1', 5.0),\n  (1010, 'FIL1', 3.0),\n  (1010, 'BIO1', 6.0),\n  (1010, 'ECO1', 6.0),\n  (1010, 'PRO1', 7.0),\n  (1011, 'MAT1', 7.25),\n  (1011, 'LEN1', 3.5),\n  (1011, 'ING1', 7.75),\n  (1011, 'FIL1', 9.25),\n  (1011, 'FIQ1', 7.25),\n  (1011, 'BIO1', 9.5),\n  (1011, 'ANA1', 6.0),\n  (1012, 'MAT1', 10.0),\n  (1012, 'LEN1', NULL),\n  (1012, 'ING1', 6.0),\n  (1012, 'FIL1', 7.0),\n  (1012, 'ECO1', 6.0),\n  (1012, 'FIQ1', 3.75),\n  (1012, 'ANA1', 2.75),\n  (1013, 'MAT1', 3.5),\n  (1013, 'LEN1', 4.0),\n  (1013, 'ING1', 2.75),\n  (1013, 'FIL1', 6.25),\n  (1013, 'ECO1', 5.0),\n  (1013, 'FIQ1', 8.75),\n  (1013, 'ANA1', 8.0),\n  (1014, 'MAT1', 3.75),\n  (1014, 'LEN1', 9.0),\n  (1014, 'ING1', 7.0),\n  (1014, 'FIL1', 3.5),\n  (1014, 'BIO1', 7.25),\n  (1014, 'ECO1', 3.0),\n  (1014, 'ANA1', 6.5),\n  (1015, 'MAT1', NULL),\n  (1015, 'LEN1', 2.75),\n  (1015, 'ING1', 6.0),\n  (1015, 'FIL1', NULL),\n  (1015, 'BIO1', 3.0),\n  (1015, 'FIQ1', 9.75),\n  (1015, 'ANA1', 4.0);\n"
  },
  {
   "id": "biblioteca",
   "name": "Biblioteca",
   "desc": "Autores, libros, socios y préstamos.",
   "sql": "-- Base de datos de ejemplo de SGBD (creada por Juan Luis Torralbo Muñoz)\n-- Biblioteca: autores, libros, socios y préstamos\n\nPRAGMA foreign_keys = ON;\n\nCREATE TABLE autores (\n  id_autor INTEGER PRIMARY KEY,\n  nombre VARCHAR(100) NOT NULL,\n  nacionalidad VARCHAR(50),\n  anio_nacimiento INTEGER\n);\n\nCREATE TABLE libros (\n  isbn VARCHAR(13) PRIMARY KEY,\n  titulo VARCHAR(150) NOT NULL,\n  anio_publicacion INTEGER,\n  genero VARCHAR(30),\n  paginas INTEGER,\n  id_autor INTEGER NOT NULL,\n  FOREIGN KEY (id_autor) REFERENCES autores (id_autor)\n);\n\nCREATE TABLE socios (\n  id_socio INTEGER PRIMARY KEY,\n  nombre VARCHAR(50) NOT NULL,\n  apellidos VARCHAR(100) NOT NULL,\n  fecha_alta DATE NOT NULL,\n  localidad VARCHAR(50),\n  telefono VARCHAR(15)\n);\n\nCREATE TABLE prestamos (\n  id_prestamo INTEGER PRIMARY KEY,\n  isbn VARCHAR(13) NOT NULL,\n  id_socio INTEGER NOT NULL,\n  fecha_prestamo DATE NOT NULL,\n  fecha_devolucion DATE,\n  FOREIGN KEY (isbn) REFERENCES libros (isbn),\n  FOREIGN KEY (id_socio) REFERENCES socios (id_socio)\n);\n\nINSERT INTO autores (id_autor, nombre, nacionalidad, anio_nacimiento) VALUES\n  (1, 'Miguel de Cervantes', 'España', 1547),\n  (2, 'Federico García Lorca', 'España', 1898),\n  (3, 'Benito Pérez Galdós', 'España', 1843),\n  (4, 'Miguel Delibes', 'España', 1920),\n  (5, 'Carmen Laforet', 'España', 1921),\n  (6, 'Emilia Pardo Bazán', 'España', 1851),\n  (7, 'Gabriel García Márquez', 'Colombia', 1927),\n  (8, 'Isabel Allende', 'Chile', 1942),\n  (9, 'Julio Verne', 'Francia', 1828),\n  (10, 'Mary Shelley', 'Reino Unido', 1797),\n  (11, 'Jorge Luis Borges', 'Argentina', 1899),\n  (12, 'Ana María Matute', 'España', 1925);\n\nINSERT INTO libros (isbn, titulo, anio_publicacion, genero, paginas, id_autor) VALUES\n  ('9788400000011', 'Don Quijote de la Mancha', 1605, 'Novela', 1100, 1),\n  ('9788400000028', 'Novelas ejemplares', 1613, 'Novela', 560, 1),\n  ('9788400000035', 'Bodas de sangre', 1933, 'Teatro', 120, 2),\n  ('9788400000042', 'La casa de Bernarda Alba', 1945, 'Teatro', 110, 2),\n  ('9788400000059', 'Romancero gitano', 1928, 'Poesía', 96, 2),\n  ('9788400000066', 'Marianela', 1878, 'Novela', 220, 3),\n  ('9788400000073', 'Fortunata y Jacinta', 1887, 'Novela', 1050, 3),\n  ('9788400000080', 'Los santos inocentes', 1981, 'Novela', 180, 4),\n  ('9788400000097', 'El camino', 1950, 'Novela', 230, 4),\n  ('9788400000103', 'Nada', 1945, 'Novela', 290, 5),\n  ('9788400000110', 'Los pazos de Ulloa', 1886, 'Novela', 340, 6),\n  ('9788400000127', 'Cien años de soledad', 1967, 'Novela', 470, 7),\n  ('9788400000134', 'Crónica de una muerte anunciada', 1981, 'Novela', 140, 7),\n  ('9788400000141', 'La casa de los espíritus', 1982, 'Novela', 500, 8),\n  ('9788400000158', 'Viaje al centro de la Tierra', 1864, 'Aventuras', 300, 9),\n  ('9788400000165', 'La vuelta al mundo en 80 días', 1872, 'Aventuras', 260, 9),\n  ('9788400000172', 'Frankenstein', 1818, 'Terror', 280, 10),\n  ('9788400000189', 'Ficciones', 1944, 'Relatos', 200, 11),\n  ('9788400000196', 'Primera memoria', 1960, 'Novela', 240, 12);\n\nINSERT INTO socios (id_socio, nombre, apellidos, fecha_alta, localidad, telefono) VALUES\n  (1, 'Laura', 'Pérez Ruiz', '2022-08-17', 'Huelva', '683848372'),\n  (2, 'Manuel', 'Gómez Sanz', '2024-02-13', 'Huelva', '651361341'),\n  (3, 'Andrea', 'Díaz Moreno', '2020-12-21', 'Almería', '624273167'),\n  (4, 'Jorge', 'Muñoz Alonso', '2020-11-27', 'Jaén', '626865635'),\n  (5, 'Claudia', 'Álvarez Romero', '2023-02-24', 'Almería', NULL),\n  (6, 'Rubén', 'Navarro Torres', '2018-06-18', 'Huelva', '670658948'),\n  (7, 'Sara', 'Ruiz Domínguez', '2019-02-26', 'Jaén', '611440242'),\n  (8, 'Diego', 'Serrano Gil', '2024-11-27', 'Granada', '662889751'),\n  (9, 'Nerea', 'Molina Ortega', '2022-01-26', 'Málaga', '661401419'),\n  (10, 'Óscar', 'Blanco Castro', '2021-02-09', 'Córdoba', '670586492'),\n  (11, 'Elena', 'Suárez Méndez', '2018-09-23', 'Jaén', '612402344'),\n  (12, 'Raúl', 'Ortega Vidal', '2021-05-15', 'Málaga', '645040008');\n\nINSERT INTO prestamos (id_prestamo, isbn, id_socio, fecha_prestamo, fecha_devolucion) VALUES\n  (1, '9788400000189', 4, '2025-09-16', '2025-09-22'),\n  (2, '9788400000042', 11, '2025-07-16', '2025-07-22'),\n  (3, '9788400000172', 5, '2025-04-08', '2025-04-16'),\n  (4, '9788400000059', 7, '2025-06-02', '2025-06-05'),\n  (5, '9788400000035', 11, '2025-05-14', '2025-05-17'),\n  (6, '9788400000134', 9, '2025-05-20', '2025-05-25'),\n  (7, '9788400000028', 8, '2025-03-06', '2025-03-09'),\n  (8, '9788400000097', 6, '2025-06-18', '2025-06-21'),\n  (9, '9788400000103', 4, '2025-06-06', NULL),\n  (10, '9788400000134', 2, '2025-08-09', '2025-08-13'),\n  (11, '9788400000080', 9, '2025-01-03', '2025-01-06'),\n  (12, '9788400000059', 7, '2025-01-13', NULL),\n  (13, '9788400000103', 11, '2025-04-03', '2025-04-10'),\n  (14, '9788400000059', 11, '2025-07-11', '2025-07-17'),\n  (15, '9788400000059', 5, '2025-03-02', '2025-03-10'),\n  (16, '9788400000172', 11, '2025-07-17', '2025-07-24'),\n  (17, '9788400000172', 10, '2025-01-19', '2025-01-27'),\n  (18, '9788400000080', 2, '2025-01-02', '2025-01-07'),\n  (19, '9788400000042', 7, '2025-08-18', NULL),\n  (20, '9788400000011', 11, '2025-09-08', '2025-09-11'),\n  (21, '9788400000158', 2, '2025-09-18', '2025-09-25'),\n  (22, '9788400000035', 12, '2025-08-09', '2025-08-14'),\n  (23, '9788400000080', 12, '2025-04-08', '2025-04-14'),\n  (24, '9788400000165', 7, '2025-02-16', '2025-02-21'),\n  (25, '9788400000028', 10, '2025-04-03', '2025-04-08'),\n  (26, '9788400000097', 11, '2025-05-20', '2025-05-23'),\n  (27, '9788400000165', 1, '2025-08-09', '2025-08-12'),\n  (28, '9788400000073', 11, '2025-08-10', '2025-08-15'),\n  (29, '9788400000158', 8, '2025-08-04', NULL),\n  (30, '9788400000189', 4, '2025-05-03', NULL),\n  (31, '9788400000165', 1, '2025-05-15', NULL),\n  (32, '9788400000035', 9, '2025-08-09', NULL),\n  (33, '9788400000134', 4, '2025-04-03', NULL),\n  (34, '9788400000196', 2, '2025-03-17', NULL);\n"
  },
  {
   "id": "tienda",
   "name": "Tienda en línea",
   "desc": "Categorías, productos, clientes, pedidos y líneas de pedido.",
   "sql": "-- Base de datos de ejemplo de SGBD (creada por Juan Luis Torralbo Muñoz)\n-- Tienda en línea: categorías, productos, clientes, pedidos y líneas de pedido\n\nPRAGMA foreign_keys = ON;\n\nCREATE TABLE categorias (\n  id_categoria INTEGER PRIMARY KEY,\n  nombre VARCHAR(50) NOT NULL UNIQUE\n);\n\nCREATE TABLE productos (\n  id_producto INTEGER PRIMARY KEY,\n  nombre VARCHAR(100) NOT NULL,\n  precio DECIMAL(10,2) NOT NULL CHECK (precio >= 0),\n  stock INTEGER DEFAULT 0,\n  id_categoria INTEGER NOT NULL,\n  FOREIGN KEY (id_categoria) REFERENCES categorias (id_categoria)\n);\n\nCREATE TABLE clientes (\n  id_cliente INTEGER PRIMARY KEY,\n  nombre VARCHAR(50) NOT NULL,\n  apellidos VARCHAR(100),\n  email VARCHAR(100) UNIQUE,\n  ciudad VARCHAR(50),\n  fecha_registro DATE\n);\n\nCREATE TABLE pedidos (\n  id_pedido INTEGER PRIMARY KEY,\n  id_cliente INTEGER NOT NULL,\n  fecha DATE NOT NULL,\n  estado VARCHAR(20) DEFAULT 'Pendiente',\n  FOREIGN KEY (id_cliente) REFERENCES clientes (id_cliente)\n);\n\nCREATE TABLE lineas_pedido (\n  id_pedido INTEGER NOT NULL,\n  id_producto INTEGER NOT NULL,\n  cantidad INTEGER NOT NULL CHECK (cantidad > 0),\n  precio_unidad DECIMAL(10,2) NOT NULL,\n  PRIMARY KEY (id_pedido, id_producto),\n  FOREIGN KEY (id_pedido) REFERENCES pedidos (id_pedido) ON DELETE CASCADE,\n  FOREIGN KEY (id_producto) REFERENCES productos (id_producto)\n);\n\nINSERT INTO categorias (id_categoria, nombre) VALUES\n  (1, 'Informática'),\n  (2, 'Papelería'),\n  (3, 'Libros'),\n  (4, 'Deportes'),\n  (5, 'Música');\n\nINSERT INTO productos (id_producto, nombre, precio, stock, id_categoria) VALUES\n  (1, 'Ratón inalámbrico', 14.95, 40, 1),\n  (2, 'Teclado mecánico', 59.9, 12, 1),\n  (3, 'Memoria USB 64 GB', 9.5, 80, 1),\n  (4, 'Auriculares con micrófono', 24.99, 25, 1),\n  (5, 'Monitor 24 pulgadas', 129.0, 6, 1),\n  (6, 'Cuaderno A4 cuadriculado', 2.4, 200, 2),\n  (7, 'Pack 10 bolígrafos', 3.95, 150, 2),\n  (8, 'Calculadora científica', 17.5, 35, 2),\n  (9, 'Mochila escolar', 32.0, 18, 2),\n  (10, 'Diccionario de inglés', 21.9, 15, 3),\n  (11, 'Atlas universal', 27.5, 7, 3),\n  (12, 'Guía de programación', 34.95, 10, 3),\n  (13, 'Balón de fútbol', 19.9, 22, 4),\n  (14, 'Raqueta de pádel', 64.0, 9, 4),\n  (15, 'Esterilla de yoga', 15.0, 30, 4),\n  (16, 'Ukelele', 39.9, 5, 5),\n  (17, 'Afinador digital', 11.95, 0, 5);\n\nINSERT INTO clientes (id_cliente, nombre, apellidos, email, ciudad, fecha_registro) VALUES\n  (1, 'Ana', 'Rivas Luna', 'ana.rivas@correo.es', 'Sevilla', '2024-05-12'),\n  (2, 'Luis', 'Prieto Gómez', 'luis.prieto@correo.es', 'Málaga', '2024-03-20'),\n  (3, 'Marta', 'Cano Ruiz', 'marta.cano@correo.es', 'Córdoba', '2024-11-17'),\n  (4, 'Pedro', 'Vera Soto', 'pedro.vera@correo.es', 'Jaén', '2024-05-04'),\n  (5, 'Inés', 'Luna Mora', 'ines.luna@correo.es', 'Granada', '2024-12-12'),\n  (6, 'Carlos', 'Rey Pardo', 'carlos.rey@correo.es', 'Almería', '2024-04-16'),\n  (7, 'Nuria', 'Gil Toledo', 'nuria.gil@correo.es', 'Sevilla', '2024-08-13'),\n  (8, 'Tomás', 'Soler Ibáñez', 'tomás.soler@correo.es', 'Cádiz', '2024-01-06'),\n  (9, 'Eva', 'Montes Ríos', 'eva.montes@correo.es', 'Huelva', '2024-01-16'),\n  (10, 'Hugo', 'León Vidal', 'hugo.león@correo.es', 'Málaga', '2024-11-15');\n\nINSERT INTO pedidos (id_pedido, id_cliente, fecha, estado) VALUES\n  (1, 5, '2025-01-09', 'Entregado'),\n  (2, 4, '2025-01-24', 'Enviado'),\n  (3, 7, '2025-02-07', 'Cancelado'),\n  (4, 3, '2025-02-07', 'Pendiente'),\n  (5, 7, '2025-02-09', 'Entregado'),\n  (6, 6, '2025-02-13', 'Enviado'),\n  (7, 5, '2025-03-21', 'Entregado'),\n  (8, 6, '2025-03-22', 'Pendiente'),\n  (9, 4, '2025-04-03', 'Entregado'),\n  (10, 3, '2025-04-09', 'Enviado'),\n  (11, 4, '2025-04-15', 'Entregado'),\n  (12, 5, '2025-04-26', 'Pendiente'),\n  (13, 7, '2025-05-24', 'Entregado'),\n  (14, 6, '2025-07-07', 'Entregado'),\n  (15, 8, '2025-07-11', 'Entregado'),\n  (16, 1, '2025-07-23', 'Cancelado'),\n  (17, 5, '2025-08-09', 'Entregado'),\n  (18, 7, '2025-08-14', 'Entregado'),\n  (19, 4, '2025-08-14', 'Cancelado'),\n  (20, 9, '2025-08-15', 'Entregado'),\n  (21, 7, '2025-08-19', 'Enviado'),\n  (22, 7, '2025-08-20', 'Entregado'),\n  (23, 7, '2025-09-18', 'Entregado'),\n  (24, 8, '2025-09-22', 'Enviado'),\n  (25, 3, '2025-09-22', 'Entregado');\n\nINSERT INTO lineas_pedido (id_pedido, id_producto, cantidad, precio_unidad) VALUES\n  (1, 12, 2, 34.95),\n  (1, 13, 1, 19.9),\n  (1, 6, 2, 2.4),\n  (1, 2, 2, 59.9),\n  (2, 10, 2, 21.9),\n  (3, 12, 2, 34.95),\n  (4, 10, 3, 21.9),\n  (5, 7, 2, 3.95),\n  (5, 12, 1, 34.95),\n  (5, 13, 3, 19.9),\n  (6, 2, 3, 59.9),\n  (7, 16, 3, 39.9),\n  (7, 2, 1, 59.9),\n  (7, 15, 1, 15.0),\n  (8, 9, 3, 32.0),\n  (8, 17, 1, 11.95),\n  (8, 7, 2, 3.95),\n  (9, 6, 3, 2.4),\n  (10, 8, 2, 17.5),\n  (10, 15, 2, 15.0),\n  (10, 16, 1, 39.9),\n  (10, 6, 3, 2.4),\n  (11, 3, 2, 9.5),\n  (11, 11, 2, 27.5),\n  (11, 4, 3, 24.99),\n  (12, 14, 2, 64.0),\n  (12, 7, 1, 3.95),\n  (12, 16, 2, 39.9),\n  (12, 5, 2, 129.0),\n  (13, 3, 1, 9.5),\n  (13, 9, 2, 32.0),\n  (14, 5, 1, 129.0),\n  (15, 3, 2, 9.5),\n  (16, 8, 1, 17.5),\n  (17, 3, 1, 9.5),\n  (17, 2, 1, 59.9),\n  (17, 1, 3, 14.95),\n  (17, 13, 1, 19.9),\n  (18, 4, 3, 24.99),\n  (18, 17, 3, 11.95),\n  (18, 2, 1, 59.9),\n  (18, 5, 2, 129.0),\n  (19, 1, 3, 14.95),\n  (20, 16, 3, 39.9),\n  (20, 8, 1, 17.5),\n  (21, 2, 2, 59.9),\n  (21, 1, 3, 14.95),\n  (21, 4, 3, 24.99),\n  (22, 12, 3, 34.95),\n  (22, 8, 2, 17.5),\n  (22, 16, 3, 39.9),\n  (22, 1, 2, 14.95),\n  (23, 17, 2, 11.95),\n  (23, 3, 1, 9.5),\n  (23, 4, 2, 24.99),\n  (24, 10, 2, 21.9),\n  (24, 4, 3, 24.99),\n  (24, 17, 1, 11.95),\n  (25, 5, 2, 129.0);\n"
  },
  {
   "id": "empresa",
   "name": "Empresa",
   "desc": "Departamentos y empleados, con la relación reflexiva jefe.",
   "sql": "-- Base de datos de ejemplo de SGBD (creada por Juan Luis Torralbo Muñoz)\n-- Empresa: departamentos y empleados (con relación reflexiva jefe-empleado)\n\nPRAGMA foreign_keys = ON;\n\nCREATE TABLE departamentos (\n  id_dep INTEGER PRIMARY KEY,\n  nombre VARCHAR(50) NOT NULL,\n  ubicacion VARCHAR(50),\n  presupuesto DECIMAL(12,2)\n);\n\nCREATE TABLE empleados (\n  id_emp INTEGER PRIMARY KEY,\n  nombre VARCHAR(50) NOT NULL,\n  apellidos VARCHAR(100) NOT NULL,\n  puesto VARCHAR(50),\n  salario DECIMAL(10,2),\n  fecha_contrato DATE,\n  id_dep INTEGER,\n  id_jefe INTEGER,\n  FOREIGN KEY (id_dep) REFERENCES departamentos (id_dep),\n  FOREIGN KEY (id_jefe) REFERENCES empleados (id_emp)\n);\n\nINSERT INTO departamentos (id_dep, nombre, ubicacion, presupuesto) VALUES\n  (10, 'Dirección', 'Planta 3', 150000),\n  (20, 'Ventas', 'Planta 1', 220000),\n  (30, 'Informática', 'Planta 2', 180000),\n  (40, 'Recursos Humanos', 'Planta 3', 90000),\n  (50, 'Marketing', 'Planta 1', 120000);\n\nINSERT INTO empleados (id_emp, nombre, apellidos, puesto, salario, fecha_contrato, id_dep, id_jefe) VALUES\n  (1, 'Isabel', 'Cortés Fuentes', 'Directora general', 4800, '2010-03-01', 10, NULL),\n  (2, 'Ramón', 'Aguilar Ponce', 'Jefe de ventas', 3200, '2012-06-15', 20, 1),\n  (3, 'Silvia', 'Benítez Luque', 'Jefa de informática', 3400, '2014-01-10', 30, 1),\n  (4, 'Fernando', 'Carmona Rey', 'Jefe de RR. HH.', 3000, '2015-09-01', 40, 1),\n  (5, 'Beatriz', 'Durán Lozano', 'Comercial', 1950, '2018-02-19', 20, 2),\n  (6, 'Gonzalo', 'Esteban Mena', 'Comercial', 1900, '2020-11-02', 20, 2),\n  (7, 'Patricia', 'Flores Arias', 'Comercial', 2050, '2016-05-23', 20, 2),\n  (8, 'Alberto', 'Herrero Pino', 'Programador', 2400, '2019-04-08', 30, 3),\n  (9, 'Cristina', 'Ibáñez Roldán', 'Programadora', 2450, '2017-07-01', 30, 3),\n  (10, 'Enrique', 'Lorenzo Salas', 'Técnico de sistemas', 2200, '2021-10-18', 30, 3),\n  (11, 'Mónica', 'Marín Bravo', 'Técnica de selección', 1850, '2022-01-17', 40, 4),\n  (12, 'Víctor', 'Nieto Bermejo', 'Becario', 900, '2025-03-03', 30, 9),\n  (13, 'Teresa', 'Osuna Pizarro', 'Administrativa', 1700, '2013-08-26', 10, 1);\n"
  }
 ],
 "er": [
  {
   "id": "instituto",
   "name": "Instituto (1:N, N:M, multivaluado, derivado)",
   "diagram": {
    "version": 1,
    "title": "Instituto",
    "nodes": [
     {
      "id": "e1",
      "kind": "entity",
      "name": "Curso",
      "x": -420,
      "y": -170,
      "weak": false
     },
     {
      "id": "e2",
      "kind": "entity",
      "name": "Alumno",
      "x": -420,
      "y": 190,
      "weak": false
     },
     {
      "id": "e3",
      "kind": "entity",
      "name": "Asignatura",
      "x": 300,
      "y": 190,
      "weak": false
     },
     {
      "id": "e4",
      "kind": "entity",
      "name": "Profesor",
      "x": 300,
      "y": -170,
      "weak": false
     },
     {
      "id": "a5",
      "kind": "attr",
      "name": "id_curso",
      "owner": "e1",
      "x": -550,
      "y": -230,
      "key": true,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "INTEGER"
     },
     {
      "id": "a6",
      "kind": "attr",
      "name": "nombre",
      "owner": "e1",
      "x": -420,
      "y": -255,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "VARCHAR(100)"
     },
     {
      "id": "a7",
      "kind": "attr",
      "name": "aula",
      "owner": "e1",
      "x": -290,
      "y": -230,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "VARCHAR(50)"
     },
     {
      "id": "a8",
      "kind": "attr",
      "name": "nia",
      "owner": "e2",
      "x": -595,
      "y": 145,
      "key": true,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "INTEGER"
     },
     {
      "id": "a9",
      "kind": "attr",
      "name": "nombre",
      "owner": "e2",
      "x": -605,
      "y": 215,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "VARCHAR(100)"
     },
     {
      "id": "a10",
      "kind": "attr",
      "name": "apellidos",
      "owner": "e2",
      "x": -560,
      "y": 280,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "VARCHAR(100)"
     },
     {
      "id": "a11",
      "kind": "attr",
      "name": "fecha_nacimiento",
      "owner": "e2",
      "x": -430,
      "y": 300,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "DATE"
     },
     {
      "id": "a12",
      "kind": "attr",
      "name": "edad",
      "owner": "e2",
      "x": -280,
      "y": 285,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": true,
      "required": false,
      "dtype": "INTEGER"
     },
     {
      "id": "a13",
      "kind": "attr",
      "name": "email",
      "owner": "e2",
      "x": -610,
      "y": 80,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "VARCHAR(100)"
     },
     {
      "id": "a14",
      "kind": "attr",
      "name": "cod_asig",
      "owner": "e3",
      "x": 475,
      "y": 150,
      "key": true,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "VARCHAR(9)"
     },
     {
      "id": "a15",
      "kind": "attr",
      "name": "nombre",
      "owner": "e3",
      "x": 475,
      "y": 230,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "VARCHAR(100)"
     },
     {
      "id": "a16",
      "kind": "attr",
      "name": "horas_semana",
      "owner": "e3",
      "x": 360,
      "y": 290,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "INTEGER"
     },
     {
      "id": "a17",
      "kind": "attr",
      "name": "dni",
      "owner": "e4",
      "x": 475,
      "y": -220,
      "key": true,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "VARCHAR(9)"
     },
     {
      "id": "a18",
      "kind": "attr",
      "name": "nombre",
      "owner": "e4",
      "x": 485,
      "y": -150,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "VARCHAR(100)"
     },
     {
      "id": "a19",
      "kind": "attr",
      "name": "apellidos",
      "owner": "e4",
      "x": 420,
      "y": -280,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "VARCHAR(100)"
     },
     {
      "id": "a20",
      "kind": "attr",
      "name": "telefono",
      "owner": "e4",
      "x": 300,
      "y": -270,
      "key": false,
      "partial": false,
      "multi": true,
      "derived": false,
      "required": false,
      "dtype": "VARCHAR(15)"
     },
     {
      "id": "r21",
      "kind": "rel",
      "name": "Pertenece",
      "x": -420,
      "y": 10,
      "identifying": false,
      "parts": [
       {
        "entity": "e1",
        "min": "1",
        "max": "1",
        "role": ""
       },
       {
        "entity": "e2",
        "min": "1",
        "max": "N",
        "role": ""
       }
      ]
     },
     {
      "id": "r22",
      "kind": "rel",
      "name": "Matrícula",
      "x": -60,
      "y": 190,
      "identifying": false,
      "parts": [
       {
        "entity": "e2",
        "min": "0",
        "max": "N",
        "role": ""
       },
       {
        "entity": "e3",
        "min": "1",
        "max": "N",
        "role": ""
       }
      ]
     },
     {
      "id": "a23",
      "kind": "attr",
      "name": "nota",
      "owner": "r22",
      "x": -60,
      "y": 285,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "DECIMAL(4,2)"
     },
     {
      "id": "r24",
      "kind": "rel",
      "name": "Imparte",
      "x": 300,
      "y": 10,
      "identifying": false,
      "parts": [
       {
        "entity": "e4",
        "min": "0",
        "max": "1",
        "role": ""
       },
       {
        "entity": "e3",
        "min": "0",
        "max": "N",
        "role": ""
       }
      ]
     }
    ]
   }
  },
  {
   "id": "biblioteca",
   "name": "Biblioteca (entidad débil, compuesto)",
   "diagram": {
    "version": 1,
    "title": "Biblioteca",
    "nodes": [
     {
      "id": "e1",
      "kind": "entity",
      "name": "Autor",
      "x": -460,
      "y": -160,
      "weak": false
     },
     {
      "id": "e2",
      "kind": "entity",
      "name": "Libro",
      "x": -60,
      "y": -160,
      "weak": false
     },
     {
      "id": "e3",
      "kind": "entity",
      "name": "Ejemplar",
      "x": -60,
      "y": 170,
      "weak": true
     },
     {
      "id": "e4",
      "kind": "entity",
      "name": "Socio",
      "x": 420,
      "y": 170,
      "weak": false
     },
     {
      "id": "a5",
      "kind": "attr",
      "name": "id_autor",
      "owner": "e1",
      "x": -580,
      "y": -230,
      "key": true,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "INTEGER"
     },
     {
      "id": "a6",
      "kind": "attr",
      "name": "nombre",
      "owner": "e1",
      "x": -460,
      "y": -255,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "VARCHAR(100)"
     },
     {
      "id": "a7",
      "kind": "attr",
      "name": "nacionalidad",
      "owner": "e1",
      "x": -610,
      "y": -145,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "VARCHAR(50)"
     },
     {
      "id": "a8",
      "kind": "attr",
      "name": "isbn",
      "owner": "e2",
      "x": -170,
      "y": -240,
      "key": true,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "VARCHAR(13)"
     },
     {
      "id": "a9",
      "kind": "attr",
      "name": "titulo",
      "owner": "e2",
      "x": -40,
      "y": -260,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "VARCHAR(100)"
     },
     {
      "id": "a10",
      "kind": "attr",
      "name": "anio",
      "owner": "e2",
      "x": 80,
      "y": -230,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "INTEGER"
     },
     {
      "id": "a11",
      "kind": "attr",
      "name": "num_ejemplar",
      "owner": "e3",
      "x": -230,
      "y": 160,
      "key": false,
      "partial": true,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "INTEGER"
     },
     {
      "id": "a12",
      "kind": "attr",
      "name": "estado",
      "owner": "e3",
      "x": -210,
      "y": 240,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "VARCHAR(50)"
     },
     {
      "id": "a13",
      "kind": "attr",
      "name": "id_socio",
      "owner": "e4",
      "x": 580,
      "y": 100,
      "key": true,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "INTEGER"
     },
     {
      "id": "a14",
      "kind": "attr",
      "name": "nombre",
      "owner": "e4",
      "x": 595,
      "y": 170,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "VARCHAR(100)"
     },
     {
      "id": "a15",
      "kind": "attr",
      "name": "telefono",
      "owner": "e4",
      "x": 580,
      "y": 240,
      "key": false,
      "partial": false,
      "multi": true,
      "derived": false,
      "required": false,
      "dtype": "VARCHAR(15)"
     },
     {
      "id": "a16",
      "kind": "attr",
      "name": "direccion",
      "owner": "e4",
      "x": 450,
      "y": 280,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "VARCHAR(100)"
     },
     {
      "id": "a17",
      "kind": "attr",
      "name": "calle",
      "owner": "a16",
      "x": 350,
      "y": 350,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "VARCHAR(100)"
     },
     {
      "id": "a18",
      "kind": "attr",
      "name": "numero",
      "owner": "a16",
      "x": 450,
      "y": 370,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "INTEGER"
     },
     {
      "id": "a19",
      "kind": "attr",
      "name": "cp",
      "owner": "a16",
      "x": 550,
      "y": 350,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "VARCHAR(5)"
     },
     {
      "id": "r20",
      "kind": "rel",
      "name": "Escribe",
      "x": -260,
      "y": -160,
      "identifying": false,
      "parts": [
       {
        "entity": "e1",
        "min": "1",
        "max": "1",
        "role": ""
       },
       {
        "entity": "e2",
        "min": "1",
        "max": "N",
        "role": ""
       }
      ]
     },
     {
      "id": "r21",
      "kind": "rel",
      "name": "Tiene",
      "x": -60,
      "y": 5,
      "identifying": true,
      "parts": [
       {
        "entity": "e2",
        "min": "1",
        "max": "1",
        "role": ""
       },
       {
        "entity": "e3",
        "min": "1",
        "max": "N",
        "role": ""
       }
      ]
     },
     {
      "id": "r22",
      "kind": "rel",
      "name": "Préstamo",
      "x": 180,
      "y": 170,
      "identifying": false,
      "parts": [
       {
        "entity": "e3",
        "min": "0",
        "max": "N",
        "role": ""
       },
       {
        "entity": "e4",
        "min": "0",
        "max": "N",
        "role": ""
       }
      ]
     },
     {
      "id": "a23",
      "kind": "attr",
      "name": "fecha_prestamo",
      "owner": "r22",
      "x": 120,
      "y": 265,
      "key": true,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "DATE"
     },
     {
      "id": "a24",
      "kind": "attr",
      "name": "fecha_devolucion",
      "owner": "r22",
      "x": 260,
      "y": 275,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "DATE"
     }
    ]
   }
  },
  {
   "id": "empresa",
   "name": "Empresa (relación reflexiva)",
   "diagram": {
    "version": 1,
    "title": "Empresa",
    "nodes": [
     {
      "id": "e1",
      "kind": "entity",
      "name": "Departamento",
      "x": -440,
      "y": 0,
      "weak": false
     },
     {
      "id": "e2",
      "kind": "entity",
      "name": "Empleado",
      "x": 40,
      "y": 0,
      "weak": false
     },
     {
      "id": "e3",
      "kind": "entity",
      "name": "Proyecto",
      "x": 480,
      "y": 0,
      "weak": false
     },
     {
      "id": "a4",
      "kind": "attr",
      "name": "id_dep",
      "owner": "e1",
      "x": -550,
      "y": -75,
      "key": true,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "INTEGER"
     },
     {
      "id": "a5",
      "kind": "attr",
      "name": "nombre",
      "owner": "e1",
      "x": -605,
      "y": 5,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "VARCHAR(100)"
     },
     {
      "id": "a6",
      "kind": "attr",
      "name": "presupuesto",
      "owner": "e1",
      "x": -550,
      "y": 80,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "DECIMAL(10,2)"
     },
     {
      "id": "a7",
      "kind": "attr",
      "name": "id_emp",
      "owner": "e2",
      "x": -110,
      "y": -80,
      "key": true,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "INTEGER"
     },
     {
      "id": "a8",
      "kind": "attr",
      "name": "nombre",
      "owner": "e2",
      "x": 20,
      "y": -100,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "VARCHAR(100)"
     },
     {
      "id": "a9",
      "kind": "attr",
      "name": "salario",
      "owner": "e2",
      "x": -80,
      "y": 95,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "DECIMAL(10,2)"
     },
     {
      "id": "a10",
      "kind": "attr",
      "name": "fecha_nacimiento",
      "owner": "e2",
      "x": 50,
      "y": 110,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "DATE"
     },
     {
      "id": "a11",
      "kind": "attr",
      "name": "edad",
      "owner": "e2",
      "x": 190,
      "y": 100,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": true,
      "required": false,
      "dtype": "INTEGER"
     },
     {
      "id": "a12",
      "kind": "attr",
      "name": "cod_proyecto",
      "owner": "e3",
      "x": 450,
      "y": -95,
      "key": true,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "VARCHAR(9)"
     },
     {
      "id": "a13",
      "kind": "attr",
      "name": "nombre",
      "owner": "e3",
      "x": 570,
      "y": -80,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "VARCHAR(100)"
     },
     {
      "id": "r14",
      "kind": "rel",
      "name": "Trabaja en",
      "x": -200,
      "y": 0,
      "identifying": false,
      "parts": [
       {
        "entity": "e1",
        "min": "1",
        "max": "1",
        "role": ""
       },
       {
        "entity": "e2",
        "min": "1",
        "max": "N",
        "role": ""
       }
      ]
     },
     {
      "id": "r15",
      "kind": "rel",
      "name": "Dirige",
      "x": 40,
      "y": -230,
      "identifying": false,
      "parts": [
       {
        "entity": "e2",
        "min": "0",
        "max": "1",
        "role": "jefe"
       },
       {
        "entity": "e2",
        "min": "0",
        "max": "N",
        "role": "subordinado"
       }
      ]
     },
     {
      "id": "r16",
      "kind": "rel",
      "name": "Participa",
      "x": 260,
      "y": 0,
      "identifying": false,
      "parts": [
       {
        "entity": "e2",
        "min": "1",
        "max": "N",
        "role": ""
       },
       {
        "entity": "e3",
        "min": "0",
        "max": "N",
        "role": ""
       }
      ]
     },
     {
      "id": "a17",
      "kind": "attr",
      "name": "horas",
      "owner": "r16",
      "x": 260,
      "y": 95,
      "key": false,
      "partial": false,
      "multi": false,
      "derived": false,
      "required": false,
      "dtype": "INTEGER"
     }
    ]
   }
  }
 ]
};
