import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  BotIcon,
  FileTextIcon,
  FileSearchIcon,
  GitCompareIcon,
  KeyRoundIcon,
  LockIcon,
  PlayCircleIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TableIcon,
  UploadIcon,
  UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "PG Docs AI",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "AI document intelligence workspace: upload contracts, proposals and policies, get Claude-powered answers, summaries, structured extractions, comparisons and reports with page-level citations.",
  url: "https://pgsofts.org",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

// The corporate entity behind the PGSofts brand — the only Organization
// node on the site; the SoftwareApplication above describes the product.
// The filed office address is intentionally NOT here: structured data
// asserts current facts, and the address is only verified as of the 2021
// state filing (it is published on the pages with an "on state filing"
// qualifier instead).
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "PGSofts",
  legalName: "Perfect Group LLC",
  alternateName: "PG Docs AI",
  foundingDate: "2021-09-14",
  url: "https://www.pgsofts.org",
  sameAs: ["https://www.linkedin.com/company/perfect-group-llc"],
};

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const workflow = [
  {
    icon: UploadIcon,
    title: "1 · Upload",
    description:
      "Drop in PDFs, contracts, proposals, policies. Processing runs in the background — parsing, chunking with page numbers, embedding.",
  },
  {
    icon: FileSearchIcon,
    title: "2 · Ask",
    description:
      "Chat with your workspace. Retrieval grounds every answer in your documents — not the model's memory.",
  },
  {
    icon: ScrollTextIcon,
    title: "3 · Cite",
    description:
      "Every claim carries a marker that links to the exact page and source chunk it came from. Verify in one click.",
  },
  {
    icon: TableIcon,
    title: "4 · Produce",
    description:
      "Summaries, key points, risk registers, structured extraction, side-by-side comparisons and exportable reports.",
  },
] as const;

const capabilities = [
  {
    icon: BotIcon,
    title: "Grounded chat",
    description:
      "An agentic Claude loop searches before it answers and cites what it used — including saying when the answer isn't in your documents.",
  },
  {
    icon: ScrollTextIcon,
    title: "Summaries & risk registers",
    description:
      "One-click executive summaries, key-point lists and risk registers with severity, location and reasoning.",
  },
  {
    icon: TableIcon,
    title: "Extraction templates",
    description:
      "Built-in templates for payment terms, parties & dates, obligations and risks — or define your own fields and get structured JSON.",
  },
  {
    icon: GitCompareIcon,
    title: "Document comparison",
    description:
      "Pick two or more documents; get a difference table, the changes that matter and a recommendation.",
  },
  {
    icon: FileTextIcon,
    title: "Report builder",
    description:
      "Describe the report you need, choose the sources, export Markdown with a full source list.",
  },
  {
    icon: KeyRoundIcon,
    title: "Workspace API",
    description:
      "Create API keys per workspace and drive the same pipeline from your own systems — hashed at rest, revocable in one click.",
  },
] as const;

const useCases = [
  {
    title: "Procurement teams",
    description:
      "Compare vendor proposals line by line, extract payment terms across contracts, and hand legal a cited risk register before signature.",
  },
  {
    title: "Legal & contract ops",
    description:
      "Summarize agreements in seconds, surface one-sided clauses and renewal traps, and answer ‘where is this stated?’ with page numbers.",
  },
  {
    title: "Compliance & audit",
    description:
      "Turn dense policies into checklists, trace every extracted obligation to its source, and export evidence-ready reports.",
  },
  {
    title: "Research & strategy",
    description:
      "Question market reports, synthesize findings across sources, and produce cited briefings instead of unread PDFs.",
  },
] as const;

const securityPoints = [
  {
    icon: UsersIcon,
    title: "Tenant isolation by construction",
    description:
      "Every query flows through a tenant-scoped repository that injects the workspace filter — cross-tenant access is structurally impossible, and covered by dedicated tests.",
  },
  {
    icon: LockIcon,
    title: "Your keys, your models",
    description:
      "Bring your own Claude API key per workspace. Keys are encrypted at rest (Fernet) and write-only through the API — a database leak leaks nothing usable.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Zero-fabrication citations",
    description:
      "Citations come from the numbered source list the model was given, not from the model's claims. Markers the model invents are dropped.",
  },
] as const;

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For trying the full pipeline on your own documents.",
    features: [
      "1 workspace, up to 3 seats",
      "50 documents",
      "Chat, summaries, extractions, comparison",
      "Bring your own API key",
      "Usage dashboard",
    ],
    cta: "Start free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "per month",
    description: "For teams that live in documents.",
    features: [
      "Unlimited workspaces & documents",
      "Team management with roles",
      "Report builder & export",
      "Workspace API keys",
      "Higher rate limits & priority models",
    ],
    cta: "Start free, upgrade later",
    highlighted: true,
  },
  {
    name: "Self-hosted",
    price: "MIT",
    period: "open source",
    description: "Run the whole stack in your own cloud.",
    features: [
      "Full source code",
      "Your infrastructure, your data boundary",
      "Terraform deployment included",
      "Any Claude model you configure",
      "Community support",
    ],
    cta: "Read the deployment guide",
    highlighted: false,
  },
] as const;

const faqs = [
  {
    question: "How do citations work?",
    answer:
      "Before answering, the system retrieves the most relevant chunks from your documents and presents them to Claude as a numbered source list (document, page, text). The model must cite those markers inline. Post-processing keeps only markers that actually exist — if the model invents a citation, it is dropped, and if the documents don't contain the answer, the model is instructed to say so.",
  },
  {
    question: "Which file types are supported?",
    answer:
      "PDF, plain text and Markdown, up to 20 MB per document. PDFs are parsed page by page so citations carry real page numbers.",
  },
  {
    question: "Do I need my own API key?",
    answer:
      "On the hosted demo, yes — workspaces run on their own Anthropic key, encrypted at rest, so your usage is billed directly to you with no markup. Self-hosted deployments can also configure server-wide keys as the fallback.",
  },
  {
    question: "Is my data used for training?",
    answer: "No. Documents are stored in your workspace's isolated storage, processed only to answer your requests, and never used to train models.",
  },
  {
    question: "Can I automate this from my own systems?",
    answer:
      "Yes. Workspace API keys (Settings → API keys) authenticate the same REST API the app uses — upload, search, extract, report — with the same tenant isolation and rate limits.",
  },
  {
    question: "What happens if the answer isn't in my documents?",
    answer:
      "The assistant says so. The retrieval-augmented prompt explicitly forbids filling gaps with outside knowledge, and our evaluation suite includes negative cases that test exactly this.",
  },
] as const;

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {eyebrow}
      </p>
      <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      {description ? (
        <p className="text-sm text-muted-foreground sm:text-base">{description}</p>
      ) : null}
    </div>
  );
}

export default function MarketingPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4">
      <script
        type="application/ld+json"
        // Static literal above — nothing user-controlled is interpolated.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />

      {/* Hero */}
      <section className="flex flex-col items-center gap-6 py-20 text-center sm:py-24">
        <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs text-muted-foreground">
          <SparklesIcon className="size-3.5" />
          Powered by Claude · grounded in your documents
        </span>
        <h1 className="max-w-3xl font-heading text-4xl font-bold tracking-tight sm:text-5xl">
          Documents in. Cited answers out.
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
          PG Docs AI is the document intelligence workspace for teams that need receipts.
          Upload contracts, proposals and policies — ask questions, compare versions, extract
          structured data and generate reports where every claim links to the page it came
          from.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/signup">
              Try the demo workspace
              <ArrowRightIcon className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#demo-video">
              <PlayCircleIcon className="size-4" />
              Watch the 90-second demo
            </a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          PGSofts is a technology brand operated by Perfect Group LLC.
        </p>

        {/* Product screenshot — a faithful mock of the chat view with citations */}
        <div className="mt-6 w-full max-w-4xl overflow-hidden rounded-xl border bg-muted/30 shadow-sm">
          <div className="flex items-center gap-1.5 border-b bg-background px-4 py-2.5">
            <span className="size-2.5 rounded-full bg-red-400/70" />
            <span className="size-2.5 rounded-full bg-yellow-400/70" />
            <span className="size-2.5 rounded-full bg-green-500/70" />
            <span className="ml-3 text-xs text-muted-foreground">
              PG Docs AI — Demo Workspace
            </span>
          </div>
          <div className="flex flex-col gap-4 bg-background p-5 text-left sm:p-7">
            <div className="flex justify-end">
              <p className="max-w-[80%] rounded-lg bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
                What are the payment terms in the Acme proposal?
              </p>
            </div>
            <div className="max-w-[92%] rounded-lg bg-muted px-3.5 py-2.5 text-sm">
              <p className="leading-relaxed">
                The Acme proposal prices at <strong>USD 148,500</strong> for a 12-month term:
                licensing at $8,000/month, implementation at $34,500 one-off, and support at
                $18,000/year. Invoices are monthly in arrears with{" "}
                <strong>net-30</strong> terms; the implementation fee splits 50/50 between
                signature and go-live <span className="rounded bg-background px-1 font-mono text-xs">[3]</span>.
                Late payments accrue <strong>1.0% monthly interest</strong>{" "}
                <span className="rounded bg-background px-1 font-mono text-xs">[3]</span>. A 5%
                second-year discount applies if you commit to 24 months at signature{" "}
                <span className="rounded bg-background px-1 font-mono text-xs">[3]</span>.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {["business-proposal-acme.pdf · p.3", "business-proposal-acme.pdf · p.4"].map(
                  (source) => (
                    <span
                      key={source}
                      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      <FileSearchIcon className="size-3" />
                      {source}
                    </span>
                  ),
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-muted-foreground">
              <FileSearchIcon className="size-3.5 animate-pulse text-blue-500" />
              Searching documents… 3 sections matched
            </div>
          </div>
        </div>
      </section>

      {/* Document-to-answer workflow */}
      <section id="how-it-works" className="scroll-mt-20 py-16">
        <SectionHeading
          eyebrow="How it works"
          title="From document to answer in four steps"
          description="A retrieval-augmented pipeline — not a chatbot with a file upload box bolted on."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {workflow.map((step) => (
            <Card key={step.title}>
              <CardHeader>
                <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <step.icon className="size-5" />
                </div>
                <CardTitle className="text-base">{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Citation demo */}
      <section id="citations" className="scroll-mt-20 py-16">
        <SectionHeading
          eyebrow="Citations"
          title="Answers you can audit"
          description="Every generated artifact carries a numbered source list. Click a marker, read the passage — that's the whole verification loop."
        />
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">The risk register said</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed">
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-semibold">Risk</th>
                      <th className="px-2 py-1.5 text-left font-semibold">Severity</th>
                      <th className="px-2 py-1.5 text-left font-semibold">Where</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="px-2 py-1.5">
                        Auto-renewal with 90-day notice window{" "}
                        <span className="rounded bg-muted px-1 font-mono">[4]</span>
                      </td>
                      <td className="px-2 py-1.5 text-red-500">High</td>
                      <td className="px-2 py-1.5">p.2</td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-2 py-1.5">
                        Liability capped at 12 months of fees{" "}
                        <span className="rounded bg-muted px-1 font-mono">[6]</span>
                      </td>
                      <td className="px-2 py-1.5 text-yellow-500">Medium</td>
                      <td className="px-2 py-1.5">p.6</td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-2 py-1.5">
                        Service credits are the exclusive remedy{" "}
                        <span className="rounded bg-muted px-1 font-mono">[4]</span>
                      </td>
                      <td className="px-2 py-1.5 text-yellow-500">Medium</td>
                      <td className="px-2 py-1.5">p.4</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">The source behind [4]</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border p-3">
                <p className="font-mono text-[10px] text-muted-foreground">
                  saas-agreement-globex.pdf · page 2 · chunk 4
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  “…continues for an initial term of 24 months. It renews automatically for
                  successive 12-month periods unless either party gives written notice of
                  non-renewal at least 90 days before the end of the then-current term.”
                </p>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                The source viewer shows the exact indexed chunks retrieval used — the same
                text the model saw. Nothing is paraphrased after the fact.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-16">
        <SectionHeading
          eyebrow="Capabilities"
          title="A workspace, not a demo"
          description="Everything below ships in the product today — no ‘coming soon’."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((capability) => (
            <Card key={capability.title}>
              <CardHeader>
                <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <capability.icon className="size-5" />
                </div>
                <CardTitle className="text-base">{capability.title}</CardTitle>
                <CardDescription>{capability.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Use cases */}
      <section id="use-cases" className="scroll-mt-20 py-16">
        <SectionHeading
          eyebrow="Use cases"
          title="Built for document-heavy teams"
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {useCases.map((useCase) => (
            <Card key={useCase.title}>
              <CardHeader>
                <CardTitle className="text-base">{useCase.title}</CardTitle>
                <CardDescription>{useCase.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Security */}
      <section id="security" className="scroll-mt-20 py-16">
        <SectionHeading
          eyebrow="Security"
          title="Isolation by construction"
          description="Multi-tenant from the data layer up — see the Security page for the full picture."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {securityPoints.map((point) => (
            <Card key={point.title}>
              <CardHeader>
                <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <point.icon className="size-5" />
                </div>
                <CardTitle className="text-base">{point.title}</CardTitle>
                <CardDescription>{point.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Demo video */}
      <section id="demo-video" className="scroll-mt-20 py-16">
        <SectionHeading
          eyebrow="Demo"
          title="Ninety seconds, end to end"
          description="Upload → processing → ask → cited answer → summary → report export."
        />
        <div className="mx-auto mt-10 max-w-3xl">
          <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-xl border bg-muted/40">
            <PlayCircleIcon className="size-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Demo video placeholder — the recording script and storyboard are in{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                docs/demo-video-script.md
              </code>
              .
            </p>
            <p className="max-w-md px-6 text-center text-xs text-muted-foreground">
              Scene 1 — upload a contract. Scene 2 — watch it index page by page. Scene 3 — ask
              about payment terms and get a cited answer. Scene 4 — one-click summary. Scene 5 —
              generate and export a report.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 py-16">
        <SectionHeading
          eyebrow="Pricing"
          title="Start free. Upgrade when it sticks."
          description="LLM usage is billed through your own API key — no per-token markup from us."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={plan.highlighted ? "border-primary shadow-sm ring-1 ring-primary/20" : ""}
            >
              <CardHeader>
                {plan.highlighted ? (
                  <span className="mb-1 w-fit rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Most popular
                  </span>
                ) : null}
                <CardTitle className="text-base">{plan.name}</CardTitle>
                <p className="mt-1">
                  <span className="font-heading text-3xl font-bold">{plan.price}</span>{" "}
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </p>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className="mt-5 w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                >
                  <Link href="/signup">{plan.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 py-16">
        <SectionHeading eyebrow="FAQ" title="Questions, answered plainly" />
        <div className="mx-auto mt-10 flex max-w-3xl flex-col gap-3">
          {faqs.map((faq) => (
            <details key={faq.question} className="group rounded-lg border px-4 py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium">
                {faq.question}
                <span className="text-muted-foreground transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="pb-24 pt-8">
        <div className="flex flex-col items-center gap-4 rounded-2xl border bg-muted/30 px-6 py-12 text-center">
          <h2 className="max-w-xl font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Your documents already know the answers. Start asking.
          </h2>
          <p className="max-w-lg text-sm text-muted-foreground">
            Create a workspace, seed the demo documents, and get your first cited answer in
            under two minutes.
          </p>
          <Button asChild size="lg">
            <Link href="/signup">
              Create your workspace
              <ArrowRightIcon className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
