'use client'

import { format } from "date-fns"
import type { DayContentProps } from "react-day-picker"

interface Holiday {
    name: string;
    type: 'public' | 'official';
    id?: number;
    description: string | null;
}

const typeColorMap = {
    public: 'bg-blue-100 text-blue-800',
    official: 'bg-purple-100 text-purple-800',
}

export function CalendarDay({ date, holidays }: DayContentProps & { holidays: Holiday[] }) {
    const dayNumber = format(date, 'd');

    return (
        <div className="flex flex-col h-full">
            <span className="self-start">{dayNumber}</span>
            <div className="flex-1 overflow-y-auto -mx-2 px-1 space-y-1">
                {holidays.map((holiday, index) => (
                    <div 
                        key={index}
                        className={`text-xs p-1 rounded-sm ${typeColorMap[holiday.type]}`}
                    >
                        <p className="font-semibold truncate">{holiday.name}</p>
                        {holiday.description && <p className="truncate text-xs">{holiday.description}</p>}
                    </div>
                ))}
            </div>
        </div>
    )
}
