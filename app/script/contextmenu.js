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
]

let menu = Menu.buildFromTemplate(contextMenu)

editorContextmenu.addEventListener('contextmenu', e => {
  e.preventDefault()
  menu.popup({ window: remote.getCurrentWindow() })
})
// editor内的右键菜单
