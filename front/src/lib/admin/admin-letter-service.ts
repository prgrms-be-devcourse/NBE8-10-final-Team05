import { requestData } from "@/lib/api/http-client";
import type {
  AdminLetterDetail,
  AdminLetterListItem,
} from "@/lib/admin/admin-letter-types";

const ADMIN_LETTERS_PATH = "/api/v1/admin/letters";

export async function getAdminLetters(): Promise<AdminLetterListItem[]> {
  return requestData<AdminLetterListItem[]>(ADMIN_LETTERS_PATH);
}

export async function getAdminLetterDetail(id: number): Promise<AdminLetterDetail> {
  return requestData<AdminLetterDetail>(`${ADMIN_LETTERS_PATH}/${id}`);
}
