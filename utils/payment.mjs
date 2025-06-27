import { appendFileSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// 取得當前檔案的目錄路徑
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 支付相關常數
export const PAYMENT_METHODS = {
  LINE_PAY: "Line Pay",
  CASH: "現金",
  CREDIT_CARD: "信用卡",
  JKO_PAY: "街口支付",
};

export const PAYMENT_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
};

/**
 * 驗證支付方式
 * @param {string} paymentMethod - 支付方式
 * @returns {boolean} 是否為有效的支付方式
 */
export function isValidPaymentMethod(paymentMethod) {
  return Object.values(PAYMENT_METHODS).includes(paymentMethod);
}

/**
 * 計算訂單總金額
 * @param {Object} order - 訂單資訊
 * @param {Object} menuData - 菜單資料
 * @returns {number} 訂單總金額
 */
export function calculateOrderTotal(order, menuData) {
  const categories = [
    "tea",
    "milk_tea",
    "tea_latte",
    "fresh_juice",
    "season_special",
  ];

  // 找到品項的價格
  let itemPrice = 0;
  for (const category of categories) {
    const item = menuData.menu[category].find(
      (drink) => drink.name_zh === order.item
    );
    if (item) {
      itemPrice = item.prices[order.size];
      break;
    }
  }

  // 計算總金額（數量 × 單價）
  return itemPrice * order.quantity;
}

/**
 * 處理支付
 * @param {Object} order - 訂單資訊
 * @param {string} paymentMethod - 支付方式
 * @param {number} amount - 支付金額
 * @returns {Object} 支付結果
 */
export function payment(order, paymentMethod, amount) {
  // 驗證支付方式
  if (!isValidPaymentMethod(paymentMethod)) {
    throw new Error(`無效的支付方式：${paymentMethod}`);
  }

  // 驗證金額
  if (amount <= 0) {
    throw new Error(`無效的支付金額：${amount}`);
  }

  // 建立支付記錄
  const paymentRecord = {
    orderId: order.timestamp, // 使用時間戳作為訂單ID
    timestamp: new Date().toISOString(),
    paymentMethod,
    amount,
    status: PAYMENT_STATUS.COMPLETED,
    orderDetails: order,
  };

  try {
    // 讀取現有支付記錄
    let payments = [];
    const paymentsFilePath = join(__dirname, "..", "data", "payments.json");
    try {
      const paymentsData = readFileSync(paymentsFilePath, "utf8");
      payments = JSON.parse(paymentsData);
    } catch (err) {
      // 如果檔案不存在或格式錯誤，使用空陣列
      payments = [];
    }

    // 確保 payments 是陣列
    if (!Array.isArray(payments)) {
      payments = [];
    }

    // 添加新支付記錄
    payments.push(paymentRecord);

    // 寫入檔案
    writeFileSync(paymentsFilePath, JSON.stringify(payments, null, 2), "utf8");

    return {
      success: true,
      paymentRecord,
      message: `支付成功！使用 ${paymentMethod} 支付 ${amount} 元`,
    };
  } catch (error) {
    throw new Error(`支付處理失敗：${error.message}`);
  }
}

/**
 * 格式化支付資訊顯示
 * @param {Object} paymentRecord - 支付記錄
 * @returns {string} 格式化後的支付資訊
 */
export function formatPaymentDisplay(paymentRecord) {
  const lines = [
    "💳 支付資訊",
    `  訂單編號：${paymentRecord.orderId}`,
    `  支付方式：${paymentRecord.paymentMethod}`,
    `  支付金額：${paymentRecord.amount} 元`,
    `  支付狀態：${
      paymentRecord.status === PAYMENT_STATUS.COMPLETED ? "✅ 成功" : "❌ 失敗"
    }`,
    `  支付時間：${new Date(paymentRecord.timestamp).toLocaleString()}`,
    "",
  ];
  return lines.join("\n");
}
