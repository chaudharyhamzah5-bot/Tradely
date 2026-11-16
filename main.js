const { app, BrowserWindow, WebContentsView, ipcMain, shell, Menu } = require('electron')
const path = require('path')

const APP_NAME = 'Tradely'      // titlebar + window title; change here if you want "AxTrade"
const TITLEBAR_H = 38           // keep in sync with --h in titlebar/titlebar.css

let win, bar, content

function layout() {
    if (!win) return
    const [w, h] = win.getContentSize()
    const full = win.isFullScreen()
    const th = full ? 0 : TITLEBAR_H
    bar.setBounds({ x: 0, y: 0, width: w, height: th })
    bar.setVisible(!full)
    content.setBounds({ x: 0, y: th, width: w, height: Math.max(0, h - th) })
}

function pushState() {
    if (bar && !bar.webContents.isDestroyed()) {
        bar.webContents.send('win:state', { maximized: win.isMaximized(), focused: win.isFocused() })
    }
}

function pushTitle() {
    if (bar && !bar.webContents.isDestroyed()) {
        const t = content.webContents.getTitle() || ''
        bar.webContents.send('win:title', { app: APP_NAME, page: t.replace(/^Tradely\s*[—-]\s*/i, '') })
    }
}

function createWindow() {
    win = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 900,
        minHeight: 600,
        frame: false,                 // no OS title bar: we draw our own
        backgroundColor: '#090a0f',
        icon: path.join(__dirname, 'assets', 'icon.ico'),
        title: APP_NAME
    })
    win.setMenuBarVisibility(false)

    // App content (your Tradely pages) – untouched, so every 100vh layout keeps working.
    content = new WebContentsView({
        webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true }
    })
    // Custom top banner
    bar = new WebContentsView({
        webPreferences: { preload: path.join(__dirname, 'titlebar', 'preload.js'), nodeIntegration: false, contextIsolation: true, sandbox: true }
    })
    win.contentView.addChildView(content)
    win.contentView.addChildView(bar)

    content.webContents.loadFile(path.join(__dirname, 'app', 'tradely.html'))
    bar.webContents.loadFile(path.join(__dirname, 'titlebar', 'titlebar.html'))

    // links that open a new tab/window -> default browser
    content.webContents.setWindowOpenHandler(({ url }) => {
        if (/^https?:/i.test(url)) shell.openExternal(url)
        return { action: 'deny' }
    })
    content.webContents.on('page-title-updated', pushTitle)
    content.webContents.on('did-finish-load', pushTitle)
    bar.webContents.on('did-finish-load', () => { pushTitle(); pushState() })

    layout()
    ;['resize', 'maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen', 'restore'].forEach(e => win.on(e, () => { layout(); pushState() }))
    win.on('focus', pushState)
    win.on('blur', pushState)
    win.on('closed', () => { win = bar = content = null })
}

ipcMain.on('win:minimize', () => win && win.minimize())
ipcMain.on('win:toggle-maximize', () => win && (win.isMaximized() ? win.unmaximize() : win.maximize()))
ipcMain.on('win:close', () => win && win.close())
ipcMain.on('app:reload', () => content && content.webContents.reload())
ipcMain.on('app:devtools', () => content && content.webContents.toggleDevTools())

// only one copy of the app at a time
if (!app.requestSingleInstanceLock()) {
    app.quit()
} else {
    app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus() } })
    app.whenReady().then(() => {
        Menu.setApplicationMenu(null)
        createWindow()
        app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
    })
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
