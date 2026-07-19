J&J COMPANY BRO - VERSION DE ESCRITORIO

QUE SE PREPARO
- Electron abre la plataforma como aplicacion de Windows.
- El backend Express inicia automaticamente en 127.0.0.1:3001.
- El frontend React se carga desde archivos locales, sin Chrome.
- Los datos se guardan en AppData/Roaming/J&J Company Bro/data.
- El AddOn de NinjaTrader sigue comunicandose por localhost:3001.
- El instalador crea accesos directos en Escritorio y menu Inicio.

COMO GENERAR EL EXE EN WINDOWS
1. Extrae todo el ZIP en una carpeta normal.
2. Instala Node.js LTS si no esta instalado.
3. Haz doble clic en BUILD-WINDOWS.bat.
4. Espera a que termine.
5. El instalador aparecera dentro de release:
   J&J-Company-Bro-Setup-1.0.0.exe

IMPORTANTE
- La primera compilacion necesita internet para descargar Electron.
- El AddOn de NinjaTrader no se convierte en EXE; se instala/importa en NinjaTrader.
- No publiques un EXE que contenga claves reales de Stripe, Gmail u otros secretos.
