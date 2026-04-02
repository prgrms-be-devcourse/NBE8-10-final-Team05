export type ConsultationMessageRole = "USER" | "ASSISTANT" | "SYSTEM";

export interface ConsultationMessage {
  id: string;
  role: ConsultationMessageRole;
  content: string;
  createdAt: number;
}

export type ConsultationConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "error";
