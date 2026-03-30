import { db } from "@/lib/db";

export const ROOT_ADMIN_USER_ORG_PREFIX = "root_admin_user_org_";

export interface RootAdminOrgLite {
  id: string;
  nome: string;
  email: string | null;
  slug: string | null;
  statusEscritorio?: string;
}

export interface RootAdminUserLite {
  id: string;
  email: string;
  escritorioId?: string | null;
}

export interface RootAdminUserWithOrganization<T> {
  user: T;
  organizationId: string | null;
  organization: RootAdminOrgLite | null;
}

function normalizeEmail(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

function getEmailDomain(value: string | null | undefined): string | null {
  const email = normalizeEmail(value);
  const atIndex = email.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === email.length - 1) {
    return null;
  }

  return email.slice(atIndex + 1);
}

function getMappedUserIdFromKey(key: string): string | null {
  if (!key.startsWith(ROOT_ADMIN_USER_ORG_PREFIX)) {
    return null;
  }

  const userId = key.slice(ROOT_ADMIN_USER_ORG_PREFIX.length);
  return userId || null;
}

function parseOrgId(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (value && typeof value === "object" && "organizationId" in value) {
    const orgId = (value as { organizationId?: unknown }).organizationId;
    if (typeof orgId === "string" && orgId.trim()) {
      return orgId;
    }
  }

  return null;
}

export async function getUserOrganizationMappings(): Promise<Record<string, string>> {
  const rows = await db.appSetting.findMany({
    where: {
      key: {
        startsWith: ROOT_ADMIN_USER_ORG_PREFIX,
      },
    },
    select: {
      key: true,
      value: true,
    },
  });

  const mapping: Record<string, string> = {};

  for (const row of rows) {
    const userId = getMappedUserIdFromKey(row.key);
    const orgId = parseOrgId(row.value);

    if (userId && orgId) {
      mapping[userId] = orgId;
    }
  }

  return mapping;
}

export async function setUserOrganizationMapping(userId: string, organizationId: string | null) {
  const key = `${ROOT_ADMIN_USER_ORG_PREFIX}${userId}`;

  if (!organizationId) {
    await db.appSetting.deleteMany({ where: { key } });
    return;
  }

  await db.appSetting.upsert({
    where: { key },
    update: { value: { organizationId } },
    create: { key, value: { organizationId } },
  });
}

export async function deleteUserOrganizationMapping(userId: string) {
  const key = `${ROOT_ADMIN_USER_ORG_PREFIX}${userId}`;
  await db.appSetting.deleteMany({ where: { key } });
}

export function resolveUserOrganization(
  user: RootAdminUserLite,
  organizations: RootAdminOrgLite[],
  mapping: Record<string, string>
): RootAdminOrgLite | null {
  const explicitlyMappedOrgId = mapping[user.id];

  if (explicitlyMappedOrgId) {
    const mappedOrg = organizations.find((org) => org.id === explicitlyMappedOrgId) || null;
    if (mappedOrg) {
      return mappedOrg;
    }
  }

  // Priorizar escritorioId direto do usuário
  if (user.escritorioId) {
    const orgByEscritorioId = organizations.find((org) => org.id === user.escritorioId) || null;
    if (orgByEscritorioId) {
      return orgByEscritorioId;
    }
  }

  const userEmail = normalizeEmail(user.email);
  if (!userEmail) {
    return null;
  }

  const exactOrg = organizations.find((org) => normalizeEmail(org.email) === userEmail) || null;
  if (exactOrg) {
    return exactOrg;
  }

  const userDomain = getEmailDomain(userEmail);
  if (!userDomain) {
    return null;
  }

  return organizations.find((org) => getEmailDomain(org.email) === userDomain) || null;
}

export function attachOrganizationToUsers<T extends RootAdminUserLite>(
  users: T[],
  organizations: RootAdminOrgLite[],
  mapping: Record<string, string>
): Array<T & { organizationId: string | null; organization: RootAdminOrgLite | null }> {
  return users.map((user) => {
    const organization = resolveUserOrganization(user, organizations, mapping);
    return {
      ...user,
      organizationId: organization?.id || null,
      organization,
    };
  });
}
