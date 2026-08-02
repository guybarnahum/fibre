# thread-runtime

Coordinates leases, thaw, temporary cognition, commit, and freeze.

This directory currently defines a service boundary only. Implementation must use portable domain contracts and must not allow LLM output to mutate protected state directly.
