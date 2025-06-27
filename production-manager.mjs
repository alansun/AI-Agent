import readline from "readline";
import { readFileSync, writeFileSync } from "fs";
import {
  PRODUCTION_STATUS,
  updateProductionStatus,
  formatProductionOrderDisplay,
} from "./utils/production.mjs";

// 建立互動式介面
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * 顯示所有製作訂單
 */
function displayAllOrders() {
  try {
    const productionData = readFileSync("./data/production.json", "utf8");
    const productionOrders = JSON.parse(productionData);

    if (productionOrders.length === 0) {
      console.log("📭 目前沒有製作訂單");
      return;
    }

    console.log(`\n🏭 製作訂單總覽 (共 ${productionOrders.length} 筆)`);
    console.log("=".repeat(50));

    productionOrders.forEach((order, index) => {
      console.log(`\n${index + 1}. 訂單編號：${order.orderId}`);
      console.log(`   狀態：${order.status}`);
      console.log(
        `   品項：${order.orderDetails.item} x${order.orderDetails.quantity}`
      );
      console.log(`   預估時間：${order.estimatedTime} 分鐘`);
      console.log(`   建立時間：${new Date(order.timestamp).toLocaleString()}`);
    });
  } catch (error) {
    console.log("📭 目前沒有製作訂單");
  }
}

/**
 * 顯示特定訂單詳細資訊
 */
function displayOrderDetails(orderId) {
  try {
    const productionData = readFileSync("./data/production.json", "utf8");
    const productionOrders = JSON.parse(productionData);

    const order = productionOrders.find((o) => o.orderId === orderId);
    if (!order) {
      console.log("❌ 找不到指定的訂單");
      return;
    }

    console.log(formatProductionOrderDisplay(order));
  } catch (error) {
    console.log("❌ 讀取訂單失敗");
  }
}

/**
 * 更新訂單狀態
 */
async function updateOrderStatus() {
  try {
    const productionData = readFileSync("./data/production.json", "utf8");
    const productionOrders = JSON.parse(productionData);

    if (productionOrders.length === 0) {
      console.log("📭 目前沒有製作訂單");
      return;
    }

    // 顯示待處理的訂單
    const pendingOrders = productionOrders.filter(
      (order) => order.status === PRODUCTION_STATUS.PENDING
    );

    if (pendingOrders.length === 0) {
      console.log("✅ 所有訂單都已處理完成");
      return;
    }

    console.log("\n⏳ 待處理訂單：");
    pendingOrders.forEach((order, index) => {
      console.log(
        `${index + 1}. ${order.orderDetails.item} x${
          order.orderDetails.quantity
        } (${order.orderId})`
      );
    });

    // 選擇要更新的訂單
    const orderChoice = await new Promise((resolve) => {
      rl.question("\n請選擇要更新的訂單編號：", resolve);
    });

    const selectedOrder = pendingOrders[parseInt(orderChoice) - 1];
    if (!selectedOrder) {
      console.log("❌ 無效的選擇");
      return;
    }

    // 選擇新狀態
    console.log("\n🔄 請選擇新狀態：");
    console.log("1. 製作中 (in_progress)");
    console.log("2. 已完成 (completed)");
    console.log("3. 已取消 (cancelled)");

    const statusChoice = await new Promise((resolve) => {
      rl.question("請輸入狀態編號 (1-3)：", resolve);
    });

    const statusMap = {
      1: PRODUCTION_STATUS.IN_PROGRESS,
      2: PRODUCTION_STATUS.COMPLETED,
      3: PRODUCTION_STATUS.CANCELLED,
    };

    const newStatus = statusMap[statusChoice];
    if (!newStatus) {
      console.log("❌ 無效的狀態選擇");
      return;
    }

    // 更新狀態
    const result = updateProductionStatus(selectedOrder.orderId, newStatus);
    console.log(`✅ ${result.message}`);
  } catch (error) {
    console.log("❌ 更新狀態失敗：", error.message);
  }
}

/**
 * 顯示統計資訊
 */
function showStatistics() {
  try {
    const productionData = readFileSync("./data/production.json", "utf8");
    const productionOrders = JSON.parse(productionData);

    if (productionOrders.length === 0) {
      console.log("📊 目前沒有製作訂單");
      return;
    }

    const stats = {
      total: productionOrders.length,
      pending: productionOrders.filter(
        (o) => o.status === PRODUCTION_STATUS.PENDING
      ).length,
      inProgress: productionOrders.filter(
        (o) => o.status === PRODUCTION_STATUS.IN_PROGRESS
      ).length,
      completed: productionOrders.filter(
        (o) => o.status === PRODUCTION_STATUS.COMPLETED
      ).length,
      cancelled: productionOrders.filter(
        (o) => o.status === PRODUCTION_STATUS.CANCELLED
      ).length,
    };

    console.log("\n📊 製作部門統計");
    console.log("=".repeat(30));
    console.log(`總訂單數：${stats.total}`);
    console.log(`待處理：${stats.pending}`);
    console.log(`製作中：${stats.inProgress}`);
    console.log(`已完成：${stats.completed}`);
    console.log(`已取消：${stats.cancelled}`);

    // 計算完成率
    const completionRate = ((stats.completed / stats.total) * 100).toFixed(1);
    console.log(`完成率：${completionRate}%`);
  } catch (error) {
    console.log("❌ 讀取統計資料失敗");
  }
}

/**
 * 主選單
 */
async function showMainMenu() {
  console.log("\n🏭 製作部門管理系統");
  console.log("=".repeat(30));
  console.log("1. 查看所有訂單");
  console.log("2. 查看訂單詳細資訊");
  console.log("3. 更新訂單狀態");
  console.log("4. 統計資訊");
  console.log("5. 退出");

  const choice = await new Promise((resolve) => {
    rl.question("\n請選擇功能 (1-5)：", resolve);
  });

  switch (choice) {
    case "1":
      displayAllOrders();
      break;
    case "2":
      const orderId = await new Promise((resolve) => {
        rl.question("請輸入訂單編號：", resolve);
      });
      displayOrderDetails(orderId);
      break;
    case "3":
      await updateOrderStatus();
      break;
    case "4":
      showStatistics();
      break;
    case "5":
      console.log("👋 再見！");
      rl.close();
      return false;
    default:
      console.log("❌ 無效的選擇");
  }

  return true;
}

// 主程式
async function main() {
  console.log("🏭 歡迎使用製作部門管理系統！");

  let continueRunning = true;
  while (continueRunning) {
    continueRunning = await showMainMenu();
  }
}

// 啟動程式
main().catch((error) => {
  console.error("❌ 程式發生錯誤：", error);
  process.exit(1);
});
