import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How PG Docs AI handles your documents, account data and AI provider interactions.",
};

const sections = [
  {
    title: "1. What we collect",
    body: [
      "Account data: your email address, display name and authentication credentials, managed by our identity provider in a dedicated database schema.",
      "Workspace content: the documents you upload, the chunks and embeddings derived from them, your conversations, generated insights and reports, and workspace settings including encrypted provider API keys.",
      "Usage data: per-request metadata such as timestamps, token counts, model identifiers, latency and error status, used for metering, rate limiting and cost dashboards.",
      "Operational logs: request identifiers and organization identifiers attached to structured logs for debugging; we do not log document contents or credentials.",
    ],
  },
  {
    title: "2. How we use it",
    body: [
      "To operate the service: indexing your documents, answering questions, generating summaries, extractions, comparisons and reports.",
      "To meter and limit usage per workspace, and to show you what you spent.",
      "To keep the service secure and debug it. We do not use your document content for advertising, and we do not sell data.",
    ],
  },
  {
    title: "3. AI providers",
    body: [
      "To answer questions, relevant excerpts of your documents are sent to the AI provider configured for your workspace (by default Anthropic, for Claude models), together with your question or task instruction.",
      "If you provide your own API key in Settings → AI Provider, calls are billed directly by the provider under your account, under that provider's data terms.",
      "We instruct providers through API configuration not to use submitted content for training where the provider offers such a control.",
    ],
  },
  {
    title: "4. Storage and retention",
    body: [
      "Documents are stored per workspace in isolated storage paths; metadata and embeddings live in the workspace's own rows in PostgreSQL.",
      "Deleting a document deletes its file, chunks and embeddings. Deleting a workspace deletes all of its data.",
      "Backups, where maintained, age out on the platform's standard schedule; contact us for expedited deletion.",
    ],
  },
  {
    title: "5. Sharing",
    body: [
      "We do not sell or rent your data. We share data only with the infrastructure providers needed to run the service (hosting, database, object storage, email delivery) under their data-processing terms, and with the AI provider when answering your requests.",
      "We may disclose information if legally required, and will notify affected workspace owners where lawful.",
    ],
  },
  {
    title: "6. Your rights",
    body: [
      "You can access, correct, export and delete your data. Workspace owners can delete documents and workspaces directly in the product; account deletion removes your identity and membership records.",
      "EU/UK residents have additional rights under GDPR (access, rectification, erasure, restriction, portability, objection). Contact privacy@pgsofts.org and we will respond within 30 days.",
    ],
  },
  {
    title: "7. Changes",
    body: [
      "If this policy changes materially, we will notify workspace owners by email before the change takes effect.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-14">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">
          Last updated: 24 October 2026 · PG Docs AI (pgsofts.org), operated by
          Perfect Group LLC
        </p>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        PG Docs AI (pgsofts.org) is a service operated by Perfect Group LLC
        (“Perfect Group”, “we”), the data controller for the personal data
        described here. This policy explains what we collect when you use the
        service, why, and what you can do about it. It is written to be read,
        not to be survived.
      </p>
      {sections.map((section) => (
        <section key={section.title} className="flex flex-col gap-2">
          <h2 className="font-heading text-lg font-semibold tracking-tight">{section.title}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph} className="text-sm leading-relaxed text-muted-foreground">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
      <p className="text-sm text-muted-foreground">
        Questions? <span className="text-foreground">privacy@pgsofts.org</span>
      </p>
    </div>
  );
}
