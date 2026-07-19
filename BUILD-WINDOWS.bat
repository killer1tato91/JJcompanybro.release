@echo off
setlocal
cd /d "%~dp0"
echo ================================================
echo  J^&J Company Bro - Generador de instalador EXE
echo ================================================
echo.
where node >nul 2>nul || (
  echo ERROR: Node.js no esta instalado.
  echo Instala Node.js LTS y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)

echo [1/4] Instalando Electron y electron-builder...
call npm install
if errorlevel 1 goto :error

echo [2/4] Verificando dependencias del frontend...
call npm --prefix frontend install
if errorlevel 1 goto :error

echo [3/4] Creando frontend de produccion...
call npm --prefix frontend run build
if errorlevel 1 goto :error

echo [4/4] Generando instalador de Windows...
call npx electron-builder --win nsis
if errorlevel 1 goto :error

echo.
echo LISTO. El instalador esta dentro de la carpeta release.
start "" "%~dp0release"
pause
exit /b 0

:error
echo.
echo ERROR: No se pudo completar la compilacion.
echo Revisa el mensaje mostrado arriba.
pause
exit /b 1
