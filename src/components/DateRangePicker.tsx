import React from 'react';
import { FloatingDateInput } from './FloatingDateInput';

interface DateRangePickerProps {
    startDate: string;
    endDate: string;
    onStartDateChange: (date: string) => void;
    onEndDateChange: (date: string) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
}) => {
    return (
        <div className="flex items-center gap-2">
            <div className="w-40">
                <FloatingDateInput
                    label="Data Inicial"
                    value={startDate}
                    onChange={(e) => onStartDateChange(e.target.value)}
                />
            </div>
            <div className="w-40">
                <FloatingDateInput
                    label="Data Final"
                    value={endDate}
                    onChange={(e) => onEndDateChange(e.target.value)}
                />
            </div>
        </div>
    );
};
