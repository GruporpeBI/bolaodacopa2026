"use client";

import { useEffect, useRef } from "react";
import { selfCheckIn } from "./actions";

interface CheckInTriggerProps {
  gameId: string | null;
  restaurantLat: number;
  restaurantLng: number;
  radiusM: number;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function CheckInTrigger({ gameId, restaurantLat, restaurantLng, radiusM }: CheckInTriggerProps) {
  const ran = useRef(false);

  useEffect(() => {
    if (!gameId || ran.current || !navigator.geolocation) return;
    ran.current = true;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const dist = haversineMeters(
          pos.coords.latitude,
          pos.coords.longitude,
          restaurantLat,
          restaurantLng
        );
        if (dist <= radiusM) {
          await selfCheckIn(gameId).catch(() => {});
        }
      },
      () => {}, // negou permissão → silencioso
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
    );
  }, [gameId, restaurantLat, restaurantLng, radiusM]);

  return null;
}
