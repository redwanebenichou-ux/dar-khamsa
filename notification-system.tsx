"use client";
import { useEffect, useState } from "react";
import { Card, Button } from "@/components/ui";
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  action?: { label: string; onClick: () => void };
}

export default function NotificationSystem() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // إضافة إشعار جديد
  const addNotification = (notification: Omit<Notification, "id">) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = { ...notification, id };

    setNotifications(prev => [...prev, newNotification]);

    // إزالة الإشعار تلقائياً إذا لم يكن دائمياً
    if (!newNotification.persistent && newNotification.duration !== 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration || 5000);
    }

    return id;
  };

  // إزالة إشعار
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  // إشعار نجاح
  const success = (title: string, message?: string, duration?: number) => {
    return addNotification({ type: "success", title, message, duration });
  };

  // إشعار خطأ
  const error = (title: string, message?: string, duration?: number) => {
    return addNotification({ type: "error", title, message, duration });
  };

  // إشتحذير
  const warning = (title: string, message?: string, duration?: number) => {
    return addNotification({ type: "warning", title, message, duration });
  };

  // معلومات
  const info = (title: string, message?: string, duration?: number) => {
    return addNotification({ type: "info", title, message, duration });
  };

  // عرض الإشعارات
  const renderNotifications = () => {
    return notifications.map(notification => (
      <Card 
        key={notification.id} 
        className={`mb-3 transition-all duration-300 ${notification.type === "success" ? "border-green-200 bg-green-50" : 
          notification.type === "error" ? "border-red-200 bg-red-50" : 
          notification.type === "warning" ? "border-yellow-200 bg-yellow-50" : 
          "border-blue-200 bg-blue-50"}`}
      >
        <div className="flex items-start gap-3 p-4">
          {notification.type === "success" && <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />}
          {notification.type === "error" && <XCircle className="w-5 h-5 text-red-600 mt-0.5" />}
          {notification.type === "warning" && <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />}
          {notification.type === "info" && <Info className="w-5 h-5 text-blue-600 mt-0.5" />}

          <div className="flex-1">
            <h4 className="font-bold text-brown">{notification.title}</h4>
            {notification.message && <p className="text-sm text-brown/70 mt-1">{notification.message}</p>}
          </div>

          <div className="flex gap-2">
            {notification.action && (
              <Button size="sm" variant="ghost" onClick={notification.action.onClick}>
                {notification.action.label}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => removeNotification(notification.id)}>
              إغلاق
            </Button>
          </div>
        </div>
      </Card>
    ));
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      {renderNotifications()}
    </div>
  );
}

// ملف منفصل للوصول إلى النظام من أي مكان
export const useNotification = () => {
  const [_, setForceUpdate] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, "id">) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = { ...notification, id };

    setNotifications(prev => [...prev, newNotification]);

    if (!newNotification.persistent && newNotification.duration !== 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration || 5000);
    }

    return id;
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
    setForceUpdate(prev => prev + 1); // إعادة التصيير
  };

  const success = (title: string, message?: string, duration?: number) => {
    return addNotification({ type: "success", title, message, duration });
  };

  const error = (title: string, message?: string, duration?: number) => {
    return addNotification({ type: "error", title, message, duration });
  };

  const warning = (title: string, message?: string, duration?: number) => {
    return addNotification({ type: "warning", title, message, duration });
  };

  const info = (title: string, message?: string, duration?: number) => {
    return addNotification({ type: "info", title, message, duration });
  };

  return { 
    notifications, 
    addNotification, 
    removeNotification,
    success,
    error,
    warning,
    info
  };
};
