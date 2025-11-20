// 网络通信模块
class NetworkManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.gameId = null;
    this.playerId = null;
    this.onMessageCallback = null;
  }
  
  // 连接游戏服务器
  connect(serverUrl, gameId, playerId) {
    return new Promise((resolve, reject) => {
      try {
        this.socket = wx.connectSocket({
          url: serverUrl,
          success: () => {
            console.log('连接服务器成功');
          }
        });
        
        this.socket.onOpen(() => {
          this.isConnected = true;
          // 发送加入游戏消息
          this.sendJoinGame(gameId, playerId);
          resolve();
        });
        
        this.socket.onMessage((res) => {
          const message = JSON.parse(res.data);
          this.handleMessage(message);
        });
        
        this.socket.onError((res) => {
          console.error('WebSocket连接错误:', res);
          this.isConnected = false;
          reject(res);
        });
        
        this.socket.onClose((res) => {
          console.log('WebSocket连接关闭:', res);
          this.isConnected = false;
        });
      } catch (error) {
        console.error('连接失败:', error);
        reject(error);
      }
    });
  }
  
  // 发送加入游戏消息
  sendJoinGame(gameId, playerId) {
    const message = {
      type: 'join',
      gameId: gameId,
      playerId: playerId,
      gameType: 'ludo' // 飞行棋游戏类型
    };
    this.sendMessage(message);
  }
  
  // 发送消息
  sendMessage(message) {
    if (this.isConnected && this.socket) {
      this.socket.send({
        data: JSON.stringify(message)
      });
    }
  }
  
  // 处理收到的消息
  handleMessage(message) {
    switch (message.type) {
      case 'gameState':
        // 游戏状态更新
        if (this.onMessageCallback) {
          this.onMessageCallback('gameState', message.data);
        }
        break;
        
      case 'playerJoined':
        // 有玩家加入
        if (this.onMessageCallback) {
          this.onMessageCallback('playerJoined', message.data);
        }
        break;
        
      case 'playerLeft':
        // 有玩家离开
        if (this.onMessageCallback) {
          this.onMessageCallback('playerLeft', message.data);
        }
        break;
        
      case 'diceRolled':
        // 有玩家掷骰子
        if (this.onMessageCallback) {
          this.onMessageCallback('diceRolled', message.data);
        }
        break;
        
      case 'pieceMoved':
        // 棋子移动
        if (this.onMessageCallback) {
          this.onMessageCallback('pieceMoved', message.data);
        }
        break;
        
      case 'propUsed':
        // 使用道具
        if (this.onMessageCallback) {
          this.onMessageCallback('propUsed', message.data);
        }
        break;
        
      case 'gameOver':
        // 游戏结束
        if (this.onMessageCallback) {
          this.onMessageCallback('gameOver', message.data);
        }
        break;
        
      default:
        console.log('未知消息类型:', message.type);
    }
  }
  
  // 设置消息回调
  setOnMessageCallback(callback) {
    this.onMessageCallback = callback;
  }
  
  // 发送掷骰子消息
  sendRollDice(playerId, diceValue) {
    const message = {
      type: 'diceRolled',
      playerId: playerId,
      diceValue: diceValue,
      gameId: this.gameId
    };
    this.sendMessage(message);
  }
  
  // 发送移动棋子消息
  sendMovePiece(playerId, pieceIndex, fromPos, toPos) {
    const message = {
      type: 'pieceMoved',
      playerId: playerId,
      pieceIndex: pieceIndex,
      fromPos: fromPos,
      toPos: toPos,
      gameId: this.gameId
    };
    this.sendMessage(message);
  }
  
  // 发送使用道具消息
  sendUseProp(playerId, propId, targetPlayerId) {
    const message = {
      type: 'propUsed',
      playerId: playerId,
      propId: propId,
      targetPlayerId: targetPlayerId,
      gameId: this.gameId
    };
    this.sendMessage(message);
  }
  
  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.isConnected = false;
    }
  }
}

// 暴露网络管理器到全局
if (typeof window !== 'undefined') {
  window.NetworkManager = NetworkManager;
} else if (typeof module !== 'undefined' && module.exports) {
  module.exports = NetworkManager;
}