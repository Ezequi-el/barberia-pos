# Script de instalación para Neron POS

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  NERON POS - Instalación Completa" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
Write-Host "[1/4] Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js instalado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js no encontrado. Por favor instala Node.js primero." -ForegroundColor Red
    exit 1
}

# Instalar dependencias principales
Write-Host ""
Write-Host "[2/4] Instalando dependencias principales..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencias principales instaladas" -ForegroundColor Green
} else {
    Write-Host "✗ Error instalando dependencias principales" -ForegroundColor Red
    exit 1
}

# Instalar dependencias de exportación
Write-Host ""
Write-Host "[3/4] Instalando dependencias para PDF y Excel..." -ForegroundColor Yellow
npm install jspdf jspdf-autotable xlsx
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencias de exportación instaladas (jspdf, jspdf-autotable, xlsx)" -ForegroundColor Green
} else {
    Write-Host "✗ Error instalando dependencias de exportación" -ForegroundColor Red
    exit 1
}

# Resumen
Write-Host ""
Write-Host "[4/4] Verificando configuración..." -ForegroundColor Yellow

if (Test-Path ".env") {
    Write-Host "✓ Archivo .env encontrado - Modo Producción (Supabase)" -ForegroundColor Green
} else {
    Write-Host "ℹ No se encontró .env - Modo Demo (localStorage)" -ForegroundColor Cyan
    Write-Host "  → Para producción, crea un .env basado en .env.example" -ForegroundColor Gray
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  ✓ Instalación Completada" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para iniciar el servidor:" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "Documentación completa en: README.md" -ForegroundColor Gray
