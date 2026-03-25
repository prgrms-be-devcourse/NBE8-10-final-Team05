"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, ImageIcon, Loader2, Lock, Globe } from "lucide-react";
import { requestData } from "@/lib/api/http-client";

interface DiaryDetail {
  id: number;
  title: string;
  content: string;
  isPrivate: boolean;
  categoryName: string;
}

export default function DiaryEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 드래그 가이드 상태
  const [dropIndicator, setDropIndicator] = useState<{
    top: number;
    left: number;
    height: number;
    visible: boolean;
  }>({
    top: 0,
    left: 0,
    height: 0,
    visible: false,
  });
  const [dropTarget, setDropTarget] = useState<{
    node: Node | null;
    offset: "before" | "after";
  }>({
    node: null,
    offset: "after",
  });

  // 1. 기존 데이터 불러오기
  useEffect(() => {
    const fetchOriginalData = async () => {
      try {
        const data = await requestData<DiaryDetail>(`/api/v1/diaries/${id}`);
        setTitle(data.title);
        setIsPrivate(data.isPrivate);
        if (editorRef.current) {
          // 기존 HTML 주입
          editorRef.current.innerHTML = data.content || "<p><br></p>";
        }
      } catch (error) {
        alert("기록을 불러올 수 없습니다.");
        router.back();
      } finally {
        setIsLoading(false);
      }
    };
    fetchOriginalData();
  }, [id, router]);

  // 🧹 불필요한 빈 줄 정리 (연속된 빈 p태그 삭제)
  const optimizeEmptyLines = () => {
    if (!editorRef.current) return;
    const children = Array.from(editorRef.current.children);
    children.forEach((child, index) => {
      if (
        child.tagName === "P" &&
        child.innerHTML === "<br>" &&
        children[index + 1]?.tagName === "P" &&
        children[index + 1].innerHTML === "<br>"
      ) {
        child.remove();
      }
    });
  };

  const executeInsert = (
    element: HTMLElement,
    targetNode: Node | null,
    offset: "before" | "after",
  ) => {
    if (!editorRef.current) return;
    const parent = editorRef.current;
    const actualTarget =
      targetNode && parent.contains(targetNode) ? targetNode : null;

    if (actualTarget) {
      if (offset === "before") parent.insertBefore(element, actualTarget);
      else parent.insertBefore(element, actualTarget.nextSibling);
    } else {
      parent.appendChild(element);
    }

    // 사진 뒤에 글을 쓸 공간이 없으면 빈 줄 자동 생성
    const nextEl = element.nextElementSibling;
    if (!nextEl || nextEl.tagName !== "P" || nextEl.innerHTML !== "<br>") {
      const p = document.createElement("p");
      p.innerHTML = "<br>";
      element.after(p);
    }
    setTimeout(optimizeEmptyLines, 10);
  };

  const createFigure = (base64Str: string) => {
    const figure = document.createElement("figure");
    figure.id = `img-${Date.now()}`;
    figure.contentEditable = "false";
    figure.draggable = true;
    figure.className =
      "relative my-4 mx-auto w-fit group cursor-move select-none";
    figure.innerHTML = `
      <img src="${base64Str}" class="max-w-full rounded-xl shadow-sm border border-slate-100 block pointer-events-none">
      <button type="button" class="remove-btn absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-md">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;
    figure.querySelector(".remove-btn")?.addEventListener("click", () => {
      figure.remove();
      optimizeEmptyLines();
    });
    return figure;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editorRef.current) return;

    const target = document.elementFromPoint(
      e.clientX,
      e.clientY,
    ) as HTMLElement;
    const block = target?.closest(".editor-area > *") as HTMLElement;

    if (block && editorRef.current.contains(block)) {
      const rect = block.getBoundingClientRect();
      const isBefore = e.clientY - rect.top < rect.height / 2;
      setDropIndicator({
        top: rect.top + window.scrollY,
        left: isBefore
          ? rect.left + window.scrollX - 2
          : rect.right + window.scrollX - 2,
        height: rect.height,
        visible: true,
      });
      setDropTarget({ node: block, offset: isBefore ? "before" : "after" });
    } else {
      setDropIndicator((prev) => ({ ...prev, visible: false }));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropIndicator((prev) => ({ ...prev, visible: false }));

    const draggedId = e.dataTransfer.getData("dragged-id");
    const files = Array.from(e.dataTransfer.files);

    if (draggedId) {
      const element = document.getElementById(draggedId);
      if (element && element !== dropTarget.node) {
        executeInsert(element, dropTarget.node, dropTarget.offset);
      }
    } else if (files.length > 0) {
      files.forEach((file) => {
        if (!file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const figure = createFigure(ev.target?.result as string);
          executeInsert(figure, dropTarget.node, dropTarget.offset);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleUpdate = async () => {
    if (!title.trim()) return alert("제목을 입력해주세요.");
    const content = editorRef.current?.innerHTML || "";
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      const updateData = { title, content, categoryName: "일상", isPrivate };
      formData.append(
        "data",
        new Blob([JSON.stringify(updateData)], { type: "application/json" }),
      );
      await requestData(`/api/v1/diaries/${id}`, {
        method: "PUT",
        body: formData,
      });
      alert("기록이 수정되었습니다.");
      router.push(`/diaries/${id}`);
      router.refresh();
    } catch (error) {
      alert("수정 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-sky-400" size={48} />
      </div>
    );

  return (
    <div
      className="min-h-screen bg-white text-slate-900 pb-24"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
    >
      {/* 🔹 하늘색 세로 커서 */}
      {dropIndicator.visible && (
        <div
          className="fixed w-[3px] bg-sky-400 z-[150] pointer-events-none shadow-[0_0_8px_rgba(56,189,248,0.5)]"
          style={{
            top: dropIndicator.top,
            left: dropIndicator.left,
            height: `${dropIndicator.height}px`,
          }}
        />
      )}

      {/* 상단바 */}
      <header className="sticky top-0 z-[100] bg-white border-b border-slate-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={() => router.push(`/diaries/${id}`)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ChevronLeft size={28} />
          </button>
          <input
            type="text"
            placeholder="제목"
            className="text-xl font-bold border-none focus:ring-0 w-full outline-none"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <button
          onClick={handleUpdate}
          disabled={isSubmitting}
          className="bg-sky-500 text-white px-6 py-2 rounded-md font-bold hover:bg-sky-600 flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
        >
          {isSubmitting && <Loader2 size={18} className="animate-spin" />}
          수정 완료
        </button>
      </header>

      <main
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragStart={(e) => {
          const target = e.target as HTMLElement;
          const figure = target.closest("figure");
          if (figure) e.dataTransfer.setData("dragged-id", figure.id);
        }}
        className="max-w-4xl mx-auto p-6 min-h-[700px] relative"
      >
        <div className="flex mb-8">
          <button
            type="button"
            onClick={() => setIsPrivate(!isPrivate)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all duration-200 ${
              isPrivate
                ? "bg-slate-900 text-white border-slate-900 shadow-md"
                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {isPrivate ? <Lock size={16} /> : <Globe size={16} />}
            {isPrivate ? "나만 보기 (비공개)" : "전체 공개 (공유)"}
          </button>
        </div>

        {/* 에디터 본문: editor-area 클래스 추가 */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="w-full outline-none text-[18px] leading-[1.8] text-slate-700 editor-area"
        />
      </main>

      {/* 하단 툴바 */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] z-50"
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div className="max-w-4xl mx-auto flex gap-8 px-2">
          <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-sky-500 transition-colors">
            <ImageIcon size={22} />
            <span className="font-bold text-sm">사진 추가</span>
            <input
              type="file"
              multiple
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                files.forEach((file) => {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const figure = createFigure(ev.target?.result as string);
                    executeInsert(figure, null, "after");
                  };
                  reader.readAsDataURL(file);
                });
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      <style jsx global>{`
        .editor-area p {
          margin-bottom: 1rem;
          min-height: 1.8em;
        }
        .editor-area figure {
          margin: 1.5rem 0;
          outline: none;
        }
        .editor-area figure img {
          border-radius: 12px;
          transition: box-shadow 0.2s;
        }
        .editor-area figure:hover img {
          box-shadow: 0 0 0 3px #38bdf8;
        }
      `}</style>
    </div>
  );
}
