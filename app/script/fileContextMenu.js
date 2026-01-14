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
    }, 100)
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

module.exports = {
  setupDirectoryContextMenu,
  setupFileContextMenu
}
