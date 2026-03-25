"use client";

import React, { useState, useRef, useEffect } from "react";

import { useRouter } from "next/navigation";

import {
  ChevronLeft,
  ImageIcon,
  Loader2,
  Lock,
  Globe,
  Type,
  Hash,
  Waves,
  Sparkles,
  X,
} from "lucide-react";

import { requestData } from "@/lib/api/http-client";

import { restoreSession } from "@/lib/auth/auth-service";

interface FileWithId {
  id: string;

  file: File;
}

export default function DiaryWritePage() {
  const router = useRouter();

  const editorRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState("");

  const [isPrivate, setIsPrivate] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isUploading, setIsUploading] = useState(false);

  const BACKEND_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

  // 드래그 가이드 상태

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
    restoreSession();

    if (editorRef.current && editorRef.current.innerHTML === "") {
      editorRef.current.innerHTML = "<p><br></p>";
    }
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

  const createFigure = (url: string, fileId: string) => {
    const figure = document.createElement("figure");

    figure.id = fileId;

    figure.contentEditable = "false";

    figure.className =
      "relative my-10 mx-auto w-full max-w-[90%] group cursor-default select-none animate-in fade-in zoom-in duration-500";

    figure.innerHTML = `

      <div class="relative overflow-hidden rounded-[2rem] shadow-2xl shadow-slate-200 border border-white">

        <img src="${url}" class="w-full h-auto block transition-transform duration-700 group-hover:scale-[1.03]">

        <div class="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-500"></div>

      </div>

      <button type="button" class="remove-btn absolute -top-3 -right-3 bg-white text-rose-500 rounded-2xl w-10 h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:bg-rose-50 hover:scale-110 active:scale-90 border border-rose-100">

        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>

      </button>

    `;

    figure.querySelector(".remove-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();

      figure.remove();

      optimizeEmptyLines();
    });

    return figure;
  };

  const handleImageFiles = async (files: File[]) => {
    setIsUploading(true);

    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;

      const formData = new FormData();

      formData.append("image", file);

      try {
        const response = await requestData<any>("/api/v1/images/upload", {
          method: "POST",

          body: formData,
        });

        const relativeUrl =
          response?.imageUrl || response?.data?.imageUrl || response;

        const fullUrl = relativeUrl.startsWith("http")
          ? relativeUrl
          : `${BACKEND_URL}${relativeUrl}`;

        const fileId = `img-${Date.now()}`;

        const figure = createFigure(fullUrl, fileId);

        executeInsert(figure, dropTarget.node, dropTarget.offset);
      } catch (error: any) {
        alert(`이미지 업로드 실패: ${file.name}`);
      }
    }

    setIsUploading(false);
  };

  // [수정] 드래그 시작 시 figure ID를 확실하게 잡도록 개선

  const handleDragStart = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;

    const figure = target.closest("figure");

    if (figure) {
      e.dataTransfer.setData("dragged-id", figure.id);

      e.dataTransfer.effectAllowed = "move";

      // 드래그 중인 요소 시각적 피드백

      setTimeout(() => figure.classList.add("opacity-40"), 0);
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;

    const figure = target.closest("figure");

    if (figure) figure.classList.remove("opacity-40");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();

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

        left: block.offsetLeft - 8,

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

    setDropIndicator((prev) => ({ ...prev, visible: false }));

    const draggedId = e.dataTransfer.getData("dragged-id");

    const files = Array.from(e.dataTransfer.files);

    if (draggedId) {
      const element = document.getElementById(draggedId);

      if (element && element !== dropTarget.node) {
        executeInsert(element, dropTarget.node, dropTarget.offset);
      }
    } else if (files.length > 0) {
      handleImageFiles(files);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return alert("제목을 적어주세요.");

    const content = editorRef.current?.innerHTML || "";

    setIsSubmitting(true);

    try {
      const formData = new FormData();

      const diaryData = { title, content, categoryName: "일상", isPrivate };

      formData.append(
        "data",

        new Blob([JSON.stringify(diaryData)], { type: "application/json" }),
      );

      await requestData("/api/v1/diaries", { method: "POST", body: formData });

      router.push("/diaries");
    } catch (error) {
      alert("저장하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-40 font-sans selection:bg-sky-100">
      {/* 커스텀 드래그 인디케이터 */}

      {dropIndicator.visible && (
        <div
          className="fixed w-[4px] bg-sky-500 z-[150] pointer-events-none rounded-full animate-pulse shadow-[0_0_15px_rgba(14,165,233,0.8)]"
          style={{
            top: dropIndicator.top,

            left: dropIndicator.left,

            height: `${dropIndicator.height}px`,
          }}
        />
      )}

      {/* 상단 헤더: 몰입을 위해 더 얇고 투명하게 */}

      <header className="sticky top-0 z-[100] bg-white/70 backdrop-blur-xl border-b border-slate-200/50 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button
            onClick={() => router.back()}
            className="group p-2 text-slate-400 hover:text-slate-800 transition-all"
          >
            <ChevronLeft
              size={28}
              className="group-hover:-translate-x-1 transition-transform"
            />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sky-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-sky-100">
              <Waves size={18} />
            </div>

            <span className="text-sm font-black text-slate-800 tracking-tight">
              새 기록
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsPrivate(!isPrivate)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[13px] font-bold transition-all duration-300 ${
              isPrivate
                ? "bg-slate-900 text-white shadow-xl shadow-slate-200"
                : "bg-white text-slate-600 border border-slate-200 hover:border-sky-300"
            }`}
          >
            {isPrivate ? <Lock size={14} /> : <Globe size={14} />}

            {isPrivate ? "나만 보기" : "전체 공개"}
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isUploading}
            className="relative overflow-hidden bg-sky-500 text-white px-8 py-2.5 rounded-2xl font-black text-[13px] hover:bg-sky-600 disabled:opacity-50 transition-all shadow-xl shadow-sky-100 group"
          >
            <span className="relative z-10 flex items-center gap-2">
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              기록 완료
            </span>
          </button>
        </div>
      </header>

      {/* 메인 에디터 섹션 */}

      <main className="max-w-4xl mx-auto mt-16 px-6">
        {/* 제목 섹션: 경계 명확화 */}

        <div className="relative mb-12">
          <input
            type="text"
            placeholder="마음의 제목을 붙여주세요"
            className="text-4xl md:text-5xl font-black border-none focus:ring-0 w-full bg-transparent outline-none placeholder:text-slate-200 text-slate-900 tracking-tighter mb-6"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* 제목과 본문 사이의 명확한 구분선 */}

          <div className="h-[1px] w-full bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" />
        </div>

        <div className="relative min-h-[700px] bg-white/40 rounded-[2.5rem] p-8 md:p-12 border border-slate-100/50 shadow-inner">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragStart={handleDragStart} // 추가
            onDragEnd={handleDragEnd} // 추가
            className="w-full outline-none text-[20px] leading-[2.1] text-slate-700 min-h-[600px] editor-area font-medium"
            data-placeholder="오늘의 이야기를 들려주세요..."
          />
        </div>
      </main>

      {/* 하단 플로팅 툴바: 더 미니멀하고 직관적으로 */}

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-white/90 backdrop-blur-2xl border border-white px-8 py-4 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex items-center gap-8 group transition-all hover:scale-[1.02]">
          <label className="flex items-center gap-2 cursor-pointer group/item">
            <div
              className={`p-3 rounded-2xl transition-all ${isUploading ? "bg-sky-500 text-white animate-pulse" : "bg-slate-50 text-slate-500 group-hover/item:bg-sky-500 group-hover/item:text-white"}`}
            >
              {isUploading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <ImageIcon size={20} />
              )}
            </div>

            <div className="flex flex-col">
              <span className="font-black text-[12px] text-slate-800 leading-none mb-0.5">
                사진
              </span>

              <span className="text-[10px] text-slate-400 font-bold leading-none">
                Drop or Click
              </span>
            </div>

            <input
              type="file"
              multiple
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);

                handleImageFiles(files);

                e.target.value = "";
              }}
            />
          </label>

          <div className="w-[1px] h-8 bg-slate-100" />

          <button className="flex items-center gap-2 text-slate-300 cursor-not-allowed group/item">
            <div className="p-3 rounded-2xl bg-slate-50">
              <Type size={20} />
            </div>

            <span className="font-black text-[12px]">서식</span>
          </button>

          <div className="w-[1px] h-8 bg-slate-100" />

          <button className="flex items-center gap-2 text-slate-300 cursor-not-allowed group/item">
            <div className="p-3 rounded-2xl bg-slate-50">
              <Hash size={20} />
            </div>

            <span className="font-black text-[12px]">태그</span>
          </button>
        </div>
      </div>
    </div>
  );
}
