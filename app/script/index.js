'use strict'

const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')
const { createMenuTemplate } = require('./menuTemplate')

// 禁用安全性警告
// FIXME: 暂时注释，避免隐藏调试时的错误
// process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

app.allowRendererProcessReuse = false

app.on('ready', () => {
  // 在主进程中设置菜单
  try {
    const menuTemplate = createMenuTemplate()
    const menu = Menu.buildFromTemplate(menuTemplate)
    Menu.setApplicationMenu(menu)
  } catch (err) {
    console.error('设置菜单失败:', err)
  }
  
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
     backgroundColor: '#252526',   
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      worldSafeExecuteJavaScript: true,
    },
    icon: path.join(__dirname, '../../asset/ide.ico'),
  })

  win.loadFile('./app/view/index.html')
  // win.webContents.openDevTools() // F12
  win.maximize()
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
