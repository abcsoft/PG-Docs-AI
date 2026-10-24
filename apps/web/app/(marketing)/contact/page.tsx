import type { Metadata } from "next";
import Link from "next/link";
import { MailIcon, MessageSquareIcon, ShieldIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  alternates: { canonical: "/contact" },
  title: "Contact",
  description: "How to reach the PG Docs AI team — support, security, privacy and sales.",
};

const channels = [
  {
    icon: MessageSquareIcon,
    title: "Product support",
    description: "Using the product, bugs, feature requests.",
    email: "support@pgsofts.org",
  },
  {
    icon: ShieldIcon,
    title: "Security",
    description: "Vulnerability reports — acknowledged within 2 business days.",
    email: "security@pgsofts.org",
  },
  {
    icon: MailIcon,
    title: "Privacy & legal",
    description: "Data requests (GDPR or otherwise), terms, procurement.",
    email: "privacy@pgsofts.org",
  },
] as const;

export default function ContactPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-14">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Contact</h1>
        <p className="text-sm text-muted-foreground">
          Direct email, no ticket maze. We answer every message.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {channels.map((channel) => (
          <Card key={channel.title}>
            <CardHeader>
              <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <channel.icon className="size-5" />
              </div>
              <CardTitle className="text-base">{channel.title}</CardTitle>
              <CardDescription>{channel.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <a
                href={`mailto:${channel.email}`}
                className="text-sm underline underline-offset-4"
              >
                {channel.email}
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-6">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Legal Business Information
        </h2>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="font-medium">Legal Business Name</dt>
          <dd className="text-muted-foreground">Perfect Group LLC</dd>
          <dt className="font-medium">Company Type</dt>
          <dd className="text-muted-foreground">
            Wyoming Limited Liability Company, United States
          </dd>
          <dt className="font-medium">Formation Date</dt>
          <dd className="text-muted-foreground">September 14, 2021</dd>
          <dt className="font-medium">Wyoming Filing ID</dt>
          <dd className="text-muted-foreground">2021-001035529</dd>
          <dt className="font-medium">Brand</dt>
          <dd className="text-muted-foreground">PGSofts</dd>
          <dt className="font-medium">Website</dt>
          <dd className="text-muted-foreground">
            <a
              href="https://www.pgsofts.org"
              className="underline underline-offset-4"
              rel="noopener"
            >
              https://www.pgsofts.org
            </a>
          </dd>
        </dl>
        <address className="text-sm leading-relaxed text-muted-foreground not-italic">
          <span className="font-medium text-foreground">Principal Office Address</span>{" "}
          (on state filing): 312 W 2nd St, Unit #A269, Casper, WY 82601, United
          States
        </address>
        <p className="text-xs leading-relaxed text-muted-foreground">
          This is the principal office address listed in our Wyoming state
          formation documents — not a staffed office or customer service
          location. Please reach us through the email channels above.
        </p>
      </div>
      <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-6">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Faster than email: in-app chat
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Most product questions are already answered by the workspace itself — open{" "}
          <Link href="/chat" className="underline underline-offset-4">the chat</Link>{" "}
          and ask it about your own documents. For anything about billing, seats or the
          self-hosted deployment, email is fastest.
        </p>
      </div>
    </div>
  );
}
