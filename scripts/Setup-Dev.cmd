@echo off
setlocal EnableExtensions

echo ============================================================================
echo   ENSALIA - Inicializacion Reproducible del Entorno de Desarrollo (Windows)
echo ============================================================================
echo.

pushd "%~dp0.."
if errorlevel 1 (
    echo [ERROR] No se pudo acceder al directorio raiz del proyecto.
    exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js 20+ LTS no se encuentra en el PATH del sistema.
    echo         Instale Node.js 20 LTS desde https://nodejs.org/ y vuelva a intentar.
    popd
    exit /b 1
)

for /f "delims=" %%v in ('node -p "parseInt(process.versions.node.split('.')[0], 10)"') do set NODE_MAJOR=%%v
if %NODE_MAJOR% LSS 20 (
    echo [ERROR] Se requiere Node.js 20 o superior. Version detectada:
    node -v
    popd
    exit /b 1
)

if not exist ".env" (
    if exist ".env.example" (
        echo [1/5] Creando .env local desde .env.example...
        copy /Y ".env.example" ".env" >nul
    ) else (
        echo [ERROR] No se encontro .env.example en la raiz del repositorio.
        popd
        exit /b 1
    )
) else (
    echo [1/5] Archivo .env existente detectado; se conserva sin sobrescribir.
)

echo [2/5] Instalando dependencias exactas (npm ci)...
if exist "package-lock.json" (
    call npm ci
) else (
    call npm install
)
if errorlevel 1 (
    echo [ERROR] Fallo la instalacion de dependencias npm.
    popd
    exit /b 1
)

echo [3/5] Generando cliente Prisma y sincronizando esquema SQLite local...
call npx prisma generate
if errorlevel 1 (
    echo [ERROR] Fallo la generacion de Prisma Client.
    popd
    exit /b 1
)

call npx prisma migrate deploy
if errorlevel 1 (
    echo [ERROR] Fallo la aplicacion de migraciones Prisma.
    popd
    exit /b 1
)

call npx prisma db push --skip-generate
if errorlevel 1 (
    echo [ERROR] Fallo la sincronizacion de esquema con prisma db push.
    popd
    exit /b 1
)

echo [4/5] Sembrando catalogos base de laboratorio...
call npm run db:seed
if errorlevel 1 (
    echo [ERROR] Fallo el sembrado de datos iniciales (db:seed).
    popd
    exit /b 1
)

echo [5/5] Verificando integridad de tipos TypeScript...
call npm run typecheck
if errorlevel 1 (
    echo [ERROR] Fallo la verificacion de tipos (npm run typecheck).
    popd
    exit /b 1
)

echo.
echo ============================================================================
echo   Entorno de desarrollo ENSALIA listo.
echo ============================================================================
set PORT=3210
echo Iniciando servidor de desarrollo en http://127.0.0.1:3210 ...
call npm run dev -- -p 3210
popd
exit /b %errorlevel%
