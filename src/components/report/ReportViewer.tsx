import ReactMarkdown from 'react-markdown';

interface ReportViewerProps {
  content: string;
}

export function ReportViewer({ content }: ReportViewerProps) {
  return (
    <div className="prose prose-invert prose-sm max-w-none bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 overflow-x-auto">
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 className="text-xl font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-2 mb-4">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold text-[var(--text-primary)] mt-4 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold text-[var(--text-primary)] mt-3 mb-1">{children}</h3>,
          p: ({ children }) => <p className="text-[var(--text-primary)] mb-2">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-6 mb-2 text-[var(--text-primary)]">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 mb-2 text-[var(--text-primary)]">{children}</ol>,
          li: ({ children }) => <li className="mb-0.5">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-[var(--accent-blue)]">{children}</strong>,
          code: ({ children }) => <code className="px-1.5 py-0.5 rounded bg-[var(--bg-hover)] font-mono text-sm">{children}</code>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
