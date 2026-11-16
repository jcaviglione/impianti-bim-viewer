# Modelo de validación BIM — IMPIANTI

Archivo de referencia para pruebas reales: `SAS_EH_ITM_1SS_Cañerias.ifc`.

Ubicación de origen: carpeta `minichiller` en Google Drive de IMPIANTI. Tamaño observado: 512.886.506 bytes (~513 MB decimal).

**El IFC real NO se incluye en este repositorio público.** Se carga manualmente desde el navegador. No publicar binarios de clientes, planos ni credenciales.

## Criterios de aceptación

1. En escritorio, la geometría queda centrada dentro de un rectángulo de altura estable; un catálogo extenso de equipos nunca alarga la vista 3D.
2. En móvil, el visor aparece primero y los filtros quedan debajo con scroll propio.
3. Solo se listan equipos mecánicos; `M_Difusor de suministro...` y `M_Difusor de retorno...` son **terminales de aire**, no equipos.
4. El nombre visible de cada equipo prioriza el `Name` del tipo IFC asociado por `IfcRelDefinesByType`, con alternativa al nombre de instancia.
5. Se puede mostrar/ocultar por separado arquitectura, equipos, tuberías, accesorios, conductos, flexibles y terminales.
6. Los niveles y sistemas que aparezcan deben proceder del IFC, nunca de datos ficticios.
7. La vista inicial es axonométrica ortográfica. Planta y orbitar son opciones secundarias.
8. Cañerías y conductos cerca de un equipo pueden destacarse por proximidad, sin inferir un vínculo físico.
9. Las obras se cargan localmente para esta fase. Los archivos mayores a 120 MiB se abren solo en la sesión del navegador: no se intenta persistir semejante binario en IndexedDB.
10. Si el navegador no puede procesar un IFC de ~513 MB, registrar memoria/tiempo de carga y evaluar preprocesamiento por piso, categoría y sistema para producción.

## Estado

Se corrigió la altura de la interfaz y la clasificación inicial de equipos. La carga y rendimiento con **este IFC completo** aún no están validados en navegador. No anunciar la validación hasta probarlo en un equipo real.

## Próxima fase

- Mapear `Comentarios`, `Nombre de sistema` y parámetros alternativos de Revit si IFC no conserva la clasificación MEP.
- Preprocesar modelos pesados a geometría optimizada + catálogo de equipos por nivel.
- Incorporar URL/QR permanente por equipo en el hosting definitivo.
