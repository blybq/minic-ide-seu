// 最近打开的文件和工作区历史记录管理

'use strict'

const fs = require('fs')
const path = require('path')

const historyPath = path.join(__dirname, '../../config/RecentHistory.json')
const MAX_RECENT_FILES = 15
const MAX_RECENT_WORKSPACES = 10

// 读取历史记录
function loadHistory() {
  try {
    if (fs.existsSync(historyPath)) {
      const data = fs.readFileSync(historyPath, 'utf8')
      return JSON.parse(data)
    }
  } catch (err) {
    console.error('读取历史记录失败:', err)
  }
  return {
    recentFiles: [],
    recentWorkspaces: []
  }
}

// 保存历史记录
function saveHistory(history) {
  try {
    const dir = path.dirname(historyPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf8')
  } catch (err) {
    console.error('保存历史记录失败:', err)
  }
}

// 添加最近打开的文件
function addRecentFile(filePath) {
  const history = loadHistory()
  const normalizedPath = filePath.replace(/\\/g, '/')
  
  // 移除已存在的项（如果存在）
  history.recentFiles = history.recentFiles.filter(p => p !== normalizedPath)
  
  // 添加到开头
  history.recentFiles.unshift(normalizedPath)
  
  // 限制数量
  if (history.recentFiles.length > MAX_RECENT_FILES) {
    history.recentFiles = history.recentFiles.slice(0, MAX_RECENT_FILES)
  }
  
  saveHistory(history)
}

// 添加最近打开的工作区
function addRecentWorkspace(workspacePath) {
  const history = loadHistory()
  const normalizedPath = workspacePath.replace(/\\/g, '/')
  
  // 移除已存在的项（如果存在）
  history.recentWorkspaces = history.recentWorkspaces.filter(p => p !== normalizedPath)
  
  // 添加到开头
  history.recentWorkspaces.unshift(normalizedPath)
  
  // 限制数量
  if (history.recentWorkspaces.length > MAX_RECENT_WORKSPACES) {
    history.recentWorkspaces = history.recentWorkspaces.slice(0, MAX_RECENT_WORKSPACES)
  }
  
  saveHistory(history)
}

// 获取最近打开的文件列表
function getRecentFiles() {
  const history = loadHistory()
  return history.recentFiles || []
}

// 获取最近打开的工作区列表
function getRecentWorkspaces() {
  const history = loadHistory()
  return history.recentWorkspaces || []
}

// 清除最近打开的文件
function clearRecentFiles() {
  const history = loadHistory()
  history.recentFiles = []
  saveHistory(history)
}

// 清除最近打开的工作区
function clearRecentWorkspaces() {
  const history = loadHistory()
  history.recentWorkspaces = []
  saveHistory(history)
}

// 清除所有历史记录
function clearAllHistory() {
  const history = {
    recentFiles: [],
    recentWorkspaces: []
  }
  saveHistory(history)
}

module.exports = {
  addRecentFile,
  addRecentWorkspace,
  getRecentFiles,
  getRecentWorkspaces,
  clearRecentFiles,
  clearRecentWorkspaces,
  clearAllHistory
}
