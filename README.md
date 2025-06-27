# 飲料點餐 AI 助理

一個基於 Ollama 的智慧飲料點餐系統，支援完整的點餐、結帳和製作流程。

## 📋 專案概述

這個專案實現了一個完整的飲料店點餐系統，包含兩個主要版本：

- **Step1**: 基礎點餐系統 - 使用 AI 對話解析訂單
- **Step2**: 完整結帳系統 - 整合 Function Calling 的智慧點餐流程

## 🏗️ 系統架構

```
AI-Agent/
├── step1.mjs              # 基礎點餐系統（AI 對話解析）
├── step2.mjs              # 完整結帳系統（Function Calling）
├── production-manager.mjs  # 製作部門管理工具
├── contant.mjs            # Step1 系統設定
├── contant_step2.mjs      # Step2 系統設定
├── data/
│   ├── menu.json          # 菜單資料庫
│   ├── orders.json        # 訂單記錄
│   ├── payments.json      # 支付記錄
│   └── production.json    # 製作訂單
└── utils/
    ├── menu.mjs           # 菜單處理模組
    ├── order.mjs          # 訂單處理模組
    ├── payment.mjs        # 支付處理模組
    └── production.mjs     # 製作部門模組
```

## 🚀 Step1: 基礎點餐系統

### 功能特色

- **AI 對話解析**: 使用自然語言處理解析顧客點餐需求
- **訂單驗證**: 自動檢查訂單資訊完整性
- **互動式點餐**: 引導顧客完成訂單資訊
- **支付流程**: 手動選擇支付方式
- **製作轉單**: 自動轉給製作部門

### 技術實現

#### 1. AI 對話處理

```javascript
// 使用 Ollama gemma3 模型進行自然語言處理
const response = await ollama.chat({
  model: "gemma3",
  messages: messages,
});
```

#### 2. 訂單解析

```javascript
// 解析 AI 回應中的 JSON 格式訂單資訊
const orderData = parseOrderResponse(response.message.content);
```

#### 3. 訂單驗證

- 檢查品項是否在菜單中
- 驗證飲料大小（M/L）
- 確認數量為正整數
- 驗證冰塊和甜度選項
- 檢查添加品選項

#### 4. 支付流程

```javascript
// 手動選擇支付方式
const paymentMethods = Object.values(PAYMENT_METHODS);
const selectedMethod = paymentMethods[parseInt(paymentChoice) - 1];
```

### 使用流程

1. **啟動系統**

   ```bash
   node step1.mjs
   ```

2. **點餐對話**

   ```
   👤 您：我要一杯珍珠奶茶
   🤖 AI：請問您要選擇什麼大小的飲料？要幾杯？冰塊和甜度要如何調整？
   👤 您：大杯，微冰微糖，加珍珠
   ```

3. **訂單確認**

   ```
   📝 訂單已記錄！
     品項：珍珠奶茶
     大小：L
     數量：1
     冰塊：微冰
     甜度：微糖
     添加：珍珠
   ```

4. **支付處理**

   ```
   💰 訂單總金額：65 元
   💳 請選擇支付方式：
     1. Line Pay
     2. 現金
     3. 信用卡
     4. 街口支付
   ```

5. **製作轉單**
   ```
   🏭 製作訂單
     訂單編號：2024-01-01T12:00:00.000Z
     製作狀態：⏳ pending
     預估時間：4 分鐘
   ```

## 🔧 Step2: 完整結帳系統

### 功能特色

- **Function Calling**: 使用 Ollama 的 Function Calling 功能
- **自動化流程**: 完全自動化的點餐到結帳流程
- **智慧工具呼叫**: AI 自動呼叫相應的工具函數
- **即時計算**: 自動計算訂單金額
- **無縫整合**: 訂單、支付、製作一體化

### 技術實現

#### 1. Function Calling 工具定義

```javascript
const tools = [
  {
    type: "function",
    function: {
      name: "calculate_total",
      description: "計算訂單總金額",
      parameters: {
        type: "object",
        properties: {
          item: { type: "string", description: "飲料品項名稱" },
          size: { type: "string", enum: ["M", "L"], description: "飲料大小" },
          quantity: { type: "integer", minimum: 1, description: "數量" },
        },
        required: ["item", "size", "quantity"],
      },
    },
  },
  // ... 其他工具
];
```

#### 2. 工具呼叫處理

```javascript
async function handleToolCalls(toolCalls) {
  for (const toolCall of toolCalls) {
    const { id, function: func } = toolCall;

    switch (func.name) {
      case "process_order":
        const order = purchase(orderParams.item, orderParams.size, ...);
        break;
      case "process_payment":
        const paymentResult = payment(currentOrder, paymentParams.paymentMethod, paymentParams.amount);
        break;
      // ... 其他工具處理
    }
  }
}
```

#### 3. 自動化流程

1. **計算總金額**: `calculate_total` 工具
2. **建立訂單**: `process_order` 工具
3. **處理支付**: `process_payment` 工具
4. **轉給製作**: `transfer_to_production` 工具

### 使用流程

1. **啟動系統**

   ```bash
   node step2.mjs
   ```

2. **智慧點餐**

   ```
   👤 您：我要一杯多多綠，大杯，微糖微冰
   🤖 AI：好的！我來為您處理訂單。

   🔧 正在處理工具呼叫...
   💰 訂單總金額：60 元

   請選擇支付方式：
   1. Line Pay
   2. 現金
   3. 信用卡
   4. 街口支付
   ```

3. **自動處理**
   ```
   📝 訂單已記錄！
   💳 支付資訊
   🏭 製作訂單
   🎉 訂單處理完成！感謝您的購買！
   ```

## 📊 資料管理

### 檔案結構

#### `data/menu.json`

```json
{
  "menu": {
    "tea": [
      {
        "name_zh": "多多綠",
        "prices": { "M": 50, "L": 60 },
        "recommended": true
      }
    ]
  }
}
```

#### `data/orders.json`

```json
[
  {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "item": "多多綠",
    "size": "L",
    "quantity": 1,
    "ice": "微冰",
    "sugar": "微糖",
    "addOn": null,
    "status": "complete"
  }
]
```

#### `data/payments.json`

```json
[
  {
    "orderId": "2024-01-01T12:00:00.000Z",
    "timestamp": "2024-01-01T12:01:00.000Z",
    "paymentMethod": "Line Pay",
    "amount": 60,
    "status": "completed"
  }
]
```

#### `data/production.json`

```json
[
  {
    "orderId": "2024-01-01T12:00:00.000Z",
    "status": "pending",
    "estimatedTime": 3,
    "orderDetails": {
      "item": "多多綠",
      "size": "L",
      "quantity": 1
    }
  }
]
```

## 🛠️ 安裝與設定

### 前置需求

- Node.js 18+
- Ollama (已安裝 llama3.2 模型)

### 安裝步驟

1. **安裝依賴**

   ```bash
   npm install
   ```

2. **確認 Ollama 模型**

   ```bash
   ollama list
   # 確保有 llama3.2 模型
   ```

3. **初始化資料檔案**
   ```bash
   # 資料檔案已預設為空陣列 []
   ```

## 🎯 功能比較

| 功能             | Step1       | Step2       |
| ---------------- | ----------- | ----------- |
| AI 對話          | ✅ 基礎對話 | ✅ 智慧對話 |
| 訂單解析         | ✅ 手動解析 | ✅ 自動解析 |
| Function Calling | ❌          | ✅          |
| 自動化流程       | ❌          | ✅          |
| 支付方式         | 手動選擇    | 自動處理    |
| 製作轉單         | 手動觸發    | 自動觸發    |
| 錯誤處理         | 基礎        | 完整        |
| 擴展性           | 中等        | 高          |

## 🔧 開發指南

### 新增飲料品項

在 `data/menu.json` 中新增：

```json
{
  "name_zh": "新飲料",
  "prices": { "M": 55, "L": 65 },
  "recommended": false,
  "special": false
}
```

### 新增支付方式

在 `utils/payment.mjs` 中修改：

```javascript
export const PAYMENT_METHODS = {
  LINE_PAY: "Line Pay",
  CASH: "現金",
  CREDIT_CARD: "信用卡",
  JKO_PAY: "街口支付",
  NEW_PAYMENT: "新支付方式", // 新增
};
```

### 修改製作時間計算

在 `utils/production.mjs` 中調整：

```javascript
function calculateEstimatedTime(order) {
  let baseTime = 3; // 基礎時間
  // 自定義計算邏輯
  return Math.ceil(baseTime);
}
```

## 🚀 未來擴展

### 計劃功能

1. **會員系統**: 積分、優惠券管理
2. **庫存管理**: 即時庫存追蹤
3. **報表系統**: 銷售統計、熱門商品
4. **行動應用**: React Native 手機 App
5. **多語言支援**: 英文、日文介面
6. **語音辨識**: 語音點餐功能

### 技術升級

1. **資料庫**: 從 JSON 升級到 PostgreSQL
2. **API 服務**: 建立 RESTful API
3. **即時通訊**: WebSocket 即時更新
4. **雲端部署**: Docker + Kubernetes
5. **監控系統**: 效能監控、錯誤追蹤

## 📚 詳細文檔

### 技術文檔

- **[Step1 技術文檔](STEP1_GUIDE.md)** - 基礎點餐系統詳細技術說明
- **[Step2 技術文檔](STEP2_GUIDE.md)** - 完整結帳系統詳細技術說明
- **[系統比較文檔](COMPARISON.md)** - Step1 與 Step2 詳細比較分析

### 快速開始

1. 閱讀 **[系統比較文檔](COMPARISON.md)** 選擇適合的版本
2. 查看對應的技術文檔了解實作細節
3. 按照安裝步驟設定環境
4. 開始使用系統

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

### 貢獻指南

1. Fork 本專案
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📄 授權

MIT License

---

**開發者**: AI Assistant  
**版本**: 2.0.0  
**更新日期**: 2025 年 6 月
