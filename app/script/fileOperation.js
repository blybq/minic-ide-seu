// 文件操作逻辑

'use strict'

const { setProperty, getProperty, getHighlightMode, $, getIcon } = require('./utils')
const { dialog } = require('electron').remote
const fs = require('fs')
const path = require('path')
const iconv = require('iconv-lite')

// 获取文件编码设置
function getFileEncoding() {
  try {
    const settingsPath = path.join(__dirname, '../../config/AppSettings.json')
    const appSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
    return appSettings.file_encoding || 'utf8'
  } catch (err) {
    return 'utf8'
  }
}

// 使用指定编码读取文件
function readFileWithEncoding(filePath, encoding) {
  return new Promise((resolve, reject) => {
    if (encoding === 'utf8' || encoding === 'utf-8') {
      // UTF-8可以直接使用fs.readFile
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) reject(err)
        else resolve(data)
      })
    } else {
      // 其他编码需要使用iconv-lite
      fs.readFile(filePath, (err, buffer) => {
        if (err) {
          reject(err)
        } else {
          try {
            const text = iconv.decode(buffer, encoding)
            resolve(text)
          } catch (decodeErr) {
            reject(new Error(`解码失败: ${decodeErr.message}`))
          }
        }
      })
    }
  })
}

// 使用指定编码写入文件
function writeFileWithEncoding(filePath, content, encoding) {
  return new Promise((resolve, reject) => {
    if (encoding === 'utf8' || encoding === 'utf-8') {
      // UTF-8可以直接使用fs.writeFile
      fs.writeFile(filePath, content, 'utf8', (err) => {
        if (err) reject(err)
        else resolve()
      })
    } else {
      // 其他编码需要使用iconv-lite
      try {
        const buffer = iconv.encode(content, encoding)
        fs.writeFile(filePath, buffer, (err) => {
          if (err) reject(err)
          else resolve()
        })
      } catch (encodeErr) {
        reject(new Error(`编码失败: ${encodeErr.message}`))
      }
    }
  })
}

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
            // 添加到最近打开的文件
            try {
              const { addRecentFile } = require('./recentHistory')
              addRecentFile(res.filePaths[0])
            } catch (err) {
              console.error('添加文件历史记录失败:', err)
            }
            
            const encoding = getFileEncoding()
            readFileWithEncoding(getProperty('currentFilePath'), encoding).then(data => {
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
            }).catch(err => {
              dialog.showErrorBox('错误', String(err))
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
        const encoding = getFileEncoding()
        writeFileWithEncoding(getProperty('currentFilePath'), editor.getValue(), encoding).then(() => {
          const openedDocs = getProperty('openedDocs')
          openedDocs.find(v => v.path == getProperty('currentFilePath')) && (openedDocs.find(v => v.path == getProperty('currentFilePath')).modified = false)
        }).catch(err => {
          console.error(err)
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
              const encoding = getFileEncoding()
              const content = title == '新建文件' ? '' : editor.getValue()
              writeFileWithEncoding(res.filePath, content, encoding).then(() => {
                setProperty('currentFilePath', res.filePath)
                // 自动刷新资源管理器（延迟一下确保文件系统更新完成）
                const { refreshExplorer } = require('./autoRefresh')
                setTimeout(() => {
                  refreshExplorer()
                }, 300) // 修复：在文件保存对话框确认后才刷新，延迟300ms确保文件系统更新完成
                resolve()
              }).catch(err => {
                console.error(err)
                reject(err)
              })
            } else {
              resolve()
            }
          })
      })
    }
    module.exports.newFileDialog = newFile

    const saveSessionToFile = (session, filePath) => {
      const encoding = getFileEncoding()
      writeFileWithEncoding(filePath, session.getValue(), encoding).catch(err => {
        console.error(err)
      })
    }

    module.exports.saveSessionToFile = saveSessionToFile
  })()
)
