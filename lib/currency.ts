// 费用显示货币。
//
// pi 返回的 cost 以美元计价，这里统一换算成人民币展示。
// 想改汇率：直接改下面的 USD_TO_CNY，然后运行 ~/.config/pi-web/rebuild.sh 重新构建。
export const CURRENCY_SYMBOL = "¥";
export const USD_TO_CNY = 7.2;

/** 把美元费用换算成人民币并加上货币符号，默认保留 4 位小数。 */
export function formatCost(usd: number, digits = 4): string {
  return `${CURRENCY_SYMBOL}${(usd * USD_TO_CNY).toFixed(digits)}`;
}

/** 低于 0.01 时显示 "<¥0.01" 的紧凑写法。 */
export function formatCostCompact(usd: number, digits = 2): string | null {
  if (!(usd > 0)) return null;
  if (usd * USD_TO_CNY < 0.01) return `<${CURRENCY_SYMBOL}0.01`;
  return formatCost(usd, digits);
}
