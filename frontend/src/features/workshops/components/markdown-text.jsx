import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ breaks: true, gfm: true });

export default function MarkdownText({ content }) {
  const html = useMemo(() => {
    if (!content) return '';
    return DOMPurify.sanitize(marked.parse(content));
  }, [content]);

  if (!content) return null;

  return (
    <div
      className="markdown-content prose prose-slate max-w-none text-slate-600 leading-relaxed
        [&_strong]:font-bold [&_strong]:text-slate-900
        [&_em]:italic
        [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h1]:mt-6 [&_h1]:mb-3
        [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-5 [&_h2]:mb-2
        [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-900 [&_h3]:mt-4 [&_h3]:mb-2
        [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-3
        [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-3
        [&_li]:my-1
        [&_p]:my-2
        [&_a]:text-gdg-blue [&_a]:underline
        [&_blockquote]:border-l-4 [&_blockquote]:border-slate-200 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-500
        [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
