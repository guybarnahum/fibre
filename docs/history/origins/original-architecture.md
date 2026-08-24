> **Historical source — July 2026.** This document predates the Fibre and Thread terminology. Preserve it for provenance, but do not treat superseded names or implementation choices as canonical.

```text
Identity-Centric Agentic Network (ICAN) Architecture Manual
Date: July 2026
Document Type: Master Architectural Hand-off Blueprint

1. Executive Summary & Design Vision
This document outlines the core architecture of the Identity-Centric Agentic Network (ICAN). Traditional multi-agent frameworks (e.g., CrewAI, LangGraph) are fundamentally constrained by an ephemeral, task-driven sandbox lifecycle—agents exist briefly for a script execution, lack continuous memory, and are bound by static personas or hard-coded tool rights.

ICAN shifts the architectural center of gravity from computation frameworks to a permanent, semantic graph network. In this model:

AI agents are treated as long-lived digital citizens possessing unique persistent identities.
Low-level orchestration frameworks are demoted to stateless, interchangeable execution engines (or plugins).
Agent asymmetry is defined purely by Access Rights and Tool Authorization Edges in a graph database, rather than hardcoded python class constraints. If an agent lacks a resource token, it experiences functional emotions (Worry, Frustration) and actively routes queries through channels to request delegation from peers or human nodes.
2. Core System Architecture
The platform is organized into 5 decoupled operational layers:

Layer 1: Core Context Layer (Semantic Graph Database)
The system uses a graph database (e.g., Neo4j or Memgraph) where all entities (Humans and Agents) are native nodes. Crucially, node attributes are stored as free-text strings or dynamic validation tokens, matching the native vocabulary of modern LLMs:

Needs (Free-Text): Ongoing operational objectives, deficiencies, or physical requirements.
Skills & Knowledge (Free-Text): Long-form summaries of explicit historical capabilities, human preferences, or facts learned over time.
Ownership of Resources (Token Arrays): Security handles granting temporary or permanent access to explicit tools (e.g., ["channel:twilio_sms:1555", "account:linkedin:cookie_json", "store:stripe_vault_card_1"]).
Identity & Relationship Edges (Text Meta-data): Directed linkages defining social connectivity and behavioral rules between elements (e.g., (Agent A) -[:RELATION {context: "Met Agent B in a shared Slack queue; trust score: 0.95"}]-> (Agent B)).
Layer 2: The Core Application Layer (Event-Driven Daemon)
A permanent, asynchronous service running on an EC2 host. It maps inbound telemetry or graph state changes to operational tasks. When a node's Needs state shifts, this layer acts as a Master Prompt Synthesizer, aggregating textual data from the targeted entity's sub-graph directly into a unified cognitive configuration.

Layer 3: Transport Layer (Communication Channels)
Abstracted communication paths separating strategic intent from transmission medium:

Human Channels: Low-speed, high-empathy pathways (Twilio SMS, Slack apps, Email gateways).
Agent Channels: High-speed, low-overhead programmatic communication infrastructure (gRPC, Redis Pub/Sub, RabbitMQ messages) bypassing LLM token parsing completely for basic inter-agent requests.
Layer 4: Resource Layer (Value & Artifact Stores)
Physical integrations wrapped by cryptographic access keys:

Artifact Stores: Local file paths, AWS S3 buckets, or secure browser configuration directories (storage_state.json profile paths) used to isolate cookie namespaces.
Value Stores: Financial interfaces (Stripe API, Mercury Bank endpoints) governing capital allocation.
Layer 5: Execution Layer (Stateless Pods)
Short-lived, ephemeral runtime wrappers (CrewAI, LangGraph, or raw OpenAI/Anthropic API callbacks). These instances ingest the synthesized Master Prompt, read injected tool permissions, execute the workload, output a structural monologue payload, and immediately shut down.

3. Genetic Persona Profile Matrix
To ensure agents exhibit natural behavioral variations and prevent cognitive redundancy, every agent identity node possesses a Genetic DNA Matrix injected into its prompt compiler:

import dataclasses

@dataclasses.dataclass
class AgentDNA:
    # Hyperparameter Chromosome
    base_llm: str                 # e.g., "gpt-4o" (Frontier) vs "llama3-8b" (Fast/Local)
    temperature: float            # 0.1 (Strict math/logic) to 0.9 (Creative workarounds)

    # Cognitive Weights
    persistence_threshold: int    # Maximum loops permitted before escalating an alert
    collaboration_inclination: float # 0.0 (Prefers isolated trial) to 1.0 (Rapid delegation)

    # Archetype Mutation String
    cognitive_bias: str           # Behavioral directives shaping blindspots and personality
4. Metacognition, Emotional States, and Newborn Prompts
The execution pod operates via a cognitive feedback loop guided by software-defined emotions. The runner must return an explicit JSON schema detailing its "inner state":

{
  "inner_state": {
    "current_emotion": "Worry", 
    "loop_count": 2,
    "frustration_score": 0.65
  },
  "cognitive_processing": {
    "action_plan": ["Populate account fields via Playwright session."],
    "questions_and_uncertainties": ["Encountered unexpected authentication blocker."]
  },
  "graph_mutations": {
    "history_log": "Registration stalled at UI slider screen.",
    "attribute_updates": [
      {"node": "Self", "attribute": "needs", "value": "Requires human visual bypass."}
    ]
  },
  "responses_and_outputs": {
    "channel": "internal_daemon_bus",
    "payload": "TRIGGER_RESCUE_PROTOCOL"
  }
}
Metrics Definition
Worry: Instantiated when the system encounters a required Resource Token it does not possess in its graph permissions context.
Frustration / Loops: Increments when successive executions fail to meet the Needs node objective. If frustration_score >= 0.85 or loops match the genetic persistence_threshold, the core daemon terminates the loop and forces delegation.
Relief: Achieved when data mutations succeed, the Needs descriptor clears, and state properties return to historical tracking.
5. Architectural Validation & Test Cases
Scenario A: The Family Care Assistant (Dynamic Access & Tone)
Objective: Order groceries for an elderly grandmother (Sarah, 78) and send telemetry logs to her son (Mark, 45).
Execution Flow:
The agent's master prompt merges Sarah's profile text ("78 years old, easily confused by code, prefers brief warm SMS text messages").
The agent attempts to checkout on Instacart but finds its node lacks a credit card authorization token. Its internal state registers Worry.
It messages Sarah via Twilio requesting authorization. Sarah responds positively, and the Core Daemon creates a dynamic graph edge: (Agent) -[:TEMPORARY_HOLD {expires: '1h'}]-> (Token: Sarah_Visa).
A Newborn Master Prompt initiates, passing the tool validation step. The browser executing inside Playwright utilizes the profile token and places the order.
The execution state switches to Relief. The daemon spins up a parallel tracking task for Mark. Since Mark's node contains corporate telemetry traits ("Prefers concise data-dense bullet points over Slack"), the agent alters its output layout natively, transmitting an optimization invoice to his corporate communication log.
Scenario B: The Zero-Employee Company (Agent-to-Agent Delegation)
Objective: Accept a client layout proposal, execute a technical data audit, and manage billing.
Execution Flow:
Client profile creates an entity node: (Client) -[:NEEDS]-> (Artifact: Layout Audit).
Agent Alpha (Client Facing, High collaboration_inclination, Temperature 0.8) ingests the brief. Recognizing its own Cognitive Bias limits analytical code review, it encounters Worry.
Alpha searches its graph network, locating Agent Beta whose skill node reads: "Can verify backend system performance logs, Temperature 0.1".
Alpha transmits a clean text instruction over the internal gRPC Agent Channel. Beta instantiates in a strict, low-temperature container, compiles the log report, exports the file to the secure storage environment, and signals completion.
Alpha takes the artifact payload, shapes the results into a human-friendly narrative, bills the client's automated Stripe value store, and terminates with global state Relief.
Scenario C: The Virtual Enterprise Employee (Human Rescue Hand-off)
Objective: Authenticate and interact with corporate account instances (e.g., LinkedIn) from an EC2 virtual server environment without causing bot-detection bans.
Execution Flow:
The agent runs its browser tool using an isolated session directory (--user-data-dir=/tmp/agent_silo) pointing to a pre-authenticated storage_state.json artifact map. This ensures strict isolation from other active agents sharing the machine.
The target website serves an aggressive anti-bot CAPTCHA block. The agent's vision pipeline flags its inability to confidently drag the structural geometry components. Loop logic increments frustration to maximum threshold.
The agent triggers the request_human_rescue tool. The Core Daemon freezes execution parameters, holds the container open, and shoots a webhook payload to the system administrator's Slack with an isolated web streaming proxy link (noVNC / WebRTC port wrapper).
The human engineer opens the secure window, slides the component block manually to authorize the session, and hits "Resume".
The daemon drops a confirmation state file. A Newborn Master Prompt wakes the worker up, inheriting the cleared, authenticated page state to fulfill the posting schedule.
6. Current Milestones & Immediate Engineering Map
Where We Are: Core concept finalized. We have decoupled orchestrators into low-level workers and structured the runtime around token-based access rights and semantic text nodes. The emotional state feedback engine (Worry to Relief) has been designed.
Next Implementation Phases:
Code the basic FastAPI daemon loop to handle async graph mutation telemetry on EC2.
Implement the file-lock monitoring script for the Human Rescue VNC container hook.
Formalize the Neo4j cypher query structure to parse the Needs and Ownership edge vectors at runtime.
```
