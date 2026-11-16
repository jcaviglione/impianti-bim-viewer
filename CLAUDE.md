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
5. Exportador C# Revit 2025/2026/2027 para conectores MEP y trazado de redes.
6. Integración modular al Centro de Operaciones existente sin romper sus rutas, seguridad ni datos.

## Reglas de trabajo
- Proponer cambios incrementales; ejecutar pruebas antes de integrar.
- No reemplazar otros módulos del Centro de Operaciones.
- Evitar exponer planos o activos de clientes en el repositorio público.
- No atribuir al sistema funciones que todavía no existen.
- Preservar accesibilidad, responsive, separación entre datos, interfaz y renderer.
- No registrar contraseñas, tokens ni datos privados en repositorio o navegador.
