export type Language = 'zh' | 'en';

export const i18n = {
  zh: {
    appTitle: '中国象棋 · 在线对战',
    subtitle: '古风对弈 · 炫酷特效 · 好友联机',
    redSide: '红方',
    blackSide: '黑方',
    spectator: '旁观者',
    spectatorsCount: '人旁观',
    room: '房间',
    roomCode: '房间号',
    copyLink: '复制链接',
    copySuccess: '链接已复制到剪贴板！',
    copyCodeSuccess: '房间号已复制！',
    createRoom: '创建对战房间',
    joinRoom: '加入房间',
    inputRoomCode: '输入6位房间号',
    selectSide: '选择阵营',
    randomSide: '随机分配',
    redFirst: '红方 (先手)',
    blackSecond: '黑方 (后手)',
    timeControl: '包干时间',
    timeUnlimited: '不限时',
    time3m: '3 分钟 (超快棋)',
    time5m: '5 分钟 (快棋)',
    time10m: '10 分钟 (标准)',
    time20m: '20 分钟 (慢棋)',
    startGame: '开始对局',
    waitingOpponent: '等待好友加入...',
    waitingHost: '等待房主开始...',
    playWithAi: '单机演练 / 人机对战',
    enginePikafish: '皮卡鱼 (Pikafish NNUE)',
    enginePikafishDesc: '世界顶尖象棋神经网络引擎，棋力超凡',
    engineBuiltin: '传统启发式 AI',
    engineBuiltinDesc: '轻量级启发式快速评估，适合轻松练习',
    engineSelect: '对弈引擎',
    aiLevel: '难度等级',
    levelEasy: '初级练手',
    levelMedium: '棋摊好手',
    levelHard: '业余大师',
    levelMaster: '特级大师',
    pikafishThinking: '皮卡鱼 NNUE 深度推演中...',
    localTwoPlayer: '本地双人同屏',
    onlineBattle: '好友联机对战',
    returnLobby: '返回大厅',
    flipBoard: '旋转棋盘',
    soundOn: '音效开启',
    soundOff: '音效静音',
    resign: '认输',
    offerDraw: '提和',
    undoMove: '悔棋',
    rematch: '再来一局',
    giveUpConfirm: '确定要认输吗？',
    drawOffered: '对方请求和棋，是否同意？',
    undoRequested: '对方请求悔棋，是否同意？',
    accept: '同意',
    decline: '拒绝',
    drawDeclined: '对方拒绝了和棋请求',
    undoDeclined: '对方拒绝了悔棋请求',
    undoAccepted: '对方同意了悔棋',
    redTurn: '红方走棋',
    blackTurn: '黑方走棋',
    yourTurn: '轮到你走棋！',
    opponentTurn: '等待对方走棋...',
    checkAlert: '将军！',
    victory: '大捷！胜出！',
    defeat: '惜败！',
    drawGame: '握手言和',
    stalemateWin: '困毙获胜！',
    timeoutWin: '对方超时判负！',
    surrenderWin: '对方认输！',
    riverUpper: '楚 河',
    riverLower: '漢 界',
    chatPlaceholder: '按回车发送消息...',
    send: '发送',
    quickChat: '快捷消息',
    presetMessages: [
      '落子无悔大丈夫！',
      '妙啊！这步棋走得极妙！',
      '容我深思熟虑一番...',
      '快点下啊，等得花儿都谢了！',
      '手下留情，别赶尽杀绝呀！',
      '胜败乃兵家常事，承让承让！'
    ],
    killEffects: {
      wocaoma: {
        title: '卧槽马！',
        sub: '八面威风 · 踏破山河',
        desc: '伏槽良驹穿心跃，一蹄踏碎九重关！'
      },
      zhongpao: {
        title: '重炮轰鸣！',
        sub: '叠嶂连环 · 势破千军',
        desc: '双炮齐鸣震乾坤，雷霆万钧不可挡！'
      },
      guajiaoma: {
        title: '挂角马！',
        sub: '凌空绝杀 · 锁死宫闱',
        desc: '斜角破阵封死穴，任凭神仙也难逃！'
      },
      tiemenshuan: {
        title: '铁门栓！',
        sub: '封喉绝户 · 稳如泰山',
        desc: '中宫锁死绝生路，铁门难开命归天！'
      },
      chouche: {
        title: '抽将抽车！',
        sub: '声东击西 · 斩将夺车',
        desc: '将军抽车，雷霆一击！'
      },
      mensha: {
        title: '自毙闷杀！',
        sub: '金屋藏娇 · 动弹不得',
        desc: '群臣塞宫无回路，英雄无泪困自焚！'
      },
      check: {
        title: '将 军！',
        sub: '金戈铁马 · 杀气腾腾',
        desc: '请主帅提防！'
      },
      checkmate: {
        title: '绝 杀！',
        sub: '气吞万里 · 乾坤底定',
        desc: '一子定乾坤，天下归一统！'
      },
      capture: {
        title: '斩！',
        sub: '',
        desc: ''
      }
    },
    pieces: {
      red: {
        general: '帅',
        advisor: '仕',
        elephant: '相',
        horse: '傌',
        chariot: '俥',
        cannon: '炮',
        soldier: '兵'
      },
      black: {
        general: '将',
        advisor: '士',
        elephant: '象',
        horse: '马',
        chariot: '车',
        cannon: '砲',
        soldier: '卒'
      }
    }
  },
  en: {
    appTitle: 'Chinese Chess · Online Battle',
    subtitle: 'Classic Strategy · Epic VFX · Friend Match',
    redSide: 'Red',
    blackSide: 'Black',
    spectator: 'Spectator',
    spectatorsCount: 'watching',
    room: 'Room',
    roomCode: 'Room Code',
    copyLink: 'Copy Invite Link',
    copySuccess: 'Link copied to clipboard!',
    copyCodeSuccess: 'Room code copied!',
    createRoom: 'Create Room',
    joinRoom: 'Join Room',
    inputRoomCode: 'Enter 6-digit room code',
    selectSide: 'Choose Side',
    randomSide: 'Random',
    redFirst: 'Red (First)',
    blackSecond: 'Black (Second)',
    timeControl: 'Time Limit',
    timeUnlimited: 'Unlimited',
    time3m: '3 Mins (Blitz)',
    time5m: '5 Mins (Rapid)',
    time10m: '10 Mins (Standard)',
    time20m: '20 Mins (Classical)',
    startGame: 'Start Game',
    waitingOpponent: 'Waiting for friend to join...',
    waitingHost: 'Waiting for host to start...',
    playWithAi: 'Practice / Solo Play',
    enginePikafish: 'Pikafish (NNUE)',
    enginePikafishDesc: 'State-of-the-art Xiangqi neural network engine',
    engineBuiltin: 'Classic Heuristic AI',
    engineBuiltinDesc: 'Lightweight heuristic engine for casual play',
    engineSelect: 'AI Engine',
    aiLevel: 'Difficulty',
    levelEasy: 'Novice (Depth 3)',
    levelMedium: 'Club Player (Depth 6)',
    levelHard: 'Master (Depth 10)',
    levelMaster: 'Grandmaster (Depth 14)',
    pikafishThinking: 'Pikafish NNUE computing...',
    localTwoPlayer: 'Pass & Play (Local)',
    onlineBattle: 'Online Battle',
    returnLobby: 'Lobby',
    flipBoard: 'Flip Board',
    soundOn: 'Sound On',
    soundOff: 'Muted',
    resign: 'Resign',
    offerDraw: 'Draw',
    undoMove: 'Undo',
    rematch: 'Rematch',
    giveUpConfirm: 'Are you sure you want to resign?',
    drawOffered: 'Opponent offered a draw. Accept?',
    undoRequested: 'Opponent requested to undo last move. Accept?',
    accept: 'Accept',
    decline: 'Decline',
    drawDeclined: 'Draw offer declined',
    undoDeclined: 'Undo request declined',
    undoAccepted: 'Undo request accepted',
    redTurn: "Red's Turn",
    blackTurn: "Black's Turn",
    yourTurn: 'Your Turn!',
    opponentTurn: "Opponent's Turn...",
    checkAlert: 'CHECK!',
    victory: 'VICTORY!',
    defeat: 'DEFEAT!',
    drawGame: 'DRAW GAME',
    stalemateWin: 'Stalemate Win!',
    timeoutWin: 'Win on time!',
    surrenderWin: 'Opponent resigned!',
    riverUpper: 'CHU RIVER',
    riverLower: 'HAN BORDER',
    chatPlaceholder: 'Type a message...',
    send: 'Send',
    quickChat: 'Quick Chat',
    presetMessages: [
      'A true player regrets no move!',
      'Brilliant move! Well played!',
      'Give me a moment to think...',
      'Make your move, clock is ticking!',
      'Show some mercy please!',
      'Great game, well played!'
    ],
    killEffects: {
      wocaoma: {
        title: 'Crouching Horse!',
        sub: 'Eight Directions Dominance',
        desc: 'The crouching steed leaps inward, shattering the imperial gates!'
      },
      zhongpao: {
        title: 'Stacked Cannons!',
        sub: 'Consecutive Thunder Blast',
        desc: 'Dual artillery roar in unison, decimating the palace defenses!'
      },
      guajiaoma: {
        title: 'Corner Horse!',
        sub: 'Corner Angle Checkmate',
        desc: 'Flanking strike locking the throne with inescapable death!'
      },
      tiemenshuan: {
        title: 'Iron Gate Bar!',
        sub: 'Central File Lock',
        desc: 'The central palace is bolted shut; no escape remains!'
      },
      chouche: {
        title: 'Chariot Fork!',
        sub: 'Double Threat Check',
        desc: 'Checking the King while piercing the enemy chariot!'
      },
      mensha: {
        title: 'Suffocation Mate!',
        sub: 'Trapped in Palace',
        desc: 'Surrounded by own retainers, the King has no route to flee!'
      },
      check: {
        title: 'CHECK!',
        sub: 'Imperial Threat',
        desc: 'Defend your King!'
      },
      checkmate: {
        title: 'CHECKMATE!',
        sub: 'Final Conquest',
        desc: 'The decisive strike that claims the realm!'
      },
      capture: {
        title: 'STRIKE!',
        sub: '',
        desc: ''
      }
    },
    pieces: {
      red: {
        general: '帥',
        advisor: '仕',
        elephant: '相',
        horse: '傌',
        chariot: '俥',
        cannon: '炮',
        soldier: '兵'
      },
      black: {
        general: '將',
        advisor: '士',
        elephant: '象',
        horse: '馬',
        chariot: '車',
        cannon: '砲',
        soldier: '卒'
      }
    }
  }
};
