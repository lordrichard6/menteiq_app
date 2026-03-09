'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useNotificationStore, type Notification } from '@/stores/notification-store'
import { formatRelativeTime } from '@/lib/format-time'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
    Bell,
    Check,
    CheckCheck,
    Trash2,
    X,
    Clock,
    FileText,
    CheckSquare,
    DollarSign,
    MessageSquare,
    AlertCircle,
    Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Map notification types to icons
const notificationIcons: Record<string, React.ReactNode> = {
    task_due: <Clock className="h-4 w-4" />,
    task_overdue: <AlertCircle className="h-4 w-4" />,
    invoice_due: <FileText className="h-4 w-4" />,
    invoice_overdue: <AlertCircle className="h-4 w-4" />,
    mention: <MessageSquare className="h-4 w-4" />,
    comment: <MessageSquare className="h-4 w-4" />,
    assignment: <CheckSquare className="h-4 w-4" />,
    status_change: <Info className="h-4 w-4" />,
    reminder: <Bell className="h-4 w-4" />,
    system: <Info className="h-4 w-4" />,
    welcome: <Info className="h-4 w-4" />,
    update: <Info className="h-4 w-4" />,
}

// Map notification types to colors
const notificationColors: Record<string, string> = {
    task_due: 'text-blue-600',
    task_overdue: 'text-red-600',
    invoice_due: 'text-orange-600',
    invoice_overdue: 'text-red-600',
    mention: 'text-purple-600',
    comment: 'text-purple-600',
    assignment: 'text-green-600',
    status_change: 'text-blue-600',
    reminder: 'text-yellow-600',
    system: 'text-slate-600',
    welcome: 'text-green-600',
    update: 'text-blue-600',
}

export function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false)
    const router = useRouter()

    const {
        notifications,
        unreadCount,
        isLoading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        archiveNotification,
        clearAll,
    } = useNotificationStore()

    // Fetch notifications on mount and when dropdown opens
    useEffect(() => {
        fetchNotifications()
    }, [fetchNotifications])

    // Poll for new notifications every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchNotifications()
        }, 30000)

        return () => clearInterval(interval)
    }, [fetchNotifications])

    const handleNotificationClick = async (notification: Notification) => {
        // Mark as read
        if (!notification.read) {
            await markAsRead(notification.id)
        }

        // Navigate if there's a URL
        if (notification.entityUrl) {
            router.push(notification.entityUrl)
            setIsOpen(false)
        }
    }

    return (
        <div className="relative">
            {/* Bell icon button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
                <Bell className="h-5 w-5 text-slate-600" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown card */}
                    <Card className="absolute right-0 top-full mt-2 w-96 max-h-[600px] overflow-hidden flex flex-col border-slate-200 shadow-lg z-50">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900">
                                Notifications
                                {unreadCount > 0 && (
                                    <span className="ml-2 text-xs font-normal text-slate-500">
                                        ({unreadCount} unread)
                                    </span>
                                )}
                            </h3>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="text-xs text-blue-600 hover:text-blue-700"
                                    >
                                        Mark all read
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Notifications list */}
                        <div className="flex-1 overflow-y-auto">
                            {isLoading ? (
                                <div className="p-8 text-center text-slate-500">
                                    <Bell className="h-8 w-8 mx-auto mb-2 animate-pulse opacity-30" />
                                    <p className="text-sm">Loading...</p>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">
                                    <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm font-medium mb-1">No notifications</p>
                                    <p className="text-xs">You&apos;re all caught up!</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {notifications.map((notification) => {
                                        const icon = notificationIcons[notification.type] || (
                                            <Bell className="h-4 w-4" />
                                        )
                                        const colorClass =
                                            notificationColors[notification.type] || 'text-slate-600'

                                        return (
                                            <div
                                                key={notification.id}
                                                className={cn(
                                                    'p-3 hover:bg-slate-50 transition-colors relative group',
                                                    !notification.read && 'bg-blue-50/50'
                                                )}
                                            >
                                                <button
                                                    onClick={() => handleNotificationClick(notification)}
                                                    className="w-full text-left"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        {/* Icon */}
                                                        <div
                                                            className={cn(
                                                                'flex-shrink-0 mt-0.5',
                                                                colorClass
                                                            )}
                                                        >
                                                            {icon}
                                                        </div>

                                                        {/* Content */}
                                                        <div className="flex-1 min-w-0">
                                                            <p
                                                                className={cn(
                                                                    'text-sm text-slate-900',
                                                                    !notification.read && 'font-medium'
                                                                )}
                                                            >
                                                                {notification.title}
                                                            </p>
                                                            {notification.message && (
                                                                <p className="text-xs text-slate-600 mt-0.5">
                                                                    {notification.message}
                                                                </p>
                                                            )}
                                                            <p className="text-xs text-slate-500 mt-1">
                                                                {formatRelativeTime(notification.createdAt)}
                                                            </p>
                                                        </div>

                                                        {/* Unread indicator */}
                                                        {!notification.read && (
                                                            <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2" />
                                                        )}
                                                    </div>
                                                </button>

                                                {/* Action buttons (shown on hover) */}
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                    {!notification.read && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                markAsRead(notification.id)
                                                            }}
                                                            className="p-1 rounded hover:bg-slate-200"
                                                            title="Mark as read"
                                                        >
                                                            <Check className="h-3 w-3 text-slate-600" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            archiveNotification(notification.id)
                                                        }}
                                                        className="p-1 rounded hover:bg-slate-200"
                                                        title="Archive"
                                                    >
                                                        <Trash2 className="h-3 w-3 text-slate-600" />
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="p-2 border-t border-slate-200 bg-slate-50">
                                <button
                                    onClick={clearAll}
                                    className="w-full text-center text-xs text-slate-600 hover:text-slate-900 py-2"
                                >
                                    Clear all notifications
                                </button>
                            </div>
                        )}
                    </Card>
                </>
            )}
        </div>
    )
}
