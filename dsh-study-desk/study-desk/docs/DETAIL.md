# 学习台 / Study desk

在 DSH 右侧栏里读 PDF、提问、记批注，并在下课时生成带批注版和课堂总结。

## 功能

- 全页阅读工作区 PDF：翻页、缩放、适应宽度、选中文字；
- 常驻提问框：拖动、缩放、最小化；回车换行、点发送；
- 选中文字：引用到输入框、复制（系统右键）、高亮；
- 框选截图：先确认再移进输入框；手机照片/HEIC 可直接附件；
- 回答：流式显示，Markdown + LaTeX（KaTeX）；
- 下课整理：原版保持可读，批注版另存为 `<PDF>-批注版.pdf`，末尾追加一页课堂成果总结；
- 版本切换：阅读器工具栏「原版 / 批注版」；「重新生成」重做批注版。

## 安装

1. 需要 DSH 0.2.2-rc.5 或兼容版本；
2. DSH → Plugins → Add plugin，选择本包的 `study-desk/` 目录；
3. 启用 bundle，按提示重启 DSH；
4. 新会话打开右侧栏，选择「学习台」。

## 数据

插件只读写当前工作区：

- `<PDF>.annotations.json`：提问和锚点；
- `screenshots/`：框选截图；
- `.study-desk/backups/`：下课前的原版备份；
- `<PDF>-批注版.pdf`：生成的批注版。

这些文件不会随插件仓库分发。

## 限制

- HEIC 手机照片转图依赖 macOS `sips`；其他系统这条会失败，其余功能正常；
- 下课整理由 agent 现场生成，版式会随 PDF 内容和空白区域变化；
- 需要能与 DSH 0.2.2-rc.5 通信的客户端 API。

## 构建

`study-desk-build/` 里是客户端源码：

```bash
cd study-desk-build
pnpm install
node build.mjs
```

输出写回 `study-desk/client.js`。
