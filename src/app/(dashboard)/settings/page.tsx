export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { SettingsPageClient } from "./_client";

export default async function SettingsPage() {
  const organizationsP = prisma.organization.findMany({ take: 1 });
  const integrationsP = prisma.integration.findMany({
    include: { workspace: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const moduleInstallationsP = prisma.moduleInstallation.findMany({
    include: { workspace: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const usersP = prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  const workspacesP = prisma.workspace.findMany({
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
  });

  const [organizations, integrations, moduleInstallations, users, workspaces] =
    await Promise.all([
      organizationsP.catch((err) => {
        console.error("[settings] organizations query failed:", err);
        return [] as Awaited<typeof organizationsP>;
      }),
      integrationsP.catch((err) => {
        console.error("[settings] integrations query failed:", err);
        return [] as Awaited<typeof integrationsP>;
      }),
      moduleInstallationsP.catch((err) => {
        console.error("[settings] moduleInstallations query failed:", err);
        return [] as Awaited<typeof moduleInstallationsP>;
      }),
      usersP.catch((err) => {
        console.error("[settings] users query failed:", err);
        return [] as Awaited<typeof usersP>;
      }),
      workspacesP.catch((err) => {
        console.error("[settings] workspaces query failed:", err);
        return [] as Awaited<typeof workspacesP>;
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
