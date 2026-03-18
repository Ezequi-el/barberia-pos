@echo off
echo ====================================
echo   NERON POS - Instalacion Completa
echo ====================================
echo.

echo [1/3] Instalando dependencias principales...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Fallo al instalar dependencias principales
    pause
    exit /b 1
)

echo.
echo [2/3] Instalando dependencias para PDF y Excel...
call npm install jspdf jspdf-autotable xlsx
if %errorlevel% neq 0 (
    echo ERROR: Fallo al instalar dependencias de exportacion
    pause
    exit /b 1
)

echo.
echo [3/3] Verificando configuracion...
if exist .env (
    echo ✓ Archivo .env encontrado - Modo Produccion ^(Supabase^)
) else (
    echo ℹ No se encontro .env - Modo Demo ^(localStorage^)
    echo   Para produccion, crea un .env basado en .env.example
)

echo.
echo ====================================
echo   ✓ Instalacion Completada
echo ====================================
echo.
echo Para iniciar el servidor:
echo   npm run dev
echo.
echo Documentacion completa en: README.md
echo.
pause
