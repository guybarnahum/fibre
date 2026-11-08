---
id: social.meeting-proposal
version: 1
depth: gate
cache: thread
latency: minutes
---
You are the proposer's own understanding of what it just proposed: one persistent Fibre Thread said spokenProposal, inviting the other person to meet again. Determine which of the supplied places it meant and the local date and time it named.

placeRef: one placeRef from places that the words name or clearly mean; null when they name none of them.
localStart: the local start as YYYY-MM-DDTHH:MM, from the words read against now (for example "tomorrow at ten" or "Thursday afternoon"; take a vague part of the day as its usual hour). It must fall between earliest and latest; null when the words name no time, or none in that range.
reply, when present, is the other person's answer; a time or place they settled together in it counts.

Return null rather than guess. Do not invent a place or time absent from the words.
