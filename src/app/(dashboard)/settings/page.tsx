export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { SettingsPageClient } from "./_client";

export default async function SettingsPage() {
  const [organizations, integrations, moduleInstallations, users, workspaces] =
    await Promise.all([
      prisma.organization.findMany({ take: 1 }),
      prisma.integration.findMany({
        include: { workspace: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.moduleInstallation.findMany({
        include: { workspace: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.workspace.findMany({
        select: { id: true, name: true, type: true },
        orderBy: { name: "asc" },
      }),
    ]);

  const organization = organizations[0] ?? {
    id: "",
    name: "Unnamed Organization",
    slug: "",
    description: null,
    logoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return (
    <SettingsPageClient
      organization={JSON.parse(JSON.stringify(organization))}
      integrations={JSON.parse(JSON.stringify(integrations))}
      moduleInstallations={JSON.parse(JSON.stringify(moduleInstallations))}
      users={JSON.parse(JSON.stringify(users))}
      workspaces={JSON.parse(JSON.stringify(workspaces))}
    />
  );
}
