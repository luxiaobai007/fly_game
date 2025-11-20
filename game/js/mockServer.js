// 模拟服务器，用于本地测试网络功能
class MockGameServer {
  constructor() {
    this.games = {}; // 存储游戏房间
    this.clients = {}; // 存储客户端连接
    this.nextGameId = 1;
    this.nextPlayerId = 1;
  }
  
  // 创建新游戏房间
  createGame(maxPlayers = 4) {
    const gameId = `game_${this.nextGameId++}`;
    this.games[gameId] = {
      id: gameId,
      players: [],
      maxPlayers: maxPlayers,
      currentPlayer: 0,
      status: 'waiting', // waiting, playing, finished
      boardState: null
    };
    
    return gameId;
  }
  
  // 玩家加入游戏
  joinGame(gameId, playerName) {
    if (!this.games[gameId]) {
      return { success: false, message: '游戏房间不存在' };
    }
    
    const game = this.games[gameId];
    if (game.players.length >= game.maxPlayers) {
      return { success: false, message: '房间已满' };
    }
    
    // 检查玩家名是否已存在
    if (game.players.some(p => p.name === playerName)) {
      return { success: false, message: '玩家名已存在' };
    }
    
    const playerId = this.nextPlayerId++;
    const player = {
      id: playerId,
      name: playerName,
      position: game.players.length, // 0, 1, 2, 3
      ready: false
    };
    
    game.players.push(player);
    
    // 广播玩家加入消息
    this.broadcastToGame(gameId, {
      type: 'playerJoined',
      data: { playerId, playerName }
    });
    
    // 如果玩家数量达到最大值，开始游戏
    if (game.players.length === game.maxPlayers) {
      game.status = 'playing';
      this.startGame(gameId);
    }
    
    return {
      success: true,
      gameId: gameId,
      playerId: playerId,
      gameData: this.getPublicGameData(gameId)
    };
  }
  
  // 玩家准备
  playerReady(gameId, playerId) {
    if (!this.games[gameId]) return false;
    
    const player = this.games[gameId].players.find(p => p.id === playerId);
    if (player) {
      player.ready = true;
      
      // 检查是否所有玩家都准备好了
      const allReady = this.games[gameId].players.every(p => p.ready);
      if (allReady) {
        this.games[gameId].status = 'playing';
        this.startGame(gameId);
      }
      
      return true;
    }
    
    return false;
  }
  
  // 开始游戏
  startGame(gameId) {
    if (!this.games[gameId]) return false;
    
    const game = this.games[gameId];
    game.status = 'playing';
    
    // 广播游戏开始消息
    this.broadcastToGame(gameId, {
      type: 'gameStart',
      data: {
        gameId: gameId,
        players: game.players.map(p => ({ id: p.id, name: p.name }))
      }
    });
    
    return true;
  }
  
  // 处理掷骰子
  rollDice(gameId, playerId, diceValue) {
    if (!this.games[gameId]) return false;
    
    const game = this.games[gameId];
    
    // 验证是否是当前玩家
    if (game.players[game.currentPlayer].id !== playerId) {
      return { success: false, message: '不是您的回合' };
    }
    
    // 广播掷骰子消息
    this.broadcastToGame(gameId, {
      type: 'diceRolled',
      data: {
        playerId: playerId,
        diceValue: diceValue,
        currentPlayer: game.currentPlayer
      }
    });
    
    return { success: true, diceValue: diceValue };
  }
  
  // 处理移动
  movePiece(gameId, playerId, pieceIndex, fromPos, toPos) {
    if (!this.games[gameId]) return false;
    
    const game = this.games[gameId];
    
    // 验证是否是当前玩家
    if (game.players[game.currentPlayer].id !== playerId) {
      return { success: false, message: '不是您的回合' };
    }
    
    // 广播移动消息
    this.broadcastToGame(gameId, {
      type: 'pieceMoved',
      data: {
        playerId: playerId,
        pieceIndex: pieceIndex,
        fromPos: fromPos,
        toPos: toPos
      }
    });
    
    // 切换到下一个玩家（简化处理）
    game.currentPlayer = (game.currentPlayer + 1) % game.players.length;
    
    return { success: true };
  }
  
  // 使用道具
  useProp(gameId, playerId, propId, targetPlayerId) {
    if (!this.games[gameId]) return false;
    
    // 广播道具使用消息
    this.broadcastToGame(gameId, {
      type: 'propUsed',
      data: {
        playerId: playerId,
        propId: propId,
        targetPlayerId: targetPlayerId
      }
    });
    
    return { success: true };
  }
  
  // 获取游戏公开数据
  getPublicGameData(gameId) {
    if (!this.games[gameId]) return null;
    
    const game = this.games[gameId];
    return {
      gameId: game.id,
      players: game.players,
      currentPlayer: game.currentPlayer,
      status: game.status
    };
  }
  
  // 向游戏内所有玩家广播消息
  broadcastToGame(gameId, message) {
    console.log(`广播消息到游戏 ${gameId}:`, message);
    // 在实际实现中，这里会向所有连接到该游戏的客户端发送消息
  }
  
  // 玩家离开游戏
  leaveGame(gameId, playerId) {
    if (!this.games[gameId]) return false;
    
    const game = this.games[gameId];
    const playerIndex = game.players.findIndex(p => p.id === playerId);
    
    if (playerIndex !== -1) {
      const player = game.players.splice(playerIndex, 1)[0];
      
      // 广播玩家离开消息
      this.broadcastToGame(gameId, {
        type: 'playerLeft',
        data: { playerId: playerId, playerName: player.name }
      });
      
      // 如果游戏房间没有玩家了，删除房间
      if (game.players.length === 0) {
        delete this.games[gameId];
      }
      
      return true;
    }
    
    return false;
  }
}

// 创建全局服务器实例
const mockServer = new MockGameServer();

// 导出服务器实例
if (typeof window !== 'undefined') {
  window.mockServer = mockServer;
} else if (typeof module !== 'undefined' && module.exports) {
  module.exports = mockServer;
}