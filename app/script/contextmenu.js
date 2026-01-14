// 右键菜单逻辑

'use strict'

const { $ } = require('./utils')
const remote = require('electron').remote
const { Menu } = remote
const editorContextmenu = $('#editor')

let contextMenu = [
  {
    label: '全选',
    accelerator: 'ctrl+a',
    role: 'selectall',
  },
  {
    label: '剪切',
    accelerator: 'ctrl+x',
    role: 'cut',
  },
  {
    label: '复制',
    accelerator: 'ctrl+c',
    role: 'copy',
  },
  {
    label: '粘贴',
    accelerator: 'ctrl+v',
    role: 'paste',
  },
  {
    type: 'separator',
  },
  {
    label: '格式化代码',
    click: (item, focusedWindow) => {
      if (focusedWindow) {
        focusedWindow.webContents.executeJavaScript(`
          (async () => {
            try {
              const { formatCurrentFile } = require('../script/formatter')
              await formatCurrentFile()
            } catch (err) {
              console.error('格式化代码失败:', err)
              const { dialog } = require('electron').remote
              dialog.showErrorBox('格式化失败', err.message || String(err))
            }
          })()
        `).catch(err => {
          console.error('执行格式化代码失败:', err)
        })
      }
    },
  },
]

let menu = Menu.buildFromTemplate(contextMenu)

editorContextmenu.addEventListener('contextmenu', e => {
  e.preventDefault()
  menu.popup({ window: remote.getCurrentWindow() })
})
// editor内的右键菜单
