import { useState } from 'react';
import '../styles/date-range-picker.css';

const PRESETS = [
  { label: '7 Dias', days: 7 },
  { label: '30 Dias', days: 30 },
  { label: '90 Dias', days: 90 },
  { label: 'Custom', days: null },
];

export default function DateRangePicker({ onDateRangeChange, defaultDays = 30 }) {
  const [selectedDays, setSelectedDays] = useState(defaultDays);
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const handlePresetClick = (days) => {
    if (days === null) {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      setSelectedDays(days);
      onDateRangeChange(days);
    }
  };

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      const from = new Date(customFrom);
      const to = new Date(customTo);
      const days = Math.floor((to - from) / (1000 * 60 * 60 * 24));

      if (days > 0) {
        onDateRangeChange(days);
        setShowCustom(false);
      }
    }
  };

  return (
    <div className="date-range-picker">
      <div className="picker-buttons">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            className={`picker-btn ${selectedDays === preset.days ? 'active' : ''}`}
            onClick={() => handlePresetClick(preset.days)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {showCustom && (
        <div className="custom-range">
          <div className="custom-inputs">
            <div className="input-group">
              <label>De:</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label>Até:</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </div>
          </div>
          <div className="custom-actions">
            <button className="btn-apply" onClick={handleCustomApply}>
              Aplicar
            </button>
            <button
              className="btn-cancel"
              onClick={() => setShowCustom(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
