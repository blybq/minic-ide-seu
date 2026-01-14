// 活动栏逻辑

'use strict'

const { $, getProperty, setProperty } = require('./utils')
const path = require('path')
const fs = require('fs')
const { dialog } = require('electron').remote

/**
 * 初始化活动栏
 */
function initActivityBar() {
  // 检查元素是否存在，不存在则延迟执行
  const checkAndInit = () => {
    const explorerBtn = $('#activity-explorer')
    const searchBtn = $('#activity-search')
    const settingsBtn = $('#activity-settings')
    const settingsEditorBtn = $('#settings-editor')
    const settingsToolchainBtn = $('#settings-toolchain')
    const searchInput = $('#search-input')
    
    // 如果关键元素不存在，延迟重试
    if (!explorerBtn || !searchBtn || !settingsBtn) {
      setTimeout(checkAndInit, 100)
      return
    }
    
    try {
      // 活动栏按钮点击事件
      // 直接绑定到每个按钮，确保事件能正确触发
      const bindActivityButton = (btn, viewName) => {
        if (btn) {
          btn.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            switchView(viewName)
          })
        }
      }
      
      // 绑定每个按钮
      bindActivityButton(explorerBtn, 'explorer')
      bindActivityButton(searchBtn, 'search')
      bindActivityButton(settingsBtn, 'settings')
      
      // 设置项点击事件（如果元素存在）
      if (settingsEditorBtn) {
        settingsEditorBtn.addEventListener('click', () => {
          showSettingsPanel('editor')
        })
      }
      
      if (settingsToolchainBtn) {
        settingsToolchainBtn.addEventListener('click', () => {
          showSettingsPanel('toolchain')
        })
      }
      
      // 搜索功能（如果元素存在）
      if (searchInput) {
        let searchTimeout
        searchInput.addEventListener('input', (e) => {
          clearTimeout(searchTimeout)
          searchTimeout = setTimeout(() => {
            performSearch(e.target.value)
          }, 300)
        })
      }
    } catch (err) {
      console.error('初始化活动栏失败:', err)
    }
  }
  
  // 如果DOM已加载完成，立即执行；否则等待
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndInit)
  } else {
    // 延迟一点执行，确保所有DOM元素都已创建
    setTimeout(checkAndInit, 100)
  }
}

/**
 * 切换视图
 */
function switchView(viewName) {
  try {
    // 更新活动栏按钮状态
    const activityItems = document.querySelectorAll('.activity-item')
    activityItems.forEach(item => {
      item.classList.remove('active')
    })
    
    // 更新侧边栏视图
    const sidebarViews = document.querySelectorAll('.sidebar-view')
    sidebarViews.forEach(view => {
      view.classList.remove('active')
    })
    
    // 激活选中的视图
    if (viewName === 'explorer') {
      const explorerBtn = document.querySelector('#activity-explorer')
      const explorerView = document.querySelector('#explorer-view')
      if (explorerBtn) explorerBtn.classList.add('active')
      if (explorerView) explorerView.classList.add('active')
    } else if (viewName === 'search') {
      const searchBtn = document.querySelector('#activity-search')
      const searchView = document.querySelector('#search-view')
      const searchInput = document.querySelector('#search-input')
      if (searchBtn) searchBtn.classList.add('active')
      if (searchView) searchView.classList.add('active')
      if (searchInput) {
        setTimeout(() => {
          searchInput.focus()
        }, 50)
      }
    } else if (viewName === 'settings') {
      const settingsBtn = document.querySelector('#activity-settings')
      const settingsView = document.querySelector('#settings-view')
      if (settingsBtn) settingsBtn.classList.add('active')
      if (settingsView) settingsView.classList.add('active')
    }
  } catch (err) {
    console.error('switchView error:', err)
  }
}

/**
 * 显示设置面板
 */
function showSettingsPanel(panelType) {
  try {
    if (panelType === 'editor') {
      // 加载编辑器设置HTML
      loadSettingsHTML('editor')
    } else if (panelType === 'toolchain') {
      // 加载工具链设置HTML
      loadSettingsHTML('toolchain')
    }
  } catch (err) {
    console.error('显示设置面板失败:', err)
    dialog.showErrorBox('错误', `显示设置面板失败: ${err.message}`)
  }
}

/**
 * 加载设置HTML内容
 */
function loadSettingsHTML(type) {
  const overlay = $('#settings-overlay')
  const content = $('#settings-content')
  const console = $('#console')
  
  if (!overlay || !content) {
    return
  }
  
  try {
    // 计算终端高度，动态设置覆盖层的 bottom
    let bottomOffset = 0
    if (console && console.style.display !== 'none') {
      const consoleHeight = console.offsetHeight || 220  // 默认 220px
      const dragbarHeight = 6  // 拖拽条高度
      bottomOffset = consoleHeight + dragbarHeight
    }
    
    // 显示覆盖层，确保它在最上层
    overlay.style.display = 'block'
    overlay.style.zIndex = '10000'
    overlay.style.position = 'absolute'
    overlay.style.top = '0'
    overlay.style.left = '0'
    overlay.style.right = '0'
    overlay.style.bottom = bottomOffset + 'px'
    
    // 加载设置内容
    if (type === 'editor') {
      loadEditorSettings(content)
    } else {
      loadToolchainSettings(content)
    }
  } catch (err) {
    console.error('加载设置HTML失败:', err)
    // 出错时隐藏覆盖层，避免界面卡住
    if (overlay) {
      overlay.style.display = 'none'
    }
  }
}

/**
 * 加载编辑器设置
 */
function loadEditorSettings(container) {
  const fs = require('fs')
  const settingsPath = path.join(__dirname, '../../config/AppSettings.json')
  
  let appSettings = {}
  try {
    appSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
  } catch (err) {
    console.error(err)
  }
  
  container.innerHTML = `
    <div style="margin-bottom: 20px;">
      <h2 style="margin-bottom: 15px; color: #ffffff;">编辑器个性化</h2>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; color: #cccccc;">字体大小</label>
        <input type="number" id="settings-font-size" value="${appSettings.font_size || 14}" 
               style="width: 100px; padding: 5px; background: #3c3c3c; border: 1px solid #555; color: #fff; border-radius: 2px;" />
      </div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; color: #cccccc;">主题</label>
        <select id="settings-theme" 
                style="width: 200px; padding: 5px; background: #3c3c3c; border: 1px solid #555; color: #fff; border-radius: 2px;">
          <option value="ambiance" ${appSettings.theme === 'ambiance' ? 'selected' : ''}>Ambiance</option>
          <option value="chaos" ${appSettings.theme === 'chaos' ? 'selected' : ''}>Chaos</option>
          <option value="chrome" ${appSettings.theme === 'chrome' ? 'selected' : ''}>Chrome</option>
          <option value="xcode" ${appSettings.theme === 'xcode' ? 'selected' : ''}>Xcode</option>
          <option value="vibrant_ink" ${appSettings.theme === 'vibrant_ink' ? 'selected' : ''}>Vibrant Ink</option>
          <option value="terminal" ${appSettings.theme === 'terminal' ? 'selected' : ''}>Terminal</option>
          <option value="sqlserver" ${appSettings.theme === 'sqlserver' ? 'selected' : ''}>SQL Server</option>
          <option value="github" ${appSettings.theme === 'github' ? 'selected' : ''}>GitHub</option>
        </select>
      </div>
      <div>
        <button id="settings-editor-confirm" 
                style="padding: 8px 20px; background: #007acc; color: #fff; border: none; border-radius: 3px; cursor: pointer; margin-right: 10px;">确认修改</button>
        <button id="settings-editor-cancel" 
                style="padding: 8px 20px; background: #555; color: #fff; border: none; border-radius: 3px; cursor: pointer;">取消</button>
      </div>
    </div>
  `
  
  // 绑定事件（延迟绑定，确保元素已创建）
  setTimeout(() => {
    const confirmBtn = $('#settings-editor-confirm')
    const cancelBtn = $('#settings-editor-cancel')
    const fontSizeInput = $('#settings-font-size')
    const themeSelect = $('#settings-theme')
    
    if (confirmBtn && fontSizeInput && themeSelect) {
      confirmBtn.addEventListener('click', () => {
        const fontSize = parseInt(fontSizeInput.value)
        const theme = themeSelect.value
        
        appSettings.font_size = fontSize
        appSettings.theme = theme
        
        try {
          fs.writeFileSync(settingsPath, JSON.stringify(appSettings, null, 2))
          
          // 应用设置
          if (window.editor) {
            window.editor.setFontSize(fontSize)
            window.editor.setTheme('ace/theme/' + theme)
          }
          
          // 关闭覆盖层
          const overlay = $('#settings-overlay')
          if (overlay) overlay.style.display = 'none'
        } catch (err) {
          console.error('保存编辑器设置失败:', err)
          dialog.showErrorBox('错误', `保存设置失败: ${err.message}`)
        }
      })
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        const overlay = $('#settings-overlay')
        if (overlay) overlay.style.display = 'none'
      })
    }
  }, 50)
}

/**
 * 加载工具链设置
 */
function loadToolchainSettings(container) {
  const fs = require('fs')
  const settingsPath = path.join(__dirname, '../../config/ToolchainSettings.json')
  
  let toolchainSettings = {}
  try {
    toolchainSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
  } catch (err) {
    console.error('读取工具链配置失败', err)
  }
  
  container.innerHTML = `
    <div style="margin-bottom: 20px;">
      <h2 style="margin-bottom: 15px; color: #ffffff;">工具链设置</h2>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; color: #cccccc;">编译器路径</label>
        <div style="display: flex; gap: 10px;">
          <input type="text" id="settings-compiler-path" value="${toolchainSettings.compiler_path || ''}" 
                 style="flex: 1; padding: 5px; background: #3c3c3c; border: 1px solid #555; color: #fff; border-radius: 2px;" readonly />
          <button id="settings-browse-compiler" 
                  style="padding: 5px 15px; background: #555; color: #fff; border: none; border-radius: 2px; cursor: pointer;">浏览..</button>
        </div>
      </div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; color: #cccccc;">汇编器路径</label>
        <div style="display: flex; gap: 10px;">
          <input type="text" id="settings-assembler-path" value="${toolchainSettings.assembler_path || ''}" 
                 style="flex: 1; padding: 5px; background: #3c3c3c; border: 1px solid #555; color: #fff; border-radius: 2px;" readonly />
          <button id="settings-browse-assembler" 
                  style="padding: 5px 15px; background: #555; color: #fff; border: none; border-radius: 2px; cursor: pointer;">浏览..</button>
        </div>
      </div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; color: #cccccc;">串口工具路径</label>
        <div style="display: flex; gap: 10px;">
          <input type="text" id="settings-serialport-path" value="${toolchainSettings.serialport_path || ''}" 
                 style="flex: 1; padding: 5px; background: #3c3c3c; border: 1px solid #555; color: #fff; border-radius: 2px;" readonly />
          <button id="settings-browse-serialport" 
                  style="padding: 5px 15px; background: #555; color: #fff; border: none; border-radius: 2px; cursor: pointer;">浏览..</button>
        </div>
      </div>
      <div>
        <button id="settings-toolchain-confirm" 
                style="padding: 8px 20px; background: #007acc; color: #fff; border: none; border-radius: 3px; cursor: pointer; margin-right: 10px;">确认修改</button>
        <button id="settings-toolchain-cancel" 
                style="padding: 8px 20px; background: #555; color: #fff; border: none; border-radius: 3px; cursor: pointer;">取消</button>
      </div>
    </div>
  `
  
  // 绑定浏览按钮事件（延迟绑定，确保元素已创建）
  setTimeout(() => {
    const { dialog } = require('electron').remote
    
    const browseCompilerBtn = $('#settings-browse-compiler')
    const browseAssemblerBtn = $('#settings-browse-assembler')
    const browseSerialportBtn = $('#settings-browse-serialport')
    const confirmBtn = $('#settings-toolchain-confirm')
    const cancelBtn = $('#settings-toolchain-cancel')
    const compilerPathInput = $('#settings-compiler-path')
    const assemblerPathInput = $('#settings-assembler-path')
    const serialportPathInput = $('#settings-serialport-path')
    
    if (browseCompilerBtn && compilerPathInput) {
      browseCompilerBtn.addEventListener('click', () => {
        dialog.showOpenDialog({
          title: '选择编译器',
          filters: [{ name: 'JavaScript文件', extensions: ['js'] }]
        }).then(result => {
          if (!result.canceled && result.filePaths && result.filePaths[0]) {
            compilerPathInput.value = result.filePaths[0]
          }
        }).catch(err => {
          console.error('选择编译器失败:', err)
        })
      })
    }
    
    if (browseAssemblerBtn && assemblerPathInput) {
      browseAssemblerBtn.addEventListener('click', () => {
        dialog.showOpenDialog({
          title: '选择汇编器',
          filters: [{ name: 'JavaScript文件', extensions: ['js'] }]
        }).then(result => {
          if (!result.canceled && result.filePaths && result.filePaths[0]) {
            assemblerPathInput.value = result.filePaths[0]
          }
        }).catch(err => {
          console.error('选择汇编器失败:', err)
        })
      })
    }
    
    if (browseSerialportBtn && serialportPathInput) {
      browseSerialportBtn.addEventListener('click', () => {
        dialog.showOpenDialog({
          title: '选择串口工具',
          filters: [{ name: '可执行文件', extensions: ['exe'] }]
        }).then(result => {
          if (!result.canceled && result.filePaths && result.filePaths[0]) {
            serialportPathInput.value = result.filePaths[0]
          }
        }).catch(err => {
          console.error('选择串口工具失败:', err)
        })
      })
    }
    
    // 绑定确认和取消按钮
    if (confirmBtn && compilerPathInput && assemblerPathInput && serialportPathInput) {
      confirmBtn.addEventListener('click', () => {
        toolchainSettings.compiler_path = compilerPathInput.value
        toolchainSettings.assembler_path = assemblerPathInput.value
        toolchainSettings.serialport_path = serialportPathInput.value
        
        try {
          fs.writeFileSync(settingsPath, JSON.stringify(toolchainSettings, null, 2))
          
          // 关闭覆盖层
          const overlay = $('#settings-overlay')
          if (overlay) overlay.style.display = 'none'
        } catch (err) {
          console.error('保存工具链设置失败:', err)
          dialog.showErrorBox('错误', `保存设置失败: ${err.message}`)
        }
      })
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        const overlay = $('#settings-overlay')
        if (overlay) overlay.style.display = 'none'
      })
    }
  }, 50)
}

/**
 * 执行搜索
 */
function performSearch(query) {
  const resultsContainer = $('#search-results')
  resultsContainer.innerHTML = ''
  
  if (!query || query.trim() === '') {
    resultsContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">输入搜索关键词...</div>'
    return
  }
  
  const currentPath = getProperty('currentPath')
  if (!currentPath) {
    resultsContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">请先打开工作区</div>'
    return
  }
  
  // 递归搜索文件
  const results = []
  searchInDirectory(currentPath, query, results)
  
  if (results.length === 0) {
    resultsContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">未找到匹配的文件</div>'
    return
  }
  
  // 按文件分组显示搜索结果
  const groupedResults = {}
  results.forEach(result => {
    if (!groupedResults[result.path]) {
      groupedResults[result.path] = {
        name: result.name,
        path: result.path,
        lines: []
      }
    }
    groupedResults[result.path].lines.push({
      line: result.line,
      content: result.content
    })
  })
  
  // 显示搜索结果
  Object.values(groupedResults).forEach(fileResult => {
    const fileItem = document.createElement('div')
    fileItem.style.marginBottom = '15px'
    fileItem.style.borderBottom = '1px solid #3e3e42'
    fileItem.style.paddingBottom = '10px'
    
    const fileName = document.createElement('div')
    fileName.style.fontWeight = 'bold'
    fileName.style.marginBottom = '5px'
    fileName.style.color = '#4ec9b0'
    fileName.style.cursor = 'pointer'
    fileName.textContent = fileResult.name
    fileName.addEventListener('click', () => {
      openFile(fileResult.path)
    })
    fileItem.appendChild(fileName)
    
    const filePath = document.createElement('div')
    filePath.style.fontSize = '11px'
    filePath.style.color = '#888'
    filePath.style.marginBottom = '8px'
    filePath.textContent = fileResult.path
    fileItem.appendChild(filePath)
    
    fileResult.lines.forEach(lineResult => {
      const lineItem = document.createElement('div')
      lineItem.style.padding = '3px 10px'
      lineItem.style.marginBottom = '3px'
      lineItem.style.cursor = 'pointer'
      lineItem.style.borderRadius = '2px'
      lineItem.innerHTML = `
        <span style="color: #888; margin-right: 10px;">${lineResult.line}:</span>
        <span style="color: #f1f1f1;">${escapeHtml(lineResult.content)}</span>
      `
      lineItem.addEventListener('click', () => {
        openFile(fileResult.path, lineResult.line)
      })
      lineItem.addEventListener('mouseenter', () => {
        lineItem.style.backgroundColor = '#2a2d2e'
      })
      lineItem.addEventListener('mouseleave', () => {
        lineItem.style.backgroundColor = 'transparent'
      })
      fileItem.appendChild(lineItem)
    })
    
    resultsContainer.appendChild(fileItem)
  })
}

/**
 * HTML转义
 */
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * 在目录中搜索文件内容
 */
function searchInDirectory(dirPath, query, results) {
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true })
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name)
      
      // 跳过node_modules等目录
      if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === 'out') {
        continue
      }
      
      if (item.isDirectory()) {
        // 递归搜索子目录
        searchInDirectory(fullPath, query, results)
      } else if (item.isFile()) {
        // 搜索文件内容
        try {
          const content = fs.readFileSync(fullPath, 'utf8')
          const lines = content.split('\n')
          const queryLower = query.toLowerCase()
          
          lines.forEach((line, index) => {
            if (line.toLowerCase().includes(queryLower)) {
              results.push({
                name: item.name,
                path: fullPath,
                line: index + 1,
                content: line.trim()
              })
            }
          })
        } catch (err) {
          // 忽略无法读取的文件（二进制文件等）
          console.error(`无法读取文件: ${fullPath}`, err)
        }
      }
    }
  } catch (err) {
    console.error(`搜索目录失败: ${dirPath}`, err)
  }
}

/**
 * 打开文件
 */
function openFile(filePath, lineNumber = null) {
  const { getProperty, setProperty } = require('./utils')
  const openedDocs = getProperty('openedDocs') || []
  
  // 检查文件是否已打开
  const existingDoc = openedDocs.find(doc => doc.path === filePath)
  if (existingDoc) {
    window.editor.setSession(existingDoc.session)
    setProperty('currentFilePath', filePath)
    if (lineNumber !== null) {
      window.editor.gotoLine(lineNumber, 0, true)
    }
    // 切换到资源管理器视图并高亮文件
    switchView('explorer')
    const { highlightActiveFile } = require('./sidebar')
    highlightActiveFile(filePath)
    return
  }
  
  // 读取文件
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      dialog.showErrorBox('错误', `无法打开文件: ${err.message}`)
      return
    }
    
    const { getHighlightMode } = require('./utils')
    const docToAdd = {
      path: filePath,
      name: path.basename(filePath),
      modified: false,
      session: new ace.EditSession(data)
    }
    
    docToAdd.session.setMode(getHighlightMode(path.extname(filePath)))
    openedDocs.push(docToAdd)
    setProperty('openedDocs', openedDocs)
    setProperty('currentFilePath', filePath)
    
    window.editor.setSession(docToAdd.session)
    if (lineNumber !== null) {
      window.editor.gotoLine(lineNumber, 0, true)
    } else {
      window.editor.moveCursorTo(0)
    }
    
    // 切换到资源管理器视图并高亮文件
    switchView('explorer')
    const { highlightActiveFile } = require('./sidebar')
    highlightActiveFile(filePath)
  })
}

module.exports = {
  initActivityBar
}
