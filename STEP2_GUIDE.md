# Step2: 完整結帳系統技術文檔

## 📋 概述

Step2 是一個基於 Ollama Function Calling 的智慧點餐系統，實現了完全自動化的點餐到結帳流程。透過 AI 自動呼叫相應的工具函數，提供無縫的使用者體驗。

## 🏗️ 系統架構

```
Step2 系統架構
├── 使用者輸入層
│   └── 自然語言點餐指令
├── AI 處理層
│   ├── Ollama llama3.2 模型
│   ├── Function Calling 工具定義
│   ├── 工具呼叫處理器
│   └── 對話歷史管理
├── 業務邏輯層
│   ├── 訂單處理工具
│   ├── 支付處理工具
│   ├── 製作轉單工具
│   └── 金額計算工具
└── 資料持久層
    ├── orders.json
    ├── payments.json
    └── production.json
```

## 🔧 核心組件

### 1. Function Calling 工具定義

#### 工具配置

```javascript
// step2.mjs
const tools = [
  {
    type: "function",
    function: {
      name: "calculate_total",
      description: "計算訂單總金額",
      parameters: {
        type: "object",
        properties: {
          item: {
            type: "string",
            description: "飲料品項名稱",
          },
          size: {
            type: "string",
            enum: ["M", "L"],
            description: "飲料大小",
          },
          quantity: {
            type: "integer",
            minimum: 1,
            description: "數量",
          },
        },
        required: ["item", "size", "quantity"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "process_order",
      description: "處理完整的訂單資訊，建立訂單記錄",
      parameters: {
        type: "object",
        properties: {
          item: { type: "string", description: "飲料品項名稱" },
          size: { type: "string", enum: ["M", "L"], description: "飲料大小" },
          quantity: { type: "integer", minimum: 1, description: "數量" },
          ice: {
            type: "string",
            enum: ["溫熱飲", "去冰", "微冰", "少冰", "正常冰"],
            description: "冰塊選擇",
          },
          sugar: {
            type: "string",
            enum: ["無糖", "微糖", "半糖", "少糖", "全糖"],
            description: "甜度選擇",
          },
          addOn: {
            type: "string",
            enum: ["波霸", "珍珠", "燕麥", "椰果"],
            description: "添加品（可選）",
            nullable: true,
          },
        },
        required: ["item", "size", "quantity", "ice", "sugar"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "process_payment",
      description: "處理訂單支付",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string", description: "訂單ID（時間戳）" },
          paymentMethod: {
            type: "string",
            enum: ["Line Pay", "現金", "信用卡", "街口支付"],
            description: "支付方式",
          },
          amount: { type: "number", description: "支付金額" },
        },
        required: ["orderId", "paymentMethod", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "transfer_to_production",
      description: "將已支付的訂單轉給製作部門",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string", description: "訂單ID" },
          paymentRecordId: { type: "string", description: "支付記錄ID" },
        },
        required: ["orderId", "paymentRecordId"],
      },
    },
  },
];
```

### 2. 工具呼叫處理器

#### 核心處理邏輯

```javascript
async function handleToolCalls(toolCalls) {
  const results = [];

  for (const toolCall of toolCalls) {
    const { id, function: func } = toolCall;

    try {
      let result;

      switch (func.name) {
        case "process_order":
          const orderParams = func.arguments;
          console.log("🔍 調試 - 訂單參數:", orderParams);
          const order = purchase(
            orderParams.item,
            orderParams.size,
            orderParams.quantity,
            orderParams.ice,
            orderParams.sugar,
            orderParams.addOn
          );
          currentOrder = order;
          result = {
            success: true,
            order: order,
            message: "訂單已成功建立",
          };
          console.log(formatOrderDisplay(order));
          break;

        case "calculate_total":
          const totalParams = func.arguments;
          const orderForCalculation = {
            item: totalParams.item,
            size: totalParams.size,
            quantity: totalParams.quantity,
          };
          const totalAmount = calculateOrderTotal(
            orderForCalculation,
            menuData
          );
          result = {
            success: true,
            totalAmount: totalAmount,
            message: `訂單總金額：${totalAmount} 元`,
          };
          console.log(`\n💰 ${result.message}`);
          break;

        case "process_payment":
          const paymentParams = func.arguments;
          const paymentResult = payment(
            currentOrder,
            paymentParams.paymentMethod,
            paymentParams.amount
          );
          currentPaymentRecord = paymentResult.paymentRecord;
          result = {
            success: true,
            paymentRecord: paymentResult.paymentRecord,
            message: paymentResult.message,
          };
          console.log(formatPaymentDisplay(paymentResult.paymentRecord));
          break;

        case "transfer_to_production":
          const productionParams = func.arguments;
          console.log("🔍 調試 - 生產參數:", productionParams);

          if (!currentOrder || !currentPaymentRecord) {
            result = {
              success: false,
              error: "找不到對應的訂單或支付記錄",
            };
          } else {
            const productionResult = transferToProduction(
              currentOrder,
              currentPaymentRecord
            );
            result = {
              success: true,
              productionOrder: productionResult.productionOrder,
              message: productionResult.message,
            };
            console.log(
              formatProductionOrderDisplay(productionResult.productionOrder)
            );
          }
          break;

        default:
          result = {
            success: false,
            error: `未知的工具：${func.name}`,
          };
      }

      results.push({
        tool_call_id: id,
        role: "tool",
        content: JSON.stringify(result),
      });
    } catch (error) {
      results.push({
        tool_call_id: id,
        role: "tool",
        content: JSON.stringify({
          success: false,
          error: error.message,
        }),
      });
    }
  }

  return results;
}
```

### 3. AI 對話處理

#### 系統提示詞設計

```javascript
// contant_step2.mjs
export const SYSTEM_DESCRIPTION = {
  role: "system",
  content:
    "你是個飲料點餐AI助理。你的任務是:\n" +
    "- 必須使用繁體中文回答\n" +
    "- 根據提供的菜單資料跟客人介紹餐點\n" +
    "- 當客人點餐時，必須確認以下資訊是否完整：\n" +
    "  1. 品類（必須是菜單上的品項）\n" +
    "  2. 飲料大小（必須是：M(中杯)、L(大杯)）\n" +
    "  3. 數量（正整數）\n" +
    "  4. 冰塊（必須是：溫熱飲、去冰、微冰、少冰、正常冰）\n" +
    "  5. 甜度（必須是：無糖、微糖、半糖、少糖、全糖）\n" +
    "- 當所有資訊完整時，你必須按照以下順序呼叫工具：\n" +
    "  1. 首先呼叫 calculate_total 工具計算訂單總金額\n" +
    "  2. 然後呼叫 process_order 工具建立訂單記錄\n" +
    "  3. 詢問客人選擇支付方式（Line Pay、現金、信用卡、街口支付）\n" +
    "  4. 呼叫 process_payment 工具處理支付\n" +
    "  5. 最後呼叫 transfer_to_production 工具將訂單轉給製作部門\n" +
    "- 重要：當客人提供完整的訂單資訊時，你必須立即開始呼叫工具，不要等待額外的確認\n",
};
```

#### 對話處理流程

```javascript
async function handleUserInput(input) {
  try {
    // 添加使用者訊息到歷史
    messages.push({ role: "user", content: input });

    // 獲取 AI 回應，包含 tools
    const response = await ollama.chat({
      model: model,
      messages: messages,
      tools: tools,
      tool_choice: "auto",
      options: {
        temperature: 0.1,
      },
    });

    // 添加 AI 回應到歷史
    messages.push(response.message);

    // 輸出 AI 回應
    console.log("\n🤖 AI:", response.message.content, "\n");

    // 如果有 tool calls，處理它們
    if (response.message.tool_calls && response.message.tool_calls.length > 0) {
      console.log("🔧 正在處理工具呼叫...");
      console.log(
        "🔍 工具呼叫:",
        JSON.stringify(response.message.tool_calls, null, 2)
      );

      const toolResults = await handleToolCalls(response.message.tool_calls);

      // 將工具結果添加到對話歷史
      messages.push(...toolResults);

      // 獲取 AI 的後續回應
      const followUpResponse = await ollama.chat({
        model: model,
        messages: messages,
        options: {
          temperature: 0.1,
        },
      });

      // 添加後續回應到歷史
      messages.push(followUpResponse.message);

      // 輸出後續回應
      if (followUpResponse.message.content) {
        console.log("🤖 AI:", followUpResponse.message.content, "\n");
      }
    }

    // 檢查是否有完整的訂單流程完成
    if (currentOrder && currentPaymentRecord) {
      console.log("\n🎉 訂單處理完成！感謝您的購買！");
      // 重置狀態
      currentOrder = null;
      currentPaymentRecord = null;
    }
  } catch (error) {
    console.error("❌ 發生錯誤：", error.message);
    console.error("❌ 錯誤詳情：", error);
  }
}
```

## 🔄 工作流程

### 1. 完整點餐流程

```
使用者輸入 → AI 解析 → 工具呼叫 → 訂單建立 → 金額計算 → 支付處理 → 製作轉單 → 流程完成
```

### 2. 工具呼叫順序

```
calculate_total → process_order → process_payment → transfer_to_production
```

### 3. 狀態管理

```
currentOrder: 當前訂單狀態
currentPaymentRecord: 當前支付記錄
messages: 對話歷史
```

## 📊 資料流程

### 1. 訂單資料流程

```javascript
// 1. 計算總金額
const totalAmount = calculateOrderTotal(orderForCalculation, menuData);

// 2. 建立訂單
const order = purchase(item, size, quantity, ice, sugar, addOn);

// 3. 處理支付
const paymentResult = payment(currentOrder, paymentMethod, amount);

// 4. 轉給製作
const productionResult = transferToProduction(
  currentOrder,
  currentPaymentRecord
);
```

### 2. 檔案寫入流程

```javascript
// 訂單寫入
writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2), "utf8");

// 支付寫入
writeFileSync(paymentsFilePath, JSON.stringify(payments, null, 2), "utf8");

// 製作訂單寫入
writeFileSync(
  productionFilePath,
  JSON.stringify(productionOrders, null, 2),
  "utf8"
);
```

## 🛠️ 錯誤處理

### 1. 工具呼叫錯誤處理

```javascript
try {
  // 工具處理邏輯
  result = { success: true, ... };
} catch (error) {
  result = {
    success: false,
    error: error.message,
  };
}
```

### 2. 參數驗證

```javascript
// 檢查必要參數
if (!currentOrder || !currentPaymentRecord) {
  result = {
    success: false,
    error: "找不到對應的訂單或支付記錄",
  };
}
```

### 3. 檔案操作錯誤處理

```javascript
try {
  const ordersData = readFileSync(ordersFilePath, "utf8");
  orders = JSON.parse(ordersData);
} catch (err) {
  // 如果檔案不存在或格式錯誤，使用空陣列
  orders = [];
}
```

## 🎯 優點與特色

### 優點

- ✅ 完全自動化流程
- ✅ 智慧工具呼叫
- ✅ 無縫使用者體驗
- ✅ 強大的錯誤處理
- ✅ 高度可擴展性
- ✅ 即時狀態管理

### 特色功能

- 🔧 Function Calling 整合
- 🤖 AI 智慧決策
- 💳 自動支付處理
- 🏭 自動製作轉單
- 📊 即時資料同步
- 🔄 狀態追蹤

## 🔧 配置與自定義

### 1. 模型配置

```javascript
const model = "llama3.2"; // 可改為其他模型

// AI 回應配置
const response = await ollama.chat({
  model: model,
  messages: messages,
  tools: tools,
  tool_choice: "auto",
  options: {
    temperature: 0.1, // 控制回應的創造性
  },
});
```

### 2. 工具自定義

```javascript
// 新增自定義工具
const customTool = {
  type: "function",
  function: {
    name: "custom_function",
    description: "自定義功能描述",
    parameters: {
      type: "object",
      properties: {
        // 自定義參數
      },
      required: ["required_param"],
    },
  },
};

tools.push(customTool);
```

### 3. 流程自定義

```javascript
// 在 handleToolCalls 中新增工具處理
case "custom_function":
  const customParams = func.arguments;
  // 自定義處理邏輯
  result = {
    success: true,
    message: "自定義功能執行成功",
  };
  break;
```

## 📈 效能優化

### 1. 記憶體管理

- 定期清理對話歷史
- 使用弱引用管理大型物件
- 實作記憶體監控

### 2. 回應時間優化

- 並行處理工具呼叫
- 快取常用資料
- 非同步檔案操作

### 3. 錯誤恢復

- 自動重試機制
- 狀態回滾功能
- 錯誤日誌記錄

## 🚀 擴展功能

### 1. 新增工具函數

```javascript
// 新增庫存檢查工具
const inventoryTool = {
  type: "function",
  function: {
    name: "check_inventory",
    description: "檢查商品庫存",
    parameters: {
      type: "object",
      properties: {
        item: { type: "string", description: "商品名稱" },
      },
      required: ["item"],
    },
  },
};
```

### 2. 整合外部 API

```javascript
// 整合支付閘道
case "process_payment":
  const paymentParams = func.arguments;
  const paymentResult = await processPaymentWithGateway(
    currentOrder,
    paymentParams.paymentMethod,
    paymentParams.amount
  );
  break;
```

### 3. 多語言支援

```javascript
// 支援多語言工具呼叫
const languageTools = {
  "zh-TW": tools,
  "en-US": englishTools,
  "ja-JP": japaneseTools,
};
```

## 🔍 除錯與監控

### 1. 除錯工具

```javascript
// 詳細的除錯日誌
console.log("🔍 調試 - 訂單參數:", orderParams);
console.log("🔍 調試 - 工具呼叫:", JSON.stringify(toolCalls, null, 2));
console.log("🔍 調試 - 處理結果:", result);
```

### 2. 狀態監控

```javascript
// 監控系統狀態
const systemStatus = {
  currentOrder: currentOrder ? "active" : "none",
  currentPayment: currentPaymentRecord ? "active" : "none",
  toolCallsCount: toolCalls.length,
  lastUpdate: new Date().toISOString(),
};
```

### 3. 效能監控

```javascript
// 監控回應時間
const startTime = Date.now();
const result = await handleToolCalls(toolCalls);
const endTime = Date.now();
console.log(`⏱️ 工具處理時間: ${endTime - startTime}ms`);
```

## 🎯 最佳實踐

### 1. 工具設計原則

- 單一職責原則
- 明確的參數定義
- 完整的錯誤處理
- 清晰的回傳格式

### 2. 狀態管理

- 集中化狀態管理
- 狀態一致性檢查
- 狀態回滾機制
- 狀態持久化

### 3. 錯誤處理

- 分層錯誤處理
- 使用者友善的錯誤訊息
- 錯誤恢復機制
- 錯誤日誌記錄

## 🚀 未來發展

### 短期目標

1. 添加更多工具函數
2. 改善錯誤處理機制
3. 添加效能監控
4. 支援批量操作

### 長期目標

1. 微服務架構
2. 雲端部署
3. 機器學習整合
4. 多平台支援
