// 自动刷新资源管理器

'use strict'

const { getProperty, $ } = require('./utils')
const sidebarModule = require('./sidebar')

/**
 * 刷新资源管理器
 */
function refreshExplorer() {
  const currentPath = getProperty('currentPath')
  const treeView = $('#tree-view')
  
  
  if (!currentPath) {
    return
  }
  
  if (!treeView) {
    // 延迟重试
    setTimeout(() => {
      const retryTreeView = $('#tree-view')
      if (retryTreeView && getProperty('currentPath')) {
        try {
          sidebarModule.initSideBarLow(getProperty('currentPath'), retryTreeView, true)
        } catch (err) {
          console.error('刷新资源管理器失败:', err)
        }
      }
    }, 200)
    return
  }
  
  try {
    // 使用setTimeout确保DOM更新完成后再刷新，增加延迟时间确保文件系统更新完成
    setTimeout(() => {
      try {
        // 直接使用sidebarModule.initSideBarLow，避免解构导入问题
        if (typeof sidebarModule.initSideBarLow === 'function') {
          sidebarModule.initSideBarLow(currentPath, treeView, true)
        } else {
          throw new Error('initSideBarLow函数未找到')
        }
      } catch (initErr) {
        console.error('initSideBarLow执行失败:', initErr)
      }
    }, 300) // 增加延迟时间到300ms，确保文件系统更新完成
  } catch (err) {
    console.error('刷新资源管理器失败:', err)
  }
}

module.exports = {
  refreshExplorer
}
