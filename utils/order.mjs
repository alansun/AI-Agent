import { appendFileSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { menuData } from "./menu.mjs";

// 取得當前檔案的目錄路徑
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 訂單相關常數
export const ORDER_CONSTANTS = {
  SIZES: ["M", "L"],
  ICE_LEVELS: ["溫熱飲", "去冰", "微冰", "少冰", "正常冰"],
  SUGAR_LEVELS: ["無糖", "微糖", "半糖", "少糖", "全糖"],
  ADD_ONS: ["波霸", "珍珠", "燕麥", "椰果", null],
};

/**
 * 驗證訂單資訊
 * @param {Object} order - 訂單資訊
 * @param {string} order.item - 品項名稱
 * @param {string} order.size - 飲料大小
 * @param {number} order.quantity - 數量
 * @param {string} order.ice - 冰塊選擇
 * @param {string} order.sugar - 甜度選擇
 * @param {string|null} order.addOn - 添加品
 * @returns {Object} 驗證結果 { isValid: boolean, message?: string }
 */
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

/**
 * 處理訂單並寫入檔案
 * @param {string} item - 飲料品項
 * @param {string} size - 飲料大小
 * @param {number} quantity - 數量
 * @param {string} ice - 冰塊量
 * @param {string} sugar - 甜度
 * @param {string|null} addOn - 添加品
 * @returns {Object} 訂單物件
 */
export function purchase(item, size, quantity, ice, sugar, addOn) {
  // 驗證訂單資訊
  const validationResult = validateOrder({
    item,
    size,
    quantity,
    ice,
    sugar,
    addOn,
  });
  console.log("🔍 調試 - 驗證結果:", validationResult);
  if (!validationResult.isValid) {
    throw new Error(validationResult.message);
  }

  // 建立訂單物件
  const order = {
    timestamp: new Date().toISOString(),
    item,
    size,
    quantity,
    ice,
    sugar,
    addOn,
    status: "complete",
  };

  try {
    // 讀取現有訂單
    let orders = [];
    const ordersFilePath = join(__dirname, "..", "data", "orders.json");
    try {
      const ordersData = readFileSync(ordersFilePath, "utf8");
      orders = JSON.parse(ordersData);
    } catch (err) {
      // 如果檔案不存在或格式錯誤，使用空陣列
      orders = [];
    }

    // 確保 orders 是陣列
    if (!Array.isArray(orders)) {
      orders = [];
    }

    // 添加新訂單
    orders.push(order);

    // 寫入檔案
    writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2), "utf8");

    return order;
  } catch (error) {
    throw new Error(`寫入訂單失敗：${error.message}`);
  }
}

/**
 * 解析 AI 回應中的訂單資訊
 * @param {string} content - AI 回應內容
 * @returns {Object|null} 解析後的訂單資訊，如果沒有訂單資訊則返回 null
 */
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

/**
 * 格式化訂單資訊顯示
 * @param {Object} order - 訂單資訊
 * @returns {string} 格式化後的訂單資訊
 */
export function formatOrderDisplay(order) {
  const lines = [
    "📝 訂單已記錄！",
    `  品項：${order.item}`,
    `  大小：${order.size}`,
    `  數量：${order.quantity}`,
    `  冰塊：${order.ice}`,
    `  甜度：${order.sugar}`,
    `  添加：${order.addOn || "無"}`,
    `  時間：${new Date(order.timestamp).toLocaleString()}`,
    "",
  ];
  return lines.join("\n");
}

/**
 * 格式化不完整訂單的詢問訊息
 * @param {Object} orderData - 不完整訂單資訊
 * @returns {string} 格式化後的詢問訊息
 */
export function formatIncompleteOrderMessage(orderData) {
  if (orderData.message) {
    return `❓ ${orderData.message}\n`;
  }

  const lines = ["❓ 訂單資訊不完整，請提供以下資訊："];
  orderData.missing.forEach((info) => lines.push(`  - ${info}`));
  lines.push("");
  return lines.join("\n");
}
