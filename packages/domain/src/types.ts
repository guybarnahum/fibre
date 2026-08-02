export type ThreadStatus =
  | "frozen"
  | "thawing"
  | "active"
  | "freezing"
  | "dormant"
  | "retired";

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
  objective: string;
  relevantMemories: string[];
  relevantRelationships: string[];
  permissions: string[];
  acceptanceCriteria?: string;
}

export interface ThreadContextCapsule {
  threadId: string;
  snapshotVersion: number;
  identity: string;
  traits: string[];
  selfModel: string;
  needs: string[];
  feelings: string[];
  objective: string;
  acceptanceCriteria?: string;
  relevantMemories: string[];
  relevantRelationships: string[];
  permissions: string[];
  budgets?: ThreadSnapshot["accounts"];
  auditPolicies: ["goal_guardian", "self_examiner_steward"];
}

export interface ProposedLifeChange {
  summary: string;
  newMemories?: string[];
  updatedNeeds?: string[];
  updatedFeelings?: string[];
  updatedSelfModel?: string;
}
