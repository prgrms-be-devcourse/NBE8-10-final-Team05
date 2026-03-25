"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
} from "lucide-react";
import { requestData } from "@/lib/api/http-client";

interface DiaryDetail {
  id: number;
  title: string;
  content: string;
  isPrivate: boolean;
  categoryName: string;
}

interface FileWithId {
  id: string;
  file: File;
}

export default function DiaryEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileWithId[]>([]);

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
    const fetchOriginalData = async () => {
      try {
        const data = await requestData<DiaryDetail>(`/api/v1/diaries/${id}`);
        setTitle(data.title);
        setIsPrivate(data.isPrivate);
        if (editorRef.current) {
          editorRef.current.innerHTML = data.content || "<p><br></p>";
          // 기존 이미지들에 드래그 및 삭제 기능 주입
          setTimeout(bindExistingElements, 100);
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

  // [중요] 기존 본문에 있던 이미지(figure)들에 이벤트 재연결
  const bindExistingElements = () => {
    if (!editorRef.current) return;
    const figures = editorRef.current.querySelectorAll("figure");
    figures.forEach((fg) => {
      const figure = fg as HTMLElement;
      figure.draggable = true;
      figure.contentEditable = "false";

      // 삭제 버튼 이벤트 재연결
      const btn = figure.querySelector(".remove-btn");
      btn?.addEventListener("click", (e) => {
        e.stopPropagation();
        figure.remove();
        optimizeEmptyLines();
      });
    });
  };

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

  const createFigure = (base64Str: string, fileId: string) => {
    const figure = document.createElement("figure");
    figure.id = fileId;
    figure.contentEditable = "false";
    figure.draggable = true;
    figure.className =
      "relative my-10 mx-auto w-full max-w-[90%] group cursor-move select-none animate-in fade-in zoom-in duration-500";
    figure.innerHTML = `
      <div class="relative overflow-hidden rounded-[2rem] shadow-2xl shadow-slate-200 border border-white">
        <img src="${base64Str}" class="w-full h-auto block transition-transform duration-700 group-hover:scale-[1.03]">
        <div class="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-500"></div>
      </div>
      <button type="button" class="remove-btn absolute -top-3 -right-3 bg-white text-rose-500 rounded-2xl w-10 h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:bg-rose-50 hover:scale-110 active:scale-90 border border-rose-100">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;

    figure.querySelector(".remove-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId));
      figure.remove();
      optimizeEmptyLines();
    });

    return figure;
  };

  const handleImageFiles = (files: File[]) => {
    files.forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const fileId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setSelectedFiles((prev) => [...prev, { id: fileId, file }]);

      const reader = new FileReader();
      reader.onload = (ev) => {
        const figure = createFigure(ev.target?.result as string, fileId);
        executeInsert(figure, dropTarget.node, dropTarget.offset);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragStart = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    const figure = target.closest("figure");
    if (figure) {
      e.dataTransfer.setData("dragged-id", figure.id);
      e.dataTransfer.effectAllowed = "move";
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
      const computedStyle = window.getComputedStyle(block);
      const paddingLeft = parseFloat(computedStyle.paddingLeft);
      const isBefore = e.clientY - rect.top < rect.height / 2;

      setDropIndicator({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX + paddingLeft - 4,
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

      // 신규 파일이 있다면 전송
      if (selectedFiles.length > 0) {
        formData.append("image", selectedFiles[selectedFiles.length - 1].file);
      }

      await requestData(`/api/v1/diaries/${id}`, {
        method: "PUT",
        body: formData,
      });

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="animate-spin text-sky-400 mb-4" size={48} />
        <p className="text-slate-400 font-medium animate-pulse">
          기록을 불러오는 중...
        </p>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-40 font-sans selection:bg-sky-100">
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
              기록 수정
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
            onClick={handleUpdate}
            disabled={isSubmitting}
            className="relative overflow-hidden bg-sky-500 text-white px-8 py-2.5 rounded-2xl font-black text-[13px] hover:bg-sky-600 disabled:opacity-50 transition-all shadow-xl shadow-sky-100 group"
          >
            <span className="relative z-10 flex items-center gap-2">
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              수정 완료
            </span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto mt-16 px-6">
        <div className="relative mb-12">
          <input
            type="text"
            placeholder="마음의 제목을 붙여주세요"
            className="text-4xl md:text-5xl font-black border-none focus:ring-0 w-full bg-transparent outline-none placeholder:text-slate-200 text-slate-900 tracking-tighter mb-6"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="h-[1px] w-full bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" />
        </div>

        <div className="relative min-h-[700px] bg-white/40 rounded-[2.5rem] p-8 md:p-12 border border-slate-100/50 shadow-inner">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className="w-full outline-none text-[20px] leading-[2.1] text-slate-700 min-h-[600px] editor-area font-medium"
            data-placeholder="오늘의 이야기를 들려주세요..."
          />
        </div>
      </main>

      {/* 하단 툴바는 작성 페이지와 동일하게 유지 */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-white/90 backdrop-blur-2xl border border-white px-8 py-4 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex items-center gap-8 group transition-all hover:scale-[1.02]">
          <label className="flex items-center gap-2 cursor-pointer group/item">
            <div className="p-3 rounded-2xl bg-slate-50 text-slate-500 group-hover/item:bg-sky-500 group-hover/item:text-white transition-all">
              <ImageIcon size={20} />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-[12px] text-slate-800 leading-none mb-0.5">
                사진
              </span>
              <span className="text-[10px] text-slate-400 font-bold leading-none">
                Add New
              </span>
            </div>
            <input
              type="file"
              multiple
              className="hidden"
              accept="image/*"
              onChange={(e) =>
                handleImageFiles(Array.from(e.target.files || []))
              }
            />
          </label>
          <div className="w-[1px] h-8 bg-slate-100" />
          <button className="flex items-center gap-2 text-slate-300 cursor-not-allowed">
            <Type size={20} />
            <span className="font-black text-[12px]">서식</span>
          </button>
          <div className="w-[1px] h-8 bg-slate-100" />
          <button className="flex items-center gap-2 text-slate-300 cursor-not-allowed">
            <Hash size={20} />
            <span className="font-black text-[12px]">태그</span>
          </button>
        </div>
      </div>
    </div>
  );
}
