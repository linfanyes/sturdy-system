# 师者小站 minium GUI 自动化测试

基于 [minium](https://github.com/WeChatMiniTest/minium) 对微信小程序 `dist/build/mp-weixin` 做 GUI 冒烟/E2E 测试。

## 1. 环境准备（Windows）

| 步骤 | 说明 |
|------|------|
| Python 3.8+ | python.org 下载，安装时勾选 **Add Python to PATH** |
| 微信开发者工具 | 稳定版即可，安装时务必勾选“命令行工具” |
| 配置 PATH | 将开发者工具的 `cli` 目录加入系统 PATH，默认通常是 `C:\Program Files (x86)\Tencent\微信web开发者工具` |
| 验证 CLI | `minicommand --help` 能看到帮助说明 |

## 2. 安装依赖

```powershell
cd D:\workspace\my-prj\tercher-work\work-system\mini-program\minium
pip install -r requirements.txt
```

## 3. 确认配置

打开 `config.json`，重点检查两个路径：

```json
{
  "projectPath": "D:/workspace/my-prj/tercher-work/work-system/mini-program/dist/build/mp-weixin",
  "devtoolPath": "C:/Program Files (x86)/Tencent/微信web开发者工具/cli.bat"
}
```

- `projectPath`：指向 uni-app 构建产物，跑之前必须先执行 `npm run build:mp-weixin`
- `devtoolPath`：微信开发者工具 CLI 的实际路径，安装在不同盘/目录时请修改

## 4. 先构建小程序

```powershell
cd D:\workspace\my-prj\tercher-work\work-system\mini-program
npm run build:mp-weixin
```

## 5. 运行用例

```powershell
cd D:\workspace\my-prj\tercher-work\work-system\mini-program\minium

# 运行指定测试文件（必须加 -m）
miniruntest -c config.json -m test_tabbar
miniruntest -c config.json -m test_login

# 带日志级别
miniruntest -c config.json -m test_tabbar --level debug
```

> 注意：`-p` 只是用例搜索目录，不指定具体文件；`-m` 才是测试模块名。
> 如果你希望一次跑完多个文件，可以先跑完一个再跑另一个，或者后面我再帮你加一个 suite.json。

## 6. 查看结果

- 控制台输出：用例通过/失败状态
- 截图产物：`mini-program/minium/reports/*.png`
- 如果有失败，minium 会在日志中给出页面 XML，方便调整选择器

## 7. 注意事项

1. **关闭已占用的开发者工具**：minium 会启动 CLI 打开项目，如果开发者工具已经占着同一个项目，会报端口冲突
2. **路径分隔符**：Python 代码里统一用正斜杠 `/` 或原始字符串，避免 `\` 转义问题
3. **选择器调试**：如果 `input` / `button` 选择器无效，先用 `self.app.get_page_info()` 打印当前页面 XML，再按实际 `class` / `id` 调整
4. **真机运行**：把 `config.json` 的 `platform` 改成 `device`，并确保手机已开启 USB 调试
5. **和现有测试互补**：
   - `mini-program/test/*.spec.ts`：接口/单元级
   - `mini-program/minium/`：GUI/E2E 级
   - `docs/TEST_REPORT.md`：手工测试报告
