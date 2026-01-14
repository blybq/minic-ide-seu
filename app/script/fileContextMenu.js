// 文件和目录右键菜单逻辑

'use strict'

const { $, getProperty, setProperty } = require('./utils')
const { dialog } = require('electron').remote
const fs = require('fs')
const path = require('path')
const { Menu } = require('electron').remote
const { initSideBarLow } = require('./sidebar')
const { refreshExplorer } = require('./autoRefresh')

/**
 * 为目录项添加右键菜单
 */
function setupDirectoryContextMenu() {
  const treeView = $('#tree-view')
  
  // 使用冒泡阶段，让空白区域菜单先处理（在捕获阶段）
  treeView.addEventListener('contextmenu', e => {
    const target = e.target
    const span = target.closest('span[data-type="directory"]')
    
    if (!span) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const dirPath = span.dataset.path
    const dirName = span.dataset.name
    
    const menu = Menu.buildFromTemplate([
      {
        label: '新建文件',
        click: () => {
          createNewFile(dirPath)
        }
      },
      {
        label: '新建目录',
        click: () => {
          createNewDirectory(dirPath)
        }
      },
      {
        label: '重命名',
        click: () => {
          renameDirectory(dirPath, span)
        }
      },
      {
        type: 'separator'
      },
      {
        label: '删除目录',
        click: () => {
          deleteDirectory(dirPath)
        }
      }
    ])
    
    menu.popup({ window: require('electron').remote.getCurrentWindow() })
  })
}

/**
 * 为文件项添加右键菜单
 */
function setupFileContextMenu() {
  const treeView = $('#tree-view')
  
  // 使用冒泡阶段，让空白区域菜单先处理（在捕获阶段）
  treeView.addEventListener('contextmenu', e => {
    const target = e.target
    const span = target.closest('span[data-type="file"]')
    
    if (!span) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const filePath = span.dataset.path
    const fileName = span.dataset.name
    
    const menu = Menu.buildFromTemplate([
      {
        label: '重命名',
        click: () => {
          renameFile(filePath, span)
        }
      },
      {
        type: 'separator'
      },
      {
        label: '删除文件',
        click: () => {
          deleteFile(filePath)
        }
      }
    ])
    
    menu.popup({ window: require('electron').remote.getCurrentWindow() })
  })
}

/**
 * 在当前目录下新建目录
 */
function createNewDirectory(dirPath) {
  const prompt = require('electron-prompt')
  
  prompt({
    title: '新建目录',
    label: '目录名：',
    value: '新建目录',
    inputAttrs: {
      type: 'text'
    }
  }).then(result => {
    if (result === null) return
    
    const dirName = result.trim()
    if (!dirName) {
      dialog.showMessageBox({
        type: 'warning',
        title: '提示',
        message: '目录名不能为空',
        buttons: ['确定']
      })
      return
    }
    
    const newDirPath = path.join(dirPath, dirName)
    
    // 检查目录是否已存在
    if (fs.existsSync(newDirPath)) {
      dialog.showMessageBox({
        type: 'warning',
        title: '提示',
        message: '目录已存在',
        buttons: ['确定']
      })
      return
    }
    
    // 创建目录
    try {
      fs.mkdirSync(newDirPath, { recursive: true })
      
      // 自动刷新目录树（延迟一下确保文件系统更新完成）
      setTimeout(() => {
        refreshExplorer()
      }, 100)
    } catch (err) {
      dialog.showErrorBox('错误', `创建目录失败: ${err.message}`)
    }
  }).catch(err => {
    console.error(err)
  })
}

/**
 * 在当前目录下新建文件
 */
function createNewFile(dirPath) {
  const prompt = require('electron-prompt')
  
  prompt({
    title: '新建文件',
    label: '文件名：',
    value: 'newfile.c',
    inputAttrs: {
      type: 'text'
    }
  }).then(result => {
    if (result === null) return
    
    const fileName = result.trim()
    if (!fileName) {
      dialog.showMessageBox({
        type: 'warning',
        title: '提示',
        message: '文件名不能为空',
        buttons: ['确定']
      })
      return
    }
    
    const filePath = path.join(dirPath, fileName)
    
    // 检查文件是否已存在
    if (fs.existsSync(filePath)) {
      dialog.showMessageBox({
        type: 'warning',
        title: '提示',
        message: '文件已存在',
        buttons: ['确定']
      })
      return
    }
    
    // 创建空文件
    fs.writeFileSync(filePath, '', 'utf8')
    
    // 自动刷新目录树（延迟一下确保文件系统更新完成）
    setTimeout(() => {
      refreshExplorer()
    }, 200)
  }).catch(err => {
    console.error(err)
  })
}

/**
 * 重命名目录
 */
function renameDirectory(dirPath, spanElement) {
  const oldName = spanElement.dataset.name
  const parentDir = path.dirname(dirPath)
  
  // 使元素可编辑
  spanElement.contentEditable = 'true'
  spanElement.focus()
  
  // 选中文本
  const range = document.createRange()
  range.selectNodeContents(spanElement)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)
  
  // 处理失焦事件
  const handleBlur = () => {
    spanElement.contentEditable = 'false'
    const newName = spanElement.textContent.trim()
    
    if (!newName || newName === oldName) {
      spanElement.textContent = oldName
      return
    }
    
    const newPath = path.join(parentDir, newName)
    
    // 检查新名称是否已存在
    if (fs.existsSync(newPath)) {
      dialog.showMessageBox({
        type: 'warning',
        title: '提示',
        message: '目录名已存在',
        buttons: ['确定']
      })
      spanElement.textContent = oldName
      return
    }
    
    // 重命名目录
    try {
      fs.renameSync(dirPath, newPath)
      spanElement.dataset.path = newPath
      spanElement.dataset.name = newName
      
      // 如果当前路径包含此目录，需要更新
      const currentPath = getProperty('currentPath')
      if (currentPath && currentPath.startsWith(dirPath)) {
        const newCurrentPath = currentPath.replace(dirPath, newPath)
        setProperty('currentPath', newCurrentPath)
      }
      
      // 刷新目录树（延迟一下确保文件系统更新完成）
      if (currentPath) {
        setTimeout(() => {
          initSideBarLow(currentPath, $('#tree-view'), true)
        }, 100)
      }
    } catch (err) {
      dialog.showErrorBox('错误', `重命名失败: ${err.message}`)
      spanElement.textContent = oldName
    }
  }
  
  // 处理回车键
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      spanElement.blur()
    } else if (e.key === 'Escape') {
      spanElement.textContent = oldName
      spanElement.blur()
    }
  }
  
  spanElement.addEventListener('blur', handleBlur, { once: true })
  spanElement.addEventListener('keydown', handleKeyDown, { once: true })
}

/**
 * 重命名文件
 */
function renameFile(filePath, spanElement) {
  const oldName = spanElement.dataset.name
  const parentDir = path.dirname(filePath)
  
  // 使元素可编辑
  spanElement.contentEditable = 'true'
  spanElement.focus()
  
  // 选中文本（不包括扩展名）
  const nameWithoutExt = path.parse(oldName).name
  const range = document.createRange()
  range.selectNodeContents(spanElement)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)
  
  // 处理失焦事件
  const handleBlur = () => {
    spanElement.contentEditable = 'false'
    const newName = spanElement.textContent.trim()
    
    if (!newName || newName === oldName) {
      spanElement.textContent = oldName
      return
    }
    
    const newPath = path.join(parentDir, newName)
    
    // 检查新名称是否已存在
    if (fs.existsSync(newPath)) {
      dialog.showMessageBox({
        type: 'warning',
        title: '提示',
        message: '文件名已存在',
        buttons: ['确定']
      })
      spanElement.textContent = oldName
      return
    }
    
    // 重命名文件
    try {
      fs.renameSync(filePath, newPath)
      spanElement.dataset.path = newPath
      spanElement.dataset.name = newName
      
      // 如果这是当前打开的文件，更新路径
      const currentFilePath = getProperty('currentFilePath')
      if (currentFilePath === filePath) {
        setProperty('currentFilePath', newPath)
        // 更新已打开文档列表
        const openedDocs = getProperty('openedDocs')
        const doc = openedDocs.find(d => d.path === filePath)
        if (doc) {
          doc.path = newPath
          doc.name = newName
        }
      }
      
      // 刷新目录树（延迟一下确保文件系统更新完成）
      const currentPath = getProperty('currentPath')
      if (currentPath) {
        setTimeout(() => {
          initSideBarLow(currentPath, $('#tree-view'), true)
        }, 100)
      }
    } catch (err) {
      dialog.showErrorBox('错误', `重命名失败: ${err.message}`)
      spanElement.textContent = oldName
    }
  }
  
  // 处理回车键
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      spanElement.blur()
    } else if (e.key === 'Escape') {
      spanElement.textContent = oldName
      spanElement.blur()
    }
  }
  
  spanElement.addEventListener('blur', handleBlur, { once: true })
  spanElement.addEventListener('keydown', handleKeyDown, { once: true })
}

/**
 * 删除目录
 */
function deleteDirectory(dirPath) {
  dialog.showMessageBox({
    type: 'warning',
    title: '确认删除',
    message: `确定要删除目录 "${path.basename(dirPath)}" 吗？此操作不可恢复。`,
    buttons: ['取消', '删除'],
    defaultId: 0,
    cancelId: 0
  }).then(result => {
    if (result.response === 1) {
      try {
        // 递归删除目录
        if (fs.existsSync(dirPath)) {
          // 使用递归删除函数（兼容旧版本Node.js）
          function removeDirSync(dirPath) {
            if (fs.existsSync(dirPath)) {
              const files = fs.readdirSync(dirPath)
              files.forEach(file => {
                const filePath = path.join(dirPath, file)
                const stat = fs.statSync(filePath)
                if (stat.isDirectory()) {
                  removeDirSync(filePath)
                } else {
                  fs.unlinkSync(filePath)
                }
              })
              fs.rmdirSync(dirPath)
            }
          }
          removeDirSync(dirPath)
          
          // 如果当前路径在此目录下，需要更新
          const currentPath = getProperty('currentPath')
          if (currentPath && (currentPath === dirPath || currentPath.startsWith(dirPath + path.sep))) {
            setProperty('currentPath', path.dirname(dirPath))
          }
          
          // 刷新目录树（延迟一下确保文件系统更新完成）
          const newCurrentPath = getProperty('currentPath')
          if (newCurrentPath) {
            setTimeout(() => {
              initSideBarLow(newCurrentPath, $('#tree-view'), true)
            }, 100)
          }
        }
      } catch (err) {
        dialog.showErrorBox('错误', `删除目录失败: ${err.message}`)
      }
    }
  })
}

/**
 * 删除文件
 */
function deleteFile(filePath) {
  dialog.showMessageBox({
    type: 'warning',
    title: '确认删除',
    message: `确定要删除文件 "${path.basename(filePath)}" 吗？此操作不可恢复。`,
    buttons: ['取消', '删除'],
    defaultId: 0,
    cancelId: 0
  }).then(result => {
    if (result.response === 1) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
          
          // 如果这是当前打开的文件，关闭它
          const currentFilePath = getProperty('currentFilePath')
          if (currentFilePath === filePath) {
            const openedDocs = getProperty('openedDocs')
            const docIndex = openedDocs.findIndex(d => d.path === filePath)
            if (docIndex !== -1) {
              openedDocs.splice(docIndex, 1)
            }
            
            // 切换到其他文件或清空编辑器
            if (openedDocs.length > 0) {
              const nextDoc = openedDocs[0]
              setProperty('currentFilePath', nextDoc.path)
              window.editor.setSession(nextDoc.session)
            } else {
              setProperty('currentFilePath', '')
              window.editor.setValue('')
            }
          } else {
            // 从已打开文档列表中移除
            const openedDocs = getProperty('openedDocs')
            const docIndex = openedDocs.findIndex(d => d.path === filePath)
            if (docIndex !== -1) {
              openedDocs.splice(docIndex, 1)
            }
          }
          
          // 刷新目录树（延迟一下确保文件系统更新完成）
          const currentPath = getProperty('currentPath')
          if (currentPath) {
            setTimeout(() => {
              initSideBarLow(currentPath, $('#tree-view'), true)
            }, 100)
          }
        }
      } catch (err) {
        dialog.showErrorBox('错误', `删除文件失败: ${err.message}`)
      }
    }
  })
}

/**
 * 为空白区域添加右键菜单
 */
function setupBlankAreaContextMenu() {
  // 首先添加全局的contextmenu事件监听器，捕获所有右键点击
  document.addEventListener('contextmenu', e => {
  }, true) // 使用捕获阶段
  
  const treeView = $('#tree-view')
  
  
  if (!treeView) {
    return
  }
  
  // 使用捕获阶段，在文件/目录菜单之前检查，但只在没有匹配文件/目录时才处理
  treeView.addEventListener('contextmenu', e => {
    // 检查是否点击在文件或目录上
    // 修复：检查点击的元素或其父元素是否是文件/目录span
    const target = e.target
    // 检查target本身及其所有父元素，看是否有文件/目录span
    let currentElement = target
    let foundFileOrDirSpan = null
    let checkDepth = 0
    const maxDepth = 5 // 最多检查5层父元素
    
    while (currentElement && currentElement !== treeView && checkDepth < maxDepth) {
      if (currentElement.tagName === 'SPAN' && currentElement.dataset && currentElement.dataset.type) {
        if (currentElement.dataset.type === 'file' || currentElement.dataset.type === 'directory') {
          foundFileOrDirSpan = currentElement
          break
        }
      }
      currentElement = currentElement.parentElement
      checkDepth++
    }
    
    
    // 如果点击在文件或目录上，不处理（由其他菜单处理）
    if (foundFileOrDirSpan) {
      return
    }
    
    // 如果点击在空白区域，显示新建菜单
    // 检查target是否是treeView本身，或者点击在treeView的空白区域（不是文件/目录元素）
    const isTreeViewSelf = target === treeView
    const isInTreeView = treeView.contains(target)
    // 检查点击的元素是否是li（文件/目录项），如果是，检查是否点击在span上
    const clickedLi = target.closest('li')
    const clickedSpan = target.closest('span[data-type]')
    const isClickOnSpan = clickedSpan && (clickedSpan.dataset.type === 'file' || clickedSpan.dataset.type === 'directory')
    // 如果点击在li上但不是span，说明点击在空白区域（li的其他部分，比如图标旁边）
    const isClickOnLiButNotSpan = clickedLi && !isClickOnSpan
    // 检查点击的元素是否是img（图标），如果是，也认为是点击在文件/目录上
    const isClickOnImg = target.tagName === 'IMG' || target.closest('img')
    // 检查点击的元素是否是ul（子目录列表），如果是，认为是空白区域
    const isClickOnUl = target.tagName === 'UL' || (target.closest('ul') && target.closest('ul').parentElement === clickedLi)
    const targetParent = target.parentElement
    const targetParentTag = targetParent ? targetParent.tagName : null
    const targetParentId = targetParent ? targetParent.id : null
    // 检查点击位置是否在tree-view的直接子元素（ul）上，或者tree-view本身
    const isDirectChildOfTreeView = targetParent === treeView || (targetParent && targetParent.parentElement === treeView)
    
    // 如果点击在treeView内但不是文件/目录span，显示菜单
    // 空白区域包括：treeView本身、ul元素（子目录列表）、li元素但不是span或img、或者其他非文件/目录元素
    // 排除：点击在span（文件/目录名）或img（图标）上
    const shouldShowBlankMenu = isInTreeView && !isClickOnSpan && !isClickOnImg && (isTreeViewSelf || isClickOnUl || isClickOnLiButNotSpan || (!clickedLi && !clickedSpan) || isDirectChildOfTreeView)
    
    
    if (shouldShowBlankMenu) {
      e.preventDefault()
      e.stopPropagation()
      
      // 获取当前工作区路径
      const currentPath = getProperty('currentPath')
      if (!currentPath) {
        return
      }
      
      const { Menu } = require('electron').remote
      const remoteWindow = require('electron').remote.getCurrentWindow()
      
      const menu = Menu.buildFromTemplate([
        {
          label: '新建文件',
          click: () => {
            createNewFile(currentPath)
          }
        },
        {
          label: '新建目录',
          click: () => {
            createNewDirectory(currentPath)
          }
        }
      ])
      
      try {
        menu.popup({ window: remoteWindow })
      } catch (popupErr) {
        console.error('显示空白区域菜单失败:', popupErr)
      }
    }
  }, true) // 使用捕获阶段，确保在文件/目录菜单之前检查
  
  
  // 额外检查：在sidebar容器上也添加监听器，如果点击在空白区域，显示菜单
  const sidebar = $('#sidebar')
  if (sidebar) {
    sidebar.addEventListener('contextmenu', e => {
      // 如果点击在sidebar上但不是tree-view，且不是文件/目录，显示空白区域菜单
      if (e.target === sidebar || (e.target.parentElement === sidebar && e.target !== treeView)) {
        // 检查是否点击在文件/目录上
        const clickedSpan = e.target.closest('span[data-type]')
        if (!clickedSpan) {
          e.preventDefault()
          e.stopPropagation()
          
          const currentPath = getProperty('currentPath')
          if (!currentPath) {
            return
          }
          
          const { Menu } = require('electron').remote
          const menu = Menu.buildFromTemplate([
            {
              label: '新建文件',
              click: () => {
                createNewFile(currentPath)
              }
            },
            {
              label: '新建目录',
              click: () => {
                createNewDirectory(currentPath)
              }
            }
          ])
          
          try {
            menu.popup({ window: require('electron').remote.getCurrentWindow() })
          } catch (popupErr) {
            console.error('显示sidebar空白区域菜单失败:', popupErr)
          }
        }
      }
    }, true)
  }
  
  // 额外检查：在explorer-view容器上也添加监听器
  const explorerView = $('#explorer-view')
  if (explorerView) {
    explorerView.addEventListener('contextmenu', e => {
      // 暂时不处理
    }, true)
  }
}

module.exports = {
  setupDirectoryContextMenu,
  setupFileContextMenu,
  setupBlankAreaContextMenu
}
