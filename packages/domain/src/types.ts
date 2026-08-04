export type ThreadStatus =
  | "frozen"
  | "thawing"
  | "active"
  | "freezing"
  | "dormant"
  | "retired";

export type EntityKind =
  | "human"
  | "thread"
  | "company"
  | "institution"
  | "other";

export interface EntityRef {
  entityId: string;
  kind: EntityKind;
  displayName: string;
}

export interface ThreadSnapshot {
  threadId: string;
  version: number;
  status: ThreadStatus;
  identity: {
    name: string;
    originOrientation: "original" | "echo" | "homage" | "composite";
    selfDescription: string;
    birthCity?: string;
    currentWorkCity?: string;
    culture?: string[];
  };
  genome: {
    textualTraits: Record<string, string>;
    runtimeBaselines: Record<string, string | number | boolean>;
  };
  currentState: {
    needs: string[];
    feelings: string[];
    selfModel: string;
    unresolvedIntentions: string[];
  };
  accounts?: {
    fibreCredits: number;
    usdAvailable: number;
    modelTokensAvailable: number;
  };
  relationshipRefs: string[];
  memoryRefs: string[];
  provenance: {
    createdAt: string;
    createdBy: string;
    lastEventId?: string;
  };
}

export interface ActivationRequest {
  trigger: string;
  requester: EntityRef;
  objective: string;
  statedNeed?: string;
  relevantMemories: string[];
  relevantRelationships: string[];
  permissions: string[];
  acceptanceCriteria?: string;
}

export interface RequestAppraisalCapsule {
  threadId: string;
  snapshotVersion: number;
  identity: string;
  traits: string[];
  selfModel: string;
  needs: string[];
  feelings: string[];
  requester: EntityRef;
  objective: string;
  statedNeed?: string;
  relevantMemories: string[];
  relevantRelationships: string[];
  appraisalPolicy: "dignity_guardian";
}

export interface DignityFactors {
  identityAlignment: string;
  individualizedAdvantage: string;
  requesterNeed: string;
  relationalMeaning: string;
  respectAndReciprocity: string;
}

export interface RelationshipImpact {
  entity: EntityRef;
  fondnessDelta: number;
  resentmentDelta: number;
  rationale: string;
}

export interface DignityAssessment {
  score: number;
  rationale: string;
  factors: DignityFactors;
  repairQuestions: string[];
  genericAlternativeAvailable: boolean;
  feelings: string[];
  relationshipImpact: RelationshipImpact;
}

export type DignityBand = "low" | "contested" | "high";

export type ParticipationAction =
  | "accept"
  | "clarify"
  | "negotiate"
  | "delegate"
  | "refuse";

export interface ParticipationDecision {
  action: ParticipationAction;
  dignityBand: DignityBand;
  score: number;
  rationale: string;
  repairQuestions: string[];
  feelings: string[];
  relationshipImpact: RelationshipImpact;
}

export interface ThreadContextCapsule {
  threadId: string;
  snapshotVersion: number;
  identity: string;
  traits: string[];
  selfModel: string;
  needs: string[];
  feelings: string[];
  requester: EntityRef;
  objective: string;
  statedNeed?: string;
  acceptanceCriteria?: string;
  relevantMemories: string[];
  relevantRelationships: string[];
  permissions: string[];
  budgets?: ThreadSnapshot["accounts"];
  participation: ParticipationDecision;
  auditPolicies: [
    "dignity_guardian",
    "goal_guardian",
    "self_examiner_steward",
  ];
}

export interface ProposedLifeChange {
  summary: string;
  newMemories?: string[];
  updatedNeeds?: string[];
  updatedFeelings?: string[];
  updatedSelfModel?: string;
}
