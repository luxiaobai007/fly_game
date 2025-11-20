// 游戏逻辑扩展，包含道具使用和网络交互

// 检查是否点击了道具
function isPropClick(x, y) {
  // 检查是否在道具栏区域内点击
  if (y > canvas.height - 150 && y < canvas.height - 10) {
    return true;
  }
  return false;
}

// 处理道具点击
function handlePropClick(x, y) {
  if (!propSystem) return;
  
  // 获取本地玩家的道具
  const playerProps = propSystem.getPlayerProps(localPlayerId);
  if (playerProps.length === 0) return;
  
  // 计算点击的是哪个道具
  for (let i = 0; i < playerProps.length; i++) {
    const propX = 30 + i * 80;
    const propY = canvas.height - 100;
    
    if (x > propX && x < propX + 60 && y > propY && y < propY + 60) {
      // 使用选中的道具
      const selectedProp = playerProps[i];
      useProp(selectedProp.id);
      break;
    }
  }
}

// 使用道具
function useProp(propId) {
  // 在这里可以添加道具选择目标的逻辑
  // 为了简化，暂时对当前玩家使用
  if (propSystem) {
    const result = propSystem.useProp(localPlayerId, propId, null);
    if (result) {
      console.log(`道具使用成功: ${propId}`);
      // 如果是网络游戏，需要发送道具使用消息
      if (networkManager && isNetworkGame) {
        networkManager.sendUseProp(localPlayerId, propId, null);
      }
    }
  }
}

// 检查是否是本地玩家的回合
function isLocalPlayerTurn() {
  return players[currentPlayerIndex].id === localPlayerId;
}

// 更新游戏逻辑，加入网络和道具效果
function updateGameLogic() {
  // 更新道具系统效果
  if (propSystem) {
    propSystem.updateEffects();
  }
  
  // 检查是否有冻结效果
  if (propSystem && propSystem.hasEffect(players[currentPlayerIndex].id, 'freeze')) {
    // 如果当前玩家被冻结，则跳过其回合
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    return;
  }
}

// 修改掷骰子函数，加入道具效果
function rollDice() {
  if (!isDiceRolled && isLocalPlayerTurn()) {
    let baseValue = Math.floor(Math.random() * 6) + 1;
    
    // 检查是否有双倍效果
    if (propSystem && propSystem.hasEffect(localPlayerId, 'double')) {
      baseValue *= 2;
      // 移除双倍效果
      // 这里需要扩展道具系统来正确管理效果
    }
    
    diceValue = baseValue;
    isDiceRolled = true;
    
    // 如果是网络游戏，发送掷骰子消息
    if (networkManager && isNetworkGame) {
      networkManager.sendRollDice(localPlayerId, diceValue);
    }
  }
}

// 修改移动棋子函数，加入道具效果
function movePiece() {
  if (isDiceRolled && diceValue > 0 && isLocalPlayerTurn()) {
    // 检查是否有额外移动效果
    let extraSteps = 0;
    if (propSystem && propSystem.hasEffect(localPlayerId, 'extraMove')) {
      extraSteps = 3;
      // 这里应该移除额外移动效果，需要扩展道具系统
    }
    
    const totalSteps = diceValue + extraSteps;
    
    // 这里需要实现完整的移动逻辑，包括选择棋子等
    const player = players[currentPlayerIndex];
    let moved = false;
    
    for (let i = 0; i < 4; i++) {
      if (canMovePiece(player, i, totalSteps)) {
        const oldPos = player.currentPos[i];
        player.currentPos[i] = calculateNewPosition(player.currentPos[i], totalSteps);
        moved = true;
        
        // 检查是否撞到其他玩家的棋子
        checkCollisionWithShield(player, i);
        
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
        
        // 如果是网络游戏，发送移动消息
        if (networkManager && isNetworkGame) {
          networkManager.sendMovePiece(localPlayerId, i, oldPos, player.currentPos[i]);
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

// 带护盾保护的碰撞检测
function checkCollisionWithShield(movingPlayer, pieceIndex) {
  const newPos = movingPlayer.currentPos[pieceIndex];
  
  // 检查是否与其他玩家的棋子在同一位置
  for (let i = 0; i < players.length; i++) {
    if (i !== currentPlayerIndex) {
      for (let j = 0; j < 4; j++) {
        if (players[i].currentPos[j] === newPos) {
          // 检查被撞玩家是否有护盾
          if (propSystem && !propSystem.hasEffect(players[i].id, 'shield')) {
            // 将被撞的棋子送回起始位置
            players[i].currentPos[j] = -1;
          }
          // 如果有护盾，不执行任何操作
        }
      }
    }
  }
}

// 设置网络消息回调
function setupNetworkCallbacks() {
  if (networkManager) {
    networkManager.setOnMessageCallback((messageType, data) => {
      switch (messageType) {
        case 'gameState':
          updateGameState(data);
          break;
        case 'diceRolled':
          handleDiceRoll(data);
          break;
        case 'pieceMoved':
          handlePieceMove(data);
          break;
        case 'propUsed':
          handlePropUse(data);
          break;
        case 'playerJoined':
          handlePlayerJoin(data);
          break;
        case 'playerLeft':
          handlePlayerLeave(data);
          break;
        case 'gameOver':
          handleGameOver(data);
          break;
      }
    });
  }
}

// 处理游戏状态更新
function updateGameState(data) {
  // 更新游戏状态和玩家信息
  if (data.players) {
    players = data.players;
  }
  if (data.currentPlayerIndex !== undefined) {
    currentPlayerIndex = data.currentPlayerIndex;
  }
}

// 处理掷骰子消息
function handleDiceRoll(data) {
  // 更新骰子值，但只在不是本地玩家时更新
  if (data.playerId !== localPlayerId) {
    diceValue = data.diceValue;
    isDiceRolled = true;
  }
}

// 处理棋子移动消息
function handlePieceMove(data) {
  // 更新指定玩家的棋子位置
  const player = players.find(p => p.id === data.playerId);
  if (player && player.currentPos && player.currentPos[data.pieceIndex] !== undefined) {
    player.currentPos[data.pieceIndex] = data.toPos;
  }
}

// 处理道具使用消息
function handlePropUse(data) {
  // 在这里处理其他玩家使用道具的情况
  console.log(`玩家 ${data.playerId} 使用了道具 ${data.propId}`);
}

// 处理玩家加入
function handlePlayerJoin(data) {
  // 添加新玩家到游戏中
  console.log(`玩家 ${data.playerId} 加入游戏`);
}

// 处理玩家离开
function handlePlayerLeave(data) {
  // 从游戏中移除玩家
  console.log(`玩家 ${data.playerId} 离开游戏`);
}

// 处理游戏结束
function handleGameOver(data) {
  console.log(`游戏结束，获胜者: ${data.winnerId}`);
  gameState = GAME_STATE.MENU; // 返回菜单
}