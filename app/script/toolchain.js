const child_process = require('child_process')
const fs = require('fs')
const path = require('path')
const jsonPath = path.join(__dirname, '../../config/ToolchainSettings.json')
const dialog = require('electron').remote.dialog
const { $ } = require('./utils')
const { executeCommand, isTerminalOpen, startPowerShell, terminalProcess } = require('./terminal')

/**
 * 生成asm文件
 * @param {*} sourceFilePath 待编译的文件的绝对路径
 * @param {*} outputPath 生成的asm文件的绝对路径
 */
module.exports.invokeCompiler = function (sourceFilePath, outputPath) {
  return new Promise((resolve, reject) => {
    sourceFilePath = sourceFilePath.replace(/\\/g, '/')
    outputPath = outputPath.replace(/\\/g, '/')

    if (sourceFilePath) {
      fs.readFile(jsonPath, 'utf8', (err, data) => {
        if (err) {
          console.error(err)
          dialog.showMessageBox({
            type: 'error',
            title: '错误',
            message: '读取配置文件失败',
            button: ['确定'],
          })
        } else {
          toolchainSettings = JSON.parse(data)
          if (path.extname(sourceFilePath) == '.c') {
            // 确保终端打开（只显示终端，不改变其大小状态）
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
              if (!terminalProcess()) {
                startPowerShell()
                
                setTimeout(() => {
                  const console = $('#console')
                  const computedStyle = console ? window.getComputedStyle(console) : null
                  
                  executeCommand(`node ${toolchainSettings.compiler_path} "${sourceFilePath}" -v -i -o "${outputPath}"`)
                  resolve()
                }, 500)
              } else {
                
                executeCommand(`node ${toolchainSettings.compiler_path} "${sourceFilePath}" -v -i -o "${outputPath}"`)
                resolve()
              }
            } else {
              
              executeCommand(`node ${toolchainSettings.compiler_path} "${sourceFilePath}" -v -i -o "${outputPath}"`)
              resolve()
            }
          } else {
            dialog.showMessageBox({
              type: 'error',
              title: '错误',
              message: '当前打开的不是.c文件，请检查文件类型后重试！',
              button: ['确定'],
            })
          }
        }
      })
    } else {
      console.error('未找到待编译文件！')
    }
  })
}

/**
 * 生成一堆文件,包括两个coe和一个txt
 * @param {*} sourceFilePath 待汇编的文件的绝对路径
 * @param {*} outputPath 生成的文件们的绝对路径
 */
module.exports.invokeAssembler = function (sourceFilePath, outputPath, link) {
  return new Promise((resolve, reject) => {
    sourceFilePath = sourceFilePath.replace(/\\/g, '/')
    outputPath = outputPath.replace(/\\/g, '/')

    if (sourceFilePath) {
      fs.readFile(jsonPath, 'utf8', (err, data) => {
        if (err) {
          console.error(err)
          dialog.showMessageBox({
            type: 'error',
            title: '错误',
            message: '读取配置文件失败',
            button: ['确定'],
          })
        } else {
          toolchainSettings = JSON.parse(data)
          if (path.extname(sourceFilePath) == '.asm') {
            // 确保终端打开（只显示终端，不改变其大小状态）
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
              if (!terminalProcess()) {
                startPowerShell()
                
                setTimeout(() => {
                  
                  executeCommand(`node ${toolchainSettings.assembler_path} "${sourceFilePath}" -o "${outputPath}" -f coe ${link ? '-l' : ''} --no-report`)
                  resolve()
                }, 500)
              } else {
                
                executeCommand(`node ${toolchainSettings.assembler_path} "${sourceFilePath}" -o "${outputPath}" -f coe ${link ? '-l' : ''} --no-report`)
                resolve()
              }
            } else {
              
              executeCommand(`node ${toolchainSettings.assembler_path} "${sourceFilePath}" -o "${outputPath}" -f coe ${link ? '-l' : ''} --no-report`)
              resolve()
            }
          } else {
            dialog.showMessageBox({
              type: 'error',
              title: '错误',
              message: '当前打开的不是.asm文件，请检查文件类型后重试！',
              button: ['确定'],
            })
          }
        }
      })
    } else {
      console.error('没有找到待汇编的文件！')
    }
  })
}

module.exports.invokeSerialPort = function (sourceFilePath) {
  sourceFilePath = sourceFilePath.replace(/\\/g, '/')

  if (sourceFilePath) {
    fs.readFile(jsonPath, 'utf8', (err, data) => {
      if (err) {
        console.error(err)
        dialog.showMessageBox({
          type: 'error',
          title: '错误',
          message: '读取配置文件失败',
          button: ['确定'],
        })
      } else {
        toolchainSettings = JSON.parse(data)
        if (path.extname(sourceFilePath) == '.txt') {
          // 串口工具直接启动，不在终端中执行
          child_process.exec(`start ${toolchainSettings.serialport_path}`)
        } else {
          dialog.showMessageBox({
            type: 'error',
            title: '错误',
            message: '当前打开的不是.txt文件，请检查文件类型后重试！',
            button: ['确定'],
          })
        }
      }
    })
  } else {
    console.error('没有找到待串口烧录的文件！')
  }
  // 波特率:128000  校验位：NONE 数据位：8 停止位：1
}
