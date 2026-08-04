# thread-runtime

Coordinates request appraisal, dignity participation decisions, leases, consented thaw, temporary cognition, commit, and freeze.

Externally initiated requests must first receive a bounded Request Appraisal Capsule. The runtime may produce clarification, negotiation, delegation, or refusal from that preflight, but it must not compile the full task capsule or execute the task unless the participation decision is `accept`.

The runtime preserves requester identity, stated need, dignity policy version, score and factor trace, feelings, proposed relationship effects, and the resulting participation action in one causation chain.

This directory currently defines a service boundary only. Implementation must use portable domain contracts and must not allow LLM output to mutate protected state directly.
