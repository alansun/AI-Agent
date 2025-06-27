import ollama from "ollama";
import readline from "readline";
import { SYSTEM_DESCRIPTION } from "./contant.mjs";
import { menuData } from "./utils/menu.mjs";
import {
  purchase,
  parseOrderResponse,
  formatOrderDisplay,
  formatIncompleteOrderMessage,
} from "./utils/order.mjs";
import {
  payment,
  calculateOrderTotal,
  formatPaymentDisplay,
  PAYMENT_METHODS,
} from "./utils/payment.mjs";
import {
  transferToProduction,
  formatProductionOrderDisplay,
} from "./utils/production.mjs";

// 建立互動式介面
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// 初始化對話歷史
let messages = [
  {
    role: "system",
    content: `${SYSTEM_DESCRIPTION.content}\n\n菜單資料：${JSON.stringify(
      menuData
    )}`,
  },
];

// 處理支付流程
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

    console.log(`\n✅ 已選擇：${selectedMethod}`);

    // 處理支付
    const paymentResult = payment(order, selectedMethod, totalAmount);
    console.log(formatPaymentDisplay(paymentResult.paymentRecord));

    return paymentResult.paymentRecord;
  } catch (error) {
    console.error("❌ 支付處理失敗：", error.message);
    throw error;
  }
}

// 處理製作部門轉單
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

// 處理使用者輸入
async function handleUserInput(input) {
  try {
    // 添加使用者訊息到歷史
    messages.push({ role: "user", content: input });

    // 獲取 AI 回應
    const response = await ollama.chat({
      model: "gemma3",
      messages: messages,
    });

    // 添加 AI 回應到歷史
    messages.push(response.message);

    // 輸出 AI 回應
    console.log("\n🤖 AI:", response.message.content, "\n");

    // 嘗試解析訂單資訊
    const orderData = parseOrderResponse(response.message.content);
    if (orderData) {
      if (orderData.type === "complete" && orderData.order) {
        const { item, size, quantity, ice, sugar, addOn } = orderData.order;
        const order = purchase(item, size, quantity, ice, sugar, addOn);
        console.log(formatOrderDisplay(order));

        // 開始支付流程
        try {
          const paymentRecord = await handlePayment(order);

          // 轉單給製作部門
          await handleProductionTransfer(order, paymentRecord);

          console.log("\n🎉 訂單處理完成！感謝您的購買！");
        } catch (error) {
          console.error("❌ 後續處理失敗：", error.message);
        }
      } else if (orderData.type === "incomplete" && orderData.order) {
        console.log(formatIncompleteOrderMessage(orderData));
      }
    }
  } catch (error) {
    console.error("❌ 發生錯誤：", error.message);
  }
}

// 主程式
async function main() {
  console.log("🍹 歡迎使用飲料點餐 AI 助理！");
  console.log('輸入 "exit" 或 "quit" 結束對話\n');

  // 開始對話循環
  while (true) {
    const input = await new Promise((resolve) => {
      rl.question("👤 您：", resolve);
    });

    // 檢查是否要結束對話
    if (input.toLowerCase() === "exit" || input.toLowerCase() === "quit") {
      console.log("\n👋 感謝使用，再見！");
      rl.close();
      break;
    }

    // 處理使用者輸入
    await handleUserInput(input);
  }
}

// 啟動程式
main().catch((error) => {
  console.error("❌ 程式發生錯誤：", error);
  process.exit(1);
});
