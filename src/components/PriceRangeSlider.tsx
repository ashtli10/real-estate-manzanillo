import { useState, useEffect, useCallback, useRef } from 'react';

interface PriceRangeSliderProps {
  min: number;
  max: number;
  step: number;
  minValue: number | null;
  maxValue: number | null;
  onChange: (min: number | null, max: number | null) => void;
  formatPrice: (value: number) => string;
}

export function PriceRangeSlider({
  min,
  max,
  step,
  minValue,
  maxValue,
  onChange,
  formatPrice,
}: PriceRangeSliderProps) {
  // Convert null values to min/max for slider
  const currentMin = minValue ?? min;
  const currentMax = maxValue ?? max;
  
  const [localMin, setLocalMin] = useState(currentMin);
  const [localMax, setLocalMax] = useState(currentMax);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalMin(minValue ?? min);
    setLocalMax(maxValue ?? max);
  }, [minValue, maxValue, min, max]);

  const getPercent = useCallback((value: number) => {
    return ((value - min) / (max - min)) * 100;
  }, [min, max]);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Number(e.target.value), localMax - step);
    setLocalMin(value);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(Number(e.target.value), localMin + step);
    setLocalMax(value);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      // Only call onChange when dragging ends
      const newMin = localMin === min ? null : localMin;
      const newMax = localMax === max ? null : localMax;
      onChange(newMin, newMax);
    }
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
    };
  });

  const minPercent = getPercent(localMin);
  const maxPercent = getPercent(localMax);

  return (
    <div className="w-full px-2">
      {/* Price Display */}
      <div className="flex justify-between mb-4">
        <div className="text-center">
          <span className="text-xs text-gray-500 block">Mínimo</span>
          <span className="text-sm font-semibold text-gray-800">
            {localMin === min ? 'Cualquiera' : formatPrice(localMin)}
          </span>
        </div>
        <div className="text-center">
          <span className="text-xs text-gray-500 block">Máximo</span>
          <span className="text-sm font-semibold text-gray-800">
            {localMax === max ? 'Cualquiera' : formatPrice(localMax)}
          </span>
        </div>
      </div>

      {/* Slider Track */}
      <div className="relative h-2 mb-6" ref={sliderRef}>
        {/* Background Track */}
        <div className="absolute w-full h-2 bg-gray-200 rounded-full" />
        
        {/* Active Range */}
        <div
          className="absolute h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
          style={{
            left: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`,
          }}
        />

        {/* Min Thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localMin}
          onChange={handleMinChange}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none 
            [&::-webkit-slider-thumb]:pointer-events-auto
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-blue-500
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-webkit-slider-thumb]:transition-transform
            [&::-moz-range-thumb]:pointer-events-auto
            [&::-moz-range-thumb]:appearance-none
            [&::-moz-range-thumb]:w-5
            [&::-moz-range-thumb]:h-5
            [&::-moz-range-thumb]:bg-white
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-blue-500
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:shadow-md
            [&::-moz-range-thumb]:cursor-pointer"
          style={{ zIndex: localMin > max - 100 ? 5 : 3 }}
        />

        {/* Max Thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localMax}
          onChange={handleMaxChange}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none
            [&::-webkit-slider-thumb]:pointer-events-auto
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-cyan-500
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-webkit-slider-thumb]:transition-transform
            [&::-moz-range-thumb]:pointer-events-auto
            [&::-moz-range-thumb]:appearance-none
            [&::-moz-range-thumb]:w-5
            [&::-moz-range-thumb]:h-5
            [&::-moz-range-thumb]:bg-white
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-cyan-500
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:shadow-md
            [&::-moz-range-thumb]:cursor-pointer"
          style={{ zIndex: 4 }}
        />
      </div>

      {/* Scale Markers */}
      <div className="flex justify-between text-xs text-gray-400 px-1">
        <span>{formatPrice(min)}</span>
        <span>{formatPrice(max)}</span>
      </div>
    </div>
  );
}
