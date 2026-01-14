// 菜单模板定义（可在主进程和渲染进程中使用）

'use strict'

/**
 * 创建菜单模板
 * 这个函数返回菜单模板，但 click 回调需要在渲染进程中执行
 * 因此需要通过 IPC 或 executeJavaScript 来调用渲染进程的函数
 */
function createMenuTemplate() {
  return [
    {
      label: '文件',
      submenu: [
        {
          label: '新建文件',
          accelerator: 'ctrl+n',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.executeJavaScript(`
                (async () => {
                  try {
                    const { newFileDialog } = require('../script/fileOperation')
                    const { refreshExplorer } = require('../script/autoRefresh')
                    await newFileDialog('新建文件')
                    refreshExplorer()
                  } catch (err) {
                    console.error('新建文件失败:', err)
                  }
                })()
              `).catch(err => console.error('执行新建文件失败:', err))
            }
          },
        },
        {
          label: '打开文件',
          accelerator: 'ctrl+o',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.executeJavaScript(`
                try {
                    const { openFileDialog } = require('../script/fileOperation')
                  openFileDialog()
                } catch (err) {
                  console.error('打开文件失败:', err)
                }
              `).catch(err => console.error('执行打开文件失败:', err))
            }
          },
        },
        {
          label: '打开工作区',
          click: async (item, focusedWindow) => {
            // 如果没有 focusedWindow，尝试获取当前窗口
            const { BrowserWindow, dialog } = require('electron')
            const targetWindow = focusedWindow || BrowserWindow.getFocusedWindow()
            
            if (!targetWindow) {
              console.error('没有可用的窗口')
              return
            }
            
            try {
              const result = await dialog.showOpenDialog(targetWindow, {
                properties: ['openFile', 'openDirectory']
              })
              
              if (!result.canceled && result.filePaths && result.filePaths[0]) {
                const selectedPath = result.filePaths[0]
                
                // 使用正确的路径分隔符
                const normalizedPath = selectedPath.replace(/\\/g, '/')
                
                targetWindow.webContents.executeJavaScript(`
                  (function() {
                    try {
                      const { setProperty, getProperty } = require('../script/utils')
                      const { initSideBarLow } = require('../script/sidebar')
                      const treeView = document.querySelector('#tree-view')
                      
                      setProperty('currentPath', ${JSON.stringify(normalizedPath)})
                      
                      if (treeView) {
                        initSideBarLow(${JSON.stringify(normalizedPath)}, treeView, true)
                        const currentPath = getProperty('currentPath')
                        document.title = (currentPath || '未打开工作区') + ' - Minisys IDE'
                      } else {
                        setTimeout(() => {
                          const retryTreeView = document.querySelector('#tree-view')
                          if (retryTreeView) {
                            initSideBarLow(${JSON.stringify(normalizedPath)}, retryTreeView, true)
                            const currentPath = getProperty('currentPath')
                            document.title = (currentPath || '未打开工作区') + ' - Minisys IDE'
                          }
                        }, 200)
                      }
                    } catch (err) {
                      console.error('设置工作区失败:', err)
                    }
                  })()
                `).catch(err => {
                  console.error('执行设置工作区失败:', err)
                })
              }
            } catch (err) {
              console.error('打开工作区对话框失败:', err)
            }
          },
        },
        {
          type: 'separator',
        },
        {
          label: '保存',
          accelerator: 'ctrl+s',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.executeJavaScript(`
                try {
                  const { getProperty } = require('../script/utils')
                  const { newFileDialog, saveFileDialog } = require('../script/fileOperation')
                  !getProperty('currentFilePath') ? newFileDialog('保存为') : saveFileDialog()
                } catch (err) {
                  console.error('保存文件失败:', err)
                }
              `).catch(err => console.error('执行保存文件失败:', err))
            }
          },
        },
        {
          label: '另存为',
          accelerator: '',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.executeJavaScript(`
                try {
                  const { newFileDialog } = require('../script/fileOperation')
                  newFileDialog('另存为')
                } catch (err) {
                  console.error('另存为失败:', err)
                }
              `).catch(err => console.error('执行另存为失败:', err))
            }
          },
        },
        {
          type: 'separator',
        },
        {
          label: '退出',
          accelerator: 'alt+f4',
          role: 'quit',
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
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.executeJavaScript(`
                try {
                  if (window.editor) {
                    window.editor.execCommand('find')
                  }
                } catch (err) {
                  console.error('查找失败:', err)
                }
              `).catch(err => console.error('执行查找失败:', err))
            }
          },
        },
        {
          label: '替换',
          accelerator: 'ctrl+h',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.executeJavaScript(`
                try {
                  if (window.editor) {
                    window.editor.execCommand('replace')
                  }
                } catch (err) {
                  console.error('替换失败:', err)
                }
              `).catch(err => console.error('执行替换失败:', err))
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
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.executeJavaScript(`
                (async () => {
                  try {
                    const { getProperty } = require('../script/utils')
                    const { invokeCompiler, invokeAssembler, invokeSerialPort } = require('../script/toolchain')
                    const { isTerminalOpen, startPowerShell } = require('../script/terminal')
                    const { refreshExplorer } = require('../script/autoRefresh')
                    const path = require('path')
                    const fs = require('fs')
                    const { dialog } = require('electron').remote
                    
                    if (getProperty('currentFilePath') && getProperty('currentPath')) {
                      const currentPath = getProperty('currentPath')
                      const currentFilePath = getProperty('currentFilePath')
                      const compilerOutputPath = path.join(currentPath, './out', path.basename(currentFilePath), './')
                      fs.mkdirSync(compilerOutputPath, { recursive: true })
                      
                      if (!isTerminalOpen()) {
                        const console = document.querySelector('#console')
                        if (console) {
                          console.style.display = 'flex'
                          window.dispatchEvent(new Event('resize'))
                        }
                        startPowerShell()
                        await new Promise(resolve => setTimeout(resolve, 500))
                      }
                      
                      await invokeCompiler(currentFilePath, compilerOutputPath)
                      const asmOutputFile = path.join(compilerOutputPath, path.basename(currentFilePath, '.c') + '.asm')
                      const assemblerOutputPath = path.join(currentPath, './out', path.basename(currentFilePath, '.c') + '.asm', './')
                      fs.mkdirSync(assemblerOutputPath, { recursive: true })
                      await invokeAssembler(asmOutputFile, assemblerOutputPath, 1)
                      invokeSerialPort(path.join(assemblerOutputPath, 'serial.txt'))
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
                  } catch (err) {
                    console.error('一键执行失败:', err)
                  }
                })()
              `).catch(err => console.error('执行一键执行失败:', err))
            }
          },
        },
        {
          label: '编译',
          accelerator: 'f6',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.executeJavaScript(`
                try {
                  const { getProperty } = require('../script/utils')
                  const { invokeCompiler } = require('../script/toolchain')
                  const { isTerminalOpen, startPowerShell } = require('../script/terminal')
                  const { refreshExplorer } = require('../script/autoRefresh')
                  const path = require('path')
                  const fs = require('fs')
                  const { dialog } = require('electron').remote
                  
                  const currentPath = getProperty('currentPath')
                  const currentFilePath = getProperty('currentFilePath')
                  if (currentFilePath && currentPath) {
                    if (!isTerminalOpen()) {
                      const console = document.querySelector('#console')
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
                } catch (err) {
                  console.error('编译失败:', err)
                }
              `).catch(err => console.error('执行编译失败:', err))
            }
          },
        },
        {
          label: '汇编',
          accelerator: 'f7',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.executeJavaScript(`
                try {
                  const { getProperty } = require('../script/utils')
                  const { invokeAssembler } = require('../script/toolchain')
                  const { isTerminalOpen, startPowerShell } = require('../script/terminal')
                  const { refreshExplorer } = require('../script/autoRefresh')
                  const path = require('path')
                  const fs = require('fs')
                  const { dialog } = require('electron').remote
                  
                  const currentPath = getProperty('currentPath')
                  const currentFilePath = getProperty('currentFilePath')
                  if (currentFilePath && currentPath) {
                    if (!isTerminalOpen()) {
                      const console = document.querySelector('#console')
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
                } catch (err) {
                  console.error('汇编失败:', err)
                }
              `).catch(err => console.error('执行汇编失败:', err))
            }
          },
        },
        {
          label: '汇编并链接',
          accelerator: 'f8',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.executeJavaScript(`
                try {
                  const { getProperty } = require('../script/utils')
                  const { invokeAssembler } = require('../script/toolchain')
                  const { isTerminalOpen, startPowerShell } = require('../script/terminal')
                  const { refreshExplorer } = require('../script/autoRefresh')
                  const path = require('path')
                  const fs = require('fs')
                  const { dialog } = require('electron').remote
                  
                  const currentPath = getProperty('currentPath')
                  const currentFilePath = getProperty('currentFilePath')
                  if (currentFilePath && currentPath) {
                    if (!isTerminalOpen()) {
                      const console = document.querySelector('#console')
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
                } catch (err) {
                  console.error('汇编并链接失败:', err)
                }
              `).catch(err => console.error('执行汇编并链接失败:', err))
            }
          },
        },
        {
          label: '串口烧写',
          accelerator: 'f9',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.executeJavaScript(`
                try {
                  const { invokeSerialPort } = require('../script/toolchain')
                  invokeSerialPort('x.txt')
                } catch (err) {
                  console.error('串口烧写失败:', err)
                }
              `).catch(err => console.error('执行串口烧写失败:', err))
            }
          },
        },
        {
          type: 'separator',
        },
        {
          label: '新建终端',
          accelerator: 'ctrl+`',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.executeJavaScript(`
                try {
                  const { isTerminalOpen, startPowerShell } = require('../script/terminal')
                  const { $ } = require('../script/utils')
                  const { dialog } = require('electron').remote
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
                } catch (err) {
                  console.error('新建终端失败:', err)
                }
              `).catch(err => console.error('执行新建终端失败:', err))
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
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.executeJavaScript(`
                try {
                  const { dialog } = require('electron').remote
                  dialog.showMessageBox({
                    type: 'info',
                    title: '提示',
                    message: '目前未完成，尽情期待。',
                    button: ['确定']
                  })
                } catch (err) {
                  console.error('显示文档失败:', err)
                }
              `).catch(err => console.error('执行显示文档失败:', err))
            }
          },
        },
      ],
    },
  ]
}

module.exports = { createMenuTemplate }
