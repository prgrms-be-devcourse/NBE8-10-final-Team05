"use client";

import React, { useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { requestData } from "@/lib/api/http-client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { getPublicApiBaseUrl, joinUrl } from "@/lib/runtime/deployment-env";

const API_BASE_URL = getPublicApiBaseUrl();
const SUBSCRIBE_TICKET_PATH = "/api/v1/notifications/subscribe-ticket";
const RECONNECT_DELAY_MS = 3000;

interface NotificationSubscriptionTicketResponse {
  ticket: string;
  expiresInSeconds: number;
}

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { isAuthenticated } = useAuthStore();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const isConnectingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const clearReconnectTimer = () => {
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const closeConnection = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };

    if (!isAuthenticated) {
      clearReconnectTimer();
      closeConnection();
      return;
    }

    const scheduleReconnect = () => {
      if (cancelled || !isAuthenticated || reconnectTimeoutRef.current !== null) {
        return;
      }

      reconnectTimeoutRef.current = window.setTimeout(() => {
        reconnectTimeoutRef.current = null;
        void openConnection();
      }, RECONNECT_DELAY_MS);
    };

    const openConnection = async () => {
      if (cancelled || !isAuthenticated || eventSourceRef.current || isConnectingRef.current) {
        return;
      }

      isConnectingRef.current = true;

      try {
        console.log("📡 통합 알림 시스템 SSE 연결 시작...");
        const { ticket } = await requestData<NotificationSubscriptionTicketResponse>(
          SUBSCRIBE_TICKET_PATH,
          {
            method: "POST",
          },
        );

        if (cancelled || !isAuthenticated) {
          return;
        }

        const subscribeUrl = new URL(
          joinUrl(API_BASE_URL, "/api/v1/notifications/subscribe"),
        );
        subscribeUrl.searchParams.set("ticket", ticket);

        const es = new EventSource(subscribeUrl.toString(), {
          withCredentials: true,
        });

        eventSourceRef.current = es;

        es.addEventListener("connect", (e: MessageEvent) => {
          console.log("🚀 SSE 연결 성공:", e.data);
        });

        es.addEventListener("new_letter", (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            toast.success(data.message || "새로운 편지가 도착했습니다!", {
              icon: "✉️",
              duration: 5000,
            });
          } catch {
            toast.success(e.data, { icon: "✉️", duration: 5000 });
          }
          window.dispatchEvent(new CustomEvent("notification_received"));
        });

        es.addEventListener("letter_read", (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            toast.success(data.message || "상대방이 편지를 읽었습니다.", {
              icon: "📖",
              duration: 5000,
            });
          } catch {
            toast.success(e.data, { icon: "📖", duration: 5000 });
          }
          window.dispatchEvent(new CustomEvent("notification_received"));
        });

        es.addEventListener("writing_status", () => {
          window.dispatchEvent(new CustomEvent("notification_received"));
        });

        es.addEventListener("reply_arrival", (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            toast.success(data.message || "답장이 도착했습니다!", {
              icon: "✍️",
              duration: 5000,
            });
          } catch {
            toast.success(e.data, { icon: "✍️", duration: 5000 });
          }
          window.dispatchEvent(new CustomEvent("notification_received"));
        });

        es.onerror = (error) => {
          console.error("SSE 연결 오류:", error);
          if (eventSourceRef.current === es) {
            eventSourceRef.current = null;
          }
          es.close();
          scheduleReconnect();
        };
      } catch (error) {
        console.error("SSE 구독 티켓 발급 오류:", error);
        scheduleReconnect();
      } finally {
        isConnectingRef.current = false;
      }
    };

    void openConnection();

    return () => {
      cancelled = true;
      clearReconnectTimer();
      closeConnection();
      isConnectingRef.current = false;
    };
  }, [isAuthenticated]);

  return <>{children}</>;
};
