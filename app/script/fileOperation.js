// 文件操作逻辑

'use strict'

const { setProperty, getProperty, getHighlightMode, $, getIcon } = require('./utils')
const { dialog } = require('electron').remote
const fs = require('fs')
const path = require('path')

let highlightActiveFile
const { refreshExplorer } = require('./autoRefresh')
async function init() {
  highlightActiveFile = (await require('./sidebar')).highlightActiveFile
}

init().then(
  (() => {
    /**
     * 打开文件
     */
    const openFile = () => {
      dialog
        .showOpenDialog({
          title: '打开文件..',
        })
        .then(res => {
          if (!res.filePaths[0]) return
          const openedDocs = getProperty('openedDocs')
          if (openedDocs.some(v => v.path == res.filePaths[0])) return
          const docToAdd = {
            path: res.filePaths[0],
            name: path.basename(res.filePaths[0]),
            modified: false,
            session: undefined,
          }
          setProperty('currentFilePath', res.filePaths[0])
          if (getProperty('currentFilePath')) {
            fs.readFile(getProperty('currentFilePath'), 'utf8', (err, data) => {
              err && dialog.showErrorBox('错误', String(err))
              // 为新打开的文件新建一个Session
              docToAdd.session = new ace.EditSession(data)
              // 监听Session的change事件
              docToAdd.session.on('change', e => {
                if (openedDocs.find(v => v.path == docToAdd.path).modified == false) {
                  openedDocs.find(v => v.path == docToAdd.path).modified = true
                }
              })
              // 设置高亮模式
              docToAdd.session.setMode(getHighlightMode(path.extname(getProperty('currentFilePath'))))
              openedDocs.push(docToAdd)
              // 更新侧边栏文件高亮
              highlightActiveFile(docToAdd.path)
              // 更新editor状态
              editor.setSession(openedDocs.slice(-1)[0].session)
              editor.moveCursorTo(0)
              // 自动刷新资源管理器
              refreshExplorer()
            })
          }
        })
    }
    module.exports.openFileDialog = openFile

    /**
     * 保存至打开的文件
     */
    const saveFile = () => {
      if (getProperty('currentFilePath')) {
        fs.writeFile(getProperty('currentFilePath'), editor.getValue(), 'utf8', err => {
          if (err) {
            console.error(err)
          } else {
            const openedDocs = getProperty('openedDocs')
            openedDocs.find(v => v.path == getProperty('currentFilePath')) && (openedDocs.find(v => v.path == getProperty('currentFilePath')).modified = false)
          }
        })
      } else {
        dialog.showMessageBox({
          type: 'info',
          title: '提示',
          message: '保存失败！',
          button: ['确定'],
        })
      }
    }
    module.exports.saveFileDialog = saveFile

    /**
     * 新建文件并保存
     */
    const newFile = title => {
      return new Promise((resolve, reject) => {
        dialog
          .showSaveDialog({
            title,
          })
          .then(res => {
            if (res.filePath) {
              fs.writeFile(res.filePath, title == '新建文件' ? '' : editor.getValue(), 'utf8', err => {
                if (err) {
                  console.error(err)
                } else {
                  setProperty('currentFilePath', res.filePath)
                  // 自动刷新资源管理器（延迟一下确保文件系统更新完成）
                  const { refreshExplorer } = require('./autoRefresh')
                  setTimeout(() => {
                    refreshExplorer()
                  }, 100)
                  resolve()
                }
              })
            } else {
              resolve()
            }
          })
      })
    }
    module.exports.newFileDialog = newFile

    const saveSessionToFile = (session, path) => {
      fs.writeFile(path, session.getValue(), 'utf8', err => {
        console.error(err)
      })
    }

    module.exports.saveSessionToFile = saveSessionToFile
  })()
)
