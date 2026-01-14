// 侧边栏相关逻辑

'use strict'

const dree = require('dree')
const path = require('path')
const fs = require('fs')
const prompt = require('electron-prompt')
const child_process = require('child_process')
const { dialog } = require('electron').remote

const { getProperty, setProperty, $, getHighlightMode, getIcon } = require('./utils')
const { saveSessionToFile, newFileDialog } = require('./fileOperation')
const { refreshExplorer } = require('./autoRefresh')

/**
 * 初始化侧边栏
 */
function initSideBar() {
  setProperty('openedDocs', [])

  // 检查并初始化侧边栏元素
  const initSideBarElements = () => {
    const refreshBtn = $('#refresh')
    const newFileBtn = $('#newFile')
    const newFolderBtn = $('#newFolder')
    const openCurFolderBtn = $('#openCurFolder')
    const treeView = $('#tree-view')
    
    // 如果关键元素不存在，延迟重试
    if (!refreshBtn || !newFileBtn || !newFolderBtn || !openCurFolderBtn || !treeView) {
      setTimeout(initSideBarElements, 100)
      return
    }
    
    try {
      // 刷新按钮按下时重新渲染下部文件树
      refreshBtn.addEventListener('click', () => {
        refreshExplorer()
      })

      // 下部的新建文件按钮响应
      newFileBtn.addEventListener('click', async () => {
        await newFileDialog('新建文件')
        refreshExplorer()
      })

      // 下部的新建文件夹按钮响应
      newFolderBtn.addEventListener('click', async () => {
        if (getProperty('currentPath')) {
          let folderName = await prompt({
            title: '请输入...',
            label: '文件夹名：',
            value: '新建文件夹',
          })
          // 如有重复文件夹，则弹出提示框
          if (folderName) {
            const folderPath = path.join(getProperty('currentPath'), folderName)
            fs.mkdir(folderPath, { recursive: true }, err => {
              if (err) {
                dialog.showErrorBox('错误', `创建文件夹失败: ${err.message}`)
              } else {
                // 自动刷新（延迟一下确保文件系统更新完成）
                setTimeout(() => {
                  refreshExplorer()
                }, 100)
              }
            })
          }
        }
      })

      // 下部的打开当前文件夹按钮响应
      openCurFolderBtn.addEventListener('click', () => {
        if (getProperty('currentPath')) child_process.exec(`start ${getProperty('currentPath')}`)
      })
      
      // 设置目录树点击事件
      setupTreeViewEvents(treeView)
    } catch (err) {
      console.error('初始化侧边栏元素失败:', err)
    }
  }
  
  // 如果DOM已加载，立即执行；否则等待
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSideBarElements)
  } else {
    initSideBarElements()
  }
}

/**
 * 设置目录树点击事件
 */
function setupTreeViewEvents(treeView) {
  if (!treeView) return
  
  // 设置下半部分（目录树）监听
  treeView.addEventListener('click', e => {
    e.stopPropagation()

    const target = e.target
    const dataset = target.dataset
    if (!dataset || !dataset.type) return
    
    const editor = window.editor
    const openedDocs = getProperty('openedDocs')

    // 类型是文件
    if (dataset.type == 'file') {
      // 更新文件开关状态
      const docToAdd = {
        path: dataset.path,
        name: dataset.name,
        modified: false,
        session: undefined,
      }
      setProperty('currentFilePath', dataset.path)
      if (getProperty('currentFilePath')) {
        fs.readFile(getProperty('currentFilePath'), 'utf8', (err, data) => {
          err && dialog.showErrorBox('错误', String(err))
          // 为新打开的文件新建一个会话
          docToAdd.session = new ace.EditSession(data)
          // 为了实现文件被修改的检测功能，监听会话的change事件
          docToAdd.session.on('change', e => {
            if (openedDocs.find(v => v.path == dataset.path).modified == false) {
              openedDocs.find(v => v.path == dataset.path).modified = true
              // 更新目录树中的文件高亮（如果有修改标记）
            }
          })
          // 设置高亮模式
          docToAdd.session.setMode(getHighlightMode(path.extname(getProperty('currentFilePath'))))
          // 加入全局属性，统一管理
          openedDocs.push(docToAdd)
          // 更新目录树中的文件高亮
          highlightActiveFile(dataset.path)
          // 更新editor状态
          editor.setSession(openedDocs.slice(-1)[0].session)
          editor.moveCursorTo(0)
          setProperty('currentFilePath', dataset.path)
        })
      }
    } else if (dataset.type == 'directory') {
      // 更新文件夹开关状态
      /**
       * 寻找最近的兄弟姐妹结点
       */
      function findClosestSibling(dom, label, mustAfter) {
        let on = !mustAfter
        let res = void 0
        dom.parentNode.childNodes.forEach(node => {
          if (node == dom) on = true
          if (on && node.nodeType == 1 && node.tagName.toLowerCase() == label.toLowerCase()) {
            res = node
            return
          }
        })
        return res
      }
      // 用来渲染这个目录下面的孩子的ul
      const closestUL = findClosestSibling(target, 'ul', true)
      if (closestUL && target.dataset['path']) {
        // 渲染孩子
        initSideBarLow(target.dataset['path'], closestUL)
      }
      // 更新文件夹开闭图标
      const closestImg = findClosestSibling(target, 'img', false)
      if (closestImg) {
        closestImg.src = getIcon('directory', '', ['on', 'off'][Number(!!closestImg.src.includes('folderon'))])
      }
    }
  })
}


/**
 * 更新侧边栏下半部分（目录树）
 * dom是要更新的文件夹的根的dom（ul）
 */
function initSideBarLow(clickedPath, dom, refresh) {
  if (!clickedPath || !dom) {
    return
  }
  
  try {
    // 每次一层进行扫描
    const dreeTree = dree.scan(clickedPath, { depth: 1 })
    // 更新当前打开目录显示（只显示目录名）
    const currentPath = getProperty('currentPath')
    const currentPathElement = $('#current-path')
    if (currentPathElement) {
      currentPathElement.innerHTML = currentPath ? path.basename(currentPath) : '未打开任何目录'
    }
  // 该层级初始化渲染或刷新时，将重新渲染整个树结构
  if (dom.innerHTML.trim() == '' || refresh) {
    const currentFilePath = getProperty('currentFilePath')
    dom.innerHTML = (function (tree) {
      let res = ''
      if (tree && tree.children) {
        for (let children of tree.children)
          if (children.type == 'directory')
            res += `<li>
            <img src="${getIcon('directory', '', 'off')}" class="file-icon"></img>
            <span data-path="${children.path}" data-type="directory" data-name="${children.name}">
             ${children.name}
            </span>
            <ul></ul>
            </li>`
        for (let children of tree.children)
          if (children.type == 'file') {
            const isActive = currentFilePath === children.path
            res += `<li>
            <img src="${getIcon('file', children.name)}" class="file-icon"></img>
            <span data-path="${children.path}" data-type="file" data-name="${children.name}" class="${isActive ? 'active-file' : ''}">
              ${children.name}
            </span>
            </li>`
          }
      }
      return res
    })(dreeTree)
  }
  // 若已探索过该层级，则只要更新显隐状态即可
  else {
    const children = Array.from(dom.childNodes)
    children
      .filter(node => node.nodeType == 1) // 非#text节点
      .forEach(v => {
        // prettier-ignore
        v.style.display = ({ 'none': 'block', 'block': 'none' })[v.style.display.trim() || 'block']
      })
  }
  } catch (err) {
    console.error('initSideBarLow执行失败:', err)
  }
}
module.exports.initSideBar = initSideBar
module.exports.initSideBarLow = initSideBarLow

/**
 * 高亮当前打开的文件
 */
function highlightActiveFile(filePath) {
  // 清除所有高亮
  const allSpans = document.querySelectorAll('#tree-view span[data-type="file"]')
  allSpans.forEach(span => {
    span.classList.remove('active-file')
  })
  
  // 高亮当前文件
  if (filePath) {
    const activeSpan = document.querySelector(`#tree-view span[data-path="${filePath}"]`)
    if (activeSpan) {
      activeSpan.classList.add('active-file')
    }
  }
}
module.exports.highlightActiveFile = highlightActiveFile
