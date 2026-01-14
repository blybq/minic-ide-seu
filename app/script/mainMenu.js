// 菜单栏逻辑

'use strict'

const { app, Menu, dialog } = require('electron').remote
const { setProperty, getProperty, $ } = require('./utils')
const { initSideBarLow } = require('./sidebar')
const child_process = require('child_process')
const { newFileDialog, openFileDialog, saveFileDialog } = require('./fileOperation')
const { invokeCompiler, invokeAssembler, invokeSerialPort } = require('./toolchain')
const { isTerminalOpen, startPowerShell } = require('./terminal')
const { refreshExplorer } = require('./autoRefresh')
const path = require('path')
const fs = require('fs')

const menuTemplate = [
  {
    label: '文件',
    submenu: [
      {
        label: '新建文件',
        accelerator: 'ctrl+n',
        click: async () => {
          await newFileDialog('新建文件')
          refreshExplorer()
        },
      },
      {
        label: '打开文件',
        accelerator: 'ctrl+o',
        click: openFileDialog,
      },
      {
        label: '打开工作区',
        click: async () => {
          try {
            const result = await dialog.showOpenDialog({ properties: ['openFile', 'openDirectory'] })
            const selectedPath = result.filePaths && result.filePaths[0]
            if (selectedPath) {
              setProperty('currentPath', selectedPath)
              // 确保路径设置后再刷新
              setTimeout(() => {
                refreshExplorer()
                document.title = getProperty('currentPath') + ' - Minisys IDE'
              }, 100)
            }
          } catch (err) {
            console.error('打开工作区失败:', err)
            dialog.showMessageBox({
              type: 'error',
              title: '错误',
              message: `打开工作区失败: ${err.message}`,
              buttons: ['确定']
            })
          }
        },
      },
      {
        type: 'separator',
      },
      {
        label: '保存',
        accelerator: 'ctrl+s',
        click: () => {
          !getProperty('currentFilePath') ? newFileDialog('保存为') : saveFileDialog()
        },
      },
      {
        label: '另存为',
        accelerator: '',
        click: () => {
          newFileDialog('另存为')
        },
      },
      {
        type: 'separator',
      },
      {
        label: '退出',
        accelerator: 'alt+f4',
        click: () => {
          app.quit()
        },
      },
    ],
  },
  {
    label: '编辑',
    submenu: [
      {
        label: '撤销',
        accelerator: 'ctrl+z',
        role: 'undo',
      },
      {
        label: '重做',
        accelerator: 'ctrl+y',
        role: 'redo',
      },
      {
        type: 'separator',
      },
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
        label: '查找',
        accelerator: 'ctrl+f',
        click: () => {
          if (window.editor) {
            window.editor.execCommand('find')
          }
        },
      },
      {
        label: '替换',
        accelerator: 'ctrl+h',
        click: () => {
          if (window.editor) {
            window.editor.execCommand('replace')
          }
        },
      },
    ],
  },
  {
    label: '运行',
    submenu: [
      {
        label: '一键执行',
        accelerator: 'f5',
        click: async () => {
          if (getProperty('currentFilePath') && getProperty('currentPath')) {
            const currentPath = getProperty('currentPath')
            const currentFilePath = getProperty('currentFilePath')
            // call compiler
            const compilerOutputPath = path.join(currentPath, './out', path.basename(currentFilePath), './')
            fs.mkdirSync(compilerOutputPath, { recursive: true })
            // 确保PowerShell已打开
            if (!isTerminalOpen()) {
              const console = $('#console')
              if (console) {
                console.style.display = 'flex'
                window.dispatchEvent(new Event('resize'))
              }
              startPowerShell()
              await new Promise(resolve => setTimeout(resolve, 500))
            }
            
            await invokeCompiler(currentFilePath, compilerOutputPath)
            // call assembler
            const asmOutputFile = path.join(compilerOutputPath, path.basename(currentFilePath, '.c') + '.asm')
            const assemblerOutputPath = path.join(
              currentPath,
              './out',
              path.basename(currentFilePath, '.c') + '.asm',
              './'
            )
            fs.mkdirSync(assemblerOutputPath, { recursive: true })
            await invokeAssembler(asmOutputFile, assemblerOutputPath, 1)
            // call serialport
            invokeSerialPort(path.join(assemblerOutputPath, 'serial.txt'))
            // 自动刷新
            refreshExplorer()
          } else {
            dialog.showMessageBox({
              type: 'error',
              title: '错误',
              message: !getProperty('currentFilePath')
                ? '当前未打开文件，请打开一个.c文件后再次尝试。'
                : '当前未打开工作区，请打开一个工作区后再次尝试。',
              button: ['确定'],
            })
          }
        },
      },
      {
        label: '编译',
        accelerator: 'f6',
        click: () => {
          const currentPath = getProperty('currentPath')
          const currentFilePath = getProperty('currentFilePath')
          if (currentFilePath && currentPath) {
            // 确保PowerShell已打开
            if (!isTerminalOpen()) {
              const console = $('#console')
              if (console) {
                console.style.display = 'flex'
                window.dispatchEvent(new Event('resize'))
              }
              startPowerShell()
              setTimeout(() => {
                const realOutputPath = path.join(currentPath, './out', path.basename(currentFilePath), './')
                fs.mkdirSync(realOutputPath, { recursive: true })
                invokeCompiler(currentFilePath, realOutputPath).then(() => {
                  refreshExplorer()
                })
              }, 500)
            } else {
              const realOutputPath = path.join(currentPath, './out', path.basename(currentFilePath), './')
              fs.mkdirSync(realOutputPath, { recursive: true })
              invokeCompiler(currentFilePath, realOutputPath).then(() => {
                refreshExplorer()
              })
            }
          } else {
            dialog.showMessageBox({
              type: 'error',
              title: '错误',
              message: !currentFilePath
                ? '当前未打开文件，请打开一个.c文件后再次尝试。'
                : '当前未打开工作区，请打开一个工作区后再次尝试。',
              button: ['确定'],
            })
          }
        },
      },
      {
        label: '汇编',
        accelerator: 'f7',
        click: () => {
          const currentPath = getProperty('currentPath')
          const currentFilePath = getProperty('currentFilePath')
          if (currentFilePath && currentPath) {
            // 确保PowerShell已打开
            if (!isTerminalOpen()) {
              const console = $('#console')
              if (console) {
                console.style.display = 'flex'
                window.dispatchEvent(new Event('resize'))
              }
              startPowerShell()
              setTimeout(() => {
                const realOutputPath = path.join(currentPath, './out', path.basename(currentFilePath), './')
                fs.mkdirSync(realOutputPath, { recursive: true })
                invokeAssembler(currentFilePath, realOutputPath, 0).then(() => {
                  refreshExplorer()
                })
              }, 500)
            } else {
              const realOutputPath = path.join(currentPath, './out', path.basename(currentFilePath), './')
              fs.mkdirSync(realOutputPath, { recursive: true })
              invokeAssembler(currentFilePath, realOutputPath, 0).then(() => {
                refreshExplorer()
              })
            }
          } else {
            dialog.showMessageBox({
              type: 'error',
              title: '错误',
              message: !getProperty('currentFilePath')
                ? '当前未打开文件，请打开一个.asm文件后再次尝试。'
                : '当前未打开工作区，请打开一个工作区后再次尝试。',
              button: ['确定'],
            })
          }
        },
      },
      {
        label: '汇编并链接',
        accelerator: 'f8',
        click: () => {
          const currentPath = getProperty('currentPath')
          const currentFilePath = getProperty('currentFilePath')
          if (currentFilePath && currentPath) {
            // 确保PowerShell已打开
            if (!isTerminalOpen()) {
              const console = $('#console')
              if (console) {
                console.style.display = 'flex'
                window.dispatchEvent(new Event('resize'))
              }
              startPowerShell()
              setTimeout(() => {
                const realOutputPath = path.join(currentPath, './out', path.basename(currentFilePath), './')
                fs.mkdirSync(realOutputPath, { recursive: true })
                invokeAssembler(currentFilePath, realOutputPath, 1).then(() => {
                  refreshExplorer()
                })
              }, 500)
            } else {
              const realOutputPath = path.join(currentPath, './out', path.basename(currentFilePath), './')
              fs.mkdirSync(realOutputPath, { recursive: true })
              invokeAssembler(currentFilePath, realOutputPath, 1).then(() => {
                refreshExplorer()
              })
            }
          } else {
            dialog.showMessageBox({
              type: 'error',
              title: '错误',
              message: !getProperty('currentFilePath')
                ? '当前未打开文件，请打开一个.asm文件后再次尝试。'
                : '当前未打开工作区，请打开一个工作区后再次尝试。',
              button: ['确定'],
            })
          }
        },
      },
      {
        label: '串口烧写',
        accelerator: 'f9',
        click: () => {
          invokeSerialPort('x.txt') 
        },
      },
      {
        type: 'separator',
      },
      {
        label: '新建终端',
        accelerator: 'ctrl+`',
        click: () => {
          const { isTerminalOpen, startPowerShell } = require('./terminal')
          const console = $('#console')
          if (isTerminalOpen && isTerminalOpen()) {
            dialog.showMessageBox({
              type: 'info',
              title: '提示',
              message: 'PowerShell已打开',
              button: ['确定'],
            })
          } else {
            if (console) {
              console.style.display = 'flex'
              window.dispatchEvent(new Event('resize'))
            }
            startPowerShell()
          }
        },
      },
      {
        label: '开发者工具',
        accelerator: 'f12',
        role: 'toggledevtools',
      },
    ],
  },
  {
    label: '帮助',
    submenu: [
      {
        label: '文档与关于',
        click: () => {
          dialog.showMessageBox({
            type: 'info',
            title: '提示',
            message: '目前未完成，尽情期待。',
            button: ['确定']
         })
        }
      },
    ],
  },
]

/**
 * 初始化上部菜单栏
 */
function initMainMenu() {
  // 检查 Menu 和 remote 是否可用
  if (!Menu) {
    console.error('Menu is not available via electron.remote')
    return
  }
  
  try {
    const builtMenu = Menu.buildFromTemplate(menuTemplate)
    Menu.setApplicationMenu(builtMenu)
    
    // Menu initialized successfully
  } catch (err) {
    console.error('初始化菜单失败:', err)
    // 也输出到控制台以便调试
    if (window.console && window.console.error) {
      window.console.error('Menu initialization error:', err)
    }
  }
}
module.exports.initMainMenu = initMainMenu
