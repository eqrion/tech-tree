import * as React from "react";
import { useMemo } from "react";
import markdownit from "markdown-it";

const md = markdownit();

interface MarkdownProps {
  text: string;
}

export function Markdown({ text }: MarkdownProps) {
  const htmlContent = useMemo(() => md.render(text), [text]);
  return (
    <div
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      className="prose prose-sm max-w-none"
    />
  );
}
