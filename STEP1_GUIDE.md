# Step1: 基礎點餐系統技術文檔

## 📋 概述

Step1 是一個基於 AI 對話的基礎點餐系統，使用自然語言處理技術來解析顧客的點餐需求，並透過手動流程完成訂單處理。

## 🏗️ 系統架構

```
Step1 系統架構
├── 使用者輸入層
│   └── 自然語言點餐指令
├── AI 處理層
│   ├── Ollama gemma3 模型
│   ├── 對話歷史管理
│   └── JSON 格式回應解析
├── 業務邏輯層
│   ├── 訂單驗證
│   ├── 支付處理
│   └── 製作轉單
└── 資料持久層
    ├── orders.json
    ├── payments.json
    └── production.json
```

## 🔧 核心組件

### 1. AI 對話處理

#### 系統提示詞設計

```javascript
// contant.mjs
export const SYSTEM_DESCRIPTION = {
  role: "system",
  content:
    "你是個飲料點餐AI助理。你的任務是:\n" +
    "- 必須使用繁體中文回答\n" +
    "- 根據提供的菜單資料跟客人介紹餐點\n" +
    "- 當客人點餐時，必須確認以下資訊是否完整：\n" +
    "  1. 品類（必須是菜單上的品項）\n" +
    "  2. 飲料大小（必須是：M、L）\n" +
    "  3. 數量（正整數）\n" +
    "  4. 冰塊（必須是：溫熱飲、去冰、微冰、少冰、正常冰）\n" +
    "  5. 甜度（必須是：無糖、微糖、半糖、少糖、全糖）\n" +
    "- 當資訊不完整時，必須以 JSON 格式回傳並詢問缺失的資訊\n" +
    "- 當所有資訊完整時，必須以 JSON 格式回傳訂單資訊\n",
};
```

#### 對話歷史管理

```javascript
// 初始化對話歷史
let messages = [
  {
    role: "system",
    content: `${SYSTEM_DESCRIPTION.content}\n\n菜單資料：${JSON.stringify(
      menuData
    )}`,
  },
];

// 添加使用者訊息
messages.push({ role: "user", content: input });

// 獲取 AI 回應
const response = await ollama.chat({
  model: "gemma3",
  messages: messages,
});

// 添加 AI 回應到歷史
messages.push(response.message);
```

### 2. 訂單解析與驗證

#### JSON 回應解析

```javascript
// utils/order.mjs
export function parseOrderResponse(content) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const orderData = JSON.parse(jsonMatch[0]);
    if (!orderData.order) return null;

    return orderData;
  } catch (error) {
    return null;
  }
}
```

#### 訂單驗證邏輯

```javascript
function validateOrder({ item, size, quantity, ice, sugar, addOn }) {
  // 檢查品項是否存在於菜單中
  const isValidItem =
    menuData.menu.tea.some((drink) => drink.name_zh === item) ||
    menuData.menu.milk_tea.some((drink) => drink.name_zh === item) ||
    menuData.menu.tea_latte.some((drink) => drink.name_zh === item) ||
    menuData.menu.fresh_juice.some((drink) => drink.name_zh === item) ||
    menuData.menu.season_special.some((drink) => drink.name_zh === item);

  if (!isValidItem) {
    return { isValid: false, message: `無效的品項：${item}` };
  }

  // 檢查飲料大小
  if (!ORDER_CONSTANTS.SIZES.includes(size)) {
    return { isValid: false, message: `無效的飲料大小：${size}` };
  }

  // 檢查數量
  if (Number(quantity) <= 0) {
    return { isValid: false, message: `無效的數量：${quantity}` };
  }

  // 檢查冰塊選擇
  if (!ORDER_CONSTANTS.ICE_LEVELS.includes(ice)) {
    return { isValid: false, message: `無效的冰塊選擇：${ice}` };
  }

  // 檢查甜度選擇
  if (!ORDER_CONSTANTS.SUGAR_LEVELS.includes(sugar)) {
    return { isValid: false, message: `無效的甜度選擇：${sugar}` };
  }

  return { isValid: true };
}
```

### 3. 支付流程處理

#### 手動支付選擇

```javascript
async function handlePayment(order) {
  try {
    // 計算訂單總金額
    const totalAmount = calculateOrderTotal(order, menuData);
    console.log(`\n💰 訂單總金額：${totalAmount} 元`);

    // 顯示可用的支付方式
    console.log("\n💳 請選擇支付方式：");
    Object.values(PAYMENT_METHODS).forEach((method, index) => {
      console.log(`  ${index + 1}. ${method}`);
    });

    // 詢問支付方式
    const paymentChoice = await new Promise((resolve) => {
      rl.question("\n請輸入支付方式編號 (1-4)：", resolve);
    });

    const paymentMethods = Object.values(PAYMENT_METHODS);
    const selectedMethod = paymentMethods[parseInt(paymentChoice) - 1];

    if (!selectedMethod) {
      throw new Error("無效的支付方式選擇");
    }

    // 處理支付
    const paymentResult = payment(order, selectedMethod, totalAmount);
    console.log(formatPaymentDisplay(paymentResult.paymentRecord));

    return paymentResult.paymentRecord;
  } catch (error) {
    console.error("❌ 支付處理失敗：", error.message);
    throw error;
  }
}
```

### 4. 製作部門轉單

#### 自動轉單處理

```javascript
async function handleProductionTransfer(order, paymentRecord) {
  try {
    // 轉單給製作部門
    const productionResult = transferToProduction(order, paymentRecord);
    console.log(formatProductionOrderDisplay(productionResult.productionOrder));

    return productionResult.productionOrder;
  } catch (error) {
    console.error("❌ 轉單失敗：", error.message);
    throw error;
  }
}
```

## 🔄 工作流程

### 1. 點餐流程

```
使用者輸入 → AI 解析 → 訂單驗證 → 資訊確認 → 訂單建立
```

### 2. 支付流程

```
訂單確認 → 金額計算 → 支付方式選擇 → 支付處理 → 支付記錄
```

### 3. 製作流程

```
支付完成 → 製作轉單 → 製作訂單建立 → 流程完成
```

## 📊 資料結構

### 訂單資料結構

```javascript
const order = {
  timestamp: new Date().toISOString(),
  item: "多多綠",
  size: "L",
  quantity: 1,
  ice: "微冰",
  sugar: "微糖",
  addOn: null,
  status: "complete",
};
```

### 支付資料結構

```javascript
const paymentRecord = {
  orderId: order.timestamp,
  timestamp: new Date().toISOString(),
  paymentMethod: "Line Pay",
  amount: 60,
  status: "completed",
  orderDetails: order,
};
```

### 製作訂單資料結構

```javascript
const productionOrder = {
  orderId: order.timestamp,
  timestamp: new Date().toISOString(),
  status: "pending",
  priority: "normal",
  orderDetails: {
    item: order.item,
    size: order.size,
    quantity: order.quantity,
    ice: order.ice,
    sugar: order.sugar,
    addOn: order.addOn,
  },
  paymentInfo: {
    method: paymentRecord.paymentMethod,
    amount: paymentRecord.amount,
    status: paymentRecord.status,
  },
  estimatedTime: 3,
  notes: "微冰微糖",
};
```

## 🛠️ 錯誤處理

### 1. 訂單驗證錯誤

```javascript
if (!validationResult.isValid) {
  throw new Error(validationResult.message);
}
```

### 2. 支付處理錯誤

```javascript
if (!selectedMethod) {
  throw new Error("無效的支付方式選擇");
}
```

### 3. 檔案操作錯誤

```javascript
try {
  const ordersData = readFileSync(ordersFilePath, "utf8");
  orders = JSON.parse(ordersData);
} catch (err) {
  // 如果檔案不存在或格式錯誤，使用空陣列
  orders = [];
}
```

## 🎯 優點與限制

### 優點

- ✅ 簡單易懂的架構
- ✅ 自然的對話體驗
- ✅ 完整的訂單驗證
- ✅ 手動控制支付流程
- ✅ 清晰的錯誤訊息

### 限制

- ❌ 需要手動選擇支付方式
- ❌ 流程較為繁瑣
- ❌ 缺乏自動化
- ❌ 擴展性有限
- ❌ 錯誤處理較為基礎

## 🔧 自定義配置

### 修改 AI 模型

```javascript
// step1.mjs
const response = await ollama.chat({
  model: "gemma3", // 可改為其他模型
  messages: messages,
});
```

### 修改系統提示詞

```javascript
// contant.mjs
export const SYSTEM_DESCRIPTION = {
  role: "system",
  content: "自定義的系統提示詞...",
};
```

### 新增驗證規則

```javascript
// utils/order.mjs
function validateOrder({ item, size, quantity, ice, sugar, addOn }) {
  // 新增自定義驗證邏輯
  if (quantity > 10) {
    return { isValid: false, message: "單次訂單最多 10 杯" };
  }
  // ... 其他驗證
}
```

## 📈 效能考量

### 記憶體使用

- 對話歷史會持續累積，建議定期清理
- 大型菜單資料會載入到記憶體中

### 回應時間

- AI 模型回應時間取決於 Ollama 設定
- 檔案 I/O 操作可能影響效能

### 擴展性

- 單一執行緒處理
- 不支援並發處理
- 檔案鎖定可能影響多使用者場景

## 🚀 未來改進

### 短期改進

1. 添加對話歷史清理機制
2. 改善錯誤處理和重試機制
3. 添加訂單取消功能
4. 支援批量點餐

### 長期改進

1. 升級到 Step2 的 Function Calling 架構
2. 添加資料庫支援
3. 實現 Web 介面
4. 添加會員系統
