# 安行护腰 UI 原型

安行护腰是一个面向社区养老场景的防跌倒产品与管理平台概念验证原型。本仓库包含产品展示页面、社区管理后台、事件闭环回放、Python 演示服务及项目文档。

## 本地运行

需要 Python 3，无需安装第三方 Python 包。

```bash
python3 server/app.py --port 8848
```

启动后访问：

- 产品展示：<http://127.0.0.1:8848/index.html>
- 社区管理后台：<http://127.0.0.1:8848/admin.html>
- 事件流程回放：<http://127.0.0.1:8848/event-flow.html>

后台演示登录使用任意非空账号，口令为 `8888`。也可以在 macOS 上运行 `启动平台.command`。

若要启动设备数据模拟器，另开终端运行：

```bash
python3 server/simulator.py
```

## 目录说明

- `index.html`、`styles.css`、`app.js`：产品展示页
- `admin.html`、`event-flow.html`、`assets/`：管理后台与事件流程回放
- `server/`：Python HTTP 服务、SQLite 数据层和设备模拟器
- `docs/`：社区落地作业手册及执行记录表
- 根目录中的 Word、Markdown 和图片文件：项目计划、研究摘要及数据许可材料

## 演示数据与项目范围

首次启动服务时，`server/db.py` 会在 `server/data/` 下初始化 SQLite 演示数据库。数据库文件保存在本地，不纳入版本控制。页面中的风险判定、事件记录和性能数字均为演示数据；项目处于概念验证阶段，不代表整机实测结果，也不构成医学诊断。

前台页面可作为静态页面展示；管理后台、事件回放和设备接入需要运行 Python 服务。设备接入目前由模拟器演示，尚未连接真实硬件。

更多使用说明见 [使用说明.txt](使用说明.txt)。
