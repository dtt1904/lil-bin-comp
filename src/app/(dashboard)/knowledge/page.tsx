export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { KnowledgePageClient } from "./_client";

export default async function KnowledgeCenterPage() {
  const [memories, sops, prompts] = await Promise.all([
    prisma.memoryEntry.findMany({
      include: {
        workspace: { select: { name: true } },
        ownerAgent: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.sOPDocument.findMany({
      include: {
        workspace: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.promptTemplate.findMany({
      include: {
        workspace: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <KnowledgePageClient
      memories={JSON.parse(JSON.stringify(memories))}
      sops={JSON.parse(JSON.stringify(sops))}
      prompts={JSON.parse(JSON.stringify(prompts))}
    />
  );
}
