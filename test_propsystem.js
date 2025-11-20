// 测试PropSystem是否可以正确加载
const fs = require('fs');
const path = require('path');

// 读取propSystem.js文件内容
const propSystemCode = fs.readFileSync('./game/js/propSystem.js', 'utf8');

// 创建一个简单的测试环境
function testPropSystem() {
  console.log('开始测试PropSystem...');
  
  // 模拟浏览器环境
  global.window = {};
  
  try {
    // 评估propSystem.js代码
    eval(propSystemCode);
    
    // 检查PropSystem是否定义
    if (typeof global.window.PropSystem !== 'undefined') {
      console.log('✓ window.PropSystem 已定义');
      
      // 尝试创建实例
      const propSystem = new global.window.PropSystem();
      console.log('✓ PropSystem 实例创建成功');
      
      // 测试基本功能
      propSystem.initPlayerProps(1);
      console.log('✓ initPlayerProps 方法调用成功');
      
      const props = propSystem.getPlayerProps(1);
      console.log(`✓ 玩家1的道具数量: ${props.length}`);
      
      if (props.length > 0) {
        const result = propSystem.useProp(1, props[0].id, 2);
        console.log(`✓ useProp 方法调用结果: ${result}`);
      }
      
      console.log('\nPropSystem测试通过！');
      return true;
    } else {
      console.log('✗ window.PropSystem 未定义');
      return false;
    }
  } catch (error) {
    console.error('✗ 测试过程中出现错误:', error.message);
    return false;
  }
}

// 运行测试
const success = testPropSystem();
process.exit(success ? 0 : 1);