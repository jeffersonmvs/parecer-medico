// Shapes returned by the API, used by client components.

export type Ref = { id: string; name: string };

export type ParecerListItem = {
  id: string;
  code: string;
  patientName: string;
  patientRecord: string;
  bed: string | null;
  diagnosis: string;
  priority: string;
  status: string;
  escalationLevel: number;
  createdAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  requestingSpecialty: { id: string; name: string; code: string };
  requestedSpecialty: { id: string; name: string; code: string };
  requester: Ref;
  assignee: Ref | null;
  _count: { messages: number; attachments: number };
};

export type ParecerEvent = {
  id: string;
  type: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  location: string | null;
  durationMs: number | null;
  createdAt: string;
  user: Ref | null;
};

export type ChatMessage = {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  readAt: string | null;
  deliveredAt: string | null;
  sender: Ref;
};

export type ShiftEntry = {
  id: string;
  status: string;
  startedAt: string;
  user: { id: string; name: string; role: string; crm: string | null };
};

export type SpecialtyBoard = {
  id: string;
  name: string;
  code: string;
  onShift: ShiftEntry[];
  pending: number;
  avgResponseMs: number | null;
};
