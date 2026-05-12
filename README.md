# HexEditor

一个基于 Web 技术的十六进制编辑器，使用 Vue 3 + Vite 构建。

## 功能特性

- 打开并编辑任意二进制文件
- 以十六进制字节形式展示文件内容
- 支持插入/替换两种编辑模式
- 多字节数据解释：整数、浮点、Unicode、GBK、SHIFT-JIS 等
- 查找/批量替换（十六进制字节序列）
- 标签（Tag）系统：为指定字节范围添加颜色标注和备注
- 虚拟滚动，支持大文件浏览
- 可扩展的插件式数据解释器架构

## 技术栈

| 模块 | 技术选型 |
|------|----------|
| 前端框架 | Vue 3 (Composition API) |
| 构建工具 | Vite 6 |
| 状态管理 | Pinia |
| UI 组件库 | Ant Design Vue 4 |
| 运行时 | Node.js 18+ |

## 开发环境准备

```bash
# 安装依赖
npm install

# 启动开发服务器（访问 http://localhost:5173）
npm run dev

# 构建生产版本（输出到 dist/）
npm run build

# 预览构建结果
npm run preview
```

## 目录结构

```
src/
├── main.js                   # 应用入口
├── App.vue                   # 根布局组件
├── components/
│   ├── layout/               # 侧边栏、标签栏、状态栏
│   ├── editor/               # 编辑器核心组件（HexGrid、虚拟滚动等）
│   ├── menu/                 # 菜单栏、右键菜单
│   └── dialogs/              # 对话框（查找替换、标签编辑、设置）
├── stores/                   # Pinia 状态管理
├── core/
│   ├── FileBuffer.js         # Piece Table 文件缓冲
│   ├── EditHistory.js        # 撤销/重做命令栈
│   └── TagManager.js         # .TAG 文件读写
├── plugins/
│   ├── BaseInterpreter.js    # 解释器抽象基类
│   ├── PluginManager.js      # 插件注册与调用
│   └── interpreters/         # 内置解释器实现
└── utils/
    ├── fp8.js                # FP8 位运算
    ├── fp16.js               # FP16 位运算
    └── encoding.js           # 多编码解码工具
```

## 关于 .TAG 文件

标签信息存储在与源文件同名、扩展名为 `.TAG` 的 JSON 文件中。  
打开文件时可选择同时导入对应的 `.TAG` 文件，编辑标签后可手动导出保存。

## 开发计划

- **Phase 1-2**（已完成）：项目脚手架与骨架搭建
- **Phase 3**：Piece Table 核心数据层完整实现
- **Phase 4**：数据解释器插件实现（整数、浮点、FP8/16、哈希等）
- **Phase 5**：编辑器 UI 核心（输入编辑、标签渲染、虚拟滚动完善）
- **Phase 6**：交互功能（查找替换、右键菜单、对话框完整实现）
