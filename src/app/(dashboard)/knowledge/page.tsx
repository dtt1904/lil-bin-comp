export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { KnowledgePageClient } from "./_client";

export default async function KnowledgeCenterPage() {
  const memoriesP = prisma.memoryEntry.findMany({
    include: {
      workspace: { select: { name: true } },
      ownerAgent: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const sopsP = prisma.sOPDocument.findMany({
    include: {
      workspace: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  const promptsP = prisma.promptTemplate.findMany({
    include: {
      workspace: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const [memories, sops, prompts] = await Promise.all([
    memoriesP.catch((err) => {
      console.error("[knowledge] memories query failed:", err);
      return [] as Awaited<typeof memoriesP>;
    }),
    sopsP.catch((err) => {
      console.error("[knowledge] sops query failed:", err);
      return [] as Awaited<typeof sopsP>;
    }),
    promptsP.catch((err) => {
      console.error("[knowledge] prompts query failed:", err);
      return [] as Awaited<typeof promptsP>;
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
