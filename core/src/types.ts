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

export interface PolicyRef {
  id: string;
  version: string;
}

export interface ThreadSnapshot {
  threadId: string;
  version: number;
  status: ThreadStatus;
  identity: {
    name: string;
    originOrientation: "original" | "echo" | "homage" | "composite";
    selfDescription: string;
    birthDate?: string;
    languages?: string[];
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
  requestId: string;
  trigger: string;
  requester: EntityRef;
  objective: string;
  statedNeed?: string;
  permissions: string[];
  acceptanceCriteria?: string;
}

export interface ContextSelection {
  memoryRefs?: string[];
  relationshipRefs?: string[];
  knownAlternatives?: EntityRef[];
  /** Thread-owned unresolved-intention references selected for this appraisal. */
  obligations?: string[];
}

export interface RequestAppraisalCapsule {
  threadId: string;
  snapshotVersion: number;
  requestId: string;
  requestFingerprint: string;
  identity: string;
  traits: string[];
  selfModel: string;
  needs: string[];
  feelings: string[];
  unresolvedIntentions: string[];
  budgets?: ThreadSnapshot["accounts"];
  requester: EntityRef;
  objective: string;
  statedNeed?: string;
  acceptanceCriteria?: string;
  permissions: string[];
  relevantMemories: string[];
  excludedMemories: string[];
  relevantRelationships: string[];
  excludedRelationships: string[];
  knownAlternatives: EntityRef[];
  obligations: string[];
  excludedObligations: string[];
  appraisalPolicy: PolicyRef;
}

export interface DignityFactors {
  identityAlignment: string;
  individualizedAdvantage: string;
  requesterNeed: string;
  relationalMeaning: string;
  respectAndReciprocity: string;
  participationTerms: string;
  obligationsAndOpportunityCost: string;
}

export interface RelationshipImpact {
  entity: EntityRef;
  fondnessDelta: number;
  resentmentDelta: number;
  rationale: string;
  evidenceRefs: string[];
}

export type DignityBand = "low" | "contested" | "high";

export type ParticipationAction =
  | "accept"
  | "clarify"
  | "negotiate"
  | "delegate"
  | "refuse";

export interface DignityAssessment {
  threadId: string;
  snapshotVersion: number;
  requestId: string;
  requestFingerprint: string;
  policy: PolicyRef;
  proposedAction: ParticipationAction;
  score: number;
  rationale: string;
  factors: DignityFactors;
  evidenceRefs: string[];
  repairQuestions: string[];
  knownAlternatives: EntityRef[];
  feelings: string[];
  conflictingMotives: string[];
  uncertainties: string[];
  relationshipImpact: RelationshipImpact;
}

export interface PrivateParticipationStance {
  threadId: string;
  snapshotVersion: number;
  requestId: string;
  requestFingerprint: string;
  policy: PolicyRef;
  desiredAction: ParticipationAction;
  dignityBand: DignityBand;
  score: number;
  privateRationale: string;
  evidenceRefs: string[];
  privateFeelings: string[];
  conflictingMotives: string[];
  uncertainties: string[];
  repairQuestions: string[];
  knownAlternatives: EntityRef[];
  relationshipImpact: RelationshipImpact;
}

export interface AuthorizationDecision {
  authorizedAction: ParticipationAction;
  rationale: string;
  /** References must resolve to this Thread's unresolved intentions in the prototype. */
  obligationReferences?: string[];
}

export interface AuthorizationMetadata {
  authorizationId: string;
  causationId: string;
  issuedAt: string;
}

export interface ParticipationAuthorization {
  authorizationId: string;
  causationId: string;
  issuedAt: string;
  threadId: string;
  snapshotVersion: number;
  requestId: string;
  requestFingerprint: string;
  requester: EntityRef;
  policy: PolicyRef;
  desiredAction: ParticipationAction;
  authorizedAction: ParticipationAction;
  dignityBand: DignityBand;
  score: number;
  rationale: string;
  evidenceRefs: string[];
  obligationReferences: string[];
  relationshipImpact: RelationshipImpact;
}

export type DisclosureMode =
  | "full_candor"
  | "tactful_candor"
  | "selective"
  | "strategic_ambiguity"
  | "evasive"
  | "deceptive";

export type CommunicatedPosture = ParticipationAction | "noncommittal";

export interface DisclosureStrategyInput {
  strategyId: string;
  audience: EntityRef[];
  mode: DisclosureMode;
  communicatedPosture: CommunicatedPosture;
  publicRationaleIntent: string;
  disclosedReasonCategories: string[];
  withheldReasonCategories: string[];
  relationshipObjective?: string;
  selfProtectionObjective?: string;
  integrityConcern?: string;
  privateRationale: string;
}

export interface DisclosureStrategy extends DisclosureStrategyInput {
  threadId: string;
  requestId: string;
  authorizationId: string;
}

/** Audience-visible response. Restricted disclosure mode remains on DisclosureStrategy. */
export interface ExternalParticipationResponse {
  requestId: string;
  authorizationId: string;
  strategyId: string;
  communicatedPosture: CommunicatedPosture;
  message: string;
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
  requestId: string;
  objective: string;
  statedNeed?: string;
  acceptanceCriteria?: string;
  relevantMemories: string[];
  relevantRelationships: string[];
  permissions: string[];
  budgets?: ThreadSnapshot["accounts"];
  participation: ParticipationAuthorization;
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
  updatedUnresolvedIntentions?: string[];
}
