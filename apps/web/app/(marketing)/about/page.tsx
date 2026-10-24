import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2Icon } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description:
    "PG Docs AI is a PGSofts product operated by Perfect Group LLC — why it exists and what we believe about AI over business documents.",
};

const beliefs = [
  "An answer without a source is an opinion. Every claim our system produces should be traceable to the passage it came from.",
  "The model should say 'I don't know' when the documents don't contain the answer — anything else is fabrication with confidence.",
  "Multi-tenancy is a data-layer property, not a feature checkbox. Isolation must be structural, not aspirational.",
  "Teams should be able to run the whole thing in their own cloud. Open source is the honest version of that promise.",
];

export default function AboutPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-14">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">About PG Docs AI</h1>
        <p className="text-sm text-muted-foreground">pgsofts.org</p>
      </div>
      <div className="flex flex-col gap-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          Businesses sit on thousands of pages of contracts, proposals, policies and research
          that nobody has time to read — and the parts that matter are exactly the parts that
          get skimmed. Generic chatbots make this worse: confident answers, no sources, no way
          to check.
        </p>
        <p>
          PG Docs AI is a document intelligence workspace built the other way around. You bring
          the documents; the system indexes them page by page, and Claude answers, summarizes,
          extracts, compares and reports — with a numbered source attached to every claim. If
          the answer is not in your documents, it says so.
        </p>
        <p>
          Under the hood it is a serious piece of engineering: multi-tenant isolation enforced
          in the data layer, per-workspace encryption of provider keys, metering of every
          model call, rate limiting, an evaluation harness that scores faithfulness and
          citation correctness, and infrastructure-as-code deployment that can run at zero
          fixed cost. The whole platform is open source under the MIT licence.
        </p>
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold tracking-tight">Our Company</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          PGSofts is a technology brand operated by Perfect Group LLC, a legally
          registered limited liability company in the United States.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Through PGSofts, we develop and deliver technology solutions designed
          to help businesses innovate, automate workflows, and build scalable
          digital products.
        </p>
        <dl className="mt-1 grid gap-x-6 gap-y-2 rounded-xl border bg-muted/30 p-5 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="font-medium">Legal Business Name</dt>
          <dd className="text-muted-foreground">Perfect Group LLC</dd>
          <dt className="font-medium">Brand Name</dt>
          <dd className="text-muted-foreground">PGSofts</dd>
          <dt className="font-medium">Official Website</dt>
          <dd className="text-muted-foreground">
            <a
              href="https://pgsofts.org"
              className="underline underline-offset-4"
              rel="noopener"
            >
              https://pgsofts.org
            </a>
          </dd>
          <dt className="font-medium">LinkedIn</dt>
          <dd className="text-muted-foreground">
            <a
              href="https://www.linkedin.com/company/perfect-group-llc"
              className="underline underline-offset-4"
              rel="noopener"
            >
              Perfect Group LLC
            </a>
          </dd>
        </dl>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold tracking-tight">What we believe</h2>
        <ul className="flex flex-col gap-2.5">
          {beliefs.map((belief) => (
            <li key={belief} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-primary" />
              {belief}
            </li>
          ))}
        </ul>
      </section>
      <p className="text-sm text-muted-foreground">
        PG Docs AI is a PGSofts product, operated by Perfect Group LLC. Reach us
        any time via the{" "}
        <Link href="/contact" className="underline underline-offset-4">
          contact page
        </Link>
        .
      </p>
    </div>
  );
}
