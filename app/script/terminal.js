// PowerShell终端集成

'use strict'

const { $ } = require('./utils')
const { spawn } = require('child_process')
const path = require('path')

let terminalProcess = null
let terminalContainer = null
let terminalInput = null
let terminalOutput = null
let commandHistory = []
let historyIndex = -1
let currentCommand = ''

// 导出terminalProcess供其他模块使用
module.exports.terminalProcess = () => terminalProcess

/**
 * 初始化终端
 */
function initTerminal() {
  terminalContainer = $('#terminal-container')
  if (!terminalContainer) return
  
  // 创建终端界面（单栏输入输出）
  terminalContainer.innerHTML = `
    <div id="terminal-content" class="terminal-content"></div>
  `
  
  terminalOutput = $('#terminal-content')
  terminalInput = null // 不再使用单独的输入框
  
  // 启动PowerShell进程
  startPowerShell()
  
  // 绑定输入事件（直接在终端内容区域处理）
  if (terminalOutput) {
    terminalOutput.addEventListener('keydown', handleTerminalInput)
    terminalOutput.setAttribute('contenteditable', 'true')
    terminalOutput.setAttribute('spellcheck', 'false')
    terminalOutput.focus()
    
    // 点击终端区域时聚焦
    terminalContainer.addEventListener('click', () => {
      if (terminalOutput) {
        terminalOutput.focus()
        moveCursorToEnd()
      }
    })
    
    // 防止粘贴时插入HTML
    terminalOutput.addEventListener('paste', (e) => {
      e.preventDefault()
      const text = e.clipboardData.getData('text/plain')
      insertTextAtCursor(text)
    })
    
    // 防止拖拽
    terminalOutput.addEventListener('drop', (e) => {
      e.preventDefault()
    })
    
    // 防止选择提示符
    terminalOutput.addEventListener('selectstart', (e) => {
      const selection = window.getSelection()
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const text = terminalOutput.textContent || ''
        const lines = text.split('\n')
        const lastLine = lines[lines.length - 1] || ''
        const promptLength = 'PS> '.length
        
        if (lastLine.length > 0) {
          const startOffset = range.startOffset
          const endOffset = range.endOffset
          const lineStart = text.lastIndexOf('\n', startOffset - 1) + 1
          const currentPos = startOffset - lineStart
          
          if (currentPos < promptLength) {
            e.preventDefault()
            range.setStart(terminalOutput.firstChild, lineStart + promptLength)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      }
    })
  }
}

/**
 * 启动PowerShell进程
 */
function startPowerShell() {
  
  if (terminalProcess) {
    terminalProcess.kill()
  }
  
  // 在Windows上启动PowerShell
  const isWindows = process.platform === 'win32'
  const shell = isWindows ? 'powershell.exe' : '/bin/bash'
  const args = isWindows ? ['-NoExit', '-Command', '-'] : []
  
  terminalProcess = spawn(shell, args, {
    cwd: process.cwd(),
    env: process.env,
    shell: false,
    stdio: ['pipe', 'pipe', 'pipe']
  })
  
  // 处理标准输出
  terminalProcess.stdout.on('data', (data) => {
    appendOutput(data.toString(), 'stdout')
  })
  
  // 处理标准错误
  terminalProcess.stderr.on('data', (data) => {
    appendOutput(data.toString(), 'stderr')
  })
  
  // 处理进程退出
  terminalProcess.on('exit', (code) => {
    appendOutput(`\n进程已退出，代码: ${code}\n`, 'system')
    terminalProcess = null
  })
  
  // 处理错误
  terminalProcess.on('error', (err) => {
    appendOutput(`\n错误: ${err.message}\n`, 'error')
  })
  
  // 显示欢迎信息
  if (terminalOutput) {
    const welcomeText = 'PowerShell 终端已启动\n' + `当前目录: ${process.cwd()}\n\n` + 'PS> '
    terminalOutput.textContent = welcomeText
    
    // 移动光标到末尾
    setTimeout(() => {
      moveCursorToEnd()
      const console = $('#console')
      const computedStyle = console ? window.getComputedStyle(console) : null
      
    }, 100)
  }
  
}

/**
 * 获取当前输入行的文本
 */
function getCurrentInputLine() {
  if (!terminalOutput) return ''
  const selection = window.getSelection()
  const range = selection.getRangeAt(0)
  const textNode = range.startContainer
  const text = terminalOutput.textContent || terminalOutput.innerText
  const lines = text.split('\n')
  return lines[lines.length - 1] || ''
}

/**
 * 在光标位置插入文本
 */
function insertTextAtCursor(text) {
  if (!terminalOutput) return
  const selection = window.getSelection()
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0)
    range.deleteContents()
    const textNode = document.createTextNode(text)
    range.insertNode(textNode)
    range.setStartAfter(textNode)
    range.setEndAfter(textNode)
    selection.removeAllRanges()
    selection.addRange(range)
  }
}

/**
 * 处理终端输入
 */
function handleTerminalInput(e) {
  if (!terminalProcess) {
    if (e.key === 'Enter') {
      startPowerShell()
    }
    return
  }
  
  if (e.key === 'Enter') {
    e.preventDefault()
    
    // 获取当前文本和最后一行
    const text = terminalOutput.textContent || ''
    const lines = text.split('\n')
    const lastLine = lines[lines.length - 1] || ''
    const promptLength = 'PS> '.length
    
    // 提取命令（移除提示符）
    const command = lastLine.substring(promptLength).trim()
    
    if (command) {
      // 添加到历史记录
      commandHistory.push(command)
      historyIndex = commandHistory.length
      currentCommand = ''
      
      // 添加换行（appendOutput会自动添加新的提示符）
      appendOutput('\n', 'stdout')
      
      // 发送命令到PowerShell
      terminalProcess.stdin.write(command + '\r\n')
    } else {
      // 空命令，只发送换行
      appendOutput('\n', 'stdout')
      terminalProcess.stdin.write('\r\n')
    }
  } else if (e.key === 'ArrowUp') {
    // 上箭头：历史记录向上
    e.preventDefault()
    if (commandHistory.length > 0) {
      if (historyIndex > 0) {
        historyIndex--
      }
      replaceLastLine(`PS> ${commandHistory[historyIndex] || ''}`)
      currentCommand = commandHistory[historyIndex] || ''
    }
  } else if (e.key === 'ArrowDown') {
    // 下箭头：历史记录向下
    e.preventDefault()
    if (commandHistory.length > 0) {
      if (historyIndex < commandHistory.length - 1) {
        historyIndex++
        replaceLastLine(`PS> ${commandHistory[historyIndex] || ''}`)
      } else {
        historyIndex = commandHistory.length
        replaceLastLine(`PS> ${currentCommand}`)
      }
    }
  } else if (e.key === 'c' && e.ctrlKey) {
    // Ctrl+C：中断当前命令
    e.preventDefault()
    if (terminalProcess) {
      terminalProcess.kill('SIGINT')
      appendOutput('^C\n', 'stdout')
    }
  } else if (e.key === 'Backspace') {
    // 防止删除提示符
    const selection = window.getSelection()
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const startOffset = range.startOffset
      const textNode = range.startContainer
      
      if (textNode.nodeType === Node.TEXT_NODE) {
        const nodeText = textNode.textContent
        const lineStart = nodeText.lastIndexOf('\n', startOffset - 1) + 1
        const currentPos = startOffset - lineStart
        
        if (currentPos <= promptLength) {
          e.preventDefault()
          return
        }
      }
    }
  } else if (e.key === 'ArrowLeft') {
    // 左箭头：防止移动到提示符之前
    const selection = window.getSelection()
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const startOffset = range.startOffset
      const textNode = range.startContainer
      const promptLength = 'PS> '.length
      
      if (textNode.nodeType === Node.TEXT_NODE) {
        const nodeText = textNode.textContent
        const lineStart = nodeText.lastIndexOf('\n', startOffset - 1) + 1
        const currentPos = startOffset - lineStart
        
        if (currentPos <= promptLength) {
          e.preventDefault()
          return
        }
      }
    }
  }
}

/**
 * 替换最后一行
 */
function replaceLastLine(newLine) {
  if (!terminalOutput) return
  const text = terminalOutput.textContent || ''
  const lines = text.split('\n')
  lines[lines.length - 1] = newLine
  terminalOutput.textContent = lines.join('\n')
  
  // 移动光标到末尾
  moveCursorToEnd()
}

/**
 * 追加输出到终端
 */
function appendOutput(text, type = 'stdout') {
  if (!terminalOutput) return
  
  const currentText = terminalOutput.textContent || ''
  
  // 移除末尾的提示符（如果存在）
  let textWithoutPrompt = currentText.replace(/PS> $/, '')
  
  // 追加新文本
  textWithoutPrompt += text
  
  // 如果文本以换行结尾，添加新的提示符
  if (text.endsWith('\n') || text.endsWith('\r\n')) {
    textWithoutPrompt += 'PS> '
  }
  
  terminalOutput.textContent = textWithoutPrompt
  
  // 移动光标到末尾
  moveCursorToEnd()
  
  // 自动滚动到底部
  terminalOutput.scrollTop = terminalOutput.scrollHeight
}

/**
 * 移动光标到末尾
 */
function moveCursorToEnd() {
  if (!terminalOutput) return
  const range = document.createRange()
  const selection = window.getSelection()
  range.selectNodeContents(terminalOutput)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
}

/**
 * 在终端中执行命令
 */
function executeCommand(command) {
  
  if (!terminalProcess) {
    startPowerShell()
    // 等待一下让PowerShell启动
    setTimeout(() => {
      if (terminalProcess) {
        // 显示命令
        appendOutput(`\n${command}\n`, 'stdout')
        terminalProcess.stdin.write(command + '\r\n')
      }
    }, 500)
  } else {
    // 显示命令
    appendOutput(`\n${command}\n`, 'stdout')
    terminalProcess.stdin.write(command + '\r\n')
  }
  
  // 确保终端可见（只显示终端，不改变其大小状态）
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
    console.style.minHeight = ''
    console.style.maxHeight = ''
    // 不要设置内联样式，让 CSS 规则自然生效
    // 内联样式会覆盖 CSS，可能导致布局问题
    
    // 不要触发 resize 事件，因为这会导致 Ace Editor 在布局不稳定时重新计算大小，可能导致编辑器高度变为0
    // window.dispatchEvent(new Event('resize'))
    // 完全避免在 executeCommand 时调用任何 resize 相关的操作
    // Ace Editor 会在真正的窗口 resize 时自动调整大小
    
    // 使用 requestAnimationFrame 监控布局变化，但不修改（避免影响正常功能）
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const editorEl = $('#editor')
        const workareaEl = $('#workarea')
        const consoleEl = $('#console')
        if (editorEl && workareaEl && consoleEl) {
          const editorComputed = window.getComputedStyle(editorEl)
          const workareaComputed = window.getComputedStyle(workareaEl)
          const consoleComputed = window.getComputedStyle(consoleEl)
          
        }
      })
    })
    
    
    
    // 在 setTimeout focus 之后再次检查状态
    setTimeout(() => {
      const computedStyleAfterFocus = window.getComputedStyle(console)
      const editorAfterFocus = $('#editor')
      const workareaAfterFocus = $('#workarea')
      const editorComputedAfterFocus = editorAfterFocus ? window.getComputedStyle(editorAfterFocus) : null
      const workareaComputedAfterFocus = workareaAfterFocus ? window.getComputedStyle(workareaAfterFocus) : null
      
    }, 200)
    
    // 持续监控一段时间，看是否有后续的样式变化，并在编辑器高度变为0时恢复
    let checkCount = 0
    const maxChecks = 10
    const checkInterval = setInterval(() => {
      checkCount++
      const computedStyleCheck = window.getComputedStyle(console)
      const editorCheck = $('#editor')
      const workareaCheck = $('#workarea')
      const editorComputedCheck = editorCheck ? window.getComputedStyle(editorCheck) : null
      const workareaComputedCheck = workareaCheck ? window.getComputedStyle(workareaCheck) : null
      
      // 只监控，不修改（避免影响正常功能）
      if (editorCheck && editorCheck.offsetHeight < 50) {
        const consoleEl = $('#console')
        const consoleComputed = consoleEl ? window.getComputedStyle(consoleEl) : null
        
      }
      
      
      if (checkCount >= maxChecks) {
        clearInterval(checkInterval)
      }
    }, 300)
  }
  
  // 聚焦终端
  if (terminalOutput) {
    setTimeout(() => {
      
      terminalOutput.focus()
      moveCursorToEnd()
    }, 100)
  }
}

/**
 * 关闭终端
 */
function closeTerminal() {
  if (terminalProcess) {
    terminalProcess.kill()
    terminalProcess = null
  }
  
  const console = $('#console')
  if (console) {
    console.style.display = 'none'
    // 不要触发 resize 事件，避免导致编辑器布局问题
    // window.dispatchEvent(new Event('resize'))
    // 如果需要调整 Ace Editor 大小，应该使用 setTimeout 延迟，并确保编辑器容器有正确的大小
    if (window.editor && typeof window.editor.resize === 'function') {
      setTimeout(() => {
        const editorEl = $('#editor')
        if (editorEl && editorEl.offsetHeight > 0) {
          window.editor.resize()
        }
      }, 100)
    }
  }
  
  // 清空终端内容
  if (terminalOutput) {
    terminalOutput.textContent = ''
  }
}

/**
 * 检查终端是否打开
 */
function isTerminalOpen() {
  const console = $('#console')
  return console && console.style.display !== 'none'
}

module.exports = {
  initTerminal,
  executeCommand,
  closeTerminal,
  isTerminalOpen,
  startPowerShell
}
