import { useId } from 'react';

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  leftLabel?: string;
  rightLabel?: string;
  disabled?: boolean;
}

export const Slider = ({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  leftLabel,
  rightLabel,
  disabled = false,
}: SliderProps) => {
  const sliderId = useId();
  const labelId = `${sliderId}-label`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span id={labelId} className="text-sm font-medium text-slate-700">
          {label}
        </span>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{value}%</span>
      </div>
      <input
        id={sliderId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled}
        aria-labelledby={labelId}
        className="ui-slider"
      />
      {(leftLabel || rightLabel) && (
        <div className="flex justify-between text-xs text-slate-500">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
    </div>
  );
};
