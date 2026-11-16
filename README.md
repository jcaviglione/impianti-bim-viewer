# IMPIANTI · Visor BIM de instalaciones

Interfaz ligera para que mantenimiento consulte obras por nivel, instalación y equipo, con una vista axonométrica fácil de usar.

## Estado: Primera versión para prueba con IFC real

- Inicio con listado de obras, búsqueda y creación de una obra.
- Carga de IFC local desde el navegador; visualización tridimensional por Web-IFC + Three.js (dependencias bajo demanda).
- Filtros por niveles, instalaciones, colores editables, cámara axonométrica/planta/orbitar, selección de elementos y panel de información.
- Catálogo inicial de equipos por clase IFC y nivel, más búsqueda visual de elementos MEP **cercanos** a un equipo. El visor no presupone conectores ni conexiones hidráulicas; usa geometría y proximidad. La asociación es orientativa, no una certificación de conexión.
- Obras y archivos IFC guardados **solo en IndexedDB del navegador que los cargó**. No existe todavía un backend ni publicación compartida entre dispositivos.
- Enlace a obra/equipo y QR real: **pendiente**, no afirmar que ya funciona.

## Ejecutar

No requiere instalar dependencias para la interfaz:

```bash
python3 -m http.server 4173
```

Abrir `http://localhost:4173`.

Alternativa: publicar este repositorio como sitio estático (GitHub Pages/Vercel/Cloudflare Pages). Se requiere conexión a internet para cargar fuentes y las dependencias del conversor IFC al importar.

> Aviso: En esta primera versión, subir un archivo no lo envía al servidor. Permanece solo en el navegador y se vuelve a procesar al abrir el proyecto. Para obras grandes y mantenimiento multiusuario, la siguiente etapa es conversión IFC → Fragments o GLB por obra/nivel en servidor y almacenamiento privado con permisos.

## Cómo probar

1. «Nueva obra» → nombre, ubicación y archivo .ifc → «Crear y abrir».
2. Esperar a que cargue el modelo IFC; los archivos grandes pueden necesitar bastante memoria.
3. Seleccionar un nivel y mostrar u ocultar equipos, cañerías, conductos y accesorios con las casillas.
4. Seleccionar un equipo para ver su tipo y las instalaciones cercanas.
5. Comprobar que el IFC conserva las categorías, niveles y nombres de tipo que se cargaron desde Revit.

## Controles de visibilidad

El prototipo dispone de casillas independientes por **categoría de elemento**: arquitectura, equipos, cañerías, accesorios de cañerías, conductos rígidos, conductos flexibles y terminales. Incluye accesos rápidos: **Solo equipos**, **Cañerías + equipos**, **Ver todo**.

El filtro por **sistema** es independiente y permite ocultar instalaciones por color. El prototipo deduce grupos básicos desde nombres IFC; mapear parámetros como `Comentarios`, `Nombre de sistema`, `Abreviatura de sistema` o parámetros compartidos es trabajo de integración posterior.

La lista de equipos busca primero su **nombre de tipo** desde `IfcRelDefinesByType`; si no llega exportado, se utiliza el nombre de instancia o el identificador. En la versión actual también pueden seleccionarse directamente elementos en la vista.

## Limitaciones técnicas

- IFC como formato de entrada, no archivos .RVT directos.
- Lectura y geometría en el propio navegador; todavía no hay conversión persistida optimizada ni streaming.
- Los sistemas se infieren a partir de nombres de elementos y grupos IFC; algunas exportaciones de Revit pueden perder relaciones MEP. No es necesario demostrar conectividad MEP para usar los colores y localizar tuberías próximas: el técnico puede interpretar el recorrido visualmente. Un exportador adicional de conectores sería opcional.
- No se garantiza rendimiento con un hospital completo hasta probar con modelos reales.
- No hay cuentas, roles ni almacenamiento compartido. No cargar información sensible en un despliegue público sin implementar permisos.
- Biblioteca Web-IFC con licencia MPL-2.0; Three.js bajo MIT. Revisar las licencias de sus versiones antes del despliegue empresarial.

## Identidad

La tipografía del logo y los colores están centralizados en `styles.css`. La interfaz toma como referencia las capturas suministradas de Calias: blanco, negro, grises, retícula sutil y naranja. El logo de tres «i» es una aproximación tipográfica; para reproducirlo exactamente se necesitará el recurso oficial. El resto de la interfaz usa una tipografía legible independiente. La tipografía del resto de la interfaz es independiente del logo.

## Integración con el centro de operaciones

Leer `CLAUDE.md` antes de integrar. Este código es un MVP independiente; preservarlo como módulo y agregar una API autenticada por etapas. El repositorio es público: no subir archivos IFC reales de clientes, planos protegidos ni tokens.

## Titularidad

El repositorio no incluye una licencia general de reutilización porque su titularidad y autorización deben acordarse con IMPIANTI S.R.L. No confundir el acceso público al código con una licencia de terceros.
