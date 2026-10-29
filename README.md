<div align="center">

# 将 · 界 &middot; JIANGJIE

### *The Art of War, Reimagined.*

<p><strong>以科技向人文致敬，以触觉重塑千年对弈。</strong></p>

<p>
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License" />
  <img src="https://img.shields.io/badge/Release-Feature_Rich_Beta-e5a93c?style=for-the-badge" alt="Feature Rich Beta" />
  <img src="https://img.shields.io/badge/Three.js-WebGL_3D-black?style=for-the-badge&logo=three.js" alt="Three.js" />
  <img src="https://img.shields.io/badge/Engine-Negamax_AlphaBeta-crimson?style=for-the-badge" alt="Negamax Alpha-Beta" />
  <img src="https://img.shields.io/badge/Acoustics-Physical_WebAudio-00bcd4?style=for-the-badge" alt="Web Audio" />
  <img src="https://img.shields.io/badge/Platform-Web_First_CrossPlatform-10b981?style=for-the-badge" alt="Cross Platform" />
</p>

<p>
  没有冗长的安装，没有丑陋弹窗，没有数值破坏。<br />
  在浏览器中轻轻一点，烽火烈烈、硬木清脆，楚汉对决即刻在眼前磅礴展开。
</p>

---

</div>

<br />

## 💡 设计哲学 · When Jobs Meets Miyamoto

> *“Design is not just what it looks like and feels like. Design is how it works.”* &mdash; **Steve Jobs**  
> *“A game is only truly great if the very act of moving feels inherently delightful.”* &mdash; **Shigeru Miyamoto**

市面上的大多数棋牌软件，只是冰冷的数据表格与廉价塑料贴图的拼凑。  
**《将·界》** 是一场推倒重来的革命——我们将**苹果级的极简克制**与**任天堂级的触觉愉悦**融为一体：

```
                    ┌── 乔布斯之眼：极简、品味、克制、数字工艺品收藏
  《将 · 界》哲学 ───┤
                    └── 宫本茂之手：手感、即时物理反馈、零学习成本的纯粹快乐
```

<br />

## 🌟 颠覆性的核心感官体验

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🪵 0.3 秒的硬木触觉奇迹</h3>
      <p><strong>宫本茂手感哲学：</strong>哪怕是第一次摸到棋子，抬起、划过天际、落盘撞击的 300 毫秒曲线都令人上瘾。基于 Web Audio 物理声学实时建模：极短的触击瞬态瞬间爆裂，伴随老沉木腔体的低频回鸣，辅以镜头微米级物理冲击震颤，落子生威。</p>
    </td>
    <td width="50%" valign="top">
      <h3>🎯 黄金 36&deg; 古战场全景</h3>
      <p><strong>乔布斯严苛构图：</strong>拒绝平庸的 90&deg; 垂直压平与死角俯视。36&deg; 黄金仰角将九宫经纬一览无余地铺展在视线正中，两侧烽火熊熊摇曳，背景云雾遮绕苍凉远山，红黑二军如临楚河古阵。</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🪨 锋利纯粹的字章与立体雕工</h3>
      <p>每一枚棋子都是一件温润厚重的数字艺术品。深凹金线字模结合正面常驻透光印记，无论在何种距离、何种动态光照下，敌我阵营与棋职立判，彻底根除“辨子困难”。</p>
    </td>
    <td width="50%" valign="top">
      <h3>🪶 悬浮液态玻璃交互坞</h3>
      <p>消灭粗暴堆砌的双层功能条与粗糙菜单。唯一的控制器是一枚漂浮在盘面下方的半透明磨砂玻璃胶囊（Liquid Frosted Dock），轻触如水波舒展，落子时彻底遁入虚空，将对弈舞台 100% 归还给玩家。</p>
    </td>
  </tr>
</table>

<br />

## 🎮 完整玩法 · Game Modes

```
   ┌──────────────┬──────────────┬──────────────┬──────────────┐
   │   人机演武    │   残局破阵    │   好友论道    │   同屏对弈    │
   ├──────────────┼──────────────┼──────────────┼──────────────┤
   │ 3 档棋力      │ 18 道一步杀   │ 公开房/快速匹配│ 双时钟/加秒   │
   │ 开局书/分析   │ 12 道两步杀   │ 刷新恢复/观战  │ 自动翻面/交接 │
   │ 自由摆棋      │ 解法复盘      │ 禁言/举报/二维码│ 交接隐私确认 │
   └──────────────┴──────────────┴──────────────┴──────────────┘
```

### 🧠 人机演武 · AI Duel
- **Negamax + Alpha-Beta + 静默搜索 + 带界限置换表**，计算在 Web Worker 后台线程运行。
- 入门、棋手、国手三档棋力，并附常用开局库与随机开局变化。
- 可对当前局面进行 AI 分析，显示评分、搜索深度、推荐着法和理由。
- 支持从自由摆棋局面或棋谱任意一步继续对弈。

### 📜 残局破阵 · Endgame Archive
- 30 道经过自动验证的残局：18 道一步杀、12 道强制两步杀。
- 每题验证预设杀法、唯一首着及两步题的对手唯一应手。
- 走错后立即判定失败，可查看完整强制线路、双方着法与杀法复盘。
- 残局进度保存在本地，并可通过同步码随账号同步。

### 🌐 好友论道 · Online Rooms
- 公开房列表与快速匹配；也可创建仅邀请或带密码的私密房。
- 六位房间码、邀请链接、二维码邀请和系统分享，移动端可直接走微信分享。
- 服务端权威裁决、整局总时长与每步加秒、悔棋协商、提和、认输、聊天和再来一局。
- 30 秒断线宽限，页面刷新或服务端重启后可恢复活动房间；明确离开或不重连会判负。
- 聊天限流、房主禁言与消息举报。
- 对局结束后由服务端保存完整棋谱；匿名同步码支持跨设备恢复棋谱、战绩、好友与残局记录。

### 🗂️ 棋谱库 · Archive & Replay
- 自动保存人机、同屏、联机、残局与每日挑战记录。
- 完整逐着回放、任意步跳转、从历史局面继续，以及浅层全盘分析与失误标记。
- 使用 Xiangqi FEN + ICCS 着法导入和导出，可离线保存为 `.xq` 文件。
- 好友同步码、对局统计与历史记录通过服务端 `DATA_DIR` 持久化。

### 💎 赛季与棋具工坊 · Season & Atelier
- 由对局、胜场、残局和每日挑战累积赛季积分，并展示当前赛季称号。
- 提供军阵玉雕、经典字章、羊脂暖玉、宣德古铜四套棋具外观；后两套随赛季积分解锁。
- 外观只改变视觉呈现，不影响棋力或规则数值。

### ♿ 兼容与引导 · Access & Onboarding
- 首次进入提供可交互棋子走法指南，选中棋子时解释走法与合法落点数量。
- 棋盘支持方向键选格、回车落子，对话框提供焦点循环和 Esc 关闭。
- WebGL 不可用、上下文丢失或用户主动选择时自动切换到键盘可操作的二维棋盘。
- 提供高清、平衡、流畅三档画质与自动低端设备提示。

<br />

## 🏛️ 严谨完备的规则引擎 · The Core Engine

规则、残局、棋谱格式与联机服务均配有自动化测试：

- [x] **九宫禁制**：将帅九宫步法、飞将对脸照面禁止
- [x] **兵种特性**：士斜行、象飞田（塞象眼校验）、马走日（蹩马腿判定）、车直行
- [x] **隔子打炮**：炮走直线、隔一子方可翻山吃子
- [x] **兵卒演进**：过河前仅能直进，过河后可横行，不可后退
- [x] **胜负裁判**：送将过滤、将军检测、将死与困毙判定
- [x] **终局裁决**：三次重复局面及长将自动判负、中式传统四字记谱法

<br />

## 🚀 极速部署与运行 · Quick Start

### 环境依赖
- **Node.js** &ge; 22.0.0
- **pnpm** &ge; 9.0.0

```bash
# 1. 获取代码
git clone git@github.com:binterore/c-chess.git
cd c-chess

# 2. 安装全部依赖
pnpm install

# 3. 启动开发服务器 (Vite 客户端与 3001 端口联机服务协同运行)
pnpm dev
```

直接打开浏览器访问 `http://localhost:5173`。

### 严谨质量把控与构建

```bash
# 严格类型检查
pnpm typecheck

# 规则、残局、棋谱与联机服务测试
pnpm test

# 针对已启动服务的完整联机冒烟验证
pnpm verify:online

# 生产环境紧凑优化打包
pnpm build

# 启动生产单体服务（默认端口 3001）
pnpm start
```

<br />

## 📐 工程拓扑 · Architecture Topology

```
c-chess/
├── src/
│   ├── three/             # 3D 渲染核心：沙盘、真实材质、烽火粒子、震屏微冲击
│   ├── engine/            # 纯 TypeScript 规则引擎、记谱器与 AI Negamax 决策器
│   ├── workers/           # AI 搜索、局面分析与全盘分析 Worker
│   ├── components/        # 棋局、棋谱、每日挑战、规则、摆棋与分析界面
│   ├── audio/             # Web Audio 物理落子碰撞与空腔回鸣合成器
│   ├── i18n/              # 中文文案与中式记谱格式化
│   └── services/          # Socket.IO、会话恢复、棋谱与本地持久化
├── server/                # Express 5 + Socket.IO 权威服务端与 JSON 持久化
├── data/                  # 服务端账号、棋谱、好友与举报数据（运行时创建）
├── tests/                 # 规则、残局、棋谱和联机集成测试
└── public/                # 离线 PWA 支持 (Service Worker)
```

<br />

## 💾 数据与部署 · Persistence

服务端默认将账号、棋谱、好友关系、举报记录和活动房间快照写入 `data/store.json`。可使用 `DATA_DIR` 指定持久化目录：

```bash
DATA_DIR=/var/lib/jiangjie pnpm start
```

`docker-compose.yml` 已将 `./data` 挂载到容器内的 `/app/data`。生产环境仍建议在反向代理层配置 HTTPS、访问日志和速率限制。

<br />

## 📄 开源许可证 · License

本项目采用 [MIT License](LICENSE) 商业开源许可协议。欢迎开发者、设计师及象棋爱好者学习、商用、分发与二次创作。

<br />

<div align="center">

**将 · 界 &middot; JIANGJIE**  
*楚河汉界，方寸之间见天地。*

</div>
