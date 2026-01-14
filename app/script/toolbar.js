// 工具栏逻辑

'use strict'

const { newFileDialog, saveFileDialog } = require('./fileOperation')
const { invokeCompiler, invokeAssembler, invokeSerialPort } = require('./toolchain')
const { $, getProperty } = require('./utils')
const { initSideBarLow } = require('./sidebar')
const { refreshExplorer } = require('./autoRefresh')
const { isTerminalOpen, startPowerShell } = require('./terminal')
const path = require('path')
const dialog = require('electron').remote.dialog
const fs = require('fs')

function defaultFunc() {
  alert('当前功能尚未开发完毕！')
}

const handlers = {
  'new-file': async () => {
    await newFileDialog('新建文件')()
    refreshExplorer()
  },
  // prettier-ignore
  'save': () => {
    !getProperty('currentFilePath') ? newFileDialog('保存为') : saveFileDialog()
  },
  'save-as': () => {
    newFileDialog('另存为')
  },
  // prettier-ignore
  'compile': () => {
    
    const currentPath = getProperty('currentPath')
    const currentFilePath = getProperty('currentFilePath')
    if (currentFilePath && currentPath) {
      // 确保PowerShell已打开（只显示终端，不改变其大小状态）
      if (!isTerminalOpen()) {
        const console = $('#console')
        
        if (console) {
          // 只显示终端，确保不处于最大化状态
          console.style.display = 'flex'
          // 确保没有最大化class
          console.classList.remove('maximized')
          // 确保状态不是最大化
          if (typeof window.terminalMaximized !== 'undefined') {
            window.terminalMaximized = false
          }
          // 确保没有内联样式设置position等属性
          console.style.position = ''
          console.style.top = ''
          console.style.left = ''
          console.style.right = ''
          console.style.bottom = ''
          console.style.zIndex = ''
          console.style.height = ''
          console.style.flex = ''
          
          // 不要触发 resize 事件，避免导致编辑器布局问题
          // window.dispatchEvent(new Event('resize'))
          
        }
        startPowerShell()
        
        setTimeout(() => {
          const realOutputPath = path.join(currentPath, './out', path.basename(currentFilePath), './')
          fs.mkdirSync(realOutputPath, {recursive: true})
          
          invokeCompiler(currentFilePath, realOutputPath).then(() => {
            
            refreshExplorer()
          })
        }, 500)
      } else {
        
        const realOutputPath = path.join(currentPath, './out', path.basename(currentFilePath), './')
        fs.mkdirSync(realOutputPath, {recursive: true})
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
  // prettier-ignore
  'assembly': () => {
    
    const currentPath = getProperty('currentPath')
    const currentFilePath = getProperty('currentFilePath')
    if (currentFilePath && currentPath) {
      // 确保PowerShell已打开（只显示终端，不改变其大小状态）
      if (!isTerminalOpen()) {
        const console = $('#console')
        
        if (console) {
          // 只显示终端，确保不处于最大化状态
          console.style.display = 'flex'
          // 确保没有最大化class
          console.classList.remove('maximized')
          // 确保状态不是最大化
          if (typeof window.terminalMaximized !== 'undefined') {
            window.terminalMaximized = false
          }
          // 确保没有内联样式设置position等属性
          console.style.position = ''
          console.style.top = ''
          console.style.left = ''
          console.style.right = ''
          console.style.bottom = ''
          console.style.zIndex = ''
          console.style.height = ''
          console.style.flex = ''
          
          // 不要触发 resize 事件，避免导致编辑器布局问题
          // window.dispatchEvent(new Event('resize'))
          
        }
        startPowerShell()
        
        setTimeout(() => {
          const realOutputPath = path.join(currentPath, './out', path.basename(currentFilePath), './')
          fs.mkdirSync(realOutputPath, {recursive: true})
          
          invokeAssembler(currentFilePath, realOutputPath, 0).then(() => {
            
            refreshExplorer()
          })
        }, 500)
      } else {
        
        const realOutputPath = path.join(currentPath, './out', path.basename(currentFilePath), './')
        fs.mkdirSync(realOutputPath, {recursive: true})
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
  'assembly-and-link': () => {
    
    const currentPath = getProperty('currentPath')
    const currentFilePath = getProperty('currentFilePath')
    if (currentFilePath && currentPath) {
      // 确保PowerShell已打开（只显示终端，不改变其大小状态）
      if (!isTerminalOpen()) {
        const console = $('#console')
        
        if (console) {
          // 只显示终端，确保不处于最大化状态
          console.style.display = 'flex'
          // 确保没有最大化class
          console.classList.remove('maximized')
          // 确保状态不是最大化
          if (typeof window.terminalMaximized !== 'undefined') {
            window.terminalMaximized = false
          }
          // 确保没有内联样式设置position等属性
          console.style.position = ''
          console.style.top = ''
          console.style.left = ''
          console.style.right = ''
          console.style.bottom = ''
          console.style.zIndex = ''
          console.style.height = ''
          console.style.flex = ''
          
          // 不要触发 resize 事件，避免导致编辑器布局问题
          // window.dispatchEvent(new Event('resize'))
          
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
  serial: () => {
    const currentFilePath = getProperty('currentFilePath')
    if (currentFilePath) {
      invokeSerialPort(currentFilePath)
    } else {
      dialog.showMessageBox({
        type: 'error',
        title: '错误',
        message: !getProperty('currentFilePath')
          ? '当前未打开文件，请打开一个.txt文件后再次尝试。'
          : '当前未打开工作区，请打开一个工作区后再次尝试。',
        button: ['确定'],
      })
    }
  },
  'magic-click': async () => {
    
    if (getProperty('currentFilePath') && getProperty('currentPath')) {
      // 确保PowerShell已打开（只显示终端，不改变其大小状态）
      if (!isTerminalOpen()) {
        const console = $('#console')
        
        if (console) {
          // 只显示终端，确保不处于最大化状态
          console.style.display = 'flex'
          // 确保没有最大化class
          console.classList.remove('maximized')
          // 确保状态不是最大化
          if (typeof window.terminalMaximized !== 'undefined') {
            window.terminalMaximized = false
          }
          // 确保没有内联样式设置position等属性
          console.style.position = ''
          console.style.top = ''
          console.style.left = ''
          console.style.right = ''
          console.style.bottom = ''
          console.style.zIndex = ''
          console.style.height = ''
          console.style.flex = ''
          
          // 不要触发 resize 事件，避免导致编辑器布局问题
          // window.dispatchEvent(new Event('resize'))
          
        }
        startPowerShell()
        
        await new Promise(resolve => setTimeout(resolve, 500))
        
      }
      
      const currentPath = getProperty('currentPath')
      const currentFilePath = getProperty('currentFilePath')
      // call compiler
      const compilerOutputPath = path.join(currentPath, './out', path.basename(currentFilePath), './')
      fs.mkdirSync(compilerOutputPath, { recursive: true })
      await invokeCompiler(currentFilePath, compilerOutputPath)
      // call assembler
      const asmOutputFile = path.join(compilerOutputPath, path.basename(currentFilePath, '.c') + '.asm')
      const assemblerOutputPath = path.join(currentPath, './out', path.basename(currentFilePath, '.c') + '.asm', './')
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
}

/**
 * 初始化上部工具栏
 */
function initToolBar() {
  const toolbarEl = $('#toolbar');

  // 事件委托：同时兼容 <span class="icon"> 和 <img>
  toolbarEl.addEventListener('click', ev => {
    // 在 toolbar 内找最近的图标元素：.icon 或 img
    const el = ev.target.closest('#toolbar .icon, #toolbar img');
    if (!el) return;                       // 点到空白就忽略
    const fn = handlers[el.id] || defaultFunc;
    try { fn(); } catch (ex) { console.error(ex); }
  })
}
module.exports.initToolBar = initToolBar
