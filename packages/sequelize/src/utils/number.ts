// Helper to get number of decimal places in a step
function getNumberPrecision(step: string | number): number {
  const stepStr = step.toString();
  if (stepStr.includes('e-')) {
    // Handle scientific notation like 1e-3
    const [, exp] = stepStr.split('e-');
    return parseInt(exp, 10);
  }
  const decimalIndex = stepStr.indexOf('.');
  return decimalIndex >= 0 ? stepStr.length - decimalIndex - 1 : 0;
}

// Helper to fix a number to a given precision
function toFixed(value: string | number, precision: number): string {
  const num = Number(value);
  if (isNaN(num)) return '';
  return num.toFixed(precision);
}

export function toFixedByStep(value: any, step: string | number): string {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  const precision = getNumberPrecision(step);
  return toFixed(value, precision);
}
