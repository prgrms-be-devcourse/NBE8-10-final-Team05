"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, Clock3, Eye, Flag, UserRound } from "lucide-react";
import MainHeader from "@/components/layout/MainHeader";
import ReportCreateDialog from "@/components/report/ReportCreateDialog";
import { requestData, requestVoid } from "@/lib/api/http-client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { toErrorMessage } from "@/lib/api/rs-data";
import { createReport } from "@/lib/report/report-service";
import type { ReportReasonCode } from "@/lib/report/report-types";

type PostCategory = "DAILY" | "WORRY" | "QUESTION";
type PostResolutionStatus = "ONGOING" | "RESOLVED";

type StoryDetail = {
  id: number;
  title: string;
  content: string;
  viewCount: number;
  createDate: string;
  modifyDate: string;
  thumbnail: string | null;
  category: PostCategory;
  resolutionStatus: PostResolutionStatus;
  authorid: number;
  nickname: string;
};

type ReplyInfo = {
  id: number;
  content: string;
  authorId: number;
  nickname: string;
  email: string;
  postId: number;
  createDate: string;
  modifyDate: string;
};

type CommentInfo = {
  id: number;
  content: string;
  authorId: number;
  nickname: string;
  email: string;
  postId: number;
  createDate: string;
  modifyDate: string;
  replies: ReplyInfo[];
};

type CommentSlice = {
  content: CommentInfo[];
  hasNext: boolean;
};

const CATEGORY_LABEL: Record<PostCategory, string> = {
  DAILY: "일상",
  WORRY: "고민",
  QUESTION: "질문",
};
const EDITABLE_STORY_CATEGORIES: PostCategory[] = ["WORRY", "DAILY", "QUESTION"];
const RESOLUTION_STATUS_LABEL: Record<PostResolutionStatus, string> = {
  ONGOING: "고민중",
  RESOLVED: "고민해결",
};
const RESOLUTION_STATUS_BADGE_CLASS: Record<PostResolutionStatus, string> = {
  ONGOING: "bg-[#fff4e8] text-[#a86b2e]",
  RESOLVED: "bg-[#eaf8ef] text-[#2f7d49]",
};

const MAX_COMMENT_CONTENT_LENGTH = 1000;
const DELETED_COMMENT_PLACEHOLDER = "[삭제된 댓글입니다.]";
const MENTION_SEGMENT_PATTERN = /(@[0-9A-Za-z._-가-힣]{2,30})/g;
const MENTION_TOKEN_PATTERN = /^@[0-9A-Za-z._-가-힣]{2,30}$/;

function parseStoryId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderContentWithMentions(content: string): ReactNode {
  const segments = content.split(MENTION_SEGMENT_PATTERN);

  return segments.map((segment, index) => {
    if (MENTION_TOKEN_PATTERN.test(segment)) {
      return (
        <span key={`mention-${index}`} className="font-semibold text-[#3d6fb9]">
          {segment}
        </span>
      );
    }

    return <span key={`text-${index}`}>{segment}</span>;
  });
}

function clampCommentContent(value: string): string {
  if (value.length <= MAX_COMMENT_CONTENT_LENGTH) {
    return value;
  }

  return value.slice(0, MAX_COMMENT_CONTENT_LENGTH);
}

function createOptimisticId(): number {
  return -(Date.now() + Math.floor(Math.random() * 1000));
}

function applyEditOptimistically(
  prevComments: CommentInfo[],
  commentId: number,
  content: string,
): CommentInfo[] {
  const nowIso = new Date().toISOString();

  return prevComments.map((comment) => {
    if (comment.id === commentId) {
      return {
        ...comment,
        content,
        modifyDate: nowIso,
      };
    }

    let changed = false;
    const nextReplies = comment.replies.map((reply) => {
      if (reply.id !== commentId) {
        return reply;
      }

      changed = true;
      return {
        ...reply,
        content,
        modifyDate: nowIso,
      };
    });

    if (!changed) {
      return comment;
    }

    return {
      ...comment,
      replies: nextReplies,
    };
  });
}

function applyDeleteOptimistically(prevComments: CommentInfo[], commentId: number): CommentInfo[] {
  return prevComments.flatMap((comment) => {
    if (comment.id === commentId) {
      if (comment.replies.length > 0) {
        return [
          {
            ...comment,
            content: DELETED_COMMENT_PLACEHOLDER,
            modifyDate: new Date().toISOString(),
          },
        ];
      }

      return [];
    }

    const nextReplies = comment.replies.filter((reply) => reply.id !== commentId);
    if (nextReplies.length !== comment.replies.length) {
      return [
        {
          ...comment,
          replies: nextReplies,
        },
      ];
    }

    return [comment];
  });
}

export default function StoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = useMemo(() => parseStoryId(params.id), [params.id]);
  const { isAuthenticated, member } = useAuthStore();

  const [story, setStory] = useState<StoryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentInfo[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentPage, setCommentPage] = useState(0);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [newCommentContent, setNewCommentContent] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyTargetId, setReplyTargetId] = useState<number | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [submittingReplyTargetId, setSubmittingReplyTargetId] = useState<number | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const [commentActionError, setCommentActionError] = useState<string | null>(null);
  const [isStoryEditMode, setIsStoryEditMode] = useState(false);
  const [storyEditTitle, setStoryEditTitle] = useState("");
  const [storyEditContent, setStoryEditContent] = useState("");
  const [storyEditCategory, setStoryEditCategory] = useState<PostCategory>("WORRY");
  const [isSavingStory, setIsSavingStory] = useState(false);
  const [isDeletingStory, setIsDeletingStory] = useState(false);
  const [isUpdatingResolution, setIsUpdatingResolution] = useState(false);
  const [storyActionError, setStoryActionError] = useState<string | null>(null);
  const [storyActionNotice, setStoryActionNotice] = useState<string | null>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportDialogKey, setReportDialogKey] = useState(0);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportErrorMessage, setReportErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchStoryDetail(postId: number): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const data = await requestData<StoryDetail>(`/api/v1/posts/${postId}`);
        if (!cancelled) {
          setStory(data);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setStory(null);
          setErrorMessage(toErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    if (storyId === null) {
      setStory(null);
      setErrorMessage("잘못된 고민 상세 경로입니다.");
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    void fetchStoryDetail(storyId);

    return () => {
      cancelled = true;
    };
  }, [storyId]);

  async function fetchComments(postId: number, page: number, append: boolean): Promise<void> {
    if (!append) {
      setIsCommentsLoading(true);
    }
    setCommentsError(null);

    try {
      const slice = await requestData<CommentSlice>(
        `/api/v1/posts/${postId}/comments?page=${page}&size=10`,
        {
          skipAuth: true,
          retryOnAuthFailure: false,
          authFailureRedirect: false,
        },
      );

      setComments((prev) => (append ? [...prev, ...slice.content] : slice.content));
      setCommentPage(page);
      setHasMoreComments(Boolean(slice.hasNext));
    } catch (error: unknown) {
      setCommentsError(toErrorMessage(error));
      if (!append) {
        setComments([]);
      }
    } finally {
      if (!append) {
        setIsCommentsLoading(false);
      }
    }
  }

  useEffect(() => {
    if (storyId === null) {
      setComments([]);
      setCommentsError(null);
      setCommentPage(0);
      setHasMoreComments(false);
      return;
    }

    void fetchComments(storyId, 0, false);
  }, [storyId]);

  useEffect(() => {
    if (!story) {
      return;
    }

    setStoryEditTitle(story.title);
    setStoryEditContent(story.content);
    setStoryEditCategory(story.category);
    setIsStoryEditMode(false);
    setStoryActionError(null);
  }, [story]);

  function isMyComment(authorId: number): boolean {
    return Boolean(member && member.id === authorId);
  }

  function openReplyEditor(commentId: number, targetNickname: string): void {
    setReplyTargetId(commentId);
    setReplyDrafts((prev) => {
      const mentionPrefix = `@${targetNickname} `;
      const current = prev[commentId] ?? "";
      const normalizedCurrent = current.trim();

      if (normalizedCurrent.length > 0 && !normalizedCurrent.startsWith("@")) {
        return prev;
      }

      return {
        ...prev,
        [commentId]: mentionPrefix,
      };
    });
  }

  async function handleCreateComment(): Promise<void> {
    if (storyId === null || isSubmittingComment) {
      return;
    }

    const content = newCommentContent.trim();
    if (!content) {
      setCommentActionError("댓글 내용을 입력해 주세요.");
      return;
    }

    if (!isAuthenticated) {
      setCommentActionError("댓글 작성은 로그인 후 가능합니다.");
      return;
    }

    setCommentActionError(null);
    setIsSubmittingComment(true);
    const optimisticId = createOptimisticId();
    const nowIso = new Date().toISOString();

    if (!member) {
      setCommentActionError("로그인 정보가 확인되지 않습니다. 잠시 후 다시 시도해 주세요.");
      setIsSubmittingComment(false);
      return;
    }

    const optimisticComment: CommentInfo = {
      id: optimisticId,
      content,
      authorId: member.id,
      nickname: member.nickname,
      email: member.email,
      postId: storyId,
      createDate: nowIso,
      modifyDate: nowIso,
      replies: [],
    };

    setComments((prev) => [optimisticComment, ...prev]);
    setNewCommentContent("");

    try {
      await requestVoid(`/api/v1/posts/${storyId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          parentCommentId: null,
        }),
        authFailureRedirect: false,
      });
      await fetchComments(storyId, 0, false);
    } catch (error: unknown) {
      setComments((prev) => prev.filter((comment) => comment.id !== optimisticId));
      setNewCommentContent(content);
      setCommentActionError(toErrorMessage(error));
    } finally {
      setIsSubmittingComment(false);
    }
  }

  async function handleCreateReply(parentCommentId: number): Promise<void> {
    if (storyId === null || submittingReplyTargetId !== null) {
      return;
    }

    const content = (replyDrafts[parentCommentId] ?? "").trim();
    if (!content) {
      setCommentActionError("답글 내용을 입력해 주세요.");
      return;
    }

    if (!isAuthenticated) {
      setCommentActionError("답글 작성은 로그인 후 가능합니다.");
      return;
    }

    setCommentActionError(null);
    setSubmittingReplyTargetId(parentCommentId);
    const optimisticId = createOptimisticId();
    const nowIso = new Date().toISOString();

    if (!member) {
      setCommentActionError("로그인 정보가 확인되지 않습니다. 잠시 후 다시 시도해 주세요.");
      setSubmittingReplyTargetId(null);
      return;
    }

    const optimisticReply: ReplyInfo = {
      id: optimisticId,
      content,
      authorId: member.id,
      nickname: member.nickname,
      email: member.email,
      postId: storyId,
      createDate: nowIso,
      modifyDate: nowIso,
    };

    setComments((prev) =>
      prev.map((comment) =>
        comment.id === parentCommentId
          ? {
              ...comment,
              replies: [...comment.replies, optimisticReply],
            }
          : comment,
      ),
    );
    setReplyDrafts((prev) => ({ ...prev, [parentCommentId]: "" }));
    setReplyTargetId(null);

    try {
      await requestVoid(`/api/v1/posts/${storyId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          parentCommentId,
        }),
        authFailureRedirect: false,
      });
      await fetchComments(storyId, 0, false);
    } catch (error: unknown) {
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === parentCommentId
            ? {
                ...comment,
                replies: comment.replies.filter((reply) => reply.id !== optimisticId),
              }
            : comment,
        ),
      );
      setReplyTargetId(parentCommentId);
      setReplyDrafts((prev) => ({ ...prev, [parentCommentId]: content }));
      setCommentActionError(toErrorMessage(error));
    } finally {
      setSubmittingReplyTargetId(null);
    }
  }

  function beginEdit(commentId: number, content: string): void {
    setCommentActionError(null);
    setEditingCommentId(commentId);
    setEditingContent(clampCommentContent(content));
  }

  function cancelEdit(): void {
    setEditingCommentId(null);
    setEditingContent("");
  }

  async function saveEdit(commentId: number): Promise<void> {
    if (storyId === null || isSavingEdit) {
      return;
    }

    const content = editingContent.trim();
    if (!content) {
      setCommentActionError("수정할 내용을 입력해 주세요.");
      return;
    }

    setCommentActionError(null);
    setIsSavingEdit(true);
    const previousComments = comments;
    setComments((prev) => applyEditOptimistically(prev, commentId, content));
    cancelEdit();

    try {
      await requestVoid(`/api/v1/comments/${commentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
        }),
        authFailureRedirect: false,
      });
    } catch (error: unknown) {
      setComments(previousComments);
      setEditingCommentId(commentId);
      setEditingContent(content);
      setCommentActionError(toErrorMessage(error));
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function deleteComment(commentId: number): Promise<void> {
    if (storyId === null || deletingCommentId !== null) {
      return;
    }

    if (!window.confirm("댓글을 삭제할까요?")) {
      return;
    }

    setCommentActionError(null);
    setDeletingCommentId(commentId);
    const previousComments = comments;
    setComments((prev) => applyDeleteOptimistically(prev, commentId));
    if (editingCommentId === commentId) {
      cancelEdit();
    }

    try {
      await requestVoid(`/api/v1/comments/${commentId}`, {
        method: "DELETE",
        authFailureRedirect: false,
      });
    } catch (error: unknown) {
      setComments(previousComments);
      setCommentActionError(toErrorMessage(error));
    } finally {
      setDeletingCommentId(null);
    }
  }

  function isStoryAuthor(): boolean {
    if (!member || !story) {
      return false;
    }

    return member.id === story.authorid;
  }

  function beginStoryEdit(): void {
    if (!story) {
      return;
    }

    setStoryActionError(null);
    setStoryActionNotice(null);
    setStoryEditTitle(story.title);
    setStoryEditContent(story.content);
    setStoryEditCategory(story.category);
    setIsStoryEditMode(true);
  }

  function cancelStoryEdit(): void {
    if (!story) {
      return;
    }

    setStoryEditTitle(story.title);
    setStoryEditContent(story.content);
    setStoryEditCategory(story.category);
    setIsStoryEditMode(false);
  }

  async function saveStoryEdit(): Promise<void> {
    if (!story || isSavingStory) {
      return;
    }

    const title = storyEditTitle.trim();
    const content = storyEditContent.trim();

    if (!title || !content) {
      setStoryActionError("제목과 내용을 모두 입력해 주세요.");
      return;
    }

    setStoryActionError(null);
    setStoryActionNotice(null);
    setIsSavingStory(true);

    try {
      await requestVoid(`/api/v1/posts/${story.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content,
          thumbnail: story.thumbnail,
          category: storyEditCategory,
        }),
      });

      setStory((prev) =>
        prev
          ? {
              ...prev,
              title,
              content,
              category: storyEditCategory,
              modifyDate: new Date().toISOString(),
            }
          : prev,
      );
      setIsStoryEditMode(false);
      setStoryActionNotice("게시글이 수정되었습니다.");
    } catch (error: unknown) {
      setStoryActionError(toErrorMessage(error));
    } finally {
      setIsSavingStory(false);
    }
  }

  async function toggleStoryResolutionStatus(): Promise<void> {
    if (!story || isUpdatingResolution) {
      return;
    }

    const nextStatus: PostResolutionStatus =
      story.resolutionStatus === "ONGOING" ? "RESOLVED" : "ONGOING";

    setStoryActionError(null);
    setStoryActionNotice(null);
    setIsUpdatingResolution(true);

    try {
      await requestVoid(`/api/v1/posts/${story.id}/resolution-status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resolutionStatus: nextStatus,
        }),
      });

      setStory((prev) =>
        prev
          ? {
              ...prev,
              resolutionStatus: nextStatus,
              modifyDate: new Date().toISOString(),
            }
          : prev,
      );
      setStoryActionNotice("해결 상태가 변경되었습니다.");
    } catch (error: unknown) {
      setStoryActionError(toErrorMessage(error));
    } finally {
      setIsUpdatingResolution(false);
    }
  }

  async function deleteStory(): Promise<void> {
    if (!story || isDeletingStory) {
      return;
    }

    if (!window.confirm("게시글을 삭제할까요? 삭제 후 복구할 수 없습니다.")) {
      return;
    }

    setStoryActionError(null);
    setStoryActionNotice(null);
    setIsDeletingStory(true);

    try {
      await requestVoid(`/api/v1/posts/${story.id}`, {
        method: "DELETE",
      });
      router.push("/stories");
    } catch (error: unknown) {
      setStoryActionError(toErrorMessage(error));
      setIsDeletingStory(false);
    }
  }

  function openStoryReportDialog(): void {
    if (!story) {
      return;
    }

    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(`/stories/${story.id}`)}`);
      return;
    }

    if (isStoryAuthor()) {
      setStoryActionError("본인 게시글은 신고할 수 없습니다.");
      return;
    }

    setStoryActionError(null);
    setStoryActionNotice(null);
    setReportErrorMessage(null);
    setReportDialogKey((prev) => prev + 1);
    setIsReportDialogOpen(true);
  }

  async function submitStoryReport(reason: ReportReasonCode, content: string): Promise<void> {
    if (!story || isSubmittingReport) {
      return;
    }

    setIsSubmittingReport(true);
    setReportErrorMessage(null);

    try {
      await createReport({
        targetId: story.id,
        targetType: "POST",
        reason,
        content: content.trim().length > 0 ? content.trim() : undefined,
      });
      setIsReportDialogOpen(false);
      setStoryActionNotice("신고가 접수되었습니다.");
    } catch (error: unknown) {
      setReportErrorMessage(toErrorMessage(error));
    } finally {
      setIsSubmittingReport(false);
    }
  }

  return (
    <div className="home-atmosphere min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-12 pt-7">
        <MainHeader />

        <section className="mx-auto mt-8 w-full max-w-5xl">
          <Link
            href="/stories"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#4f70a6] underline decoration-[#9eb5d4] underline-offset-4 transition hover:text-[#35527e]"
          >
            <ChevronLeft size={16} />
            고민 공유 목록
          </Link>

          {isLoading ? (
            <div className="home-panel mt-4 rounded-[28px] px-6 py-14 text-center text-[#5f7598]">
              고민 내용을 불러오는 중입니다.
            </div>
          ) : null}

          {!isLoading && errorMessage ? (
            <div className="home-panel mt-4 rounded-[28px] border border-[#f3d0d0] bg-[#fff8f8] px-6 py-12 text-center">
              <p className="text-[18px] font-semibold text-[#7a3d3d]">고민을 불러오지 못했습니다.</p>
              <p className="mt-2 text-sm text-[#9a4b4b]">{errorMessage}</p>
            </div>
          ) : null}

          {!isLoading && !errorMessage && story ? (
            <>
              <article className="home-panel mt-4 rounded-[32px] px-6 py-7 sm:px-8 sm:py-8">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#5b749a]">
                  <span className="rounded-full bg-[#edf5ff] px-3 py-1 text-[#486ca1]">
                    {CATEGORY_LABEL[story.category] ?? story.category}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 ${
                      RESOLUTION_STATUS_BADGE_CLASS[story.resolutionStatus]
                    }`}
                  >
                    {RESOLUTION_STATUS_LABEL[story.resolutionStatus]}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#f7fbff] px-3 py-1">
                    <Clock3 size={13} />
                    {formatDate(story.createDate)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#f7fbff] px-3 py-1">
                    <Eye size={13} />
                    조회 {story.viewCount}
                  </span>
                  <button
                    type="button"
                    onClick={openStoryReportDialog}
                    className="inline-flex items-center gap-1 rounded-full bg-[#fff4f4] px-3 py-1 text-[#b56060] transition hover:bg-[#ffecec]"
                  >
                    <Flag size={13} />
                    신고
                  </button>
                </div>

                {isStoryAuthor() ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => (isStoryEditMode ? cancelStoryEdit() : beginStoryEdit())}
                      disabled={isSavingStory || isDeletingStory || isUpdatingResolution}
                      className="rounded-[10px] bg-[#edf2f9] px-3 py-1.5 text-xs font-semibold text-[#4f70a6] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isStoryEditMode ? "수정 취소" : "게시글 수정"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleStoryResolutionStatus()}
                      disabled={isSavingStory || isDeletingStory || isUpdatingResolution}
                      className="rounded-[10px] bg-[#edf5ff] px-3 py-1.5 text-xs font-semibold text-[#3d6fb9] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isUpdatingResolution
                        ? "변경 중..."
                        : story.resolutionStatus === "ONGOING"
                          ? "해결됨으로 변경"
                          : "고민중으로 변경"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteStory()}
                      disabled={isSavingStory || isDeletingStory || isUpdatingResolution}
                      className="rounded-[10px] bg-[#fff1f1] px-3 py-1.5 text-xs font-semibold text-[#a45f5f] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isDeletingStory ? "삭제 중..." : "게시글 삭제"}
                    </button>
                  </div>
                ) : null}

                {storyActionError ? (
                  <div className="mt-4 rounded-[14px] border border-[#f3d0d0] bg-[#fff8f8] px-4 py-3 text-sm text-[#9a4b4b]">
                    {storyActionError}
                  </div>
                ) : null}
                {storyActionNotice ? (
                  <div className="mt-4 rounded-[14px] border border-[#d6eadb] bg-[#f1fbf4] px-4 py-3 text-sm text-[#3f7d50]">
                    {storyActionNotice}
                  </div>
                ) : null}

                {isStoryEditMode ? (
                  <div className="mt-6 rounded-[20px] border border-[#dce7fb] bg-[#f9fbff] p-4">
                    <div className="flex flex-wrap gap-2">
                      {EDITABLE_STORY_CATEGORIES.map((category) => {
                        const active = storyEditCategory === category;

                        return (
                          <button
                            key={category}
                            type="button"
                            onClick={() => setStoryEditCategory(category)}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                              active
                                ? "bg-[#4f8cf0] text-white"
                                : "bg-white text-[#5b749a] hover:bg-[#edf5ff]"
                            }`}
                          >
                            {CATEGORY_LABEL[category]}
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="text"
                      value={storyEditTitle}
                      onChange={(event) => setStoryEditTitle(event.target.value)}
                      placeholder="제목을 입력해 주세요."
                      className="mt-3 h-[52px] w-full rounded-[14px] border border-[#d8e4f7] bg-white px-4 text-[16px] text-[#2b4162] outline-none placeholder:text-[#9ab0cc] focus:border-[#8ab6ef] focus:ring-2 focus:ring-[#8ab6ef]/20"
                    />
                    <textarea
                      value={storyEditContent}
                      onChange={(event) => setStoryEditContent(event.target.value)}
                      placeholder="내용을 입력해 주세요."
                      className="mt-3 h-[220px] w-full resize-y rounded-[14px] border border-[#d8e4f7] bg-white px-4 py-3 text-[15px] leading-7 text-[#2b4162] outline-none placeholder:text-[#9ab0cc] focus:border-[#8ab6ef] focus:ring-2 focus:ring-[#8ab6ef]/20"
                    />
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelStoryEdit}
                        className="rounded-[10px] bg-[#edf2f9] px-4 py-2 text-sm font-semibold text-[#5f7598]"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveStoryEdit()}
                        disabled={isSavingStory}
                        className={`rounded-[10px] px-4 py-2 text-sm font-semibold text-white ${
                          isSavingStory
                            ? "cursor-not-allowed bg-[#b6c9e7]"
                            : "bg-[#4f8cf0] hover:bg-[#3f80eb]"
                        }`}
                      >
                        {isSavingStory ? "저장 중..." : "수정 저장"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="mt-6 text-[30px] font-semibold leading-[1.35] tracking-[-0.03em] text-[#223552] sm:text-[34px]">
                      {story.title}
                    </h1>

                    <p className="mt-8 whitespace-pre-wrap text-[16px] leading-8 text-[#415a7d]">
                      {story.content}
                    </p>
                  </>
                )}

                <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#e8f0fd] pt-5 text-sm text-[#6f84a5]">
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound size={15} />
                    {story.nickname}
                  </span>
                  <span>수정일 {formatDate(story.modifyDate)}</span>
                </div>
              </article>

              <section className="home-panel mt-5 rounded-[32px] px-6 py-7 sm:px-8 sm:py-8">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-[#223552]">댓글</h2>
                  <span className="text-sm text-[#6881a3]">{comments.length}개</span>
                </div>

                {commentActionError ? (
                  <div className="mt-4 rounded-[14px] border border-[#f3d0d0] bg-[#fff8f8] px-4 py-3 text-sm text-[#9a4b4b]">
                    {commentActionError}
                  </div>
                ) : null}

                <div className="mt-4 rounded-[20px] border border-[#dce7fb] bg-[#f9fbff] p-4">
                  <textarea
                    value={newCommentContent}
                    onChange={(event) => setNewCommentContent(clampCommentContent(event.target.value))}
                    placeholder={
                      isAuthenticated ? "댓글을 입력해 주세요." : "댓글은 로그인 후 작성할 수 있습니다."
                    }
                    disabled={!isAuthenticated || isSubmittingComment}
                    className="h-[96px] w-full resize-y rounded-[14px] border border-[#d8e4f7] bg-white px-4 py-3 text-[15px] leading-7 text-[#2b4162] outline-none placeholder:text-[#9ab0cc] focus:border-[#8ab6ef] focus:ring-2 focus:ring-[#8ab6ef]/20 disabled:cursor-not-allowed disabled:bg-[#f2f6fc]"
                  />
                  <div className="mt-2 text-right text-xs text-[#7a8ea9]">
                    {newCommentContent.length}/{MAX_COMMENT_CONTENT_LENGTH}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-[#7a8ea9]">
                      {isAuthenticated ? "예의 있는 대화 문화를 함께 지켜주세요." : "로그인 후 댓글을 작성할 수 있습니다."}
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleCreateComment()}
                      disabled={!isAuthenticated || isSubmittingComment || !newCommentContent.trim()}
                      className={`rounded-[12px] px-4 py-2 text-sm font-semibold text-white transition ${
                        !isAuthenticated || isSubmittingComment || !newCommentContent.trim()
                          ? "cursor-not-allowed bg-[#b6c9e7]"
                          : "bg-[#4f8cf0] hover:bg-[#3f80eb]"
                      }`}
                    >
                      {isSubmittingComment ? "등록 중..." : "댓글 등록"}
                    </button>
                  </div>
                </div>

                {isCommentsLoading ? (
                  <div className="mt-6 text-sm text-[#5f7598]">댓글을 불러오는 중입니다.</div>
                ) : null}

                {!isCommentsLoading && commentsError ? (
                  <div className="mt-6 rounded-[14px] border border-[#f3d0d0] bg-[#fff8f8] px-4 py-3 text-sm text-[#9a4b4b]">
                    댓글을 불러오지 못했습니다. {commentsError}
                  </div>
                ) : null}

                {!isCommentsLoading && !commentsError && comments.length === 0 ? (
                  <p className="mt-6 text-sm text-[#6f84a5]">첫 댓글을 남겨보세요.</p>
                ) : null}

                {!isCommentsLoading && !commentsError && comments.length > 0 ? (
                  <ul className="mt-6 space-y-4">
                    {comments.map((comment) => (
                      <li key={comment.id} className="rounded-[18px] border border-[#e2ebf8] bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-[#2f476b]">{comment.nickname}</p>
                          <div className="flex items-center gap-2 text-xs text-[#7a8ea9]">
                            <span>{formatDateTime(comment.modifyDate)}</span>
                            {isMyComment(comment.authorId) ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => beginEdit(comment.id, comment.content)}
                                  className="rounded px-2 py-1 font-semibold text-[#4f70a6] hover:bg-[#edf5ff]"
                                >
                                  수정
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void deleteComment(comment.id)}
                                  disabled={deletingCommentId === comment.id}
                                  className="rounded px-2 py-1 font-semibold text-[#a45f5f] hover:bg-[#fff1f1] disabled:cursor-not-allowed"
                                >
                                  삭제
                                </button>
                              </>
                            ) : null}
                          </div>
                        </div>

                        {editingCommentId === comment.id ? (
                          <div className="mt-3 space-y-2">
                            <textarea
                              value={editingContent}
                              onChange={(event) =>
                                setEditingContent(clampCommentContent(event.target.value))
                              }
                              className="h-[90px] w-full resize-y rounded-[12px] border border-[#d8e4f7] bg-white px-3 py-2 text-[15px] leading-7 text-[#2b4162] outline-none focus:border-[#8ab6ef] focus:ring-2 focus:ring-[#8ab6ef]/20"
                            />
                            <div className="text-right text-xs text-[#7a8ea9]">
                              {editingContent.length}/{MAX_COMMENT_CONTENT_LENGTH}
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="rounded-[10px] bg-[#edf2f9] px-3 py-1.5 text-xs font-semibold text-[#5f7598]"
                              >
                                취소
                              </button>
                              <button
                                type="button"
                                onClick={() => void saveEdit(comment.id)}
                                disabled={isSavingEdit || !editingContent.trim()}
                                className={`rounded-[10px] px-3 py-1.5 text-xs font-semibold text-white ${
                                  isSavingEdit || !editingContent.trim()
                                    ? "cursor-not-allowed bg-[#b6c9e7]"
                                    : "bg-[#4f8cf0] hover:bg-[#3f80eb]"
                                }`}
                              >
                                {isSavingEdit ? "저장 중..." : "저장"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-[#3e5678]">
                            {renderContentWithMentions(comment.content)}
                          </p>
                        )}

                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => openReplyEditor(comment.id, comment.nickname)}
                            disabled={!isAuthenticated}
                            className={`text-xs font-semibold ${
                              isAuthenticated
                                ? "text-[#4f70a6] hover:underline"
                                : "cursor-not-allowed text-[#a3b2c9]"
                            }`}
                          >
                            답글 달기
                          </button>
                        </div>

                        {replyTargetId === comment.id ? (
                          <div className="mt-3 rounded-[14px] border border-[#dce7fb] bg-[#f7faff] p-3">
                            <textarea
                              value={replyDrafts[comment.id] ?? ""}
                              onChange={(event) =>
                                setReplyDrafts((prev) => ({
                                  ...prev,
                                  [comment.id]: clampCommentContent(event.target.value),
                                }))
                              }
                              placeholder="답글을 입력해 주세요. (예: @닉네임)"
                              className="h-[86px] w-full resize-y rounded-[12px] border border-[#d8e4f7] bg-white px-3 py-2 text-[14px] leading-7 text-[#2b4162] outline-none focus:border-[#8ab6ef] focus:ring-2 focus:ring-[#8ab6ef]/20"
                            />
                            <div className="mt-2 text-right text-xs text-[#7a8ea9]">
                              {(replyDrafts[comment.id] ?? "").length}/{MAX_COMMENT_CONTENT_LENGTH}
                            </div>
                            <div className="mt-2 flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setReplyTargetId(null)}
                                className="rounded-[10px] bg-[#edf2f9] px-3 py-1.5 text-xs font-semibold text-[#5f7598]"
                              >
                                취소
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleCreateReply(comment.id)}
                                disabled={
                                  submittingReplyTargetId === comment.id ||
                                  !(replyDrafts[comment.id] ?? "").trim()
                                }
                                className={`rounded-[10px] px-3 py-1.5 text-xs font-semibold text-white ${
                                  submittingReplyTargetId === comment.id ||
                                  !(replyDrafts[comment.id] ?? "").trim()
                                    ? "cursor-not-allowed bg-[#b6c9e7]"
                                    : "bg-[#4f8cf0] hover:bg-[#3f80eb]"
                                }`}
                              >
                                {submittingReplyTargetId === comment.id ? "등록 중..." : "답글 등록"}
                              </button>
                            </div>
                          </div>
                        ) : null}

                        {comment.replies.length > 0 ? (
                          <ul className="mt-4 space-y-3">
                            {comment.replies.map((reply) => (
                              <li key={reply.id} className="rounded-[14px] border border-[#e2ebf8] bg-[#f8fbff] p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-xs font-semibold text-[#3a567e]">{reply.nickname}</p>
                                  <div className="flex items-center gap-2 text-[11px] text-[#7a8ea9]">
                                    <span>{formatDateTime(reply.modifyDate)}</span>
                                    <button
                                      type="button"
                                      onClick={() => openReplyEditor(comment.id, reply.nickname)}
                                      disabled={!isAuthenticated}
                                      className={`rounded px-2 py-1 font-semibold ${
                                        isAuthenticated
                                          ? "text-[#4f70a6] hover:bg-[#edf5ff]"
                                          : "cursor-not-allowed text-[#a3b2c9]"
                                      }`}
                                    >
                                      답글 달기
                                    </button>
                                    {isMyComment(reply.authorId) ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => beginEdit(reply.id, reply.content)}
                                          className="rounded px-2 py-1 font-semibold text-[#4f70a6] hover:bg-[#edf5ff]"
                                        >
                                          수정
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => void deleteComment(reply.id)}
                                          disabled={deletingCommentId === reply.id}
                                          className="rounded px-2 py-1 font-semibold text-[#a45f5f] hover:bg-[#fff1f1] disabled:cursor-not-allowed"
                                        >
                                          삭제
                                        </button>
                                      </>
                                    ) : null}
                                  </div>
                                </div>

                                {editingCommentId === reply.id ? (
                                  <div className="mt-2 space-y-2">
                                    <textarea
                                      value={editingContent}
                                      onChange={(event) =>
                                        setEditingContent(clampCommentContent(event.target.value))
                                      }
                                      className="h-[84px] w-full resize-y rounded-[10px] border border-[#d8e4f7] bg-white px-3 py-2 text-[14px] leading-7 text-[#2b4162] outline-none focus:border-[#8ab6ef] focus:ring-2 focus:ring-[#8ab6ef]/20"
                                    />
                                    <div className="text-right text-xs text-[#7a8ea9]">
                                      {editingContent.length}/{MAX_COMMENT_CONTENT_LENGTH}
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={cancelEdit}
                                        className="rounded-[10px] bg-[#edf2f9] px-3 py-1 text-xs font-semibold text-[#5f7598]"
                                      >
                                        취소
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void saveEdit(reply.id)}
                                        disabled={isSavingEdit || !editingContent.trim()}
                                        className={`rounded-[10px] px-3 py-1 text-xs font-semibold text-white ${
                                          isSavingEdit || !editingContent.trim()
                                            ? "cursor-not-allowed bg-[#b6c9e7]"
                                            : "bg-[#4f8cf0] hover:bg-[#3f80eb]"
                                        }`}
                                      >
                                        {isSavingEdit ? "저장 중..." : "저장"}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#415a7d]">
                                    {renderContentWithMentions(reply.content)}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {!isCommentsLoading && !commentsError && hasMoreComments ? (
                  <div className="mt-5 flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (storyId !== null) {
                          void fetchComments(storyId, commentPage + 1, true);
                        }
                      }}
                      className="rounded-[12px] border border-[#d2def3] bg-white px-4 py-2 text-sm font-semibold text-[#4f70a6] transition hover:bg-[#f2f7ff]"
                    >
                      댓글 더보기
                    </button>
                  </div>
                ) : null}
              </section>
            </>
          ) : null}
        </section>
      </div>
      <ReportCreateDialog
        key={reportDialogKey}
        open={isReportDialogOpen}
        targetLabel="게시글"
        isSubmitting={isSubmittingReport}
        errorMessage={reportErrorMessage}
        onClose={() => setIsReportDialogOpen(false)}
        onSubmit={submitStoryReport}
      />
    </div>
  );
}
