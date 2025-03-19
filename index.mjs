import ollama from "ollama";

import { SYSTEM_DESCRIPTION } from "./contant.mjs";

(async () => {
  const response = await ollama.chat({
    model: "ChalisAssistant",
    messages: [
      SYSTEM_DESCRIPTION,
      { role: "user", content: "請列出菜單" },
      // {
      //   role: "assistant",
      //   content:
      //     "您好！請問您今天想來什麼飲料？以下是我們的菜單選擇：\n" +
      //     "\n" +
      //     "1. 多多綠\n" +
      //     "2. 芒果青木瓜\n" +
      //     "3. 青蘋果冰沙\n" +
      //     "4. 焦糖布甸\n" +
      //     "\n" +
      //     "如果您有特別的需求，也可以告訴我關於冰塊、甜度和添加品的偏好。期待您的選擇",
      // },
      // { role: "user", content: "有什麼推薦的飲料嗎？" },
    ],
  });
  console.log(response.message);
})();
