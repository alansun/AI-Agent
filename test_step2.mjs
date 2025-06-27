import ollama from "ollama";
import { SYSTEM_DESCRIPTION } from "./contant_step2.mjs";
import { menuData } from "./utils/menu.mjs";
import { purchase, formatOrderDisplay } from "./utils/order.mjs";
import {
  payment,
  calculateOrderTotal,
  formatPaymentDisplay,
} from "./utils/payment.mjs";
import {
  transferToProduction,
  formatProductionOrderDisplay,
} from "./utils/production.mjs";

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

// 處理 tools 呼叫
async function handleToolCalls(toolCalls) {
  const results = [];

  for (const toolCall of toolCalls) {
    const { id, function: func } = toolCall;

    try {
      let result;

      switch (func.name) {
        case "calculate_total":
          const totalParams = JSON.parse(func.arguments);
          console.log("🔍 調試 - 計算總金額參數:", totalParams);

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
            throw error;
          }
          break;

        case "process_order":
          const orderParams = JSON.parse(func.arguments);
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

// 測試函數
async function testStep2() {
  const testInput = "我要一杯阿薩姆紅茶，M杯，微冰，微糖，加珍珠";

  console.log("🧪 測試輸入:", testInput);
  console.log("=" * 50);

  try {
    // 添加使用者訊息到歷史
    messages.push({ role: "user", content: testInput });

    // 獲取 AI 回應，包含 tools
    const response = await ollama.chat({
      model: "llama3.2",
      messages: messages,
      tools: tools,
      tool_choice: "auto",
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
        model: "phi4-mini",
        messages: messages,
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
  } catch (error) {
    console.error("❌ 發生錯誤：", error.message);
    console.error("❌ 錯誤詳情：", error);
  }
}

// 執行測試
testStep2().catch((error) => {
  console.error("❌ 測試失敗：", error);
  process.exit(1);
});
