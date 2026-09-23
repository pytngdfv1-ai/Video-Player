# Guía para Generar el APK con GitHub Actions

Este proyecto ya cuenta con la configuración lista para empaquetarse en un archivo **APK de Android** automáticamente cada vez que subas cambios o ejecutes el flujo manualmente en GitHub.

---

## 📁 Archivos Creados

1. **`.github/workflows/build-apk.yml`**:
   - Flujo de trabajo de GitHub Actions automatizado.
   - Instala Node.js 20, Java JDK 17 y Android SDK.
   - Compila la aplicación web (`npm run build`).
   - Sincroniza con Capacitor Android y aplica permisos de red e Internet.
   - Configura la orientación en modo horizontal/apaisado (`sensorLandscape`) óptima para la consola cassette Hi-Fi.
   - Compila el instalador APK mediante Gradle (`./gradlew assembleDebug`).
   - Publica el archivo resultante como un **Artefacto descargable** listo para instalar en cualquier teléfono o tablet Android.

2. **`capacitor.config.json`**:
   - Configuración de la aplicación nativa (`com.mixcasete.youtubecassette`).
   - Nombre: `YouTube Cassette Player`.
   - Soporte para audio/video web y peticiones seguras de streaming.

---

## 🚀 Pasos para Obtener el APK

### 1. Subir el proyecto a un repositorio de GitHub
Si aún no has subido el código:
```bash
git init
git add .
git commit -m "feat: setup APK build with GitHub Actions"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

### 2. Ejecutar o Ver la Construcción
1. Ve a tu repositorio en **GitHub**.
2. Haz clic en la pestaña **"Actions"** en la barra superior.
3. Verás el flujo **"Build and Release Android APK"**.
   - Se ejecutará automáticamente en cada `push` a `main` o `master`.
   - También puedes lanzarlo manualmente seleccionando el flujo y haciendo clic en el botón **"Run workflow"**.

### 3. Descargar el APK
1. Una vez termine el flujo (marcado con un check verde ✅):
2. Haz clic sobre la ejecución completada.
3. Al final de la página verás la sección **Artifacts**.
4. Descarga el paquete comprimido **`YouTube-Cassette-Player-APK`**, descomprímelo y dentro tendrás:
   - `YouTube-Cassette-Player-debug.apk`
5. Pásalo a tu dispositivo Android e instálalo (permite la instalación de fuentes desconocidas).

---

## 💡 Probar localmente (Opcional)
Si tienes Android Studio instalado en tu equipo y deseas depurarlo en vivo:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npm run build
npx cap add android
npx cap open android
```
Esto abrirá el proyecto en Android Studio donde podrás ejecutarlo en tu emulador o dispositivo conectado por USB.
