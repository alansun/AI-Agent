import ollama from "ollama";
import readline from "readline";
import { SYSTEM_DESCRIPTION } from "./contant_step2.mjs";
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

const model = "llama3.2";

// 定義 tools
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
          orderId: {
            type: "string",
            description: "訂單ID（時間戳）",
          },
          paymentMethod: {
            type: "string",
            enum: ["Line Pay", "現金", "信用卡", "街口支付"],
            description: "支付方式",
          },
          amount: {
            type: "number",
            description: "支付金額",
          },
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
          orderId: {
            type: "string",
            description: "訂單ID",
          },
          paymentRecordId: {
            type: "string",
            description: "支付記錄ID",
          },
        },
        required: ["orderId", "paymentRecordId"],
      },
    },
  },
];

// 初始化對話歷史
let messages = [
  {
    role: "system",
    content: `${SYSTEM_DESCRIPTION.content}\n\n菜單資料：${JSON.stringify(
      menuData
    )}`,
  },
];

// 儲存當前訂單狀態
let currentOrder = null;
let currentPaymentRecord = null;

// 處理 tools 呼叫
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

          // 建立完整的訂單物件供計算使用
          const orderForCalculation = {
            item: totalParams.item,
            size: totalParams.size,
            quantity: totalParams.quantity,
          };
          console.log("🔍 調試 - 訂單物件:", orderForCalculation);

          try {
            const totalAmount = calculateOrderTotal(
              orderForCalculation,
              menuData
            );
            console.log("🔍 調試 - 計算結果:", totalAmount);

            result = {
              success: true,
              totalAmount: totalAmount,
              message: `訂單總金額：${totalAmount} 元`,
            };
            console.log(`\n💰 ${result.message}`);
          } catch (error) {
            console.error("🔍 調試 - 計算錯誤:", error.message);
            result = {
              success: false,
              error: error.message,
            };
          }
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

          // 檢查是否有對應的訂單和支付記錄
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

// 處理使用者輸入
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
    } else {
      console.log("🔍 沒有工具呼叫，AI 回應內容:", response.message.content);
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

// 主程式
async function main() {
  console.log("🍹 歡迎使用飲料點餐 AI 助理！");
  console.log("✨ 新功能：Tools 整合系統");
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
