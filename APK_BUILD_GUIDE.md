# Guía para Generar el APK con GitHub Actions

Este proyecto ya cuenta con la configuración corregida y lista para compilar el **APK de Android** en GitHub Actions sin errores de dependencias ni advertencias de Node.

---

## 🛠️ Correcciones Realizadas para el Error

1. **`Dependencies lock file is not found`:**
   - Ocurría porque `actions/setup-node` tenía activado `cache: 'npm'`, el cual exige estrictamente que exista un archivo `package-lock.json` en el repositorio.
   - Se removió esa restricción y se generó el archivo `package-lock.json` oficial en el proyecto junto con un `.npmrc` (`legacy-peer-deps=true`).
   - Se cambió `npm ci` por `npm install --legacy-peer-deps` para que la instalación funcione siempre, con o sin lockfile.

2. **`Node 20 is being deprecated...`:**
   - Se actualizó el entorno de ejecución en el workflow a **Node 22 (LTS)**, compatible con los nuevos runners de GitHub Actions y Capacitor 6.

---

## 🚀 Pasos para Subir y Obtener el APK

### 1. Hacer commit y push de los cambios a GitHub
Asegúrate de incluir los archivos `.github/workflows/build-apk.yml`, `package-lock.json` y `.npmrc`:

```bash
git add .
git commit -m "fix(ci): update workflow to Node 22 and fix npm dependencies"
git push origin main
```
*(o a la rama `master` si usas esa)*

### 2. Ejecutar la compilación en GitHub
1. Entra a tu repositorio en **GitHub**.
2. Ve a la pestaña **"Actions"**.
3. Selecciona el flujo **"Build and Release Android APK"**.
4. Si no inició automáticamente, pulsa en el botón **"Run workflow"** -> **"Run workflow"**.

### 3. Descargar el APK
1. Cuando termine con éxito (icono verde ✅):
2. Haz clic en la ejecución completada.
3. Desplázate hacia abajo hasta la sección **"Artifacts"**.
4. Descarga el paquete **`YouTube-Cassette-Player-APK`**.
5. Descomprímelo para obtener:
   - `YouTube-Cassette-Player-debug.apk`
6. Transfiérelo a tu teléfono/tablet Android e instálalo.
