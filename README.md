# IMPIANTI · Visor BIM de instalaciones

Interfaz ligera para que mantenimiento consulte obras por nivel, instalación y equipo, con una vista axonométrica fácil de usar.

## Estado: MVP de validación

- Inicio con listado de obras, búsqueda y creación de una obra.
- Carga de IFC local desde el navegador; visualización tridimensional por Web-IFC + Three.js (dependencias bajo demanda).
- Filtros por niveles, instalaciones, colores editables, cámara axonométrica/planta/orbitar, selección de elementos y panel de información.
- Ejemplo ilustrativo incluido para probar la interfaz sin un IFC.
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

1. Abrir «Explorar demo» para verificar niveles, sistemas, ficha de equipo y vistas.
2. «Nueva obra» → nombre, ubicación y archivo .ifc → «Crear y abrir».
3. Esperar el análisis IFC; los archivos grandes pueden necesitar bastante memoria o demorar.
4. Seleccionar SS1, SS2, PB u otro nivel exportado. Activar/desactivar instalaciones, seleccionar un elemento y orbitar con el botón.
5. Verificar en el IFC real la clasificación de sistemas: depende de cómo Revit exportó tipos, relaciones y nombres. Si faltan datos, no se inventan.

## Limitaciones técnicas del MVP

- IFC como formato de entrada, no archivos .RVT directos.
- Lectura y geometría en el propio navegador; todavía no hay conversión persistida optimizada ni streaming.
- Los sistemas se infieren a partir de nombres de elementos y grupos IFC; algunas exportaciones de Revit pueden perder relaciones MEP. El recorrido conectado de cañerías requiere un futuro exportador específico Revit API.
- No se garantiza rendimiento con un hospital completo hasta probar con modelos reales.
- No hay cuentas, roles ni almacenamiento compartido. No cargar información sensible en un despliegue público sin implementar permisos.
- Biblioteca Web-IFC con licencia MPL-2.0; Three.js bajo MIT. Revisar las licencias de sus versiones antes del despliegue empresarial.

## Identidad

La tipografía del logo y los colores están centralizados en `styles.css`. La referencia `https://calias-uy.vercel.app/` no pudo inspeccionarse con precisión en el entorno de autoría; los valores actuales son **provisionales** y deben contrastarse con una captura o los CSS de Calias. La tipografía del resto de la interfaz es independiente del logo.

## Integración con el centro de operaciones

Leer `CLAUDE.md` antes de integrar. Este código es un MVP independiente; preservarlo como módulo y agregar una API autenticada por etapas. El repositorio es público: no subir archivos IFC reales de clientes, planos protegidos ni tokens.

## Titularidad

El repositorio no incluye una licencia general de reutilización porque su titularidad y autorización deben acordarse con IMPIANTI S.R.L. No confundir el acceso público al código con una licencia de terceros.
