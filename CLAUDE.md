# Instrucciones para Claude Code — IMPIANTI BIM Viewer

## Producto
Visor BIM web **de IMPIANTI S.R.L.**, independiente de GLI1. Audiencia: personal de mantenimiento sin experiencia en Revit. Experiencia UX clara, pocos controles, apertura inicial en axonométrica y navegación orbital opcional.

## Arquitectura actual
- `index.html` y `styles.css`: sitio estático sin bundler.
- `src/app.js`: interfaz, estado, proyectos, IndexedDB local, controles, demo SVG.
- `src/ifc-viewer.js`: importación bajo demanda de Web-IFC y Three.js; escena ortográfica IFC.
- Dependencias IFC vía CDN; considerar fijar, autohospedar y auditar las dependencias para producción.

## NO asumir
- IndexedDB NO sincroniza obras con otros usuarios.
- El SVG de demo NO es geometría de un archivo real.
- Los sistemas inferidos desde IFC NO equivalen a una red hidráulica validada.
- Los QR y la ruta hidráulica entre equipos aún NO están implementados.
- Los colores y la fuente del logo deben contrastarse con Calias antes de considerar la identidad cerrada.

## Objetivos de evolución
1. Verificar con IFC real exportado desde Revit con categorías, niveles y sistemas.
2. Procesar IFC una vez en pipeline de publicación, dividir por obra/nivel, crear formatos optimizados y manifiesto de propiedades.
3. API de obras, almacenamiento privado, autenticación y permisos de operación/mantenimiento.
4. Ficha de equipo con identificador estable (`Revit UniqueId` / `IFC GlobalId`) y QR.
5. Mantener un modo ligero de proximidad por geometría: los equipos de aire, chillers o bombas pueden estar sin conectar físicamente a caños o conductos en Revit. Al seleccionar un equipo, ofrecer «Resaltar cercanos» sin afirmar conexión verificada. El técnico interpreta ida, retorno, mando e inyección por colores y filtro de sistemas; el grafo de conectores no es un requisito para el prototipo.
6. Añadir un mapeo configurable de sistemas por obra, priorizando la propiedad IFC exportada de «Nombre de sistema» cuando esté disponible, o parámetros alternativos como «Comentarios», «Abreviatura de sistema» o parámetros compartidos de Revit. No inferir siempre por proximidad.
7. Para identificación de equipos: empezar por clase/categoría IFC (equipos mecánicos, terminales, bombas, válvulas), niveles y códigos/etiquetas; permitir correcciones manuales.
8. Exportador opcional C# Revit 2025/2026/2027 solo si aporta valor futuro, no bloquear la experiencia de mantenimiento.
6. Integración modular al Centro de Operaciones existente sin romper sus rutas, seguridad ni datos.

## UX y filtros obligatorios
- Audiencia: mantenimiento, incluso desde un teléfono luego de escanear un QR. No exigir conocimientos BIM.
- Selector principal: obra → piso → equipo. La etiqueta visible debe priorizar **nombre de tipo Revit**, leyendo la relación IFC `IfcRelDefinesByType`. Si no existe, usar nombre de instancia, etiqueta y finalmente clase IFC. No confundir familia con tipo.
- Independientemente del sistema, permitir marcar/desmarcar categorías IFC: arquitectura, equipos, cañerías, accesorios de cañerías, conductos rígidos, conductos flexibles y terminales. Atajos: Solo equipos, Cañerías + equipos y Ver todo.
- Después permitir filtrar por sistema: agua fría, agua caliente, mando, retorno, inyección, extracción, etc., si el IFC conserva los parámetros. Parámetro configurable por obra: Nombre de sistema, Comentarios, abreviatura o compartido.
- Mostrar proximidad de instalaciones alrededor de un equipo sin exigir conectores. **No afirmar que haya una conexión real**.
- Cámara ortográfica axonométrica predeterminada, planta y órbita opcionales. Gran legibilidad de controles móviles.
- Diferenciar muy claramente el SVG de demo (ilustrativo) de la carga real de IFC.

## Reglas de trabajo
- Proponer cambios incrementales; ejecutar pruebas antes de integrar.
- No reemplazar otros módulos del Centro de Operaciones.
- Evitar exponer planos o activos de clientes en el repositorio público.
- No atribuir al sistema funciones que todavía no existen.
- Preservar accesibilidad, responsive, separación entre datos, interfaz y renderer.
- No registrar contraseñas, tokens ni datos privados en repositorio o navegador.
