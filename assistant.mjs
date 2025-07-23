import ollama from "ollama";
import readline from "readline";
import { SYSTEM_DESCRIPTION } from "./contant_assistant.mjs";
import { menuData } from "./utils/menu.mjs";

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
