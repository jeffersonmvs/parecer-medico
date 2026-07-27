import { Prisma } from "@prisma/client";

// Shared Prisma include for the parecer list/card shape, reused by the
// list API and server pages so the ParecerListItem type always matches.
export const parecerListInclude = {
  requestingSpecialty: true,
  requestedSpecialty: true,
  requester: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
  _count: { select: { messages: true, attachments: true } },
} satisfies Prisma.ParecerInclude;
