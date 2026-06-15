"use client"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Check, CalendarIcon, Plus, Trash2, ArrowUp, ArrowDown, Milestone } from 'lucide-react'
import { format, startOfDay, endOfDay } from "date-fns"
import { cn } from "@/lib/utils"

export interface TimelineItem {
    id: string
    date: Date | undefined
    description: string
}

interface TimelineFeedProps {
    items: TimelineItem[]
    onItemsChange: (items: TimelineItem[]) => void
    title: string
    description: string
    addButtonText: string
    emptyStateText: string
    startDate?: Date
    endDate?: Date
}

export function TimelineFeed({
    items,
    onItemsChange,
    addButtonText,
    emptyStateText,
    startDate,
    endDate
}: TimelineFeedProps) {
    const addNewItem = () => {
        const newItem: TimelineItem = {
            id: Date.now().toString(),
            date: undefined,
            description: ''
        }

        const updatedItems = [...items, newItem]
        onItemsChange(updatedItems)
    }

    const updateItem = (id: string, field: keyof TimelineItem, value: string | Date | undefined) => {
        const updatedItems = items.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        )
        onItemsChange(updatedItems)
    }

    const removeItem = (id: string) => {
        const updatedItems = items.filter(item => item.id !== id)
        onItemsChange(updatedItems)
    }

    const moveItem = (index: number, direction: 'up' | 'down') => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === items.length - 1)
        ) {
            return
        }

        const newIndex = direction === 'up' ? index - 1 : index + 1
        const updatedItems = [...items]
            ;[updatedItems[index], updatedItems[newIndex]] = [updatedItems[newIndex], updatedItems[index]]

        onItemsChange(updatedItems)
    }

    // Function to check if a date should be disabled
    const isDateDisabled = (date: Date): boolean => {
        // If no date range is set, don't disable any dates
        if (!startDate && !endDate) {
            return false;
        }

        const dayStart = startOfDay(date);

        // If only start date is set, disable dates before start date
        if (startDate && !endDate) {
            const startDay = startOfDay(startDate);
            return dayStart < startDay;
        }

        // If only end date is set, disable dates after end date
        if (!startDate && endDate) {
            const endDay = endOfDay(endDate);
            return dayStart > endDay;
        }

        // If both start and end dates are set, disable dates outside the range
        if (startDate && endDate) {
            const startDay = startOfDay(startDate);
            const endDay = endOfDay(endDate);
            const isDisabled = dayStart < startDay || dayStart > endDay;
            return isDisabled;
        }

        return false;
    }

    return (
        <div className="space-y-6">
            {/* Date Range Info */}
            {(startDate || endDate) && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                        <strong>Date Range:</strong> {startDate ? format(startDate, "PPP") : "No start date"} to {endDate ? format(endDate, "PPP") : "No end date"}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                        Milestone dates must fall within this range
                    </p>
                </div>
            )}

            {/* Timeline Items */}
            <div className="space-y-0">
                {items.map((item, index) => (
                    <div key={item.id} className="flex group">
                        {/* Timeline Line & Icon */}
                        <div className="flex flex-col items-center mr-4">
                            {/* Icon */}
                            <div className="w-10 h-10 rounded-md bg-[#F6F6F6] flex items-center justify-center border-[#EEEEEF] z-10">
                                <Check className="h-4 w-4 text-[#707070]" />
                            </div>
                            {/* Vertical Line */}
                            {index < items.length - 1 && (
                                <div className="flex-1 border-l border-gray-300 border-dashed" />
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 pb-6">
                            <div className="bg-white border rounded-lg p-4 hover:border-gray-300 transition-colors">
                                {/* Header with Controls */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => moveItem(index, 'up')}
                                            disabled={index === 0}
                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30"
                                            title="Move up"
                                        >
                                            <ArrowUp className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => moveItem(index, 'down')}
                                            disabled={index === items.length - 1}
                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30"
                                            title="Move down"
                                        >
                                            <ArrowDown className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeItem(item.id)}
                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Date and Description */}
                                <div className="space-y-2">
                                    {/* Date Picker */}
                                    <div className="space-y-2">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    className={cn(
                                                        "w-full justify-start bg-white text-left font-normal border",
                                                        !item.date && "text-muted-foreground",
                                                        item.date && isDateDisabled(item.date) && "border-red-300 bg-red-50 text-red-800"
                                                    )}
                                                >
                                                    <img src="/icons/calendar.svg" alt="calendar icon" />
                                                    {item.date ? (
                                                        <>
                                                            {format(item.date, "PPP")}
                                                            {isDateDisabled(item.date) && (
                                                                <span className="ml-2 text-xs text-red-600">(Outside date range)</span>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span>Select date</span>
                                                    )}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={item.date}
                                                    onSelect={(date) => updateItem(item.id, 'date', date)}
                                                    disabled={isDateDisabled}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        {item.date && isDateDisabled(item.date) && (
                                            <p className="text-xs text-red-600">
                                                This date is outside the allowed range. Please select a date between{" "}
                                                {startDate ? format(startDate, "MMM d, yyyy") : "start date"} and{" "}
                                                {endDate ? format(endDate, "MMM d, yyyy") : "end date"}.
                                            </p>
                                        )}
                                    </div>

                                    {/* Description */}
                                    <div className="space-y-2">
                                        <Textarea
                                            placeholder="Describe the expected outcomes and deliverables for this milestone..."
                                            value={item.description}
                                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                            className="min-h-[100px] bg-white resize-vertical"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {items.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                        <Milestone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium mb-2">{emptyStateText}</p>
                        <p className="text-sm">Start by adding your first milestone to create a project timeline</p>
                    </div>
                )}
            </div>

            {/* Add Button */}
            <Button
                onClick={addNewItem}
                variant="outline"
                className="text-[#C13C3D] border-[#C13C3D] hover:bg-[#FEF5F5] hover:text-[#A13334]"
            >
                <Plus className="h-4 w-4 mr-2" />
                {addButtonText}
            </Button>

            {/* Stats */}
            {items.length > 0 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t">
                    <span>Total: {items.length} milestone{items.length !== 1 ? 's' : ''}</span>
                    <span>{items.filter(item => item.date && !isDateDisabled(item.date)).length} valid dates</span>
                </div>
            )}
        </div>
    )
}