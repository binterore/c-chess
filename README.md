<div align="center">

# 将 · 界 &middot; JIANGJIE

<p><strong>千年楚汉风云，重铸于现代 Web3D 沙盘之上。</strong></p>

<p>
  <img src="https://img.shields.io/badge/Three.js-WebGL-black?style=for-the-badge&logo=three.js" alt="Three.js" />
  <img src="https://img.shields.io/badge/React-19-087ea4?style=for-the-badge&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Socket.IO-Realtime-010101?style=for-the-badge&logo=socketdotio" alt="Socket.IO" />
  <img src="https://img.shields.io/badge/Web_Audio-Acoustics-e5a93c?style=for-the-badge" alt="Web Audio" />
</p>

<p>
  无需下载，无需插件。打开浏览器，即刻步入烽火连天的 3D 楚汉古战场。
</p>

---

</div>

<br />

## 🌟 极致体验 · Designed for Perfection

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🎯 黄金 36&deg; 对弈视角</h3>
      <p>告别生硬死板的俯视压平与畸变斜切。相机精调至 36&deg; 黄金俯角，盘面十道经纬与九宫纵深一览无余，两侧烽火与远端水墨群山自然环抱对局。</p>
    </td>
    <td width="50%" valign="top">
      <h3>🪵 物理硬木落子声学</h3>
      <p>彻底剔除廉价合成电子蜂鸣。基于 Web Audio 实时声学物理建模：棋子击盘瞬间触发极短的高频触木冲击（Click Transient），随后衰减至低频硬木腔体共鸣，清脆沉稳。</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🪨 纯粹易读的雕刻棋印</h3>
      <p>正面发光字模徽记配合深凹金线沟槽，不论使用古典文人实木玉石盘面还是战阵立绘模式，红黑两军棋职字样在任何距离均清晰锐利、一眼立判。</p>
    </td>
    <td width="50%" valign="top">
      <h3>🪶 悬浮磨砂玻璃交互坞</h3>
      <p>拒绝割裂的重叠工具栏。所有核心操作与信息被精炼融入底部单体微光磨砂玻璃胶囊（Unified Frosted Dock），指尖轻触即时展开，对弈时完全隐于无形。</p>
    </td>
  </tr>
</table>

<br />

## ⚔️ 核心玩法 · Master the Arena

```
               ┌── 人机演武 (入门 / 棋手 / 国手) ──── Web Worker 离线静默推演
               │
   将 · 界 ────┼── 残局破阵 (三十道传世绝杀残局) ── 阶梯破阵，一击制胜
   JIANGJIE    │
               ├── 好友论道 (6位房间码 / 邀请链接) ── 服务端权威校验，秒级连线
               │
               └── 同屏对垒 (双人轮流落子) ──────── 一屏两席，面对面对弈
```

### 1. 人机演武 (AI Battle)
- **Web Worker 隔离推演**：Negamax + Alpha-Beta 剪枝 + 静默搜索 + 置换表。
- 推演计算完全在后台线程运行，60FPS 渲染与棋盘拖拽永不卡顿。
- 提供 **入门**、**棋手**、**国手** 三档棋力，兼顾新手演练与高手切磋。

### 2. 残局破阵 (Endgame Puzzles)
- 精选收录三十道经过严格终局验证的一手绝杀残局，分为五重阵卷。
- 目标提示、通关记录与连续破阵机制，攻克象棋残局精妙杀机。

### 3. 好友论道 (Realtime Online)
- **一键开房**：自动生成 6 位专属房间码与直达邀请链接，好友扫码或点击秒入。
- **服务端权威裁判**：合法性与将军状态全由服务端校验，防作弊与误操作。
- **完整对弈礼仪**：内置悔棋协商、提和、认输、计时包干与快捷传讯。

<br />

## 🏛️ 规则完备性 · Rule Engine

规则引擎经过严密单测覆盖，严格遵循中国象棋完整竞技规则：

- [x] **九宫禁制**：将帅九宫步法、飞将对脸照面禁止
- [x] **兵种特性**：士斜行、象飞田（塞象眼校验）、马走日（蹩马腿判定）、车直行
- [x] **隔子打炮**：炮走直线、隔一子方可翻山吃子
- [x] **兵卒演进**：过河前仅能直进，过河后可横行，不可后退
- [x] **胜负裁判**：送将过滤、将军检测、将死与困毙判定
- [x] **终局裁决**：三次重复局面及长将自动判负、中式传统四字记谱法

<br />

## 🚀 快速上手 · Quick Start

### 环境要求
- **Node.js** &ge; 22.0.0
- **pnpm** &ge; 9.0.0

### 本地启动

```bash
# 1. 克隆代码仓库
git clone git@github.com:binterore/c-chess.git
cd c-chess

# 2. 安装依赖
pnpm install

# 3. 启动开发环境 (同时拉起 Vite 前端与 3001 联机服务)
pnpm dev
```

浏览器访问 `http://localhost:5173` 即可开启对弈。

### 构建与验证

```bash
# 类型检查
pnpm typecheck

# 规则与三十残局自动化测试
pnpm test

# 生产环境编译
pnpm build

# 启动全栈生产服务 (3001 端口承载静态资源与 WebSocket)
pnpm start
```

<br />

## 📐 技术架构 · Architecture

```
c-chess/
├── src/
│   ├── three/             # Three.js 战场核心 (沙盘、光影、落子震颤、烽火粒子)
│   ├── engine/            # 纯 TypeScript 象棋裁判引擎与 Negamax 评估系统
│   ├── workers/           # AI 独立推演线程 (Web Worker)
│   ├── components/        # 极简 UI 组件 (统一悬浮坞、棋谱抽屉、对弈台)
│   ├── audio/             # Web Audio 物理落子碰撞与吃子声学合成器
│   ├── i18n/              # 国际化语言包与中式记谱格式化
│   └── services/          # Socket.IO 实时通信与房间状态同步
├── server/                # Express 5 + Socket.IO 权威服务端
├── tests/                 # 规则引擎与残局自动化用例
└── public/                # 离线 PWA 支持 (Service Worker)
```

<br />

<div align="center">

**将 · 界 &middot; JIANGJIE** &mdash; 楚河汉界，方寸之间见天地。

</div>
