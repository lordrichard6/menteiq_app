'use client'

import { Badge } from '@/components/ui/badge'
import { AlertCircle, Clock, Calendar } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'

interface DeadlineBadgeProps {
    deadline: Date
    className?: string
}

export function DeadlineBadge({ deadline, className }: DeadlineBadgeProps) {
    const daysUntil = differenceInDays(deadline, new Date())

    if (daysUntil < 0) {
        return (
            <Badge className={`bg-red-100 text-red-700 hover:bg-red-100 border-red-200 gap-1.5 ${className}`}>
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{Math.abs(daysUntil)}d OVERDUE</span>
            </Badge>
        )
    }

    if (daysUntil <= 7) {
        return (
            <Badge className={`bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 gap-1.5 ${className}`}>
                <Clock className="h-3.5 w-3.5" />
                <span>IN {daysUntil} DAYS</span>
            </Badge>
        )
    }

    return (
        <Badge variant="outline" className={`text-slate-500 border-slate-200 gap-1.5 ${className}`}>
            <Calendar className="h-3.5 w-3.5 opacity-60" />
            <span>{format(deadline, 'MMM d, yyyy')}</span>
        </Badge>
    )
}
