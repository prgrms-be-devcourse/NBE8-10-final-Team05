import { requestVoid } from "@/lib/api/http-client";
import { getPublicApiBaseUrl, joinUrl } from "@/lib/runtime/deployment-env";

const API_BASE_URL = getPublicApiBaseUrl();
const CONSULTATION_CONNECT_PATH = "/api/v1/consultations/connect";
const CONSULTATION_CHAT_PATH = "/api/v1/consultations/chat";

interface ConsultationChatRequest {
  message: string;
}

/** 상담 SSE 연결을 연다. */
export function openConsultationStream(): EventSource {
  return new EventSource(joinUrl(API_BASE_URL, CONSULTATION_CONNECT_PATH), {
    withCredentials: true,
  });
}

/** 상담 메시지를 전송한다. */
export async function sendConsultationMessage(message: string): Promise<void> {
  const requestBody: ConsultationChatRequest = { message };
  await requestVoid(CONSULTATION_CHAT_PATH, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
}
