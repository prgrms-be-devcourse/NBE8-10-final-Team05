"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ImageIcon, Loader2, Lock, Globe } from "lucide-react";
import { requestData } from "@/lib/api/http-client";

export default function DiaryWritePage() {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🔹 백엔드 리소스 도메인 설정
  const BACKEND_URL = "http://localhost:8080";

  const [dropIndicator, setDropIndicator] = useState({
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

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML === "") {
      editorRef.current.innerHTML = "<p><br></p>";
    }
    editorRef.current?.focus();
  }, []);

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

  // 🖼️ [추가] 이미지 서버 업로드 처리
  const uploadImageToServer = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("image", file); // ImageController의 @RequestParam("image")와 매칭

    try {
      const response = await requestData<any>("/api/v1/images/upload", {
        method: "POST",
        body: formData,
      });

      if (response?.data?.imageUrl) {
        return response.data.imageUrl; // 서버에서 온 /gen/... 경로 반환
      }
      return null;
    } catch (error) {
      console.error("이미지 업로드 실패:", error);
      return null;
    }
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

    const nextEl = element.nextElementSibling;
    if (!nextEl || nextEl.tagName !== "P" || nextEl.innerHTML !== "<br>") {
      const p = document.createElement("p");
      p.innerHTML = "<br>";
      element.after(p);
    }
    setTimeout(optimizeEmptyLines, 10);
  };

  // 🖼️ [수정] URL 기반으로 Figure 생성
  const createFigure = (imageUrl: string) => {
    const figure = document.createElement("figure");
    figure.id = `img-${Date.now()}`;
    figure.contentEditable = "false";
    figure.draggable = true;
    figure.className =
      "relative my-4 mx-auto w-fit group cursor-move select-none";

    // 에디터 노출을 위해 도메인 결합
    const fullUrl = `${BACKEND_URL}${imageUrl}`;

    figure.innerHTML = `
      <img src="${fullUrl}" class="max-w-full rounded-xl shadow-sm border border-slate-100 block pointer-events-none">
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

  // 🚀 [추가] 파일들을 서버에 올리고 에디터에 삽입하는 통합 로직
  const handleFileUploads = async (
    files: File[],
    customTarget: Node | null = null,
    customOffset: "before" | "after" = "after",
  ) => {
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;

      const serverImageUrl = await uploadImageToServer(file);
      if (serverImageUrl) {
        const figure = createFigure(serverImageUrl);
        executeInsert(figure, customTarget || dropTarget.node, customOffset);
      }
    }
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
      handleFileUploads(files);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return alert("제목을 입력하세요.");

    // 💡 저장 시에는 BACKEND_URL을 제거하고 상대 경로(/gen/...)만 남깁니다.
    let content = editorRef.current?.innerHTML || "";
    content = content.replace(new RegExp(BACKEND_URL, "g"), "");

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append(
        "data",
        new Blob(
          [JSON.stringify({ title, content, categoryName: "일상", isPrivate })],
          { type: "application/json" },
        ),
      );
      await requestData("/api/v1/diaries", { method: "POST", body: formData });
      router.push("/diaries");
    } catch (error) {
      alert("저장 실패");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-white text-slate-900 pb-24"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
    >
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

      <header className="sticky top-0 z-[100] bg-white border-b border-slate-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={() => router.back()}
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
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-sky-500 text-white px-6 py-2 rounded-md font-bold hover:bg-sky-600 flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
        >
          {isSubmitting && <Loader2 size={18} className="animate-spin" />}
          발행
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

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="w-full outline-none text-[18px] leading-[1.8] text-slate-700 editor-area"
        />
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] z-50">
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
                handleFileUploads(files, null, "after");
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
