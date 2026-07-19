const {
  app,
  BrowserWindow,
  dialog,
  Tray,
  Menu,
  nativeImage,
  ipcMain
} = require('electron')

const { autoUpdater } = require('electron-updater')
const path = require('path')
const fs = require('fs')

function getBackendRuntimeDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'backend-runtime')
    : path.join(__dirname, '..', 'backend-runtime')
}

function getFrontendDistDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'frontend', 'dist')
    : path.join(__dirname, '..', 'frontend', 'dist')
}

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})
let mainWindow = null
let backendServer = null
let tray = null
let isQuitting = false
let updaterConfigured = false

function sendUpdateStatus(status, extra = {}) {
  if (
    mainWindow &&
    !mainWindow.isDestroyed()
  ) {
    mainWindow.webContents.send(
      'update-status',
      {
        status,
        ...extra
      }
    )
  }
}

ipcMain.handle(
  'check-for-updates',
  async () => {
    if (!app.isPackaged) {
      return {
        success: false,
        message:
          'Las actualizaciones solo funcionan en la aplicación instalada.'
      }
    }

    try {
      sendUpdateStatus('checking', {
        message: 'Buscando actualizaciones...'
      })

      const result =
        await autoUpdater.checkForUpdates()

      return {
        success: true,
        currentVersion: app.getVersion(),
        latestVersion:
          result?.updateInfo?.version ||
          app.getVersion()
      }
    } catch (error) {
      console.error(
        'Error buscando actualización:',
        error
      )

      sendUpdateStatus('error', {
        message:
          error?.message ||
          'No se pudo buscar la actualización.'
      })

      return {
        success: false,
        message:
          error?.message ||
          'No se pudo buscar la actualización.'
      }
    }
  }
)

ipcMain.handle('install-update', () => {
  if (!app.isPackaged) {
    return {
      success: false,
      message:
        'La instalación solo funciona en la aplicación instalada.'
    }
  }

  isQuitting = true

  setImmediate(() => {
    autoUpdater.quitAndInstall(
      false,
      true
    )
  })

  return {
    success: true
  }
})


/*
  Evita que se abran dos copias de la aplicación.
  Si el usuario vuelve a ejecutar el acceso directo,
  se mostrará la ventana que estaba oculta.
*/
const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
}

app.on('second-instance', () => {
  showMainWindow()
})

function copySeedData(destination) {
  fs.mkdirSync(destination, {
    recursive: true
  })

  // No copiar cuentas, usuarios, trades,
  // performance ni información privada.
}

function startBackend() {
  const dataDir = path.join(
    app.getPath('userData'),
    'data'
  )

  copySeedData(dataDir)

  process.env.JJ_DATA_DIR = dataDir
  process.env.NODE_ENV = app.isPackaged
    ? 'production'
    : 'development'

  const Module = require('module')
  const backendDir = getBackendRuntimeDir()

  const backendModules = path.join(
    backendDir,
    'modules'
  )

  const backendPath = path.join(
    backendDir,
    'server.js'
  )

  if (!fs.existsSync(backendPath)) {
    throw new Error(
      `No se encontró server.js en:\n${backendPath}\n\nEjecuta: npm run prepare:backend`
    )
  }

  if (!fs.existsSync(backendModules)) {
    throw new Error(
      `No se encontraron los módulos en:\n${backendModules}\n\nEjecuta: npm run prepare:backend`
    )
  }

  if (
    !fs.existsSync(
      path.join(backendModules, 'express')
    )
  ) {
    throw new Error(
      `Express no fue incluido en:\n${path.join(
        backendModules,
        'express'
      )}\n\nEjecuta: npm run prepare:backend`
    )
  }

  process.env.NODE_PATH = backendModules
  Module._initPaths()

  const loaded = require(backendPath)

  backendServer =
    loaded && loaded.server
      ? loaded.server
      : null
}

function configureAutoUpdater() {
  if (updaterConfigured) {
    return
  }

  updaterConfigured = true

  if (!app.isPackaged) {
    console.log(
      'Actualizaciones desactivadas en desarrollo'
    )
    return
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = false

  autoUpdater.on(
  'checking-for-update',
  () => {
    console.log(
      'Buscando actualizaciones...'
    )

    sendUpdateStatus('checking', {
      message: 'Buscando actualizaciones...'
    })
  }
)

autoUpdater.on(
  'update-available',
  info => {
    console.log(
      `Actualización disponible: ${info.version}`
    )

    sendUpdateStatus('available', {
      version: info.version,
      message:
        `Versión ${info.version} encontrada. Descargando...`
    })
  }
)

autoUpdater.on(
  'update-not-available',
  info => {
    console.log(
      `Aplicación actualizada: ${info.version}`
    )

    sendUpdateStatus('not-available', {
      version: info.version,
      message:
        `Ya tienes la versión más reciente: ${app.getVersion()}`
    })
  }
)

autoUpdater.on(
  'download-progress',
  progress => {
    const percentage = Math.round(
      progress.percent || 0
    )

    console.log(
      `Descargando actualización: ${percentage}%`
    )

    sendUpdateStatus('downloading', {
      percent: percentage,
      message:
        `Descargando actualización: ${percentage}%`
    })
  }
)

autoUpdater.on(
  'update-downloaded',
  info => {
    console.log(
      `Actualización descargada: ${info.version}`
    )

    sendUpdateStatus('downloaded', {
      version: info.version,
      message:
        `La versión ${info.version} está lista para instalar.`
    })
  }
)

autoUpdater.on(
  'error',
  error => {
    console.error(
      'Error del actualizador:',
      error
    )

    sendUpdateStatus('error', {
      message:
        error?.message ||
        'Ocurrió un error con la actualización.'
    })
  }
)
setTimeout(() => {
  autoUpdater
    .checkForUpdates()
    .catch(error => {
      console.error(
        'No se pudo buscar actualización:',
        error
      )

      sendUpdateStatus('error', {
        message:
          error?.message ||
          'No se pudo buscar la actualización.'
      })
    })
}, 5000)
}
function createTray() {
  if (tray) {
    return
  }

  /*
    Windows intentará obtener el icono desde
    el ejecutable de la aplicación.
  */
 const trayIconPath = path.join(
  __dirname,
  'assets',
  'icon.png'
)

let trayIcon =
  nativeImage.createFromPath(
    trayIconPath
  )

if (trayIcon.isEmpty()) {
  console.error(
    'No se pudo cargar el icono:',
    trayIconPath
  )

  trayIcon = nativeImage.createEmpty()
}

  tray = new Tray(trayIcon)

  tray.setToolTip(
    'J&J Company Bro está ejecutándose'
  )

  const contextMenu =
    Menu.buildFromTemplate([
      {
        label: 'Abrir J&J Company Bro',
        click: () => {
          showMainWindow()
        }
      },
{
  label: 'Buscar actualizaciones',
  click: () => {
    if (!app.isPackaged) {
      dialog.showMessageBox({
        type: 'info',
        title: 'Modo desarrollo',
        message:
          'La búsqueda de actualizaciones solo funciona en la aplicación instalada.'
      })

      return
    }

    autoUpdater
      .checkForUpdatesAndNotify()
      .catch(error => {
        dialog.showErrorBox(
          'Error de actualización',
          error.message || String(error)
        )
      })
  }
},
      {
        type: 'separator'
      },
      {
        label: 'Salir completamente',
        click: () => {
          isQuitting = true
          app.quit()
        }
      }
    ])

  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    showMainWindow()
  })
}

function showMainWindow() {
  if (!mainWindow) {
    createWindow()
    return
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }

  mainWindow.show()
  mainWindow.focus()
}

function createWindow() {
mainWindow = new BrowserWindow({
  width: 1500,
  height: 900,
  minWidth: 1100,
  minHeight: 700,
  backgroundColor: '#06101d',
  autoHideMenuBar: true,
  show: false,

  icon: path.join(
    __dirname,
    'assets',
    'icon.ico'
  ),

  webPreferences: {
    preload: path.join(
      __dirname,
      'preload.js'
    ),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true
  }
})

  mainWindow.once(
    'ready-to-show',
    () => {
      mainWindow.show()
    }
  )

  const frontendIndexPath = path.join(
    getFrontendDistDir(),
    'index.html'
  )

  if (!fs.existsSync(frontendIndexPath)) {
    throw new Error(
      `No se encontró el frontend compilado en:\n${frontendIndexPath}\n\nEjecuta: npm run build:frontend`
    )
  }

  mainWindow.loadFile(frontendIndexPath)

  /*
    Pulsar X ya no cierra completamente.
    Solo oculta la ventana y mantiene
    backend + Journal funcionando.
  */
  mainWindow.on('close', event => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow.hide()

      if (tray) {
        tray.displayBalloon({
          title: 'J&J Company Bro',
          content:
            'La aplicación continúa funcionando en segundo plano.'
        })
      }
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.once(
    'did-finish-load',
    () => {
      configureAutoUpdater()
    }
  )
}

function enableWindowsStartup() {
  if (!app.isPackaged) {
    return
  }

  app.setLoginItemSettings({
    openAtLogin: true,
    path: process.execPath
  })
}

app.whenReady().then(() => {
  try {
    startBackend()
    createTray()
    createWindow()
    enableWindowsStartup()
  } catch (error) {
    console.error(error)

    dialog.showErrorBox(
      'Error iniciando J&J Company Bro',
      error.message || String(error)
    )

    isQuitting = true
    app.quit()
  }
})

/*
  No cerrar la aplicación cuando la ventana
  desaparezca. Debe seguir trabajando.
*/
app.on('window-all-closed', () => {
  // No ejecutar app.quit()
})

app.on('activate', () => {
  showMainWindow()
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('will-quit', () => {
  if (backendServer) {
    try {
      backendServer.close()
    } catch (error) {
      console.error(
        'Error cerrando backend:',
        error
      )
    }
  }

  if (tray) {
    tray.destroy()
    tray = null
  }
})