import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// 取得當前檔案的目錄路徑
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 製作狀態常數
export const PRODUCTION_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

/**
 * 將訂單轉給製作部門
 * @param {Object} order - 訂單資訊
 * @param {Object} paymentRecord - 支付記錄
 * @returns {Object} 製作訂單資訊
 */
export function transferToProduction(order, paymentRecord) {
  // 建立製作訂單
  const productionOrder = {
    orderId: order.timestamp,
    timestamp: new Date().toISOString(),
    status: PRODUCTION_STATUS.PENDING,
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
    estimatedTime: calculateEstimatedTime(order),
    notes: generateProductionNotes(order),
  };

  try {
    // 讀取現有製作訂單
    let productionOrders = [];
    const productionFilePath = join(__dirname, "..", "data", "production.json");
    try {
      const productionData = readFileSync(productionFilePath, "utf8");
      productionOrders = JSON.parse(productionData);
    } catch (err) {
      // 如果檔案不存在或格式錯誤，使用空陣列
      productionOrders = [];
    }

    // 確保 productionOrders 是陣列
    if (!Array.isArray(productionOrders)) {
      productionOrders = [];
    }

    // 添加新製作訂單
    productionOrders.push(productionOrder);

    // 寫入檔案
    writeFileSync(
      productionFilePath,
      JSON.stringify(productionOrders, null, 2),
      "utf8"
    );

    return {
      success: true,
      productionOrder,
      message: "訂單已成功轉給製作部門！",
    };
  } catch (error) {
    throw new Error(`轉單失敗：${error.message}`);
  }
}

/**
 * 計算預估製作時間（分鐘）
 * @param {Object} order - 訂單資訊
 * @returns {number} 預估製作時間
 */
function calculateEstimatedTime(order) {
  let baseTime = 3; // 基礎製作時間 3 分鐘

  // 根據數量調整時間
  if (order.quantity > 1) {
    baseTime += (order.quantity - 1) * 1.5; // 每多一杯增加 1.5 分鐘
  }

  // 根據添加品調整時間
  if (order.addOn) {
    baseTime += 0.5; // 添加品需要額外 0.5 分鐘
  }

  // 根據冰塊選擇調整時間
  if (order.ice === "溫熱飲") {
    baseTime += 1; // 溫熱飲需要額外 1 分鐘
  }

  return Math.ceil(baseTime);
}

/**
 * 生成製作備註
 * @param {Object} order - 訂單資訊
 * @returns {string} 製作備註
 */
function generateProductionNotes(order) {
  const notes = [];

  // 特殊要求備註
  if (order.ice === "溫熱飲") {
    notes.push("⚠️ 溫熱飲，請注意溫度");
  }

  if (order.sugar === "無糖") {
    notes.push("🍃 無糖飲品");
  }

  if (order.addOn) {
    notes.push(`➕ 添加：${order.addOn}`);
  }

  // 數量備註
  if (order.quantity > 3) {
    notes.push(`📦 大量訂單：${order.quantity} 杯`);
  }

  return notes.join(" | ");
}

/**
 * 格式化製作訂單顯示
 * @param {Object} productionOrder - 製作訂單
 * @returns {string} 格式化後的製作訂單資訊
 */
export function formatProductionOrderDisplay(productionOrder) {
  const statusEmoji = {
    [PRODUCTION_STATUS.PENDING]: "⏳",
    [PRODUCTION_STATUS.IN_PROGRESS]: "🔥",
    [PRODUCTION_STATUS.COMPLETED]: "✅",
    [PRODUCTION_STATUS.CANCELLED]: "❌",
  };

  const lines = [
    "🏭 製作訂單",
    `  訂單編號：${productionOrder.orderId}`,
    `  製作狀態：${statusEmoji[productionOrder.status]} ${
      productionOrder.status
    }`,
    `  預估時間：${productionOrder.estimatedTime} 分鐘`,
    `  品項：${productionOrder.orderDetails.item}`,
    `  規格：${productionOrder.orderDetails.size} | ${productionOrder.orderDetails.quantity} 杯`,
    `  調整：${productionOrder.orderDetails.ice} | ${productionOrder.orderDetails.sugar}`,
    `  添加：${productionOrder.orderDetails.addOn || "無"}`,
    `  支付：${productionOrder.paymentInfo.method} | ${productionOrder.paymentInfo.amount} 元`,
    `  備註：${productionOrder.notes || "無"}`,
    `  建立時間：${new Date(productionOrder.timestamp).toLocaleString()}`,
    "",
  ];
  return lines.join("\n");
}

/**
 * 更新製作訂單狀態
 * @param {string} orderId - 訂單ID
 * @param {string} newStatus - 新狀態
 * @returns {Object} 更新結果
 */
export function updateProductionStatus(orderId, newStatus) {
  if (!Object.values(PRODUCTION_STATUS).includes(newStatus)) {
    throw new Error(`無效的製作狀態：${newStatus}`);
  }

  try {
    // 讀取製作訂單
    const productionFilePath = join(__dirname, "..", "data", "production.json");
    const productionData = readFileSync(productionFilePath, "utf8");
    let productionOrders = JSON.parse(productionData);

    // 找到對應的訂單
    const orderIndex = productionOrders.findIndex(
      (order) => order.orderId === orderId
    );

    if (orderIndex === -1) {
      throw new Error(`找不到訂單：${orderId}`);
    }

    // 更新狀態
    productionOrders[orderIndex].status = newStatus;
    productionOrders[orderIndex].lastUpdated = new Date().toISOString();

    // 寫回檔案
    writeFileSync(
      productionFilePath,
      JSON.stringify(productionOrders, null, 2),
      "utf8"
    );

    return {
      success: true,
      message: `訂單 ${orderId} 狀態已更新為 ${newStatus}`,
    };
  } catch (error) {
    throw new Error(`更新製作狀態失敗：${error.message}`);
  }
}
