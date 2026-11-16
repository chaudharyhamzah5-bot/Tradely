const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('tb', {
    minimize: () => ipcRenderer.send('win:minimize'),
    toggleMaximize: () => ipcRenderer.send('win:toggle-maximize'),
    close: () => ipcRenderer.send('win:close'),
    reload: () => ipcRenderer.send('app:reload'),
    devtools: () => ipcRenderer.send('app:devtools'),
    onState: cb => ipcRenderer.on('win:state', (_e, s) => cb(s)),
    onTitle: cb => ipcRenderer.on('win:title', (_e, t) => cb(t))
})
