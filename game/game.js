// 游戏全局变量
let game = null;
let ctx = null;
let canvas = null;

// 游戏状态
const GAME_STATE = {
  MENU: 'menu',
  LOBBY: 'lobby',
  PLAYING: 'playing',
  PAUSED: 'paused'
};

let gameState = GAME_STATE.MENU;

// 玩家信息
let players = [];
let currentPlayerIndex = 0;
let diceValue = 0;
let isDiceRolled = false;
let gameBoard = null;

// 道具系统和网络
let propSystem = null;
let networkManager = null;
let isNetworkGame = false;
let localPlayerId = 1; // 本地玩家ID

// 初始化游戏
function initGame() {
  canvas = wx.getSharedCanvas ? wx.getSharedCanvas() : wx.createCanvas();
  ctx = canvas.getContext('2d');
  gameBoard = new GameBoard();
  
  // 初始化道具系统 - 确保PropSystem类已定义
  if (typeof window.PropSystem !== 'undefined') {
    propSystem = new window.PropSystem();
  } else if (typeof PropSystem !== 'undefined') {
    propSystem = new PropSystem();
  } else {
    console.error('PropSystem is not available');
    // 如果道具系统不可用，创建一个空的替代实现
    propSystem = {
      initPlayerProps: function(playerId) {},
      addRandomProp: function(playerId) {},
      useProp: function(playerId, propId, target) { return false; },
      applyEffect: function(effect, playerId, target) { return false; },
      hasEffect: function(playerId, effectType) { return false; },
      updateEffects: function() {},
      getPlayerProps: function(playerId) { return []; },
      renderPropInterface: function(canvas, ctx, playerId) {},
      findPlayerById: function(playerId) { return null; }
    };
    console.warn('使用空的道具系统替代实现');
  }
  
  // 初始化网络管理器
  if (typeof window.NetworkManager !== 'undefined') {
    networkManager = new window.NetworkManager();
  } else if (typeof NetworkManager !== 'undefined') {
    networkManager = new NetworkManager();
  } else {
    console.error('NetworkManager is not available');
    // 如果网络管理器不可用，创建一个空的替代实现
    networkManager = {
      connect: function(serverUrl, gameId, playerId) { return Promise.resolve(); },
      sendJoinGame: function(gameId, playerId) {},
      sendMessage: function(message) {},
      handleMessage: function(message) {},
      setOnMessageCallback: function(callback) {},
      sendRollDice: function(playerId, diceValue) {},
      sendMovePiece: function(playerId, pieceIndex, fromPos, toPos) {},
      sendUseProp: function(playerId, propId, targetPlayerId) {},
      disconnect: function() {}
    };
    console.warn('使用空的网络管理器替代实现');
  }
  
  // 初始化玩家
  players = [
    { id: 1, name: 'Player 1', color: '#FF0000', pieces: [0, 0, 0, 0], startPos: 0, currentPos: [-1, -1, -1, -1] }, // 红色
    { id: 2, name: 'Player 2', color: '#00FF00', pieces: [0, 0, 0, 0], startPos: 13, currentPos: [-1, -1, -1, -1] }, // 绿色
    { id: 3, name: 'Player 3', color: '#0000FF', pieces: [0, 0, 0, 0], startPos: 26, currentPos: [-1, -1, -1, -1] }, // 蓝色
    { id: 4, name: 'Player 4', color: '#FFFF00', pieces: [0, 0, 0, 0], startPos: 39, currentPos: [-1, -1, -1, -1] }  // 黄色
  ];
  
  // 为每个玩家初始化道具
  for (let i = 0; i < players.length; i++) {
    propSystem.initPlayerProps(players[i].id);
  }
  
  // 监听触摸事件
  canvas.addEventListener('touchstart', handleTouchStart);
  canvas.addEventListener('touchend', handleTouchEnd);
  
  // 设置网络回调
  setupNetworkCallbacks();
  
  // 开始游戏循环
  requestAnimationFrame(gameLoop);
}

// 游戏主循环
function gameLoop() {
  clearCanvas();
  updateGameLogic(); // 更新游戏逻辑
  render();
  requestAnimationFrame(gameLoop);
}

// 清除画布
function clearCanvas() {
  ctx.fillStyle = '#87CEEB'; // 天蓝色背景
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// 渲染游戏
function render() {
  switch (gameState) {
    case GAME_STATE.MENU:
      renderMenu();
      break;
    case GAME_STATE.LOBBY:
      renderLobby();
      break;
    case GAME_STATE.PLAYING:
      renderGame();
      break;
    case GAME_STATE.PAUSED:
      renderPaused();
      break;
  }
}

// 渲染菜单
function renderMenu() {
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('飞行棋游戏', canvas.width / 2, canvas.height / 2 - 50);
  
  ctx.fillStyle = '#00FF00';
  ctx.font = '24px Arial';
  ctx.fillText('点击开始游戏', canvas.width / 2, canvas.height / 2 + 20);
}

// 渲染房间
function renderLobby() {
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('多人飞行棋', canvas.width / 2, 50);
  
  // 显示玩家列表
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    ctx.fillStyle = player.color;
    ctx.font = '20px Arial';
    ctx.fillText(player.name, 50, 150 + i * 50);
    
    if (i === currentPlayerIndex) {
      ctx.fillStyle = '#FFFF00';
      ctx.fillText('<<', 20, 150 + i * 50);
    }
  }
  
  // 准备按钮
  ctx.fillStyle = '#00FF00';
  ctx.fillRect(canvas.width / 2 - 60, canvas.height - 100, 120, 50);
  ctx.fillStyle = '#000000';
  ctx.font = '20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('准备', canvas.width / 2, canvas.height - 65);
}

// 渲染游戏界面
function renderGame() {
  // 绘制游戏棋盘
  gameBoard.render();
  
  // 绘制所有玩家的棋子
  for (let i = 0; i < players.length; i++) {
    renderPlayerPieces(players[i], i);
  }
  
  // 绘制骰子
  drawDice();
  
  // 显示当前玩家
  ctx.fillStyle = players[currentPlayerIndex].color;
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`${players[currentPlayerIndex].name} 的回合`, 20, 30);
  
  // 如果已经掷骰子，显示移动按钮
  if (isDiceRolled) {
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(canvas.width - 120, 50, 100, 40);
    ctx.fillStyle = '#000000';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('移动', canvas.width - 70, 75);
  }
  
  // 渲染道具栏
  if (propSystem) {
    propSystem.renderPropInterface(canvas, ctx, localPlayerId);
  }
}

// 渲染玩家棋子
function renderPlayerPieces(player, playerIndex) {
  for (let pieceIndex = 0; pieceIndex < 4; pieceIndex++) {
    const pos = player.currentPos[pieceIndex];
    if (pos !== -1) { // -1 表示棋子在起始位置
      let x, y;
      
      // 根据位置计算坐标
      if (pos < 0) {
        // 起始位置的棋子
        const startPos = getStartPosForPlayer(playerIndex, pieceIndex);
        x = startPos.x;
        y = startPos.y;
      } else if (pos >= 52) {
        // 终点区域的棋子
        const finishPos = getFinishPosForPlayer(playerIndex, pos - 52, pieceIndex);
        x = finishPos.x;
        y = finishPos.y;
      } else {
        // 主路径上的棋子
        const pathPos = getPathPos(pos);
        x = pathPos.x;
        y = pathPos.y;
      }
      
      // 绘制棋子
      ctx.fillStyle = player.color;
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.fill();
      
      // 绘制棋子编号
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((pieceIndex + 1).toString(), x, y);
    }
  }
}

// 获取玩家起始位置
function getStartPosForPlayer(playerIndex, pieceIndex) {
  const startX = [100, 200, 100, 200]; // 红、绿、蓝、黄玩家起始X坐标
  const startY = [100, 100, 300, 300]; // 红、绿、蓝、黄玩家起始Y坐标
  
  const offsetX = (pieceIndex % 2) * 30;
  const offsetY = Math.floor(pieceIndex / 2) * 30;
  
  return {
    x: startX[playerIndex] + offsetX,
    y: startY[playerIndex] + offsetY
  };
}

// 获取玩家终点位置
function getFinishPosForPlayer(playerIndex, posInFinish, pieceIndex) {
  const finishX = [canvas.width - 100, canvas.width - 200, canvas.width - 100, canvas.width - 200]; // 红、绿、蓝、黄玩家终点X坐标
  const finishY = [canvas.height - 100, canvas.height - 100, canvas.height - 300, canvas.height - 300]; // 红、绿、蓝、黄玩家终点Y坐标
  
  const offsetX = posInFinish * 25;
  const offsetY = (pieceIndex % 2) * 25;
  
  return {
    x: finishX[playerIndex] + offsetX,
    y: finishY[playerIndex] - offsetY
  };
}

// 获取路径位置
function getPathPos(pos) {
  // 简化的路径坐标计算，实际游戏中需要根据棋盘设计调整
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = 150;
  
  // 将位置映射到路径上
  if (pos < 13) {
    // 底部横线
    return { x: centerX - 150 + pos * 25, y: centerY + 150 };
  } else if (pos < 26) {
    // 右侧竖线
    return { x: centerX + 150, y: centerY + 150 - (pos - 13) * 25 };
  } else if (pos < 39) {
    // 顶部横线
    return { x: centerX + 150 - (pos - 26) * 25, y: centerY - 150 };
  } else {
    // 左侧竖线
    return { x: centerX - 150, y: centerY - 150 + (pos - 39) * 25 };
  }
}

// 绘制骰子
function drawDice() {
  const diceX = canvas.width / 2 - 25;
  const diceY = canvas.height - 80;
  
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(diceX, diceY, 50, 50);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.strokeRect(diceX, diceY, 50, 50);
  
  if (diceValue > 0) {
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(diceValue.toString(), diceX + 25, diceY + 25);
  } else {
    ctx.fillStyle = '#0000FF';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('掷骰子', diceX + 25, diceY + 25);
  }
}

// 渲染暂停界面
function renderPaused() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('游戏暂停', canvas.width / 2, canvas.height / 2);
}

// 触摸开始事件处理
function handleTouchStart(event) {
  const touch = event.touches[0];
  const x = touch.clientX;
  const y = touch.clientY;
  
  switch (gameState) {
    case GAME_STATE.MENU:
      // 点击开始游戏
      gameState = GAME_STATE.LOBBY;
      break;
    case GAME_STATE.LOBBY:
      // 检查是否点击准备按钮
      if (x > canvas.width / 2 - 60 && x < canvas.width / 2 + 60 && 
          y > canvas.height - 100 && y < canvas.height - 50) {
        gameState = GAME_STATE.PLAYING;
      }
      break;
    case GAME_STATE.PLAYING:
      // 检查是否点击骰子
      const diceX = canvas.width / 2 - 25;
      const diceY = canvas.height - 80;
      if (x > diceX && x < diceX + 50 && y > diceY && y < diceY + 50) {
        rollDice();
      }
      // 检查是否点击移动按钮
      else if (isDiceRolled && x > canvas.width - 120 && x < canvas.width - 20 && 
               y > 50 && y < 90) {
        movePiece();
      }
      // 检查是否点击道具
      else if (isPropClick(x, y)) {
        handlePropClick(x, y);
      }
      break;
  }
}

// 触摸结束事件处理
function handleTouchEnd(event) {
  // 可以在这里处理触摸结束逻辑
}

// 掷骰子
function rollDice() {
  if (!isDiceRolled) {
    diceValue = Math.floor(Math.random() * 6) + 1;
    isDiceRolled = true;
  }
}

// 移动棋子
function movePiece() {
  if (isDiceRolled && diceValue > 0) {
    // 这里需要实现具体的移动逻辑
    // 选择一个可以移动的棋子（这里简化为移动第一个可移动的棋子）
    const player = players[currentPlayerIndex];
    let moved = false;
    
    for (let i = 0; i < 4; i++) {
      if (canMovePiece(player, i, diceValue)) {
        player.currentPos[i] = calculateNewPosition(player.currentPos[i], diceValue);
        moved = true;
        
        // 检查是否撞到其他玩家的棋子
        checkCollision(player, i);
        
        // 如果移动了6点，则可以再掷一次
        if (diceValue === 6) {
          isDiceRolled = false;
          diceValue = 0;
        } else {
          // 切换到下一个玩家
          currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
          isDiceRolled = false;
          diceValue = 0;
        }
        break;
      }
    }
    
    if (!moved) {
      // 如果没有可移动的棋子，则切换到下一个玩家
      currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
      isDiceRolled = false;
      diceValue = 0;
    }
  }
}

// 检查棋子是否可以移动
function canMovePiece(player, pieceIndex, steps) {
  const currentPos = player.currentPos[pieceIndex];
  
  // 如果棋子还在起始位置，只有掷到6才能起飞
  if (currentPos === -1) {
    return steps === 6;
  }
  
  // 如果移动后会超过终点，则不能移动
  if (currentPos + steps > 56) {
    return false;
  }
  
  return true;
}

// 计算新位置
function calculateNewPosition(currentPos, steps) {
  if (currentPos === -1) {
    // 从起始位置起飞
    return 0; // 或者根据玩家起始位置调整
  }
  
  return currentPos + steps;
}

// 检查碰撞
function checkCollision(movingPlayer, pieceIndex) {
  const newPos = movingPlayer.currentPos[pieceIndex];
  
  // 检查是否与其他玩家的棋子在同一位置
  for (let i = 0; i < players.length; i++) {
    if (i !== currentPlayerIndex) {
      for (let j = 0; j < 4; j++) {
        if (players[i].currentPos[j] === newPos) {
          // 将被撞的棋子送回起始位置
          players[i].currentPos[j] = -1;
        }
      }
    }
  }
}

// 游戏棋盘类
class GameBoard {
  constructor() {
    // 初始化棋盘数据
  }
  
  render() {
    // 绘制棋盘背景
    this.drawBackground();
    // 绘制路径
    this.drawPath();
    // 绘制特殊格子
    this.drawSpecialCells();
  }
  
  drawBackground() {
    // 绘制棋盘背景
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // 绘制中心区域
    ctx.fillStyle = '#F5F5DC'; // 米色
    ctx.fillRect(centerX - 100, centerY - 100, 200, 200);
    
    // 绘制四角起始区域
    ctx.fillStyle = '#FF0000'; // 红色区域
    ctx.fillRect(50, 50, 100, 100);
    
    ctx.fillStyle = '#00FF00'; // 绿色区域
    ctx.fillRect(canvas.width - 150, 50, 100, 100);
    
    ctx.fillStyle = '#0000FF'; // 蓝色区域
    ctx.fillRect(50, canvas.height - 150, 100, 100);
    
    ctx.fillStyle = '#FFFF00'; // 黄色区域
    ctx.fillRect(canvas.width - 150, canvas.height - 150, 100, 100);
  }
  
  drawPath() {
    // 绘制主要路径
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // 底部路径
    for (let i = 0; i < 13; i++) {
      const x = centerX - 150 + i * 25;
      const y = centerY + 150;
      this.drawPathCell(x, y, i);
    }
    
    // 右侧路径
    for (let i = 13; i < 26; i++) {
      const x = centerX + 150;
      const y = centerY + 150 - (i - 13) * 25;
      this.drawPathCell(x, y, i);
    }
    
    // 顶部路径
    for (let i = 26; i < 39; i++) {
      const x = centerX + 150 - (i - 26) * 25;
      const y = centerY - 150;
      this.drawPathCell(x, y, i);
    }
    
    // 左侧路径
    for (let i = 39; i < 52; i++) {
      const x = centerX - 150;
      const y = centerY - 150 + (i - 39) * 25;
      this.drawPathCell(x, y, i);
    }
  }
  
  drawPathCell(x, y, index) {
    // 绘制路径格子
    ctx.fillStyle = (index % 2 === 0) ? '#FFFFFF' : '#DDDDDD';
    ctx.fillRect(x - 12, y - 12, 24, 24);
    
    // 绘制边框
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 12, y - 12, 24, 24);
  }
  
  drawSpecialCells() {
    // 绘制特殊格子（安全位置等）
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // 绘制安全位置（红色）
    const safetyPositions = [0, 13, 26, 39]; // 每个颜色的起始安全位置
    for (const pos of safetyPositions) {
      let x, y;
      if (pos === 0) {
        x = centerX - 150;
        y = centerY + 150;
      } else if (pos === 13) {
        x = centerX + 150;
        y = centerY + 150;
      } else if (pos === 26) {
        x = centerX + 150;
        y = centerY - 150;
      } else if (pos === 39) {
        x = centerX - 150;
        y = centerY - 150;
      }
      
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(x - 12, y - 12, 24, 24);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 12, y - 12, 24, 24);
    }
  }
}

// 初始化游戏
wx.onShow(() => {
  if (!game) {
    initGame();
  }
});

// 隐藏时暂停游戏
wx.onHide(() => {
  // 暂停游戏逻辑
});