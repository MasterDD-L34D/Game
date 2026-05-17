import React from 'react';

export interface RangeValue {
  start: string;
  end: string;
}

export interface RangePickerProps {
  value: RangeValue;
  min?: string;
  max?: string;
  onChange: (value: RangeValue) => void;
}

export const RangePicker: React.FC<RangePickerProps> = ({ value, min, max, onChange }) => {
  return (
    <form
      className="squadsync__range"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <label>
        Inizio
        <input
          type="date"
          value={value.start}
          min={min}
          max={value.end}
          onChange={(event) => onChange({ ...value, start: event.target.value })}
        />
      </label>
      <label>
        Fine
        <input
          type="date"
          value={value.end}
          min={value.start}
          max={max}
          onChange={(event) => onChange({ ...value, end: event.target.value })}
        />
      </label>
    </form>
  );
};

export default RangePicker;
