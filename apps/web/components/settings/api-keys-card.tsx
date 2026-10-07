"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, CopyIcon, KeyIcon, Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useOrg } from "@/components/org-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, errorMessage } from "@/lib/api/client";

interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export function ApiKeysCard() {
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAdmin =
    activeOrg?.role === "owner" || activeOrg?.role === "admin";

  const { data: keys, isLoading } = useQuery({
    queryKey: ["api-keys", activeOrg?.id],
    enabled: !!activeOrg && isAdmin,
    queryFn: async () => {
      const { data, response } = await api.GET("/api-keys");
      if (!data) throw new Error(errorMessage(undefined, `Failed to load (${response.status})`));
      return data as ApiKeyRecord[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data, response, error: body } = await api.POST("/api-keys", {
        body: { name: name.trim() },
      });
      if (!data) throw new Error(errorMessage(body, `Creation failed (${response.status})`));
      return data as { key: string };
    },
    onSuccess: (result) => {
      setCreated(result.key);
      setName("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["api-keys", activeOrg?.id] });
    },
    onError: (createError) => setError(createError.message),
  });

  const revoke = useMutation({
    mutationFn: async (keyId: string) => {
      const { response, error: body } = await api.DELETE("/api-keys/{key_id}", {
        params: { path: { key_id: keyId } },
      });
      if (!response.ok) {
        throw new Error(errorMessage(body, `Revoke failed (${response.status})`));
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys", activeOrg?.id] }),
  });

  if (!isAdmin) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyIcon className="size-4" />
          API keys
        </CardTitle>
        <CardDescription>
          Programmatic access to this workspace — shown once at creation, stored hashed.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {created ? (
          <div className="rounded-md border bg-muted/40 p-3">
            <p className="text-xs font-medium">Copy your key now — it will not be shown again.</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 font-mono text-xs">
                {created}
              </code>
              <Button
                size="icon"
                variant="outline"
                aria-label="Copy API key"
                onClick={() => {
                  void navigator.clipboard.writeText(created);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
              </Button>
            </div>
          </div>
        ) : null}

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim()) create.mutate();
          }}
        >
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Key name — e.g. CI pipeline"
            maxLength={120}
          />
          <Button type="submit" disabled={!name.trim() || create.isPending}>
            {create.isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <PlusIcon className="size-4" />
            )}
            Create
          </Button>
        </form>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (keys ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No API keys yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(keys ?? []).map((key) => (
              <li key={key.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {key.name}
                    {key.revoked_at ? (
                      <span className="ml-2 rounded-full bg-destructive/15 px-2 py-0.5 text-xs text-destructive">
                        revoked
                      </span>
                    ) : null}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">{key.prefix}…</p>
                  <p className="text-xs text-muted-foreground">
                    {key.last_used_at
                      ? `last used ${new Date(key.last_used_at).toLocaleString()}`
                      : "never used"}
                  </p>
                </div>
                {!key.revoked_at ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Revoke ${key.name}`}
                    disabled={revoke.isPending}
                    onClick={() => revoke.mutate(key.id)}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Use it as <code className="font-mono">Authorization: Bearer pgda_…</code> against the
          API. The key is bound to this workspace.
        </p>
      </CardContent>
    </Card>
  );
}
