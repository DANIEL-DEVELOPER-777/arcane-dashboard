export const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

export const formatPercent = (val?: number) => {
  if (val === undefined || Number.isNaN(val)) return "0.00%";
  const sign = val > 0 ? "+" : val < 0 ? "-" : "";
  return `${sign}${Math.abs(val).toFixed(2)}%`;
};
