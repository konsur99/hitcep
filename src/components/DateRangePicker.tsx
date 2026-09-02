import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  format, subMonths, addMonths, startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, 
  isSameDay, setMonth, setYear 
} from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface DateRangePickerProps {
  startDate: string | null;
  endDate: string | null;
  onStartDateChange: (date: string | null) => void;
  onEndDateChange: (date: string | null) => void;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange
}: DateRangePickerProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDateClick = (dateStr: string) => {
    if (!startDate || (startDate && endDate)) {
      onStartDateChange(dateStr);
      onEndDateChange(null);
    } else {
      if (dateStr < startDate) {
        onEndDateChange(startDate);
        onStartDateChange(dateStr);
      } else {
        onEndDateChange(dateStr);
      }
    }
  };

  return (
    <div className="relative">
      <button 
        type="button"
        onClick={() => setShowDatePicker(!showDatePicker)} 
        className={`w-[38px] h-[34px] flex items-center justify-center rounded-xl border transition-colors shrink-0 shadow-sm ${
          showDatePicker 
            ? 'bg-gray-100 border-gray-300 text-gray-700' 
            : startDate 
              ? 'bg-blue-50 border-blue-200 text-blue-600'
              : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
        }`}
      >
        <i className="fa-solid fa-calendar-day text-sm"></i>
      </button>
      
      {showDatePicker && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={(e) => { e.stopPropagation(); setShowDatePicker(false); }}>
          <div 
            className="w-[240px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-3">
              <button type="button" onClick={() => setCurrentCalendarDate(subMonths(currentCalendarDate, 1))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                <i className="fa-solid fa-chevron-left text-[10px]"></i>
              </button>
              <div className="flex gap-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                {/* Month Dropdown */}
                <div className="relative">
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowMonthDropdown(!showMonthDropdown); setShowYearDropdown(false); }}
                    className="text-[10px] font-bold text-gray-800 bg-transparent outline-none cursor-pointer rounded px-1 flex items-center gap-1"
                  >
                    {format(currentCalendarDate, 'MMM', {locale: localeId})}
                    <i className="fa-solid fa-chevron-down text-[7px] text-gray-400"></i>
                  </button>
                  {showMonthDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-24 max-h-32 overflow-y-auto bg-white border border-gray-100 rounded-lg shadow-lg z-[80] py-1 scrollbar-hide">
                      {Array.from({length: 12}).map((_, i) => {
                        return (
                          <button
                            key={i}
                            type="button"
                            ref={(el) => {
                              if (el && currentCalendarDate.getMonth() === i) {
                                el.scrollIntoView({ block: 'center' });
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentCalendarDate(setMonth(currentCalendarDate, i));
                              setShowMonthDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-[10px] transition-colors ${currentCalendarDate.getMonth() === i ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                          >
                            {format(new Date(2020, i, 1), 'MMMM', {locale: localeId})}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                {/* Year Dropdown */}
                <div className="relative">
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowYearDropdown(!showYearDropdown); setShowMonthDropdown(false); }}
                    className="text-[10px] font-bold text-gray-800 bg-transparent outline-none cursor-pointer rounded px-1 flex items-center gap-1"
                  >
                    {currentCalendarDate.getFullYear()}
                    <i className="fa-solid fa-chevron-down text-[7px] text-gray-400"></i>
                  </button>
                  {showYearDropdown && (
                    <div className="absolute top-full right-0 mt-1 w-16 max-h-32 overflow-y-auto bg-white border border-gray-100 rounded-lg shadow-lg z-[80] py-1 scrollbar-hide">
                      {Array.from({length: 101}).map((_, i) => {
                        const year = 2000 + i;
                        return (
                          <button
                            key={year}
                            type="button"
                            ref={(el) => {
                              if (el && currentCalendarDate.getFullYear() === year) {
                                el.scrollIntoView({ block: 'center' });
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentCalendarDate(setYear(currentCalendarDate, year));
                              setShowYearDropdown(false);
                            }}
                            className={`w-full text-center py-1.5 text-[10px] transition-colors ${currentCalendarDate.getFullYear() === year ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                          >
                            {year}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <button type="button" onClick={() => setCurrentCalendarDate(addMonths(currentCalendarDate, 1))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                <i className="fa-solid fa-chevron-right text-[10px]"></i>
              </button>
            </div>
            
            {/* Helper Text */}
            {startDate && !endDate && (
              <div className="text-center text-[10px] font-semibold text-blue-600 mb-2 animate-pulse bg-blue-50 py-1 rounded-md">
                Pilih tanggal akhir...
              </div>
            )}

            {/* Days of week */}
            <div className="grid grid-cols-7 mb-1.5">
              {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d, i) => (
                <div key={i} className="text-center text-[8px] font-bold text-gray-400">{d}</div>
              ))}
            </div>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {(() => {
                const start = startOfWeek(startOfMonth(currentCalendarDate), {weekStartsOn: 0});
                const end = endOfWeek(endOfMonth(currentCalendarDate), {weekStartsOn: 0});
                const days = eachDayOfInterval({start, end});
                return days.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  let isSelected = false;
                  let isInRange = false;
                  
                  if (startDate && endDate) {
                    isSelected = dateStr === startDate || dateStr === endDate;
                    isInRange = dateStr > startDate && dateStr < endDate;
                  } else if (startDate) {
                    isSelected = dateStr === startDate;
                  }

                  const isCurrentMonth = isSameMonth(day, currentCalendarDate);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <button 
                      type="button"
                      key={dateStr}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDateClick(dateStr);
                      }}
                      className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-[9px] transition-all ${
                        isSelected ? 'bg-blue-600 text-white font-bold shadow-md scale-110 z-10' : 
                        isInRange ? 'bg-blue-100 text-blue-700 font-semibold' :
                        isToday ? 'bg-blue-50 text-blue-600 font-bold' :
                        isCurrentMonth ? 'text-gray-700 hover:bg-gray-100 font-semibold' : 
                        'text-gray-300 font-medium'
                      }`}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
