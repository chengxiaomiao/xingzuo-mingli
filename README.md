# 星座命理分析 · 网页版

一个**网页**版的命理分析产品（不再是小程序）。功能和小程序版完全一致：

- **多账号 + 主账号（老板）管理**：主账号可自行添加子账号，随时停用 / 启用 / 删除。
- **多人命理档案**：任意账号（含子账号）都能录入多个不同人的出生信息并存档。
- **主账号视角**：主账号可在档案列表切换「全部（含子账号）/ 仅我的」，跨账号查看并管理子账号录入的档案。
- **自动命理分析**：八字四柱、五行分布、生肖、日主强弱、喜用神，以及喜用色 / 幸运数字 / 幸运石。

技术栈：前端纯 HTML/CSS/JS（浏览器直接打开），后端 Node + Express，数据存 MongoDB。命理计算由规则引擎（基于 `lunar-javascript`）完成，**非 AI 生成**，并已做过真太阳时 + 夏令时校正。

---

## 一、本地运行（零配置，马上能看效果）

不需要安装任何数据库，首次运行会自动拉起一个内存数据库。

1. 安装依赖：
   ```bash
   npm install
   ```
2. 启动服务：
   ```bash
   npm start
   ```
3. 浏览器打开：`http://localhost:3000/login.html`

首次进入先去「注册」创建**第一个账号 = 主账号**，登录后就能用全部功能。

> 说明：本地用的内存数据库只在服务运行期间存在，关掉服务数据就没了。这是给**本地预览/开发**用的。要长期保存、多人多人网访问，请按下面「上线部署」。

---

## 二、上线部署（让别人也能访问）

上线需要两样东西：**一个能跑 Node 服务的地方**（推荐 Render）＋ **一个 MongoDB 云数据库**（推荐 MongoDB Atlas 免费库）。

### 第 1 步：准备 MongoDB 云数据库（免费）
1. 打开 `mongodb.com`，注册账号（免费）。
2. 建一个 **M0 免费集群**（地区选离你近的，比如新加坡）。
3. 在「Database Access」建一个数据库用户（记好用户名 / 密码）。
4. 在「Network Access」把 IP 设为 `0.0.0.0/0`（允许所有 IP 访问，演示够用）。
5. 在集群点「Connect」→「Drivers」，复制连接串，形如：
   `mongodb+srv://用户名:密码@cluster0.xxxx.mongodb.net/mingli`
   把它留着，下一步用。

> 不想绑卡的话，也可以用 Render 自带的 MongoDB 附加组件（Render 控制台新建 MongoDB，再挂到 Web Service），免信用卡。

### 第 2 步：部署到 Render（最省事）
1. 把本项目推到 GitHub（或 GitLab）仓库。
2. 打开 `render.com` 注册 → **New → Web Service** → 关联你的仓库。
3. 配置：
   - Build Command：`npm install`
   - Start Command：`npm start`
   - 实例选 **Free**（免费）。
4. 在 **Environment** 里新增环境变量：
   - 名称 `MONGODB_URI`，值 = 第 1 步复制的连接串。
5. 点 Deploy，等几分钟，Render 会给你一个 `https://xxxx.onrender.com` 的网址，打开 `登录.html` 即可。

### 备选：Railway / 其他 Node 平台
同样：上传代码 → `npm install` + `npm start` → 设 `MONGODB_URI` 环境变量即可。

---

## 三、目录结构
```
xingzuo-mingli-web/
├── package.json
├── server/
│   ├── index.js          # Express 入口（托管前端 + API）
│   ├── db.js             # MongoDB 连接（有 MONGODB_URI 用云库，否则内存库）
│   ├── bazi.js           # 命理计算引擎（八字/五行/生肖/喜用神）
│   ├── middleware/auth.js # token 鉴权
│   └── routes/           # auth / profile / analyze / admin 四个接口模块
└── web/                  # 前端静态页面
    ├── login.html / register.html / home.html
    ├── entry.html（录入）/ profiles.html（档案列表）
    ├── result.html（分析结果）/ admin.html（主账号管理）
    ├── css/style.css
    └── js/（每个页面对应的逻辑 + common.js 通用工具）
```

## 四、API 一览
| 接口 | 说明 |
|------|------|
| POST `/api/auth/register` | 注册（首个账号→主账号） |
| POST `/api/auth/login` | 登录，下发 token |
| POST `/api/auth/logout` | 退出，清 token |
| GET `/api/profiles` | 列出有权限的档案（主账号含子账号） |
| POST `/api/profiles` | 保存档案（带 recordId 原地更新） |
| GET `/api/profiles/:id` | 读取单条档案 |
| DELETE `/api/profiles/:id` | 删除档案及分析结果 |
| POST `/api/analyze` | 按档案计算命理 |
| GET `/api/admin/list` | 主账号列出子账号 |
| POST `/api/admin` | 主账号添加/停用/启用/删除子账号 |

## 五、安全说明
- 登录后后端下发随机 token，后续请求凭 token 鉴权，**前端无法伪造主账号身份**。
- 密码使用 sha256 + 随机盐哈希存储，后端校验，前端不接触明文。
- 喜用神为简化推导（参考级），仅供文化娱乐，不构成专业命理定论。
