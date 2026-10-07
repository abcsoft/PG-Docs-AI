import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Shared Markdown renderer for AI output (insights, reports).
 * GFM tables are supported; citation markers like [3] keep their plain
 * text form so they visually match the numbered source list.
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("prose-chat text-sm leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => <h2 className="mt-4 text-lg font-semibold tracking-tight" {...props} />,
          h2: (props) => <h3 className="mt-4 text-base font-semibold tracking-tight" {...props} />,
          h3: (props) => (
            <h4 className="mt-3 text-sm font-semibold tracking-tight" {...props} />
          ),
          p: (props) => <p className="mt-2 first:mt-0" {...props} />,
          ul: (props) => <ul className="mt-2 list-disc space-y-1 pl-5" {...props} />,
          ol: (props) => <ol className="mt-2 list-decimal space-y-1 pl-5" {...props} />,
          table: (props) => (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-xs" {...props} />
            </div>
          ),
          th: (props) => (
            <th
              className="border bg-muted px-2 py-1.5 text-left font-semibold"
              {...props}
            />
          ),
          td: (props) => <td className="border px-2 py-1.5 align-top" {...props} />,
          a: (props) => <a className="underline underline-offset-2" {...props} />,
          hr: () => <hr className="my-4 border" />,
          blockquote: (props) => (
            <blockquote className="mt-2 border-l-2 pl-3 text-muted-foreground" {...props} />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
