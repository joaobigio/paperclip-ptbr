import type { Agent } from "@paperclipai/shared";
import type { CompanyUserProfile } from "./company-members";

type ActivityDetails = Record<string, unknown> | null | undefined;

type ActivityParticipant = {
  type: "agent" | "user";
  agentId?: string | null;
  userId?: string | null;
};

type ActivityIssueReference = {
  id?: string | null;
  identifier?: string | null;
  title?: string | null;
};

interface ActivityFormatOptions {
  agentMap?: Map<string, Agent>;
  userProfileMap?: Map<string, CompanyUserProfile>;
  currentUserId?: string | null;
}

const ACTIVITY_ROW_VERBS: Record<string, string> = {
  "issue.created": "criou",
  "issue.updated": "atualizou",
  "issue.checked_out": "pegou",
  "issue.released": "liberou",
  "issue.comment_added": "comentou em",
  "issue.comment_cancelled": "cancelou um comentário enfileirado em",
  "issue.attachment_added": "anexou arquivo em",
  "issue.attachment_removed": "removeu anexo de",
  "issue.document_created": "criou documento em",
  "issue.document_updated": "atualizou documento em",
  "issue.document_deleted": "excluiu documento de",
  "issue.monitor_scheduled": "agendou monitor em",
  "issue.monitor_triggered": "disparou monitor para",
  "issue.monitor_cleared": "limpou monitor em",
  "issue.monitor_skipped": "pulou monitor para",
  "issue.monitor_exhausted": "esgotou monitor em",
  "issue.monitor_recovery_wake_queued": "enfileirou recuperação de monitor para",
  "issue.monitor_recovery_issue_created": "criou recuperação de monitor para",
  "issue.monitor_escalated_to_board": "escalou monitor para",
  "issue.commented": "comentou em",
  "issue.deleted": "excluiu",
  "issue.successful_run_handoff_required": "marcou próximo passo faltante em",
  "issue.successful_run_handoff_resolved": "registrou próximo passo escolhido em",
  "issue.successful_run_handoff_escalated": "escalou próximo passo faltante em",
  "agent.created": "criou",
  "agent.updated": "atualizou",
  "agent.paused": "pausou",
  "agent.resumed": "retomou",
  "agent.terminated": "encerrou",
  "agent.key_created": "criou chave de API para",
  "agent.budget_updated": "atualizou orçamento de",
  "agent.runtime_session_reset": "reiniciou sessão de",
  "heartbeat.invoked": "disparou heartbeat para",
  "heartbeat.cancelled": "cancelou heartbeat de",
  "approval.created": "solicitou aprovação",
  "approval.approved": "aprovou",
  "approval.rejected": "rejeitou",
  "project.created": "criou",
  "project.updated": "atualizou",
  "project.deleted": "excluiu",
  "goal.created": "criou",
  "goal.updated": "atualizou",
  "goal.deleted": "excluiu",
  "cost.reported": "reportou custo de",
  "cost.recorded": "registrou custo de",
  "company.created": "criou empresa",
  "company.updated": "atualizou empresa",
  "company.archived": "arquivou",
  "company.budget_updated": "atualizou orçamento de",
};

const ISSUE_ACTIVITY_LABELS: Record<string, string> = {
  "issue.created": "criou a tarefa",
  "issue.updated": "atualizou a tarefa",
  "issue.checked_out": "pegou a tarefa",
  "issue.released": "liberou a tarefa",
  "issue.comment_added": "adicionou um comentário",
  "issue.comment_cancelled": "cancelou um comentário enfileirado",
  "issue.feedback_vote_saved": "salvou feedback sobre uma resposta da IA",
  "issue.attachment_added": "adicionou um anexo",
  "issue.attachment_removed": "removeu um anexo",
  "issue.document_created": "criou um documento",
  "issue.document_updated": "atualizou um documento",
  "issue.document_deleted": "excluiu um documento",
  "issue.monitor_scheduled": "agendou um monitor",
  "issue.monitor_triggered": "disparou um monitor",
  "issue.monitor_cleared": "limpou um monitor",
  "issue.monitor_skipped": "pulou um monitor",
  "issue.monitor_exhausted": "esgotou um monitor",
  "issue.monitor_recovery_wake_queued": "enfileirou despertar de recuperação de monitor",
  "issue.monitor_recovery_issue_created": "criou uma tarefa de recuperação de monitor",
  "issue.monitor_escalated_to_board": "escalou um monitor para o painel",
  "issue.deleted": "excluiu a tarefa",
  "issue.successful_run_handoff_required": "execução terminou sem próximo passo definido",
  "issue.successful_run_handoff_resolved": "próximo passo escolhido",
  "issue.successful_run_handoff_escalated": "execução terminou sem próximo passo - recuperação escalada",
  "agent.created": "criou um agente",
  "agent.updated": "atualizou o agente",
  "agent.paused": "pausou o agente",
  "agent.resumed": "retomou o agente",
  "agent.terminated": "encerrou o agente",
  "heartbeat.invoked": "disparou um heartbeat",
  "heartbeat.cancelled": "cancelou um heartbeat",
  "approval.created": "solicitou aprovação",
  "approval.approved": "aprovou",
  "approval.rejected": "rejeitou",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function humanizeValue(value: unknown): string {
  if (typeof value !== "string") return String(value ?? "nenhum");
  return value.replace(/_/g, " ");
}

function isActivityParticipant(value: unknown): value is ActivityParticipant {
  const record = asRecord(value);
  if (!record) return false;
  return record.type === "agent" || record.type === "user";
}

function isActivityIssueReference(value: unknown): value is ActivityIssueReference {
  return asRecord(value) !== null;
}

function readParticipants(details: ActivityDetails, key: string): ActivityParticipant[] {
  const value = details?.[key];
  if (!Array.isArray(value)) return [];
  return value.filter(isActivityParticipant);
}

function readIssueReferences(details: ActivityDetails, key: string): ActivityIssueReference[] {
  const value = details?.[key];
  if (!Array.isArray(value)) return [];
  return value.filter(isActivityIssueReference);
}

function formatUserLabel(userId: string | null | undefined, options: ActivityFormatOptions = {}): string {
  if (!userId || userId === "local-board") return "Painel";
  if (options.currentUserId && userId === options.currentUserId) return "Você";
  const profile = options.userProfileMap?.get(userId);
  if (profile) return profile.label;
  return `usuário ${userId.slice(0, 5)}`;
}

function formatParticipantLabel(participant: ActivityParticipant, options: ActivityFormatOptions): string {
  if (participant.type === "agent") {
    const agentId = participant.agentId ?? "";
    return options.agentMap?.get(agentId)?.name ?? "agente";
  }
  return formatUserLabel(participant.userId, options);
}

function formatIssueReferenceLabel(reference: ActivityIssueReference): string {
  if (reference.identifier) return reference.identifier;
  if (reference.title) return reference.title;
  if (reference.id) return reference.id.slice(0, 8);
  return "tarefa";
}

function formatChangedEntityLabel(
  singular: string,
  plural: string,
  labels: string[],
): string {
  if (labels.length <= 0) return plural;
  if (labels.length === 1) return `${singular} ${labels[0]}`;
  return `${labels.length} ${plural}`;
}

function formatIssueUpdatedVerb(details: ActivityDetails): string | null {
  if (!details) return null;
  const previous = asRecord(details._previous) ?? {};
  if (details.status !== undefined) {
    const from = previous.status;
    return from
      ? `alterou status de ${humanizeValue(from)} para ${humanizeValue(details.status)} em`
      : `alterou status para ${humanizeValue(details.status)} em`;
  }
  if (details.priority !== undefined) {
    const from = previous.priority;
    return from
      ? `alterou prioridade de ${humanizeValue(from)} para ${humanizeValue(details.priority)} em`
      : `alterou prioridade para ${humanizeValue(details.priority)} em`;
  }
  return null;
}

function formatAssigneeName(details: ActivityDetails, options: ActivityFormatOptions): string | null {
  if (!details) return null;
  const agentId = details.assigneeAgentId;
  const userId = details.assigneeUserId;
  if (typeof agentId === "string" && agentId) {
    return options.agentMap?.get(agentId)?.name ?? "agente";
  }
  if (typeof userId === "string" && userId) {
    return formatUserLabel(userId, options);
  }
  return null;
}

function formatIssueUpdatedAction(details: ActivityDetails, options: ActivityFormatOptions = {}): string | null {
  if (!details) return null;
  const previous = asRecord(details._previous) ?? {};
  const parts: string[] = [];

  if (details.status !== undefined) {
    const from = previous.status;
    parts.push(
      from
        ? `alterou o status de ${humanizeValue(from)} para ${humanizeValue(details.status)}`
        : `alterou o status para ${humanizeValue(details.status)}`,
    );
  }
  if (details.priority !== undefined) {
    const from = previous.priority;
    parts.push(
      from
        ? `alterou a prioridade de ${humanizeValue(from)} para ${humanizeValue(details.priority)}`
        : `alterou a prioridade para ${humanizeValue(details.priority)}`,
    );
  }
  if (details.assigneeAgentId !== undefined || details.assigneeUserId !== undefined) {
    const assigneeName = formatAssigneeName(details, options);
    parts.push(assigneeName ? `atribuiu a tarefa para ${assigneeName}` : "removeu a atribuição da tarefa");
  }
  if (details.title !== undefined) parts.push("atualizou o título");
  if (details.description !== undefined) parts.push("atualizou a descrição");

  return parts.length > 0 ? parts.join(", ") : null;
}

function formatStructuredIssueChange(input: {
  action: string;
  details: ActivityDetails;
  options: ActivityFormatOptions;
  forIssueDetail: boolean;
}): string | null {
  const details = input.details;
  if (!details) return null;

  if (input.action === "issue.blockers_updated") {
    const added = readIssueReferences(details, "addedBlockedByIssues").map(formatIssueReferenceLabel);
    const removed = readIssueReferences(details, "removedBlockedByIssues").map(formatIssueReferenceLabel);
    if (added.length > 0 && removed.length === 0) {
      const changed = formatChangedEntityLabel("bloqueador", "bloqueadores", added);
      return input.forIssueDetail ? `adicionou ${changed}` : `adicionou ${changed} em`;
    }
    if (removed.length > 0 && added.length === 0) {
      const changed = formatChangedEntityLabel("bloqueador", "bloqueadores", removed);
      return input.forIssueDetail ? `removeu ${changed}` : `removeu ${changed} de`;
    }
    return input.forIssueDetail ? "atualizou bloqueadores" : "atualizou bloqueadores em";
  }

  if (input.action === "issue.reviewers_updated" || input.action === "issue.approvers_updated") {
    const added = readParticipants(details, "addedParticipants").map((participant) => formatParticipantLabel(participant, input.options));
    const removed = readParticipants(details, "removedParticipants").map((participant) => formatParticipantLabel(participant, input.options));
    const singular = input.action === "issue.reviewers_updated" ? "revisor" : "aprovador";
    const plural = input.action === "issue.reviewers_updated" ? "revisores" : "aprovadores";
    if (added.length > 0 && removed.length === 0) {
      const changed = formatChangedEntityLabel(singular, plural, added);
      return input.forIssueDetail ? `adicionou ${changed}` : `adicionou ${changed} em`;
    }
    if (removed.length > 0 && added.length === 0) {
      const changed = formatChangedEntityLabel(singular, plural, removed);
      return input.forIssueDetail ? `removeu ${changed}` : `removeu ${changed} de`;
    }
    return input.forIssueDetail ? `atualizou ${plural}` : `atualizou ${plural} em`;
  }

  return null;
}

export function formatActivityVerb(
  action: string,
  details?: Record<string, unknown> | null,
  options: ActivityFormatOptions = {},
): string {
  if (action === "issue.updated") {
    const issueUpdatedVerb = formatIssueUpdatedVerb(details);
    if (issueUpdatedVerb) return issueUpdatedVerb;
  }

  const structuredChange = formatStructuredIssueChange({
    action,
    details,
    options,
    forIssueDetail: false,
  });
  if (structuredChange) return structuredChange;

  return ACTIVITY_ROW_VERBS[action] ?? action.replace(/[._]/g, " ");
}

export function formatIssueActivityAction(
  action: string,
  details?: Record<string, unknown> | null,
  options: ActivityFormatOptions = {},
): string {
  if (action === "issue.updated") {
    const issueUpdatedAction = formatIssueUpdatedAction(details, options);
    if (issueUpdatedAction) return issueUpdatedAction;
  }

  const structuredChange = formatStructuredIssueChange({
    action,
    details,
    options,
    forIssueDetail: true,
  });
  if (structuredChange) return structuredChange;

  if (action.startsWith("issue.monitor_") && details) {
    const serviceName = typeof details.serviceName === "string" && details.serviceName.trim()
      ? details.serviceName.trim()
      : null;
    const base = ISSUE_ACTIVITY_LABELS[action] ?? action.replace(/[._]/g, " ");
    return serviceName ? `${base} para ${serviceName}` : base;
  }

  if (
    (action === "issue.document_created" || action === "issue.document_updated" || action === "issue.document_deleted") &&
    details
  ) {
    const key = typeof details.key === "string" ? details.key : "documento";
    const title = typeof details.title === "string" && details.title ? ` (${details.title})` : "";
    return `${ISSUE_ACTIVITY_LABELS[action] ?? action} ${key}${title}`;
  }

  return ISSUE_ACTIVITY_LABELS[action] ?? action.replace(/[._]/g, " ");
}
