# Guía para Generar el APK con GitHub Actions y Novedades

Este proyecto ya cuenta con la configuración corregida y lista para compilar el **APK de Android** en GitHub Actions con el **icono temático de cassette aplicado** y el **buscador universal activo**.

---

## 🛠️ Correcciones Realizadas

### 1. 🔍 Buscador Universal Corregido:
- **Antes**: El buscador solo filtraba las 5 canciones de muestra preinstaladas. Si escribías cualquier otro artista o tema (ej. Queen, Coldplay, Bad Bunny) no devolvía resultados.
- **Ahora**:
  - Busca en tiempo real en la red musical oficial (**iTunes / Apple Music CDN**) mostrando portadas en alta resolución, álbum, año y duración.
  - Al pulsar en cualquier resultado, se carga inmediatamente en el cassette con su carátula original y se reproduce en YouTube.
  - **Detección instantánea de YouTube**: Si pegas cualquier enlace de YouTube (`youtube.com/watch?v=...`, `youtu.be/...`, shorts o ID), el buscador detecta el video automáticamente y te permite reproducirlo o guardarlo con 1 clic.
  - Botón directo de **"Buscar en YouTube y Reproducir"** para cualquier término de búsqueda.

### 2. 🎨 Icono de la App en el APK de Android:
- **Antes**: Al compilar el APK con Capacitor, Android usaba los iconos por defecto (el robot genérico de Capacitor) porque no se inyectaban en las carpetas `res/mipmap-*` del proyecto Android nativo.
- **Ahora**:
  - Se crearon los iconos oficiales en formato PNG en todas las resoluciones estándar de Android: `mipmap-mdpi`, `mipmap-hdpi`, `mipmap-xhdpi`, `mipmap-xxhdpi` y `mipmap-xxxhdpi` (icono normal, redondeado y foreground adaptativo).
  - El flujo de GitHub Actions (`build-apk.yml`) ahora inyecta automáticamente el icono del cassette temático en el APK compilado y establece el nombre de la app como **MixCasete**.
  - En la versión web / PWA se configuraron `icon-192.png`, `icon-512.png` y `manifest.json`.

---

## 🚀 Pasos para Subir y Obtener el APK con el Icono Aplicado

### 1. Hacer commit y push de los cambios a GitHub
Asegúrate de incluir todos los cambios en tu repositorio:

```bash
git add .
git commit -m "fix: universal music search and android launcher icon injection"
git push origin main
```
*(o a la rama `master` si tu repositorio usa esa)*

### 2. Ejecutar la compilación en GitHub
1. Entra a tu repositorio en **GitHub**.
2. Ve a la pestaña **"Actions"**.
3. Selecciona el flujo **"Build and Release Android APK"**.
4. Pulsa en el botón **"Run workflow"** -> **"Run workflow"**.

### 3. Descargar el APK
1. Cuando termine con éxito (icono verde ✅):
2. Haz clic en la ejecución completada.
3. Desplázate hacia abajo hasta la sección **"Artifacts"**.
4. Descarga el paquete **`YouTube-Cassette-Player-APK`**.
5. Descomprímelo para obtener `YouTube-Cassette-Player-debug.apk`.
6. Instálalo en tu teléfono Android: ahora verás el **icono temático del cassette retro** en el cajón de aplicaciones de tu móvil.
