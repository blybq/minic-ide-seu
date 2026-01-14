// 代码格式化工具模块

'use strict'

const prettier = require('prettier')
const path = require('path')
const { dialog } = require('electron').remote
const child_process = require('child_process')
const fs = require('fs')

/**
 * 使用 clang-format 格式化 C/C++ 代码
 * @param {string} code - 要格式化的代码
 * @param {string} filePath - 文件路径
 * @returns {Promise<string>} 格式化后的代码
 */
async function formatWithClangFormat(code, filePath) {
  return new Promise((resolve, reject) => {
        
    // 查找clang-format的路径
    const findClangFormat = (callback) => {
      const isWindows = process.platform === 'win32'
      const checkCommand = isWindows ? 'where clang-format' : 'which clang-format'
      const fs = require('fs') // 确保fs可用
      
            
      // 首先检查PATH中的clang-format
      child_process.exec(checkCommand, (err, checkStdout, checkStderr) => {
        if (!err && checkStdout.trim()) {
          // 修复：去除所有空白字符（包括\r\n）并取第一行
          let clangFormatPath = checkStdout.trim().split(/[\r\n]+/)[0].trim()
          
                    
          // Windows上，如果路径在node_modules/.bin下且无扩展名，必须使用.cmd版本
          // 因为无扩展名的文件是shell脚本，不能在Windows上直接执行
          const isInNodeModulesBin = clangFormatPath.includes('node_modules') && clangFormatPath.includes('.bin')
          const hasNoExtension = !clangFormatPath.endsWith('.cmd') && !clangFormatPath.endsWith('.exe') && !clangFormatPath.endsWith('.ps1')
          
          if (isWindows && isInNodeModulesBin && hasNoExtension) {
            const cmdPath = clangFormatPath + '.cmd'
            if (fs.existsSync(cmdPath)) {
              clangFormatPath = cmdPath
            }
          }
          
          // 如果路径不存在，可能是Windows上返回了无扩展名的路径，尝试添加.cmd
          if (!fs.existsSync(clangFormatPath) && isWindows && !clangFormatPath.endsWith('.cmd') && !clangFormatPath.endsWith('.exe')) {
            const cmdPath = clangFormatPath + '.cmd'
            if (fs.existsSync(cmdPath)) {
              clangFormatPath = cmdPath
            }
          }
          
          // 最终验证路径是否存在
          if (fs.existsSync(clangFormatPath)) {
            callback(null, clangFormatPath)
            return
          }
        }
        
        // 如果PATH中找不到，检查配置文件
        const jsonPath = path.join(__dirname, '../../config/ToolchainSettings.json')
        if (fs.existsSync(jsonPath)) {
          try {
            const toolchainSettings = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
            if (toolchainSettings.clang_format_path) {
              const clangFormatPath = toolchainSettings.clang_format_path
              // 检查路径是否存在
              if (fs.existsSync(clangFormatPath)) {
                                callback(null, clangFormatPath)
                return
              }
            }
          } catch (configErr) {
                      }
        }
        
        // 如果都找不到，检查node_modules中的clang-format（如果通过npm安装）
        // Windows上需要检查.cmd文件，Linux/Mac上检查可执行文件
        // 注意：isWindows已经在findClangFormat函数开始处定义，这里直接使用
        const nodeModulesBinDir = path.join(__dirname, '../../../node_modules/.bin')
        
                
        // Windows上检查多个可能的文件名
        const possiblePaths = isWindows 
          ? [
              path.join(nodeModulesBinDir, 'clang-format.cmd'),
              path.join(nodeModulesBinDir, 'clang-format'),
              path.join(nodeModulesBinDir, 'clang-format.exe')
            ]
          : [path.join(nodeModulesBinDir, 'clang-format')]
        
        for (const possiblePath of possiblePaths) {
          if (fs.existsSync(possiblePath)) {
            callback(null, possiblePath)
            return
          }
        }
        
        // 如果都找不到，检查常见的安装路径（Windows）
        if (isWindows) {
          const commonPaths = [
            'C:\\Program Files\\LLVM\\bin\\clang-format.exe',
            'C:\\Program Files (x86)\\LLVM\\bin\\clang-format.exe',
            path.join(process.env.LOCALAPPDATA || '', 'Programs\\LLVM\\bin\\clang-format.exe'),
            path.join(process.env.PROGRAMFILES || '', 'LLVM\\bin\\clang-format.exe'),
            path.join(process.env['PROGRAMFILES(X86)'] || '', 'LLVM\\bin\\clang-format.exe')
          ]
          
          for (const commonPath of commonPaths) {
            if (fs.existsSync(commonPath)) {
              callback(null, commonPath)
              return
            }
          }
        }
        
        callback(new Error('clang-format 未找到。请安装 clang-format 或将其添加到 PATH 中。\n\n提示：您也可以使用 Prettier 格式化 C 代码（虽然支持有限）。\n\n您也可以在 ToolchainSettings.json 中添加 "clang_format_path" 字段来指定 clang-format 的路径。'), null)
      })
    }
    
    findClangFormat((err, clangFormatPath) => {
      if (err || !clangFormatPath) {
        reject(err || new Error('clang-format 未找到'))
        return
      }
      
      // clang-format存在，继续执行
      // 检查是否存在 .clang-format 配置文件
      const clangFormatConfigPath = path.join(__dirname, '../../.clang-format')
      const hasConfig = fs.existsSync(clangFormatConfigPath)
      
      // 构建 clang-format 命令参数
      const args = [`--assume-filename=${filePath}`]
      if (hasConfig) {
        args.push(`--style=file:${clangFormatConfigPath}`)
      } else {
        args.push('--style=LLVM')
      }
      
      // 检查路径是否存在
      const pathExists = fs.existsSync(clangFormatPath)
      if (!pathExists) {
        reject(new Error(`clang-format 路径不存在: ${clangFormatPath}`))
        return
      }
      
      // 检查文件类型
      let stats = null
      try {
        stats = fs.statSync(clangFormatPath)
      } catch (statErr) {
        reject(new Error(`无法访问 clang-format 文件: ${statErr.message}`))
        return
      }
      
      // 尝试执行 clang-format（使用找到的路径）
      // Windows上如果是.cmd文件，需要使用cmd.exe来执行
      const spawnOptions = {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false // 明确指定不使用shell
      }
      
      let clangFormat
      let spawnCommand
      let spawnArgs
      
      const isWindows = process.platform === 'win32'
      const isCmdFile = clangFormatPath.endsWith('.cmd')
      // Windows上，如果路径包含空格或者是.cmd文件，需要使用cmd.exe
      // 另外，如果路径在node_modules/.bin下且不是.exe，也应该使用cmd.exe
      const isInNodeModulesBin = clangFormatPath.includes('node_modules') && clangFormatPath.includes('.bin')
      const shouldUseCmdExe = isWindows && (isCmdFile || clangFormatPath.includes(' ') || (isInNodeModulesBin && !clangFormatPath.endsWith('.exe')))
      
      if (shouldUseCmdExe) {
        // Windows上执行.cmd文件或包含空格的路径需要使用cmd.exe
        spawnCommand = 'cmd.exe'
        // 对于.cmd文件，直接使用路径；对于其他文件，可能需要引号
        if (isCmdFile) {
          spawnArgs = ['/c', clangFormatPath, ...args]
        } else {
          // 对于包含空格的路径，使用引号包裹
          spawnArgs = ['/c', `"${clangFormatPath}"`, ...args]
        }
        clangFormat = child_process.spawn(spawnCommand, spawnArgs, spawnOptions)
      } else {
        spawnCommand = clangFormatPath
        spawnArgs = args
        clangFormat = child_process.spawn(spawnCommand, spawnArgs, spawnOptions)
      }
      
      let stdout = ''
      let stderr = ''
      let stdinClosed = false
      let processExited = false
      let stdinWriteAttempted = false
      let stdinWriteCompleted = false
    
          
      clangFormat.stdout.on('data', (data) => {
        stdout += data.toString()
      })
      
      clangFormat.stderr.on('data', (data) => {
        stderr += data.toString()
      })
      
      clangFormat.on('close', (code, signal) => {
        processExited = true
        if (code === 0) {
          resolve(stdout)
        } else {
          reject(new Error(`clang-format 执行失败 (退出码: ${code}): ${stderr || stdout || 'clang-format 未安装或不在 PATH 中'}`))
        }
      })
    
      clangFormat.on('error', (err) => {
        reject(new Error(`无法执行 clang-format: ${err.message}。路径: ${clangFormatPath}。请确保已安装 clang-format 并在 PATH 中。`))
      })
    
      // 监听stdin错误
      clangFormat.stdin.on('error', (err) => {
        if (err.code === 'EPIPE') {
          reject(new Error(`clang-format 进程过早关闭: ${err.message}。可能原因：进程在写入前就退出了，或者 clang-format 未正确安装。`))
        } else {
          reject(new Error(`写入 stdin 失败: ${err.message}`))
        }
      })
    
      // 等待进程准备好再写入
      // 检查进程是否立即退出（spawn失败的情况）
      const checkProcess = setInterval(() => {
        if (processExited && !stdinWriteAttempted) {
                    clearInterval(checkProcess)
          reject(new Error('clang-format 进程在写入前就退出了'))
        }
      }, 10)
      
      // 延迟写入，确保进程完全启动（特别是Windows上的.cmd文件）
      setTimeout(() => {
        if (processExited) {
          clearInterval(checkProcess)
          return
        }
        
        // 写入代码到 stdin
        stdinWriteAttempted = true
        try {
            
      if (!clangFormat.stdin.writable || clangFormat.stdin.destroyed) {
                clearInterval(checkProcess)
        reject(new Error('clang-format stdin 不可写，进程可能已退出'))
        return
      }
      
      const writeResult = clangFormat.stdin.write(code, 'utf8', (err) => {
        if (err) {
          // 忽略写入错误（会在stdin error事件中处理）
        } else {
          stdinWriteCompleted = true
        }
      })
      
      if (writeResult === false) {
        // 缓冲区已满，等待drain事件
        clangFormat.stdin.once('drain', () => {
          clangFormat.stdin.end()
          stdinClosed = true
          clearInterval(checkProcess)
        })
      } else {
        clangFormat.stdin.end()
        stdinClosed = true
        clearInterval(checkProcess)
      }
      } catch (err) {
        clearInterval(checkProcess)
        reject(new Error(`写入代码失败: ${err.message}`))
      }
      }, isWindows && isCmdFile ? 200 : 50) // Windows上.cmd文件需要更长的启动时间
    })
  })
}

/**
 * 格式化代码
 * @param {string} code - 要格式化的代码
 * @param {string} filePath - 文件路径（用于确定文件类型）
 * @returns {Promise<string>} 格式化后的代码
 */
async function formatCode(code, filePath) {
  try {
    // 根据文件扩展名确定解析器
    const ext = path.extname(filePath).toLowerCase()
    
    // C/C++ 文件使用 clang-format
    const cExtensions = ['.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hh', '.hxx']
    if (cExtensions.includes(ext)) {
      return await formatWithClangFormat(code, filePath)
    }
    
    // 其他文件使用 Prettier
    let parser = 'babel' // 默认使用 babel 解析器
    
    // 根据文件类型选择解析器
    const parserMap = {
      '.js': 'babel',
      '.jsx': 'babel',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.json': 'json',
      '.css': 'css',
      '.scss': 'scss',
      '.less': 'less',
      '.html': 'html',
      '.vue': 'vue',
      '.md': 'markdown',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.asm': 'babel', // 汇编文件使用 babel 解析器
    }
    
    parser = parserMap[ext] || 'babel'
    
    // 读取 Prettier 配置
    const prettierConfigPath = path.join(__dirname, '../../.prettierrc')
    let options = {}
    
    try {
      if (fs.existsSync(prettierConfigPath)) {
        const configContent = fs.readFileSync(prettierConfigPath, 'utf8')
        options = JSON.parse(configContent)
      }
    } catch (err) {
      console.error('读取 Prettier 配置失败:', err)
    }
    
    // 设置解析器
    options.parser = parser
    
    // 格式化代码
    const formatted = prettier.format(code, options)
    return formatted
  } catch (err) {
    console.error('格式化代码失败:', err)
    throw err
  }
}

/**
 * 格式化当前编辑器中的代码
 */
async function formatCurrentFile() {
  try {
    if (!window.editor) {
      dialog.showMessageBox({
        type: 'error',
        title: '错误',
        message: '编辑器未初始化',
        buttons: ['确定']
      })
      return
    }
    
    const { getProperty } = require('./utils')
    const currentFilePath = getProperty('currentFilePath')
    
    if (!currentFilePath) {
      dialog.showMessageBox({
        type: 'info',
        title: '提示',
        message: '当前没有打开的文件',
        buttons: ['确定']
      })
      return
    }
    
    // 获取当前代码
    const code = window.editor.getValue()
    
    // 格式化代码
    const formatted = await formatCode(code, currentFilePath)
    
    // 更新编辑器内容
    const cursorPosition = window.editor.getCursorPosition()
    window.editor.setValue(formatted)
    
    // 恢复光标位置（尽可能）
    try {
      window.editor.moveCursorTo(cursorPosition.row, cursorPosition.column)
    } catch (err) {
      // 如果位置无效，移动到开头
      window.editor.moveCursorTo(0, 0)
    }
    
    // 标记为已修改
    const { setProperty } = require('./utils')
    const openedDocs = getProperty('openedDocs') || []
    const doc = openedDocs.find(d => d.path === currentFilePath)
    if (doc) {
      doc.modified = true
      setProperty('openedDocs', openedDocs)
    }
    
  } catch (err) {
    console.error('格式化文件失败:', err)
    dialog.showMessageBox({
      type: 'error',
      title: '格式化失败',
      message: `格式化代码时出错: ${err.message}`,
      buttons: ['确定']
    })
  }
}

module.exports = {
  formatCode,
  formatCurrentFile
}
