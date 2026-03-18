# NERON POS - Modo Demo Local 🎭

Este POS ahora funciona en **dos modos**:

## 🚀 Modo Demo (Sin Supabase)
- **Autenticación**: Acepta cualquier email/password
- **Almacenamiento**: LocalStorage del navegador
- **Datos iniciales**: Se cargan automáticamente del archivo `constants.ts`
- **Ideal para**: Desarrollo local, pruebas, demos

## ☁️ Modo Producción (Con Supabase)
- **Autenticación**: Validación real con Supabase
- **Almacenamiento**: Base de datos Supabase
- **Datos iniciales**: Seed manual desde la base de datos
- **Ideal para**: Despliegue en producción

---

## 📦 Instalación

### 1. Instalar dependencias

```bash
npm install
```

### 2. Instalar dependencias adicionales para exportación (PDF/Excel)

```bash
npm install jspdf jspdf-autotable xlsx
```

O si tienes problemas con PowerShell:

```bash
powershell -ExecutionPolicy Bypass -Command "npm install jspdf jspdf-autotable xlsx"
```

### 3. Configurar variables de entorno (Opcional)

#### Para Modo Demo (Sin configuración):
- **No hagas nada**. El sistema detectará automáticamente que no hay credenciales y usará modo demo.

#### Para Modo Producción:
1. Crea un archivo `.env` en la raíz del proyecto
2. Copia el contenido de `.env.example`
3. Reemplaza con tus credenciales reales de Supabase:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anon_aqui
```

---

## 🎮 Uso

### Iniciar en Modo Demo

```bash
npm run dev
```

- Al abrir la app, intenta hacer login con **cualquier** email y password
- Ejemplo: `demo@test.com` / `12345`
- Los datos se guardarán en el navegador (localStorage)

### Iniciar en Modo Producción

1. Configura las variables de entorno (ver arriba)
2. Ejecuta:

```bash
npm run dev
```

- El sistema detectará las credenciales y usará Supabase
- Debes usar credenciales válidas para login

---

## 🔥 Nuevas Funcionalidades

### ✅ Exportación de Reportes

**PDF Profesional**:
- Click en "Descargar PDF" en la sección de Reportes
- Genera un documento con KPIs, gráficos y tabla de transacciones

**Excel Real** (no CSV):
- Click en "Exportar Excel" en la sección de Reportes
- Genera archivo `.xlsx` con dos hojas:
  - Hoja 1: Resumen de KPIs
  - Hoja 2: Transacciones detalladas

### ✅ Impresión de Tickets

- Al finalizar una venta, click en "Imprimir Ticket"
- Optimizado para impresoras térmicas de 80mm
- Solo se imprime el ticket (sin interfaz)

---

## 🗂️ Estructura de Datos en Modo Demo

Los datos se almacenan en `localStorage` con las siguientes keys:

```javascript
{
  "neron_catalog": [...],      // Productos y servicios
  "neron_transactions": [...], // Historial de ventas
  "neron_seeded": true         // Flag de inicialización
}
```

Para **resetear los datos** en modo demo:
1. Abre DevTools (F12)
2. Ve a: Application → Local Storage → http://localhost:XXXX
3. Elimina las keys `neron_*`
4. Recarga la página

---

## 🛠️ Desarrollo

### Estructura Modificada

- `lib/supabase.ts`: Detecta credenciales y retorna `isDemoMode`
- `lib/database.ts`: Capa dual (Supabase + localStorage)
- `contexts/AuthContext.tsx`: Autenticación híbrida
- `components/Reports.tsx`: Exportación PDF/Excel
- `index.html`: Estilos de impresión para tickets

### Cambiar entre modos

**Demo → Producción**:
1. Agrega credenciales en `.env`
2. Reinicia el servidor (`npm run dev`)

**Producción → Demo**:
1. Elimina o comenta las credenciales en `.env`
2. Reinicia el servidor

---

## 📝 Notas Importantes

- **Modo Demo es solo para desarrollo**. No usar en producción.
- Los datos en localStorage son locales al navegador/dispositivo
- Limpiar caché del navegador eliminará todos los datos en modo demo
- Las dependencias `jspdf`, `jspdf-autotable` y `xlsx` son necesarias para exportación

---

## 🐛 Troubleshooting

**Error: "Missing Supabase environment variables"**
- ✅ Esto es normal si configuraste mal las credenciales
- Solución: Elimina el `.env` para volver a modo demo

**Error al exportar PDF/Excel**
- ✅ Verifica que instalaste las dependencias:
  ```bash
  npm install jspdf jspdf-autotable xlsx
  ```

**Los datos no persisten entre recargas (Modo Demo)**
- ✅ Verifica que localStorage no esté bloqueado
- ✅ No uses modo incógnito

---

¡Listo para desarrollar! 🚀
