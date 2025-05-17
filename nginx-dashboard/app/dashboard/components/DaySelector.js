'use client';

import { useEffect, useState } from 'react';

export default function DaySelector({ 
  timelineData, 
  selectedDay, 
  onDaySelect,
  timeRange
}) {
  const [availableDays, setAvailableDays] = useState([]);

  // Extract unique days from timeline data
  useEffect(() => {
    if (!timelineData || timelineData.length === 0 || timeRange !== 'hourly') return;

    const uniqueDays = [...new Set(timelineData.map(item => {
      if (item.hour && item.hour.includes(' ')) {
        return item.hour.split(' ')[0]; // Extract the date part (YYYY-MM-DD)
      }
      return null;
    }))].filter(Boolean).sort();

    setAvailableDays(uniqueDays);
    
    // If no day is selected yet, select the first one
    if (!selectedDay && uniqueDays.length > 0) {
      onDaySelect(uniqueDays[0]);
    }
  }, [timelineData, selectedDay, onDaySelect, timeRange]);

  if (timeRange !== 'hourly' || !availableDays.length) return null;

  return (
    <div className="flex items-center space-x-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Select Day:
      </label>
      <select
        value={selectedDay || ''}
        onChange={(e) => onDaySelect(e.target.value)}
        className="form-select rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm shadow-sm"
      >
        {availableDays.map(day => (
          <option key={day} value={day}>
            {day}
          </option>
        ))}
      </select>
    </div>
  );
}