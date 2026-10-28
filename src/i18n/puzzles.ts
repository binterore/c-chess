export const puzzleCopy = {
  chapters: [
    { name: '踏雪寻梅', subtitle: '一马当先，踏破宫门' },
    { name: '重炮镇关', subtitle: '隔山惊雷，炮震中军' },
    { name: '铁骑破阵', subtitle: '长车直入，所向无前' },
    { name: '孤兵夺帅', subtitle: '一卒过河，亦可吞天' },
    { name: '万阵归心', subtitle: '残阳如血，终局无声' }
  ],
  titles: {
    puzzle1: '马跃檀溪',
    puzzle2: '双骑夹寨',
    puzzle3: '回马金枪',
    puzzle4: '卧槽听风',
    puzzle5: '踏营夺旗',
    puzzle6: '绝地惊鸿',
    puzzle7: '隔山打牛',
    puzzle8: '双炮锁宫',
    puzzle9: '炮碾丹砂',
    puzzle10: '沉底惊雷',
    puzzle11: '借兵开山',
    puzzle12: '关门打虎',
    puzzle13: '长车直入',
    puzzle14: '单车赴会',
    puzzle15: '横车断水',
    puzzle16: '车锁咽喉',
    puzzle17: '连珠破壁',
    puzzle18: '一骑绝尘',
    puzzle19: '孤卒过河',
    puzzle20: '兵临九宫',
    puzzle21: '寸步封喉',
    puzzle22: '微芒成刃',
    puzzle23: '背水一击',
    puzzle24: '残兵照夜',
    puzzle25: '楚河听雨',
    puzzle26: '汉界残阳',
    puzzle27: '风卷残云',
    puzzle28: '将星落野',
    puzzle29: '山河一局',
    puzzle30: '终局无声'
  }
} as const;

export type PuzzleTitleKey = keyof typeof puzzleCopy.titles;
