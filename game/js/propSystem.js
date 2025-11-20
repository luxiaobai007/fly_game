// 道具系统
class PropSystem {
  constructor() {
    this.props = [
      { id: 1, name: '加速卡', description: '可以让棋子额外移动3步', icon: 'speed', effect: 'extraMove' },
      { id: 2, name: '冰冻卡', description: '冻结对手一轮行动', icon: 'freeze', effect: 'freeze' },
      { id: 3, name: '传送卡', description: '将棋子传送到任意位置', icon: 'teleport', effect: 'teleport' },
      { id: 4, name: '护盾卡', description: '防止被撞回起点', icon: 'shield', effect: 'shield' },
      { id: 5, name: '双倍卡', description: '下次掷骰子点数翻倍', icon: 'double', effect: 'double' },
      { id: 6, name: '交换卡', description: '与对手交换棋子位置', icon: 'swap', effect: 'swap' },
      { id: 7, name: '后退卡', description: '让对手棋子后退5步', icon: 'reverse', effect: 'reverse' },
      { id: 8, name: '透视卡', description: '查看对手手牌', icon: 'view', effect: 'view' }
    ];
    
    this.playerProps = {}; // 存储每个玩家拥有的道具
    this.activeEffects = []; // 存储当前生效的效果
  }
  
  // 初始化玩家道具
  initPlayerProps(playerId) {
    if (!this.playerProps[playerId]) {
      this.playerProps[playerId] = [];
      // 新玩家初始获得2个随机道具
      for (let i = 0; i < 2; i++) {
        this.addRandomProp(playerId);
      }
    }
  }
  
  // 给玩家添加随机道具
  addRandomProp(playerId) {
    const randomProp = this.props[Math.floor(Math.random() * this.props.length)];
    this.playerProps[playerId].push({...randomProp});
  }
  
  // 使用道具
  useProp(playerId, propId, target) {
    const playerProps = this.playerProps[playerId];
    const propIndex = playerProps.findIndex(p => p.id === propId);
    
    if (propIndex !== -1) {
      const prop = playerProps[propIndex];
      const result = this.applyEffect(prop.effect, playerId, target);
      
      // 移除使用的道具
      playerProps.splice(propIndex, 1);
      
      // 有可能需要补充道具
      if (playerProps.length < 3) {
        this.addRandomProp(playerId);
      }
      
      return result;
    }
    
    return false;
  }
  
  // 应用道具效果
  applyEffect(effect, playerId, target) {
    switch (effect) {
      case 'extraMove':
        // 额外移动效果，将在下次移动时生效
        this.activeEffects.push({
          type: 'extraMove',
          playerId: playerId,
          duration: 1, // 持续到下次移动
          value: 3
        });
        return true;
        
      case 'freeze':
        // 冻结对手
        if (target) {
          this.activeEffects.push({
            type: 'freeze',
            playerId: target,
            duration: 1, // 冻结一轮
            value: 1
          });
        }
        return true;
        
      case 'teleport':
        // 传送棋子，需要额外参数指定位置
        console.log(`玩家${playerId}使用传送卡，目标位置待定`);
        return true;
        
      case 'shield':
        // 护盾效果，防止被撞回
        this.activeEffects.push({
          type: 'shield',
          playerId: playerId,
          duration: 1, // 持续到下次被撞
          value: 1
        });
        return true;
        
      case 'double':
        // 双倍点数效果
        this.activeEffects.push({
          type: 'double',
          playerId: playerId,
          duration: 1, // 持续到下次掷骰子
          value: 2
        });
        return true;
        
      case 'swap':
        // 交换棋子位置
        if (target) {
          this.swapPieces(playerId, target);
        }
        return true;
        
      case 'reverse':
        // 让对手后退
        if (target) {
          this.movePieceBack(target, 5);
        }
        return true;
        
      case 'view':
        // 透视效果，返回对手的道具信息
        if (target) {
          return this.playerProps[target] || [];
        }
        return true;
        
      default:
        return false;
    }
  }
  
  // 交换两个玩家的棋子位置
  swapPieces(playerId1, playerId2) {
    const player1 = this.findPlayerById(playerId1);
    const player2 = this.findPlayerById(playerId2);
    
    if (player1 && player2) {
      // 交换所有棋子位置
      const tempPos = [...player1.currentPos];
      player1.currentPos = [...player2.currentPos];
      player2.currentPos = tempPos;
    }
  }
  
  // 让棋子后退
  movePieceBack(targetPlayerId, steps) {
    const targetPlayer = this.findPlayerById(targetPlayerId);
    if (targetPlayer) {
      // 找到最前面的棋子进行后退
      let frontPieceIndex = -1;
      let maxPos = -2;
      
      for (let i = 0; i < 4; i++) {
        if (targetPlayer.currentPos[i] > maxPos && targetPlayer.currentPos[i] >= 0) {
          maxPos = targetPlayer.currentPos[i];
          frontPieceIndex = i;
        }
      }
      
      if (frontPieceIndex !== -1 && targetPlayer.currentPos[frontPieceIndex] >= 0) {
        targetPlayer.currentPos[frontPieceIndex] = Math.max(
          0, 
          targetPlayer.currentPos[frontPieceIndex] - steps
        );
      }
    }
  }
  
  // 检查是否有特殊效果
  hasEffect(playerId, effectType) {
    return this.activeEffects.some(effect => 
      effect.playerId === playerId && effect.type === effectType
    );
  }
  
  // 更新效果持续时间
  updateEffects() {
    // 减少效果持续时间
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      this.activeEffects[i].duration--;
      if (this.activeEffects[i].duration <= 0) {
        this.activeEffects.splice(i, 1);
      }
    }
  }
  
  // 获取玩家道具列表
  getPlayerProps(playerId) {
    return this.playerProps[playerId] || [];
  }
  
  // 查找玩家
  findPlayerById(playerId) {
    // 这里需要访问全局玩家数组，暂时返回null，实际实现中需要传入玩家数组
    return null;
  }
  
  // 显示道具界面
  renderPropInterface(canvas, ctx, playerId) {
    const playerProps = this.getPlayerProps(playerId);
    if (playerProps.length === 0) return;
    
    // 绘制道具栏背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, canvas.height - 150, canvas.width - 20, 140);
    
    // 绘制道具
    for (let i = 0; i < playerProps.length; i++) {
      const prop = playerProps[i];
      const x = 30 + i * 80;
      const y = canvas.height - 100;
      
      // 绘制道具图标背景
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x, y, 60, 60);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, 60, 60);
      
      // 绘制道具名称
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(prop.name, x + 30, y + 75);
    }
  }
}

// 暴露道具系统到全局
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PropSystem;
} else {
  window.PropSystem = PropSystem;
}