"use client";
import { useEffect, useState } from "react";
import type { Shipment, Order } from "@/lib/types";
import { Card, Badge } from "@/components/ui";
import { MapPin, Truck, Package } from "lucide-react";

interface TrackingMapProps {
  shipment: Shipment;
  order?: Order;
}

export default function TrackingMap({ shipment, order }: TrackingMapProps) {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  // محاكاة بيانات الموقع - في التطبيق الحقيقي سيتم جلبها من API
  useEffect(() => {
    if (shipment.trackingNumber) {
      // محاكاة تغيير الموقع كل 30 ثانية
      const interval = setInterval(() => {
        setCurrentLocation({
          lat: 36.7538 + (Math.random() - 0.5) * 0.1,
          lng: 3.0588 + (Math.random() - 0.5) * 0.1
        });
      }, 30000);

      // تعيين الموقع الأولي
      setCurrentLocation({
        lat: 36.7538,
        lng: 3.0588
      });

      return () => clearInterval(interval);
    }
  }, [shipment.trackingNumber]);

  // محاكاة خريطة - في التطبيق الحقيقي سيتم استخدام مكتبة مثل Leaflet أو Google Maps
  const renderMap = () => {
    if (!currentLocation) return null;

    return (
      <div className="relative h-64 bg-warmbeige rounded-lg overflow-hidden border border-brown/10">
        {/* خريطة محاكاة */}
        <div className="absolute inset-0 bg-gradient-to-br from-cream to-warmbeige">
          {/* شبكة الخريطة */}
          <div className="absolute inset-0 opacity-20">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="absolute border-b border-brown/10" style={{ top: `${(i * 10)}%`, width: '100%' }}></div>
            ))}
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="absolute border-r border-brown/10" style={{ left: `${(i * 10)}%`, height: '100%' }}></div>
            ))}
          </div>

          {/* نقطة البداية */}
          <div className="absolute" style={{ top: '30%', left: '20%' }}>
            <div className="w-4 h-4 bg-gold rounded-full border-2 border-white shadow-md"></div>
            <div className="text-xs font-bold text-brown mt-1">مركزنا</div>
          </div>

          {/* نقطة الوصول */}
          <div className="absolute" style={{ top: '70%', left: '80%' }}>
            <div className="w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-md"></div>
            <div className="text-xs font-bold text-brown mt-1">الوجهة</div>
          </div>

          {/* الموقع الحالي للشاحنة */}
          <div className="absolute animate-pulse" style={{ top: `${currentLocation.lat * 100}%`, left: `${currentLocation.lng * 100}%` }}>
            <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
              <Truck className="w-3 h-3 text-white" />
            </div>
            <div className="text-xs font-bold text-red-600 mt-1">الموقع الحالي</div>
          </div>

          {/* خط المسار */}
          <div className="absolute" style={{ top: '30%', left: '20%', width: '60%', height: '40%' }}>
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path 
                d="M 0,0 Q 25,20 50,50 T 100,100" 
                fill="none" 
                stroke="#E7BD75" 
                strokeWidth="2" 
                strokeDasharray="5,5"
              />
            </svg>
          </div>
        </div>

        {/* معلومات التتبع */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm p-3 border-t border-brown/10">
          <div className="flex justify-between items-center">
            <div className="text-sm font-bold text-brown">رقم التتبع: {shipment.trackingNumber}</div>
            <Badge className={shipment.status === "delivered" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}>
              {shipment.status === "delivered" ? "تم التوصيل" : "قيد التوصيل"}
            </Badge>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="!p-0">
      <div className="p-4">
        <h3 className="h2 flex items-center gap-2 mb-3">
          <MapPin className="w-5 h-5 text-golddark" />
          تتبع الشحنة
        </h3>

        {shipment.trackingNumber ? (
          <>
            {renderMap()}

            {/* سجل التتبع */}
            <div className="mt-4">
              <h4 className="font-bold text-brown mb-2">سجل التتبع</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {shipment.events.map((event, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 bg-gold rounded-full"></div>
                      {index < shipment.events.length - 1 && <div className="w-0.5 h-full bg-brown/10"></div>}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="text-sm font-bold text-brown">{event.status}</div>
                      <div className="text-xs text-brown/60">{event.detail}</div>
                      <div className="text-xs text-brown/40 mt-1">{new Date(event.at).toLocaleString("ar-DZ")}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-brown/60">
            <Package className="w-12 h-12 mx-auto mb-2 text-brown/30" />
            <p>لا يوجد رقم تتبع لهذه الشحنة</p>
          </div>
        )}
      </div>
    </Card>
  );
}
