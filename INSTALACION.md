# 🚀 Instrucciones de Instalación Rápida

## Opción 1: Script Automático (Recomendado)

Haz doble clic en:
```
install.bat
```

## Opción 2: Manual

Ejecuta estos comandos en orden:

```bash
# 1. Instalar dependencias principales
npm install

# 2. Instalar dependencias para exportación PDF/Excel
npm install jspdf jspdf-autotable xlsx

# 3. Iniciar el servidor
npm run dev
```

## 🎭 Modo Demo (Sin configuración)

- No necesitas configurar nada
- Usa cualquier email/password para login
- Los datos se guardan en el navegador

## ☁️ Modo Producción (Con Supabase)

1. Copia `.env.example` a `.env`
2. Agrega tus credenciales de Supabase
3. Reinicia el servidor

---

**Documentación completa**: Ver `README.md`
