"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { temporaryDraftStore } from "@/lib/temporary-draft-store";
import type { EssayQuestionPublic } from "@/types/domain";
import { MockNotice } from "@/components/trust-label";

function countCharacters(value: string): number {
  return Array.from(value.replace(/\s/g, "")).length;
}

export function EssayEditor({ question }: { question: EssayQuestionPublic }) {
  const router = useRouter();
  const draftKey = `ls-lab-phase2-${question.id}-draft`;
  const [answer, setAnswer] = useState("");
  const [saveState, setSaveState] = useState("이 브라우저에만 임시 저장되는 mock draft");
  const characterCount = useMemo(() => countCharacters(answer), [answer]);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      setAnswer(temporaryDraftStore.read(draftKey));
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [draftKey]);

  function saveDraft() {
    temporaryDraftStore.write(draftKey, answer);
    setSaveState("방금 이 브라우저에 임시 저장됨");
  }

  function submitMock() {
    const accepted = window.confirm("합성 mock 결과 화면으로 이동합니다. 실제 AI 평가나 대학 공식 채점이 아닙니다. 계속할까요?");
    if (!accepted) return;
    saveDraft();
    router.push("/essay-lab/evaluation/mock-attempt-001");
  }

  return (
    <>
      <div className="workspace-toolbar">
        <div><strong>임시 저장 상태</strong><span>{saveState}</span></div>
        <button className="button button--outline button--small" type="button" onClick={saveDraft}>임시 저장</button>
      </div>
      <div className="content-wrap content-wrap--wide workspace-notice"><MockNotice compact /></div>
      <section className="workspace content-wrap content-wrap--wide" aria-label="합성 논술 작성 공간">
        <aside className="reading-pane">
          <div className="eyebrow">SYNTHETIC QUESTION CONTEXT</div>
          <h1>{question.title}</h1>
          <p className="reading-pane__prompt">{question.questionPrompt}</p>
          <div className="reading-pane__passages">
            {question.passages.map((passage) => <article key={passage.label}><p>{passage.label}</p><blockquote>{passage.text}</blockquote></article>)}
          </div>
          <aside className="study-tip"><strong>작성 힌트</strong><p>논점 하나를 정하고, 두 지문이 그 논점을 다루는 방식의 차이를 먼저 메모해 보세요.</p></aside>
        </aside>
        <article className="editor-pane">
          <div className="editor-pane__header"><div><div className="eyebrow">WRITING PANE</div><h2>나의 답안</h2></div><div className="character-count"><strong>{characterCount.toLocaleString("ko-KR")}자</strong><span>공백 제외 · 목표 800자 내외</span></div></div>
          <label className="sr-only" htmlFor="essay-answer">합성 문제 답안 작성</label>
          <textarea id="essay-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="여기에 답안을 작성하세요. 저장 내용은 이 브라우저에만 임시 보관되며, 실제 계정이나 서버에는 전송되지 않습니다." />
          <div className="editor-pane__footer"><p>제출하면 실제 AI 평가가 아닌 합성 구조화 결과 화면으로 이동합니다.</p><button className="button button--accent" type="button" onClick={submitMock}>Mock 제출 <span aria-hidden="true">→</span></button></div>
        </article>
      </section>
    </>
  );
}
