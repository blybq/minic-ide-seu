# Minisys IDE

Minisys IDE 是一个基于 Electron 的集成开发环境，专门为 Minisys-1A 处理器系统设计。本版本是重构增强版，集成了 MiniC 编译器和 Minisys 汇编器，并增加了多项实用功能。

## 特性概览

### 🚀 核心功能

- **集成开发环境**：完整的代码编辑、编译、汇编、链接工作流
- **双工具链集成**：
  - MiniC 编译器（基于 `minic-compiler-refactored`）
  - Minisys 汇编器（基于 `advanced-minisys-assembler`）
- **PowerShell 集成**：编译和汇编程序直接运行在 PowerShell 中，提供更好的终端体验

### ✨ 编辑器增强

- **代码格式化**：在代码编辑区域右键选择"格式化代码"，通过调用 clang-formatter 实现
- **全局搜索**：支持在整个工作区中进行文本搜索
- **编辑器个性化**：
  - 自动保存选项
  - 自动换行控制
  - 制表符长度设置（支持 2/4/8 空格）
  - 文件编码方式选择（UTF-8、GBK 等）
  - 多种主题支持

### 📁 文件管理

- **右键操作**：在工作区中选中目录右键可以：
  - 在当前目录下添加新目录或文件
  - 删除目录或文件
- **改进的界面**：
  - 调整了文件资源管理器的字体样式
  - 优化了搜索栏样式
  - 更直观的图标和布局

### ⚙️ 设置与配置

- **现代化的设置界面**：重新设计的设置栏样式，更易用
- **工具链配置**：可配置编译器、汇编器路径
- **串口通信**：支持 Minisys-1A 硬件连接和程序下载

## 项目结构

```bash
minic-ide-seu/
├── app/                    # 应用前端代码
│   ├── script/            # JavaScript 业务逻辑
│   ├── style/             # CSS 样式文件
│   └── view/              # HTML 视图文件
├── asset/                 # 静态资源（图标等）
├── config/                # 配置文件
│   ├── AppSettings.json   # 应用设置
│   ├── ToolchainSettings.json # 工具链配置
│   ├── CompleterDatabase.json # 代码补全数据库
│   └── RecentHistory.json # 最近打开历史
├── lib/                   # 第三方库和工具
└── package.json          # 项目配置和依赖
```

## 快速开始

### 环境要求

- Node.js 14+
- npm 或 yarn
- Windows PowerShell（用于终端功能）

### 安装步骤

1. **克隆项目**

   ```bash
   git clone <repository-url>
   cd minic-ide-seu
   ```

2. **安装依赖**

   ```bash
   npm install
   ```

3. **确保工具链可用**
   - 确认 `../minic-compiler-refactored/` 目录存在且可编译
   - 确认 `../advanced-minisys-assembler/` 目录存在且可运行

4. **运行开发模式**

   ```bash
   npm run dev
   ```

5. **运行生产模式（可选）**

   ```bash
   npm start
   ```

## 配置说明

### 工具链配置

编辑 `config/ToolchainSettings.json`：

```json
{
  "compiler_path": "../minic-compiler-refactored/build/main.js",
  "assembler_path": "../advanced-minisys-assembler/dist/src/index.js",
  "serialport_num": "COM5",
  "serialport_path": "./lib/minisys-serialport/UartAssist.exe",
  "serialport_baud": "9600"
}
```

### 编辑器设置

编辑 `config/AppSettings.json` 或通过 IDE 界面设置：

```json
{
  "theme": "ambiance",
  "font_size": 16,
  "wrap": true,
  "auto_save": false,
  "auto_save_interval": 3000,
  "tab_size": 4,
  "file_encoding": "utf8"
}
```

## 使用指南

### 1. 创建项目

1. 点击"文件" → "新建项目"
2. 选择项目目录
3. 开始编写 MiniC 代码或汇编代码

### 2. 编写代码

- **MiniC 文件**：使用 `.c` 扩展名
- **汇编文件**：使用 `.asm` 或 `.s` 扩展名
- **代码格式化**：右键编辑区域 → "格式化代码"

### 3. 编译与汇编

- **编译 MiniC**：点击工具栏的编译按钮或按 `F5`
- **汇编代码**：点击工具栏的汇编按钮
- **查看输出**：在底部的 PowerShell 终端中查看编译/汇编结果

### 4. 文件管理

- **添加文件/目录**：在文件资源管理器中右键 → "新建文件" 或 "新建目录"
- **删除文件/目录**：右键 → "删除"
- **全局搜索**：使用顶部搜索栏或 `Ctrl+Shift+F`

### 5. 设置个性化

- **编辑器设置**：点击设置图标或"文件" → "设置"
- **调整主题、字体、编码等**
- **工具链配置**：在设置中配置编译器和汇编器路径

## 开发工作流

### MiniC 开发

1. 编写 `.c` 源文件
2. 使用集成编译器编译为汇编代码
3. 使用集成汇编器生成机器码
4. 通过串口下载到 Minisys-1A 硬件（可选）

### 汇编开发

1. 直接编写 `.asm` 汇编文件
2. 使用集成汇编器生成机器码
3. 通过串口下载到 Minisys-1A 硬件（可选）

## 技术栈

- **前端框架**：Electron 10.1.3
- **UI 库**：原生 HTML/CSS/JavaScript
- **代码编辑器**：Ace Editor
- **代码格式化**：clang-format
- **终端**：集成 PowerShell
- **构建工具**：electron-builder

## 依赖说明

主要依赖包：

- `electron` - 桌面应用框架
- `clang-format` - 代码格式化
- `prettier` - 代码美化
- `dree` - 目录树操作
- `iconv-lite` - 编码转换

## 常见问题

### Q: 编译时提示找不到编译器

A: 检查 `config/ToolchainSettings.json` 中的 `compiler_path` 配置，确保路径正确。

### Q: PowerShell 终端不工作

A: 确保系统已安装 PowerShell 且可在命令行中运行。

### Q: 代码格式化无效

A: 确保已安装 clang-format，或检查格式化配置。

### Q: 文件编码显示乱码

A: 在设置中调整文件编码方式，或使用 `iconv-lite` 进行转换。

## 更新日志

### v1.3.1（重构增强版）

- ✅ 集成 PowerShell 终端
- ✅ 添加代码格式化功能（clang-formatter）
- ✅ 支持全局搜索
- ✅ 增强文件管理右键菜单
- ✅ 改进文件资源管理器样式
- ✅ 重新设计设置界面
- ✅ 增加编辑器个性化选项
- ✅ 优化整体用户体验

## 贡献指南

欢迎提交 Issue 和 Pull Request 来改进这个项目。

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目基于 MIT 许可证开源。详见 [LICENSE](LICENSE) 文件。

## 致谢

- Minisys-1A 项目团队
- Electron 社区
- 所有贡献者和用户

---

**注意**：本 IDE 是 Minisys-1A 教学实验的辅助工具，建议配合 Minisys-1A 硬件平台使用。

## 最后更新：2026年1月
