import * as React from "react";

import { Input } from "@/components/ui/input";

type MoneyInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "inputMode" | "value" | "onChange"
> & {
  value?: number | null;
  onValueChange: (value: number) => void;
};

export function normalizeMoneyInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const hasDecimal = cleaned.includes(".");
  const [integerPart, ...decimalParts] = cleaned.split(".");
  const decimalPart = decimalParts.join("").slice(0, 2);

  let integer = integerPart.replace(/^0+(?=\d)/, "");
  if (integer === "" && (hasDecimal || cleaned.includes("0"))) {
    integer = "0";
  }

  if (!hasDecimal) return integer;
  return `${integer || "0"}.${decimalPart}`;
}

export function formatMoneyInputDisplay(value: string): string {
  if (!value) return "";
  const hasDecimal = value.includes(".");
  const [integerPart, decimalPart = ""] = value.split(".");
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (!hasDecimal) return groupedInteger;
  return `${groupedInteger}.${decimalPart}`;
}

function formatMoneyInputValue(value?: number | null): string {
  if (value === undefined || value === null || !Number.isFinite(value) || value === 0) {
    return "";
  }
  return formatMoneyInputDisplay(String(value));
}

const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onValueChange, onBlur, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(formatMoneyInputValue(value));

    React.useEffect(() => {
      setDisplayValue(formatMoneyInputValue(value));
    }, [value]);

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={(event) => {
          const next = normalizeMoneyInput(event.target.value);
          setDisplayValue(formatMoneyInputDisplay(next));
          onValueChange(Number(next) || 0);
        }}
        onBlur={(event) => {
          const next = normalizeMoneyInput(event.target.value).replace(/\.$/, "");
          setDisplayValue(formatMoneyInputValue(Number(next) || 0));
          onBlur?.(event);
        }}
      />
    );
  },
);
MoneyInput.displayName = "MoneyInput";

export default MoneyInput;
