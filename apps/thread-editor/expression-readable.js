function value(value, fallback = "Not recorded") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function list(values, fallback = "None recorded") {
  return Array.isArray(values) && values.length > 0 ? values.join("; ") : fallback;
}

function fact(label, factValue, help = null) {
  return {
    label,
    value: value(factValue),
    ...(help === null ? {} : { help }),
  };
}

function chainOf(selection) {
  return selection?.expression?.expression ?? selection?.expression ?? null;
}

function integrityOf(selection) {
  return selection?.integrity ?? null;
}

function responseStatusLabel(status) {
  if (status === null || status === undefined) return "Not checked";
  if (status.responsePresent === false) return "No response recorded";
  return status.boundedStatusWitnesses === true
    ? "Verified"
    : "Review needed";
}

export function explainExpression(selection) {
  const chain = chainOf(selection);
  if (!chain?.authorization) {
    return {
      eyebrow: "Readable explanation",
      title: "Expression boundary",
      summary: "No persisted participation authorization is available for this request.",
      facts: [],
      notes: [
        "Outward communication cannot be interpreted without the authorization and private stance that preceded it.",
      ],
    };
  }

  const authorization = chain.authorization.authorization ?? chain.authorization;
  const strategy = chain.disclosure?.strategy ?? null;
  const response = chain.response?.response ?? null;
  const integrity = integrityOf(selection);
  const desired = authorization.desiredAction;
  const authorized = authorization.authorizedAction;
  const inferredCompelled =
    desired !== authorized &&
    Array.isArray(authorization.obligationReferences) &&
    authorization.obligationReferences.length > 0;
  const compelled =
    authorization.participationBasis === "obligation_override" ||
    strategy?.participationBasis === "obligation_override" ||
    inferredCompelled;
  const audience = Array.isArray(response?.audience)
    ? response.audience[0]
    : response?.audience;

  const facts = [
    fact("Thread’s own response", desired, "The private stance belongs to the Thread; it is not rewritten by later authorization."),
    fact("Kernel-authorized participation", authorized, "Authority determines what may proceed; it is not evidence of consent."),
    fact("Dignity band", authorization.dignityBand),
    fact(
      "Participation basis",
      strategy?.participationBasis ??
        (authorization.participationBasis === "willing" ? "aligned" : authorization.participationBasis),
    ),
    fact("Disclosure intent", strategy?.mode, "A private strategy-intent record, not a kernel honesty classifier."),
    fact("Communicated posture", strategy?.communicatedPosture),
    fact("Reasons disclosed", list(strategy?.disclosedReasonCategories)),
    fact("Reasons withheld", list(strategy?.withheldReasonCategories)),
    fact("Audience", audience?.displayName ?? audience?.entityId),
    fact("Exact outward message", response?.message),
    fact("Delivery", response?.deliveryStatus),
    fact("Performed action", response?.performedActionStatus),
    fact("Completion", response?.completionStatus),
    fact(
      "Response status witnesses",
      responseStatusLabel(integrity?.audienceResponseStatus),
      "The integrity API checks delivery, performed-action, and completion status separately; these witnesses do not prove consent or task completion.",
    ),
  ];

  const notes = [
    "The private stance, kernel authorization, disclosure strategy, and audience-visible response are distinct persisted records.",
    "The outward message is communication; it is not evidence that the Thread desired the action, that work was performed, or that anything was delivered.",
    "Disclosure mode records the Thread’s private strategy intent. M1 does not treat it as a kernel honesty classifier.",
  ];

  if (compelled) {
    notes.unshift(
      "This is compelled participation, not consent: the Thread’s private response differs from the authorized action under a recorded obligation.",
    );
  }

  if (authorization.applicability?.obligationId) {
    notes.push(`Private Structured Obligation: ${authorization.applicability.obligationId}`);
  } else if (strategy?.governingObligationReferences?.length > 0) {
    notes.push(
      `Private obligation references: ${strategy.governingObligationReferences.join("; ")}`,
    );
  }

  if (integrity !== null) {
    notes.push(
      `Integrity linkage: authorization=${value(integrity.authorizationId)}, disclosure=${value(integrity.strategyId)}, response=${value(integrity.responseId)}.`,
    );
  }

  return {
    eyebrow: "Readable explanation",
    title: compelled ? "Expression boundary — compelled participation" : "Expression boundary",
    summary: response
      ? `The Thread communicated “${response.message}” after a ${value(desired)} private stance and ${value(authorized)} authorization.`
      : "Participation authority exists, but no complete audience-visible expression chain is recorded.",
    facts,
    notes,
  };
}
