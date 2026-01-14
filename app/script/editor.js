// Ace Editor逻辑

'use strict'

const fs = require('fs')
const path = require('path')
const { dialog } = require('electron').remote
// 新建 ace editor 实例
const editor = ace.edit('editor')

let appSettings
const jsonPath = path.join(__dirname, '../../config/AppSettings.json')
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
    appSettings = JSON.parse(data)
    editor.setTheme('ace/theme/' + appSettings.theme)
    // 语法高亮
    editor.session.setMode(null)
    editor.setFontSize(appSettings.font_size)
    // 选中行高亮
    editor.setHighlightActiveLine(true)
    // 代码补全
    editor.setOptions({
      enableBasicAutocompletion: true,
      enableSnippets: true,
      enableLiveAutocompletion: true,
    })
    
    // 应用自动换行（仅在用户开启时）
    if (appSettings.wrap === true) {
      // 修复：禁用换行时的缩进，避免第二行及以后比第一行多缩进一个制表符
      editor.session.setOption('indentedSoftWrap', false)
      editor.session.setUseWrapMode(true)
    }
    
    // 应用制表符大小
    if (appSettings.tab_size) {
      editor.session.setTabSize(appSettings.tab_size)
    }
  }
})

// 自动保存功能
let autoSaveTimer = null

function startAutoSave() {
  const { getProperty } = require('./utils')
  const fs = require('fs')
  const path = require('path')
  
  // 清除旧的定时器
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer)
    autoSaveTimer = null
  }
  
  // 仅在自动保存开启时启动
  if (appSettings && appSettings.auto_save === true) {
    const interval = appSettings.auto_save_interval || 3000
    
    autoSaveTimer = setInterval(() => {
      const currentFilePath = getProperty('currentFilePath')
      if (!currentFilePath) return
      
      // 检查文件是否存在于磁盘上（已保存过的文件）
      if (!fs.existsSync(currentFilePath)) return
      
      const openedDocs = getProperty('openedDocs') || []
      const doc = openedDocs.find(d => d.path === currentFilePath)
      
      // 仅在文件已保存过且有修改时才自动保存
      if (doc && doc.modified) {
        try {
          const encoding = appSettings.file_encoding || 'utf8'
          fs.writeFileSync(currentFilePath, editor.getValue(), encoding)
          doc.modified = false
          
          // 更新文档状态
          const docIndex = openedDocs.findIndex(d => d.path === currentFilePath)
          if (docIndex !== -1) {
            openedDocs[docIndex].modified = false
          }
        } catch (err) {
          console.error('自动保存失败:', err)
        }
      }
    }, interval)
  }
}

function stopAutoSave() {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer)
    autoSaveTimer = null
  }
}

// 监听设置变更事件
window.addEventListener('editorSettingsChanged', (e) => {
  const { autoSave, autoSaveInterval, fileEncoding } = e.detail || {}
  
  // 更新自动保存设置
  if (appSettings) {
    appSettings.auto_save = autoSave
    appSettings.auto_save_interval = autoSaveInterval
    appSettings.file_encoding = fileEncoding
  }
  
  // 重启自动保存
  stopAutoSave()
  if (autoSave) {
    startAutoSave()
  }
})

// 初始化自动保存
if (appSettings && appSettings.auto_save === true) {
  // 延迟启动，确保编辑器已完全初始化
  setTimeout(() => {
    startAutoSave()
  }, 1000)
}

// 自定义代码联想内容。
let completerListJson
const completerDatabasePath = path.join(__dirname, '../../config/CompleterDatabase.json')
fs.readFile(completerDatabasePath, 'utf8', (err, data) => {
  if (err) {
    console.error(err)
    dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: '读取自定义代码联想文件失败',
      button: ['确定'],
    })
  } else {
    completerListJson = JSON.parse(data)['db']
  }
})
const langTools = ace.require('ace/ext/language_tools')
const setCompleterData = function (completerList) {
  langTools.addCompleter({
    getCompletions: function (editor, session, pos, prefix, callback) {
      if (prefix.length === 0) {
        return callback(null, [])
      } else {
        return callback(null, completerList)
      }
    },
  })
}
setCompleterData(completerListJson)
// 挂载Ace Editor对象到window
window.editor = editor

/**
 * 自定义搜索框按钮 - 只保留 Aa 和 .*，隐藏 \b 和 \S
 */
function customizeSearchBoxButtons() {
  const searchBox = document.querySelector('.ace_search')
  if (!searchBox) return
  
  // 处理关闭按钮
  const closeButton = searchBox.querySelector('.ace_searchbtn_close')
  if (closeButton) {
    closeButton.style.display = ''
    closeButton.style.visibility = ''
    closeButton.style.pointerEvents = ''
    closeButton.style.zIndex = '10001'
    // 移除可能存在的 position: relative，保持 Ace Editor 的默认绝对定位
    if (closeButton.style.position === 'relative') {
      closeButton.style.position = ''
    }
    // 确保 action 属性存在
    if (!closeButton.getAttribute('action')) {
      closeButton.setAttribute('action', 'hide')
    }
    // 添加备用事件监听器，处理 CSS !important 覆盖问题
    if (!closeButton.dataset.customListenerAdded) {
      closeButton.dataset.customListenerAdded = 'true'
      closeButton.addEventListener('click', function(e) {
        // 等待 Ace Editor 的默认处理执行
        setTimeout(() => {
          const computedDisplay = window.getComputedStyle(searchBox).display
          // 如果 Ace Editor 设置了 display: none，但 CSS 的 !important 覆盖了它
          if (searchBox.style.display === 'none' && computedDisplay !== 'none') {
            searchBox.style.setProperty('display', 'none', 'important')
          } else if (searchBox.style.display !== 'none' && computedDisplay !== 'none') {
            // Ace Editor 没有隐藏搜索框，手动处理
            if (editor && editor.searchBox && editor.searchBox.hide) {
              editor.searchBox.hide()
            }
            searchBox.style.setProperty('display', 'none', 'important')
          }
        }, 100)
      }, true)
    }
  }
  
  // 只查找 ace_button 类的按钮元素（匹配选项按钮）
  const buttons = searchBox.querySelectorAll('.ace_button')
  buttons.forEach((btn) => {
    const btnText = (btn.textContent || btn.innerText || '').trim()
    const btnClass = btn.className || ''
    const btnTitle = btn.getAttribute('title') || ''
    
    // 判断按钮类型：保留 prev, next, close, caseSensitive, regExp
    const isPrev = btnClass.includes('prev') || btnText === '▲' || btnText === '◀' || btnText === '↑' || btnTitle.includes('prev') || btnTitle.includes('上一个')
    const isNext = btnClass.includes('next') || btnText === '▼' || btnText === '▶' || btnText === '↓' || btnTitle.includes('next') || btnTitle.includes('下一个')
    const isClose = btnClass.includes('close') || btnText === '×' || btnText === '✕' || btnText === '✖' || btnTitle.includes('close') || btnTitle.includes('关闭')
    const isCaseSensitive = btnClass.includes('caseSensitive') || btnText === 'Aa' || btnText === 'Ab' || btnText === 'A' || btnTitle.includes('case') || btnTitle.includes('大小写')
    const isRegExp = btnClass.includes('regExp') || btnText === '.*' || btnText === '.' || btnText === '*' || btnTitle.includes('regex') || btnTitle.includes('正则')
    const isWholeWord = btnClass.includes('wholeWord') || btnText === '\\b' || btnText === '\\B' || btnText === '\\w' || btnTitle.includes('whole') || btnTitle.includes('全词')
    // 注意：实际按钮文本是 "S" 不是 "\\S"
    const isOther = btnText === 'S' || btnText === '\\S' || btnText === '\\s' || btnText === '\\W' || btnText === '\\d' || btnText === '\\D' || btnText === '\\n' || btnText === '\\t'
    
    // 隐藏全词匹配按钮（\b）和其他不需要的按钮（S 等）
    if (isWholeWord || isOther) {
      if (isWholeWord) {
        btn.classList.add('ace_search_option_wholeword')
      } else {
        btn.classList.add('ace_search_option_other')
      }
      btn.style.display = 'none'
      btn.style.visibility = 'hidden'
      return
    }
    
    // 保留的按钮：prev, next, close, caseSensitive, regExp
    if (isPrev || isNext || isClose || isCaseSensitive || isRegExp) {
      // 确保按钮可见
      btn.style.display = ''
      btn.style.visibility = ''
      
      // 为 Aa 和 .* 按钮添加标识类名，让 CSS 可以设置颜色
      if (isCaseSensitive) {
        btn.classList.add('ace_search_option_case')
      } else if (isRegExp) {
        btn.classList.add('ace_search_option_regex')
      }
      
      // 设置 Aa 和 .* 按钮的文字颜色为白色
      if (isCaseSensitive || isRegExp) {
        btn.style.color = '#ffffff'
        btn.style.setProperty('color', '#ffffff', 'important')
        // 设置所有子元素的颜色
        const allChildren = btn.querySelectorAll('*')
        allChildren.forEach(child => {
          child.style.color = '#ffffff'
          child.style.setProperty('color', '#ffffff', 'important')
        })
        // 使用 MutationObserver 监听类变化，确保激活状态也是白色
        const colorObserver = new MutationObserver(() => {
          btn.style.color = '#ffffff'
          btn.style.setProperty('color', '#ffffff', 'important')
        })
        colorObserver.observe(btn, {
          attributes: true,
          attributeFilter: ['class']
        })
      }
    }
    // 注意：不要隐藏其他元素，只处理 ace_button 类的按钮
  })
}

/**
 * 监听搜索框的创建和更新
 */
function initSearchBoxCustomization() {
  // 监听 DOM 变化
  const observer = new MutationObserver(() => {
    const searchBox = document.querySelector('.ace_search')
    if (searchBox) {
      customizeSearchBoxButtons()
    }
  })
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
  
  // 拦截 execCommand
  const originalExecCommand = editor.execCommand.bind(editor)
  editor.execCommand = function(cmd) {
    const result = originalExecCommand(cmd)
    if (cmd === 'find' || cmd === 'replace') {
      setTimeout(customizeSearchBoxButtons, 50)
      setTimeout(customizeSearchBoxButtons, 150)
      setTimeout(customizeSearchBoxButtons, 300)
    }
    return result
  }
  
  // 定期检查（作为后备方案）
  setInterval(() => {
    const searchBox = document.querySelector('.ace_search')
    if (searchBox) {
      customizeSearchBoxButtons()
    }
  }, 500)
}

// 初始化
initSearchBoxCustomization()

/**
 * 编辑器搜索功能
 */
const find = needle => {
  return function () {
    editor.find(needle, {
      backwards: false,
      warp: false,
      caseSensitive: false,
      wholeWord: false,
      regExp: false,
    })
  }
}
module.exports.find = find
