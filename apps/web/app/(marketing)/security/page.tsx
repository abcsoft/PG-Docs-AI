import type { Metadata } from "next";
import Link from "next/link";
import {
  DatabaseIcon,
  KeyRoundIcon,
  LockIcon,
  ShieldCheckIcon,
  UsersIcon,
  FileSearchIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  alternates: { canonical: "/security" },
  title: "Security",
  description:
    "Tenant isolation, encryption, API key handling and citation integrity in PG Docs AI.",
};

const pillars = [
  {
    icon: UsersIcon,
    title: "Tenant isolation by construction",
    points: [
      "Every workspace-owned table carries an indexed tenant_id, and all data access flows through a tenant-scoped repository that injects the workspace filter at query construction — domain code cannot forget a WHERE clause because it never writes one.",
      "Object storage paths are workspace-prefixed; the API resolves the active workspace from a verified membership on every request.",
      "Cross-tenant access attempts return 404, not 403 — the existence of another workspace is never confirmed. Isolation is enforced by a dedicated test suite that tries to read another tenant's documents, insights and reports.",
    ],
  },
  {
    icon: KeyRoundIcon,
    title: "API keys and credentials",
    points: [
      "Workspace AI-provider keys are encrypted at rest with Fernet (AES) and are write-only: the API only ever returns whether one is set and its last four characters.",
      "Workspace API access keys (pgda_…) exist only as SHA-256 hashes; the full key is shown once at creation. Revocation is immediate.",
      "API keys are bound to their workspace at issue: a leaked key cannot be pointed at another workspace via a header.",
      "Application secrets live in environment variables or a managed secret store — never in code or logs.",
    ],
  },
  {
    icon: LockIcon,
    title: "Transport and data",
    points: [
      "TLS in transit everywhere; documents and derived data encrypted at rest at the storage layer.",
      "Passwords are hashed by the identity provider (Better Auth); the API never handles credentials — it validates short-lived signed JWTs.",
      "Structured logs carry request and workspace identifiers, never document contents.",
    ],
  },
  {
    icon: FileSearchIcon,
    title: "Citation integrity",
    points: [
      "Generated artifacts cite a numbered source list built from the workspace's own indexed chunks. Markers that do not exist in the list are stripped before the response reaches you.",
      "The system prompt forbids filling gaps with outside knowledge and instructs the model to say when the documents do not contain the answer.",
    ],
  },
  {
    icon: DatabaseIcon,
    title: "Operations",
    points: [
      "Per-workspace rate limiting (requests per minute and tokens per day) with plan-aware ceilings, enforced before any model call.",
      "Every LLM call is metered: tokens, cost, latency and status — including failed and interrupted calls.",
      "Background processing is idempotent and retried with backoff; a failed ingestion marks the document as failed with the reason.",
    ],
  },
  {
    icon: ShieldCheckIcon,
    title: "Self-hosting",
    points: [
      "The full stack (web, API, worker, PostgreSQL with pgvector, Redis) is open source and deployable in your own cloud via the included Terraform — your data never leaves your boundary.",
    ],
  },
];

export default function SecurityPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-14">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Security</h1>
        <p className="text-sm text-muted-foreground">
          How PG Docs AI protects your documents — architecture first, promises second.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {pillars.map((pillar) => (
          <Card key={pillar.title}>
            <CardHeader>
              <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <pillar.icon className="size-5" />
              </div>
              <CardTitle className="text-base">{pillar.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {pillar.points.map((point) => (
                  <li key={point} className="text-sm leading-relaxed text-muted-foreground">
                    {point}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-6">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Reporting a vulnerability
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We treat security reports with priority. Email{" "}
          <span className="text-foreground">security@pgsofts.org</span> with details and a
          reproduction if possible; we will acknowledge within 2 business days. We do not
          pursue good-faith research that respects privacy and avoids service degradation. See{" "}
          <Link href="/privacy" className="underline underline-offset-4">
            the privacy policy
          </Link>{" "}
          for data handling details.
        </p>
      </div>
    </div>
  );
}
