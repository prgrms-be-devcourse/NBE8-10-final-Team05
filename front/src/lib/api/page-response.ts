export interface PageResponseLike<T> {
  content?: T[];
  totalElements?: number | null;
  numberOfElements?: number | null;
}

export function resolvePageContent<T>(page: PageResponseLike<T> | null | undefined): T[] {
  return Array.isArray(page?.content) ? page.content : [];
}

export function resolveTotalElements<T>(
  page: PageResponseLike<T> | null | undefined,
): number {
  if (typeof page?.totalElements === "number" && Number.isFinite(page.totalElements)) {
    return page.totalElements;
  }

  if (
    typeof page?.numberOfElements === "number" &&
    Number.isFinite(page.numberOfElements)
  ) {
    return page.numberOfElements;
  }

  return resolvePageContent(page).length;
}
