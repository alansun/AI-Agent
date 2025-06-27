import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// 取得當前檔案的目錄路徑
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 讀取菜單資料
const menuFilePath = join(__dirname, "..", "data", "menu.json");
export const menuData = JSON.parse(readFileSync(menuFilePath, "utf-8"));

/**
 * 檢查品項是否存在於菜單中
 * @param {string} itemName - 品項名稱
 * @returns {boolean} 是否存在於菜單中
 */
export function isItemInMenu(itemName) {
  return (
    menuData.menu.tea.some((drink) => drink.name_zh === itemName) ||
    menuData.menu.milk_tea.some((drink) => drink.name_zh === itemName) ||
    menuData.menu.tea_latte.some((drink) => drink.name_zh === itemName) ||
    menuData.menu.fresh_juice.some((drink) => drink.name_zh === itemName) ||
    menuData.menu.season_special.some((drink) => drink.name_zh === itemName)
  );
}

/**
 * 取得品項的價格資訊
 * @param {string} itemName - 品項名稱
 * @returns {Object|null} 價格資訊，如果找不到則返回 null
 */
export function getItemPrice(itemName) {
  const categories = [
    "tea",
    "milk_tea",
    "tea_latte",
    "fresh_juice",
    "season_special",
  ];

  for (const category of categories) {
    const item = menuData.menu[category].find(
      (drink) => drink.name_zh === itemName
    );
    if (item) {
      return {
        category,
        prices: item.prices,
        recommended: item.recommended || false,
        special: item.special || false,
      };
    }
  }

  return null;
}
