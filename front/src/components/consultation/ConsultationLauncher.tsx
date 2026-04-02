"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoaderCircle, MessageCircle, SendHorizontal, X } from "lucide-react";
import { toErrorMessage } from "@/lib/api/rs-data";
import { useAuthStore } from "@/lib/auth/auth-store";
import {
  openConsultationStream,
  sendConsultationMessage,
} from "@/lib/consultation/consultation-service";
import type {
  ConsultationConnectionState,
  ConsultationMessage,
  ConsultationMessageRole,
} from "@/lib/consultation/types";

const MAX_MESSAGE_LENGTH = 600;
const HIDDEN_PATH_PREFIXES = ["/login", "/forbidden", "/admin"];

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createMessage(
  role: ConsultationMessageRole,
  content: string,
): ConsultationMessage {
  return {
    id: createMessageId(),
    role,
    content,
    createdAt: Date.now(),
  };
}

/** 우측 하단 상담 런처 + 모달 채팅 UI */
export default function ConsultationLauncher() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, hasRestored } = useAuthStore();

  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionState, setConnectionState] =
    useState<ConsultationConnectionState>("idle");
  const [messages, setMessages] = useState<ConsultationMessage[]>([
    createMessage(
      "SYSTEM",
      "상담을 시작하려면 메시지를 입력해 주세요. 대화 내용은 서비스 품질 향상을 위해 저장될 수 있습니다.",
    ),
  ]);

  const eventSourceRef = useRef<EventSource | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const isHiddenPath = useMemo(() => {
    const currentPath = pathname ?? "";
    return HIDDEN_PATH_PREFIXES.some((prefix) => currentPath.startsWith(prefix));
  }, [pathname]);

  const finalizeStreaming = useCallback(() => {
    streamingMessageIdRef.current = null;
    setIsStreaming(false);
  }, []);

  const appendSystemMessage = useCallback((content: string) => {
    setMessages((prev) => [...prev, createMessage("SYSTEM", content)]);
  }, []);

  const appendAssistantChunk = useCallback((chunk: string) => {
    if (!chunk) {
      return;
    }

    setIsStreaming(true);
    setMessages((prev) => {
      const targetId = streamingMessageIdRef.current;
      if (!targetId) {
        const message = createMessage("ASSISTANT", chunk);
        streamingMessageIdRef.current = message.id;
        return [...prev, message];
      }

      return prev.map((message) => {
        if (message.id !== targetId) {
          return message;
        }

        return {
          ...message,
          content: `${message.content}${chunk}`,
        };
      });
    });
  }, []);

  useEffect(() => {
    if (!isOpen || !isAuthenticated) {
      return;
    }

    setConnectionState("connecting");
    const eventSource = openConsultationStream();
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("connect", () => {
      setConnectionState("connected");
    });

    eventSource.addEventListener("chat", (event: Event) => {
      const message = event as MessageEvent<string>;
      setConnectionState("connected");
      appendAssistantChunk(message.data ?? "");
    });

    eventSource.addEventListener("chat_done", () => {
      finalizeStreaming();
    });

    eventSource.addEventListener("chat_error", (event: Event) => {
      const message = event as MessageEvent<string>;
      appendSystemMessage(
        message.data || "상담 응답 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      );
      finalizeStreaming();
    });

    eventSource.onerror = () => {
      setConnectionState("error");
      finalizeStreaming();
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
      finalizeStreaming();
    };
  }, [
    appendAssistantChunk,
    appendSystemMessage,
    finalizeStreaming,
    isAuthenticated,
    isOpen,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    viewport.scrollTop = viewport.scrollHeight;
  }, [isOpen, messages]);

  const openChat = useCallback(() => {
    if (!hasRestored) {
      return;
    }

    if (!isAuthenticated) {
      const next = encodeURIComponent(pathname || "/");
      router.push(`/login?next=${next}`);
      return;
    }

    setIsOpen(true);
  }, [hasRestored, isAuthenticated, pathname, router]);

  const closeChat = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    finalizeStreaming();
    setConnectionState("idle");
    setIsOpen(false);
  }, [finalizeStreaming]);

  const submitMessage = useCallback(async () => {
    const content = draft.trim();
    if (!content || isSending || isStreaming || connectionState !== "connected") {
      return;
    }

    if (content.length > MAX_MESSAGE_LENGTH) {
      appendSystemMessage(`메시지는 최대 ${MAX_MESSAGE_LENGTH}자까지 입력할 수 있습니다.`);
      return;
    }

    const assistantPlaceholderId = createMessageId();
    streamingMessageIdRef.current = assistantPlaceholderId;
    setMessages((prev) => [
      ...prev,
      createMessage("USER", content),
      {
        id: assistantPlaceholderId,
        role: "ASSISTANT",
        content: "",
        createdAt: Date.now(),
      },
    ]);
    setDraft("");
    setIsSending(true);
    setIsStreaming(true);

    try {
      await sendConsultationMessage(content);
    } catch (error) {
      const errorMessage = toErrorMessage(error);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantPlaceholderId
            ? { ...message, role: "SYSTEM", content: `전송 실패: ${errorMessage}` }
            : message,
        ),
      );
      finalizeStreaming();
    } finally {
      setIsSending(false);
    }
  }, [
    appendSystemMessage,
    connectionState,
    draft,
    finalizeStreaming,
    isSending,
    isStreaming,
  ]);

  if (isHiddenPath) {
    return null;
  }

  const isLauncherDisabled = !hasRestored;
  const isConnected = connectionState === "connected";
  const sendDisabled =
    !isConnected || isSending || isStreaming || draft.trim().length === 0;

  return (
    <>
      <button
        type="button"
        onClick={openChat}
        disabled={isLauncherDisabled}
        className="fixed bottom-6 right-6 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-[#3f80eb] text-white shadow-[0_18px_40px_-20px_rgba(63,128,235,0.9)] transition hover:scale-105 hover:bg-[#2f72df] disabled:cursor-not-allowed disabled:bg-[#9eb8de]"
        aria-label="상담 채팅 열기"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-end bg-black/35 p-4 sm:items-center sm:justify-center sm:p-6">
          <section className="flex h-[72vh] w-full max-w-[440px] flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_30px_90px_-35px_rgba(19,40,85,0.6)]">
            <header className="flex items-center justify-between border-b border-[#e7eefb] px-4 py-3">
              <div>
                <h2 className="text-[17px] font-semibold text-[#223552]">실시간 상담</h2>
                <p className="mt-0.5 text-xs text-[#7488a7]">
                  {isConnected
                    ? "연결됨"
                    : connectionState === "connecting"
                      ? "연결 중..."
                      : "연결 불안정 (자동 재연결 시도 중)"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeChat}
                className="rounded-full p-1 text-[#6880a5] transition hover:bg-[#eff4fc] hover:text-[#34517a]"
                aria-label="상담 채팅 닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div ref={viewportRef} className="flex-1 space-y-3 overflow-y-auto bg-[#f7faff] px-4 py-4">
              {messages.map((message) => {
                const isUserMessage = message.role === "USER";
                const isSystemMessage = message.role === "SYSTEM";
                return (
                  <div
                    key={message.id}
                    className={`flex ${isUserMessage ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[14px] leading-6 ${
                        isUserMessage
                          ? "rounded-br-md bg-[#3f80eb] text-white"
                          : isSystemMessage
                            ? "rounded-bl-md border border-[#f0d1d1] bg-[#fff7f7] text-[#954d4d]"
                            : "rounded-bl-md bg-white text-[#2a3f61] shadow-[0_10px_25px_-18px_rgba(20,45,92,0.45)]"
                      }`}
                    >
                      {message.content || (isStreaming ? "응답 작성 중..." : "")}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-[#e7eefb] bg-white px-4 py-3">
              <div className="mb-2 flex items-center justify-between text-xs text-[#7a8faf]">
                <span>
                  {isStreaming
                    ? "상담사가 답변을 작성 중입니다..."
                    : "메시지를 입력한 뒤 전송 버튼을 눌러주세요."}
                </span>
                <span>{draft.length}/{MAX_MESSAGE_LENGTH}</span>
              </div>

              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="고민을 입력해 주세요."
                  maxLength={MAX_MESSAGE_LENGTH}
                  className="h-[88px] flex-1 resize-none rounded-[12px] border border-[#d6e2f4] bg-white px-3 py-2 text-[14px] leading-6 text-[#2a3f61] outline-none placeholder:text-[#9ab0cc] focus:border-[#8ab6ef] focus:ring-2 focus:ring-[#8ab6ef]/20"
                />
                <button
                  type="button"
                  onClick={() => void submitMessage()}
                  disabled={sendDisabled}
                  className={`flex h-11 w-11 items-center justify-center rounded-full text-white transition ${
                    sendDisabled
                      ? "cursor-not-allowed bg-[#b7c9e6]"
                      : "bg-[#3f80eb] hover:bg-[#2f72df]"
                  }`}
                  aria-label="상담 메시지 전송"
                >
                  {isSending ? (
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                  ) : (
                    <SendHorizontal className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
