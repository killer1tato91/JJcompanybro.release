const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('jjDesktop', {
  isDesktop: true,
  platform: process.platform,

  getAppVersion: () =>
    ipcRenderer.invoke('get-app-version'),

  checkForUpdates: () =>
    ipcRenderer.invoke('check-for-updates'),

  installUpdate: () =>
    ipcRenderer.invoke('install-update'),

  onUpdateStatus: callback => {
    const listener = (_event, data) => {
      callback(data)
    }

    ipcRenderer.on('update-status', listener)

    return () => {
      ipcRenderer.removeListener(
        'update-status',
        listener
      )
    }
  }
})