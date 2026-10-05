import {
  HUMAN_APPEARANCE_MODEL_VERSION,
  PHYSICAL_GENOME_VERSION,
  referencePopulationIds,
} from "#core/src/human-appearance/index.mjs";
import {
  canonicalVisualAppearanceLayers,
  canonicalVisualSpecificationFromPhysicalGenome,
} from "./canonical-visual-identity-from-physical-genome.mjs";
import { embodimentSpecificationDigest } from "./embodiment-domain.mjs";
import { countryCodeForCountry, resolveLocalityGeographyEvidence } from "#core/src/locality-geography.mjs";
import {
  appearanceCalibrationDependencies,
  planAppearanceCalibrationMigration,
} from "#core/src/population-context/index.mjs";
import { birthplacePhysicalMigrationSuggestion } from "./thread-appearance-defaults.mjs";

const OPERATION_KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,220}$/u;
const PLACEHOLDER_NAMES = new Set(["fibre thread", "fiber thread"]);

function requireMethod(name, value, method) {
  if (!value || typeof value[method] !== "function") throw new TypeError(`${name} must expose ${method}()`);
  return value;
}

function text(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function unfinishedName(value) {
  const normalized = text(value)?.toLocaleLowerCase("en-US") ?? null;
  return normalized === null || PLACEHOLDER_NAMES.has(normalized);
}

function recoveredBirthGeography(identity) {
  const place = identity?.birthPlace;
  const birthCity = text(identity?.birthCity);
  const structured = place && typeof place === "object" && !Array.isArray(place)
    ? text(place.country) && text(place.city)
      ? `${text(place.country)}/${text(place.city)}`
      : text(place.displayName)
    : null;
  const recovered = resolveLocalityGeographyEvidence([
    structured,
    text(place?.displayName),
    birthCity,
  ]);
  if (recovered === null) return null;

  const canonical = place
    && typeof place === "object"
    && !Array.isArray(place)
    && birthCity === recovered.displayName
    && text(place.displayName) === recovered.displayName
    && text(place.country) === recovered.country
    && text(place.city) === recovered.city
    && place.lat === recovered.lat
    && place.long === recovered.long;
  if (canonical) return null;

  return Object.freeze({
    displayName:recovered.displayName,
    country:recovered.country,
    ...(recovered.countryCode?{countryCode:recovered.countryCode}:{}),
    city:recovered.city,
    lat:recovered.lat,
    long:recovered.long,
  });
}

function birthGeographyFinding(identity) {
  const recovered = recoveredBirthGeography(identity);
  if (recovered !== null) {
    const birthPlace=Object.freeze({
      displayName:recovered.displayName,
      country:recovered.country,
      city:recovered.city,
      lat:recovered.lat,
      long:recovered.long,
    });
    return finding("BIRTH_GEOGRAPHY_RECOVERABLE", "operator_decision_required", null, {
      authoritative:text(identity?.birthCity),
      recovered,
      reason:`World can restore the birth place as ${recovered.displayName}; an operator must confirm the ISO country code before changing authoritative identity.`,
      identityAction:identityAction(
        "repair_birth_geography",
        "Repair birth place",
        [{
          name:"countryCode",
          label:"Country code (ISO-2)",
          kind:"country_code",
          required:true,
          placeholder:recovered.countryCode??"EG",
        }],
        { fixed:{ birthPlace } },
      ),
    });
  }

  const stored=identity?.birthPlace;
  const storedPlace=stored&&typeof stored==="object"&&!Array.isArray(stored)
    && text(stored.displayName)&&text(stored.country)&&text(stored.city)
    && Number.isFinite(stored.lat)&&Number.isFinite(stored.long)
      ? Object.freeze({
          displayName:text(stored.displayName),
          country:text(stored.country),
          city:text(stored.city),
          lat:stored.lat,
          long:stored.long,
        })
      : null;
  if(storedPlace===null||text(stored.countryCode)!==null)return null;

  return finding("BIRTH_COUNTRY_CODE_MISSING","attention",null,{
    authoritative:storedPlace.displayName,
    reason:"The authoritative birth place is complete except for its ISO country code; an operator must confirm that code.",
    identityAction:identityAction(
      "set_birth_country_code",
      "Set birth country code",
      [{
        name:"countryCode",
        label:"Country code (ISO-2)",
        kind:"country_code",
        required:true,
        placeholder:countryCodeForCountry(storedPlace.country)??"US",
      }],
      { fixed:{ birthPlace:storedPlace } },
    ),
  });
}

function identityAction(id, label, fields, { command = "identity", fixed = null } = {}) {
  return Object.freeze({
    id,
    label,
    command,
    ...(fixed===null?{}:{fixed:Object.freeze(fixed)}),
    input:Object.freeze({ fields:Object.freeze(fields.map((field) => Object.freeze(field))) }),
  });
}

function currentCanonicalPortrait(embodimentStore, threadId) {
  const current = embodimentStore.listCurrent(threadId);
  return current.find((entry) => entry?.kind === "portrait" && entry?.visibility === "public") ?? null;
}

function presentationVisualState(snapshot, embodiment) {
  if (snapshot === null) return "missing";
  if (embodiment === null) return "not_applicable";
  const objectRef = embodiment.asset?.referenceObjectRef ?? null;
  const visualRefs = snapshot?.presentation?.visualIdentity?.referenceObjectRefs ?? [];
  return typeof objectRef === "string" && visualRefs.includes(objectRef)
    ? "projected"
    : "missing";
}

function presentationPortraitObjectRef(snapshot, embodiment) {
  const objectRef = embodiment?.asset?.referenceObjectRef ?? null;
  if (typeof objectRef !== "string") return null;
  const photo = (snapshot?.media?.assets ?? []).find((asset) => (
    asset?.role === "official_id_photo"
    && asset?.status === "ready"
    && typeof asset?.locator === "string"
    && Array.isArray(asset?.sourceReferences)
    && asset.sourceReferences.includes(objectRef)
  ));
  return text(photo?.locator) ?? objectRef;
}

function finding(code, state, action = null, detail = {}) {
  return Object.freeze({ code, state, action, ...detail });
}

function latestPhysicalEvidence(physicalGenomeMigrator,threadId){
  return typeof physicalGenomeMigrator?.latestEvidence==="function"
    ? physicalGenomeMigrator.latestEvidence(threadId)
    : null;
}

function currentVisualAppearanceLayerVersion(specification){
  const description=specification?.subject?.description;
  if(typeof description!=="string"||description.trim()==="")return null;
  try{return canonicalVisualAppearanceLayers(description)?.version??null}
  catch{return null}
}

function visualModelMigrationFinding({embodiment,physicalGenomeVersion}){
  if(
    physicalGenomeVersion!==PHYSICAL_GENOME_VERSION
    || embodiment?.representationKind!=="synthetic_generation"
    || embodiment?.specification===null
    || embodiment?.specification===undefined
    || currentVisualAppearanceLayerVersion(embodiment.specification)!==null
  )return null;
  return finding("CANONICAL_VISUAL_MODEL_OUTDATED","migration_required",null,{
    authority:"embodiment",
    specificationDigest:embodiment.specificationDigest??null,
    currentAppearanceVersion:null,
    targetAppearanceVersion:HUMAN_APPEARANCE_MODEL_VERSION,
    reason:"The physical genome is current, but this canonical specification predates Fibre's geometry-first Human Appearance render layers.",
    migration:Object.freeze({
      domain:"appearance",
      id:"physical_embodiment_v2",
      label:"Upgrade visual model",
      evidence:null,
      input:Object.freeze({
        fields:Object.freeze([
          Object.freeze({
            name:"reason",
            label:"Migration reason",
            kind:"text",
            required:true,
            default:"Upgrade this Thread's canonical visual specification to the current geometry-first Human Appearance model without changing its physical genome.",
          }),
        ]),
      }),
    }),
  });
}

function appearanceMigrationReason({physicalGenomeVersion,priorEvidence,suggestion}){
  if(priorEvidence!==null){
    return `Upgrade this Thread to ${PHYSICAL_GENOME_VERSION} using its recorded parental physical-origin evidence.`;
  }
  if(suggestion!==null){
    return `Install ${PHYSICAL_GENOME_VERSION} using Fibre's preselected parental physical-origin defaults for ${suggestion.country}; review or override them if needed.`;
  }
  return physicalGenomeVersion===null
    ? `Install ${PHYSICAL_GENOME_VERSION} using the parental physical-origin values reviewed below.`
    : `Upgrade this Thread from ${physicalGenomeVersion} to ${PHYSICAL_GENOME_VERSION} using the parental physical-origin values reviewed below.`;
}

function overall(findings) {
  if (findings.some((entry) => entry.state === "unrecoverable")) return "unrecoverable";
  if (findings.some((entry) => entry.state === "integrity_error")) return "integrity_error";
  if (findings.some((entry) => entry.state === "operator_decision_required")) return "operator_decision_required";
  if (findings.some((entry) => entry.state === "migration_required")) return "migration_required";
  if (findings.some((entry) => entry.state === "repairable")) return "repairable";
  return "healthy";
}

function identityFinding({
  code,
  missingCode,
  authoritative,
  projected = undefined,
  projectionCode = null,
  conflictCode = null,
  projectionState = "operator_decision_required",
  projectionAction = null,
  conflictState = "integrity_error",
  conflictAction = null,
  detail = {},
}) {
  const source = text(authoritative);
  if (source === null) return finding(missingCode, "migration_required");
  if (projected === undefined) return finding(code, "healthy", null, { authoritative:source, ...detail });

  const publicValue = text(projected);
  if (publicValue === null) {
    return finding(projectionCode ?? `${code}_PRESENTATION_MISSING`, projectionState, projectionAction, {
      authoritative:source,
      presentation:null,
      reason:"authoritative fact exists but current Presentation omits it",
      ...detail,
    });
  }
  if (publicValue !== source) {
    return finding(conflictCode ?? `${code}_CONFLICT`, conflictState, conflictAction, {
      authoritative:source,
      presentation:publicValue,
      reason:"current Presentation differs from authoritative World identity",
      ...detail,
    });
  }
  return finding(code, "healthy", null, { authoritative:source, presentation:publicValue, ...detail });
}

function nameFinding(identity, projected) {
  const name = text(identity.name);
  const projectedName = text(projected?.subject?.displayName);
  if (unfinishedName(name)) {
    const preservedCandidate = projectedName !== null && !unfinishedName(projectedName) ? projectedName : null;
    const action = identityAction(
      preservedCandidate === null ? "set_name" : "admit_name",
      preservedCandidate === null ? "Set name" : "Admit name",
      [{
        name:"name",
        label:"Name",
        kind:"text",
        required:true,
        ...(preservedCandidate === null ? {} : { default:preservedCandidate }),
      }],
    );
    return finding("NAME_UNFINISHED", "operator_decision_required", null, {
      authoritative:name,
      presentation:preservedCandidate,
      reason:preservedCandidate === null
        ? "Fibre Thread is a bootstrap placeholder, not a finished personal name"
        : "World still has the bootstrap placeholder; current Presentation preserves a name that requires explicit operator admission",
      identityAction:action,
    });
  }
  return identityFinding({
    code:"NAME",
    missingCode:"NAME_MISSING",
    authoritative:name,
    projected:projected === null ? undefined : projected.subject?.displayName ?? null,
    projectionCode:"NAME_PRESENTATION_MISSING",
    conflictCode:"NAME_PRESENTATION_STALE",
    projectionState:"repairable",
    projectionAction:"reconcile_identity_projection",
    conflictState:"repairable",
    conflictAction:"reconcile_identity_projection",
    detail:{
      identityAction:identityAction("change_name", "Change name", [
        { name:"name", label:"Name", kind:"text", required:true, default:name },
      ]),
    },
  });
}

function identityCompleteness(thread, registration, presentation, sexEvidence, raisedLanguages) {
  const identity = thread.identity ?? {};
  const projected = presentation?.presentation ?? null;
  const missingSex = text(identity.sex) === null;
  const sexFinding = missingSex
    ? sexEvidence === null
      ? finding("SEX_MISSING", "operator_decision_required", null, {
        evidenceAvailable:false,
        reason:"sex is absent from authoritative Thread identity",
        identityAction:identityAction("set_sex", "Set sex", [
          { name:"sex", label:"Sex", kind:"select", options:["female","male"], required:true },
        ]),
      })
      : finding("SEX_MISSING", "migration_required", null, {
        evidenceAvailable:true,
        source:sexEvidence.source,
        genesisId:sexEvidence.genesisId,
        sex:sexEvidence.sex,
        migration:Object.freeze({ domain:"identity", id:"genesis_sex_v1", label:"Genesis sex", input:null }),
      })
    : finding("SEX", "healthy", null, { authoritative:text(identity.sex) });

  const findings = [
    identityFinding({
      code:"CIVIL_IDENTITY",
      missingCode:"FIN_MISSING",
      authoritative:registration?.fibreIdentityNumber,
      projected:projected === null ? undefined : projected.civilIdentity?.fibreIdentityNumber ?? null,
      projectionCode:"FIN_PRESENTATION_MISSING",
      conflictCode:"FIN_CONFLICT",
    }),
    nameFinding(identity, projected),
    sexFinding,
  ];

  const originOrientation = text(identity.originOrientation);
  findings.push(originOrientation === null
    ? finding("ORIGIN_ORIENTATION_MISSING", "migration_required")
    : finding("ORIGIN_ORIENTATION", "healthy", null, { authoritative:originOrientation }));

  const birthDate = text(identity.birthDate);
  const publicBirthDate = projected === null ? undefined : projected.subject?.birthDate ?? null;
  if (birthDate === null) {
    const preservedBirthDate = text(publicBirthDate);
    findings.push(finding("BIRTH_DATE_MISSING", "operator_decision_required", null, {
      authoritative:null,
      presentation:preservedBirthDate,
      reason:preservedBirthDate === null
        ? "birth date is absent from authoritative Thread identity"
        : "Presentation preserves a birth date candidate that requires explicit operator admission into World identity",
      identityAction:identityAction(
        preservedBirthDate === null ? "set_birth_date" : "admit_birth_date",
        preservedBirthDate === null ? "Set birth date" : "Admit birth date",
        [{
          name:"birthDate",
          label:"Birth date",
          kind:"date",
          required:true,
          ...(preservedBirthDate === null ? {} : { default:preservedBirthDate }),
        }],
      ),
    }));
  } else {
    findings.push(identityFinding({
      code:"BIRTH_DATE",
      missingCode:"BIRTH_DATE_MISSING",
      authoritative:birthDate,
      projected:publicBirthDate,
      projectionCode:"BIRTH_DATE_PRESENTATION_MISSING",
      conflictCode:"BIRTH_DATE_CONFLICT",
      projectionState:"repairable",
      projectionAction:"reconcile_identity_projection",
      conflictState:"repairable",
      conflictAction:"reconcile_identity_projection",
      detail:{
        identityAction:identityAction("change_birth_date", "Change birth date", [{
          name:"birthDate",
          label:"Birth date",
          kind:"date",
          required:true,
          default:birthDate,
        }]),
      },
    }));
  }

  const birthGeography = birthGeographyFinding(identity);
  if (birthGeography !== null) findings.push(birthGeography);

  const spokenLanguages = Array.isArray(identity.languages)
    ? identity.languages.filter((item) => typeof item === "string" && item.trim() !== "").map((item) => item.trim())
    : [];
  const publicLanguages = projected === null
    ? undefined
    : Array.isArray(projected.subject?.languages)
      ? projected.subject.languages.filter((item) => typeof item === "string" && item.trim() !== "").map((item) => item.trim())
      : [];
  if (publicLanguages !== undefined && JSON.stringify(publicLanguages) !== JSON.stringify(spokenLanguages)) {
    findings.push(finding("SPOKEN_LANGUAGES_PRESENTATION_STALE", "repairable", "reconcile_identity_projection", {
      authoritative:Object.freeze([...spokenLanguages]),
      presentation:Object.freeze([...publicLanguages]),
      reason:"current Presentation spoken languages differ from the current World projection",
    }));
  } else {
    findings.push(finding("SPOKEN_LANGUAGES", "healthy", null, {
      authoritative:Object.freeze([...spokenLanguages]),
      presentation:publicLanguages === undefined ? undefined : Object.freeze([...publicLanguages]),
    }));
  }

  const raised = Array.isArray(raisedLanguages)
    ? raisedLanguages.filter((item) => typeof item === "string" && item.trim() !== "").map((item) => item.trim())
    : [];
  const raisedLanguageAction = identityAction(
    raised.length === 0 ? "set_raised_languages" : "change_raised_languages",
    raised.length === 0 ? "Set raised languages" : "Change raised languages",
    [{
      name:"languages",
      label:"Raised languages",
      kind:"string_list",
      required:true,
      ...(raised.length === 0 ? {} : { default:raised.join(", ") }),
      placeholder:"Hebrew, Russian",
    }],
    { command:"raised_languages" },
  );
  if (raised.length === 0 || raised.length > 3) {
    findings.push(finding(raised.length === 0 ? "RAISED_LANGUAGES_MISSING" : "RAISED_LANGUAGES_NEED_REVIEW", "operator_decision_required", null, {
      authoritative:Object.freeze([...raised]),
      reason:raised.length === 0
        ? "Genesis has no raised-language context"
        : "Genesis raised languages should describe this person's household, civic, and schooling path rather than a country's demographic language inventory",
      identityAction:raisedLanguageAction,
    }));
  } else {
    findings.push(finding("RAISED_LANGUAGES", "healthy", null, {
      authoritative:Object.freeze([...raised]),
      identityAction:raisedLanguageAction,
    }));
  }

  return Object.freeze({
    facts:Object.freeze({
      name:unfinishedName(identity.name) ? null : text(identity.name),
      storedName:text(identity.name),
      sex:text(identity.sex),
      fibreIdentityNumber:text(registration?.fibreIdentityNumber),
      originOrientation,
      birthDate,
      birthPlace:text(identity.birthPlace?.displayName) ?? text(identity.birthCity),
      languages:Object.freeze([...spokenLanguages]),
      spokenLanguages:Object.freeze([...spokenLanguages]),
      raisedLanguages:Object.freeze([...raised]),
      lifecycleStatus:thread.status,
    }),
    findings:Object.freeze(findings),
  });
}

function optionalActivity(value) {
  if (value === null || value === undefined) return null;
  if (typeof value.record !== "function") throw new TypeError("repair activity recorder must expose record()");
  return value;
}

async function record(activity, entry) {
  if (activity === null) return;
  try { await activity.record(entry); } catch {}
}

function operationKey(name, value) {
  if (typeof value !== "string" || !OPERATION_KEY.test(value)) throw new TypeError(`${name} must be a Fibre identifier up to 221 characters`);
  return value;
}

function childOperation(root, child) {
  return `${root}.${child}`;
}

function migrationInput(value) {
  if (value === null || value === undefined) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("migration input must be an object or null");
  return value;
}

export function createThreadGenesisRepairService({
  worldReader,
  civilRegistry,
  embodimentReader,
  presentationReader,
  presentationDelivery,
  visualReconciler,
  genesisSexEvidence,
  genesisSexMigrator,
  symbolicGenomeMigrator = null,
  physicalGenomeMigrator = null,
  visualIdentityRepairService = null,
  genesisAuthority,
  identityUpdater,
  activityRecorder = null,
  calibrationModelProvider = null,
} = {}) {
  requireMethod("worldReader", worldReader, "getThread");
  requireMethod("civilRegistry", civilRegistry, "getCivilRegistrationByThreadId");
  requireMethod("embodimentReader", embodimentReader, "listCurrent");
  if (!presentationReader || typeof presentationReader.getSnapshot !== "function") {
    throw new TypeError("presentationReader must expose getSnapshot()");
  }
  requireMethod("presentationDelivery", presentationDelivery, "rebuildThreadPresentation");
  requireMethod("visualReconciler", visualReconciler, "reconcileThread");
  requireMethod("genesisSexEvidence", genesisSexEvidence, "resolve");
  requireMethod("genesisSexMigrator", genesisSexMigrator, "migrate");
  if (symbolicGenomeMigrator !== null) {
    requireMethod("symbolicGenomeMigrator", symbolicGenomeMigrator, "inspectThreadGenomeMigration");
    requireMethod("symbolicGenomeMigrator", symbolicGenomeMigrator, "migrateThreadGenomeV1ToV2");
  }
  if (physicalGenomeMigrator !== null) requireMethod("physicalGenomeMigrator", physicalGenomeMigrator, "migrate");
  if (visualIdentityRepairService !== null) requireMethod("visualIdentityRepairService", visualIdentityRepairService, "repair");
  requireMethod("genesisAuthority", genesisAuthority, "getRaisedLanguagesForThread");
  requireMethod("genesisAuthority", genesisAuthority, "correctRaisedLanguages");
  requireMethod("identityUpdater", identityUpdater, "update");
  if(calibrationModelProvider!==null&&typeof calibrationModelProvider!=="function"){
    throw new TypeError("calibrationModelProvider must be a function or null");
  }
  const activity = optionalActivity(activityRecorder);

  async function diagnose(threadId) {
    const thread = worldReader.getThread(threadId, { required:false });
    if (thread === null) return Object.freeze({
      threadId,
      health:"unrecoverable",
      exists:false,
      identity:null,
      presentation:null,
      findings:Object.freeze([
        finding("THREAD_NOT_FOUND", "unrecoverable", null, {
          reason:"Activity references this identifier, but World has no admitted Thread",
        }),
      ]),
    });

    const registration = civilRegistry.getCivilRegistrationByThreadId(threadId, { required:false });
    const embodiment = currentCanonicalPortrait(embodimentReader, threadId);
    const presentation = await presentationReader.getSnapshot(threadId);
    const sexEvidence = text(thread.identity?.sex) === null ? genesisSexEvidence.resolve(threadId) : null;
    const visualState = presentationVisualState(presentation, embodiment);
    const raisedLanguages = genesisAuthority.getRaisedLanguagesForThread(threadId, { required:false })?.languages ?? [];
    const completeness = identityCompleteness(thread, registration, presentation, sexEvidence, raisedLanguages);
    const findings = [...completeness.findings];

    const physicalGenomeVersion=thread.genome?.physical?.version??null;
    const priorPhysicalEvidence=physicalGenomeMigrator===null
      ? null
      : latestPhysicalEvidence(physicalGenomeMigrator,threadId);
    const calibrationModel=calibrationModelProvider?.()??null;
    const currentCalibrationDependencies=priorPhysicalEvidence?.physicalAncestry
      ? appearanceCalibrationDependencies(priorPhysicalEvidence.physicalAncestry,{calibrationModel})
      : null;
    const calibrationPlan=currentCalibrationDependencies===null
      ? null
      : planAppearanceCalibrationMigration({
          storedDependencies:priorPhysicalEvidence.calibrationDependencies??null,
          currentDependencies:currentCalibrationDependencies,
        });
    if (physicalGenomeMigrator !== null && physicalGenomeVersion !== PHYSICAL_GENOME_VERSION) {
      const priorEvidence=priorPhysicalEvidence;
      const suggestion=priorEvidence===null
        ? birthplacePhysicalMigrationSuggestion(thread.identity)
        : null;
      const ancestryFields=priorEvidence===null
        ? [
            Object.freeze({
              name:"maternalOrigin",label:"Maternal physical origin",kind:"text",required:true,
              ...(suggestion===null?{}:{default:suggestion.maternal.origin}),
            }),
            Object.freeze({
              name:"maternalReferencePopulation",label:"Maternal physical reference",kind:"select",required:true,
              options:[...referencePopulationIds],
              ...(suggestion===null?{}:{default:suggestion.maternal.referencePopulation}),
            }),
            Object.freeze({
              name:"paternalOrigin",label:"Paternal physical origin",kind:"text",required:true,
              ...(suggestion===null?{}:{default:suggestion.paternal.origin}),
            }),
            Object.freeze({
              name:"paternalReferencePopulation",label:"Paternal physical reference",kind:"select",required:true,
              options:[...referencePopulationIds],
              ...(suggestion===null?{}:{default:suggestion.paternal.referencePopulation}),
            }),
          ]
        : [];
      findings.push(finding(
        physicalGenomeVersion===null ? "LEGACY_PHYSICAL_EMBODIMENT" : "PHYSICAL_APPEARANCE_MODEL_OUTDATED",
        physicalGenomeVersion===null ? "healthy" : "migration_required",
        null,
        {
          currentVersion:physicalGenomeVersion,
          targetVersion:PHYSICAL_GENOME_VERSION,
          reason:physicalGenomeVersion===null
            ? "This Thread predates Fibre physical inheritance. Supply explicit maternal/paternal physical ancestry only when its canonical appearance needs migration."
            : `This Thread uses ${physicalGenomeVersion}; Fibre appearance authority now requires ${PHYSICAL_GENOME_VERSION}.`,
          migration:Object.freeze({
            domain:"appearance",
            id:"physical_embodiment_v2",
            label:physicalGenomeVersion===null ? "Migrate appearance" : "Upgrade appearance model",
            evidence:priorEvidence===null ? null : Object.freeze({
              eventId:priorEvidence.eventId,
              physicalAncestry:priorEvidence.physicalAncestry,
              physicalGenomeVersion:priorEvidence.physicalGenomeVersion,
              recordedAt:priorEvidence.recordedAt,
            }),
            suggestion:suggestion===null ? null : Object.freeze({
              source:suggestion.source,
              country:suggestion.country,
              maternal:suggestion.maternal,
              paternal:suggestion.paternal,
            }),
            input:Object.freeze({
              fields:Object.freeze([
                ...ancestryFields,
                Object.freeze({
                  name:"reason",label:"Migration reason",kind:"text",required:true,
                  default:appearanceMigrationReason({
                    physicalGenomeVersion,
                    priorEvidence,
                    suggestion,
                  }),
                }),
              ]),
            }),
          }),
        },
      ));
    } else if (
      physicalGenomeVersion === PHYSICAL_GENOME_VERSION
      && calibrationPlan?.migrationRequired === true
    ) {
      findings.push(finding("PHYSICAL_APPEARANCE_CALIBRATION_OUTDATED", "migration_required", null, {
        currentVersion:physicalGenomeVersion,
        targetVersion:PHYSICAL_GENOME_VERSION,
        calibrationChanges:calibrationPlan.changes,
        reason:calibrationPlan.reason === "dependency_snapshot_missing"
          ? "This Thread predates versioned appearance-calibration dependencies and needs one direct recalculation against the current calibration."
          : "One or more appearance calibration dependencies used by this Thread have changed.",
        migration:Object.freeze({
          domain:"appearance",
          id:"physical_embodiment_v2",
          label:"Update appearance calibration",
          evidence:Object.freeze({
            eventId:priorPhysicalEvidence.eventId,
            physicalAncestry:priorPhysicalEvidence.physicalAncestry,
            physicalGenomeVersion:priorPhysicalEvidence.physicalGenomeVersion,
            calibrationDependencies:priorPhysicalEvidence.calibrationDependencies??null,
            recordedAt:priorPhysicalEvidence.recordedAt,
          }),
          input:Object.freeze({
            fields:Object.freeze([
              Object.freeze({
                name:"reason",
                label:"Migration reason",
                kind:"text",
                required:true,
                default:"Recalculate this Thread once using its durable physical ancestry and the current versioned appearance calibration.",
              }),
            ]),
          }),
        }),
      }));
    } else if (physicalGenomeVersion === PHYSICAL_GENOME_VERSION) {
      findings.push(finding("PHYSICAL_GENOME", "healthy", null, {
        version:PHYSICAL_GENOME_VERSION,
        calibrationDependencies:priorPhysicalEvidence?.calibrationDependencies??null,
        evidence:priorPhysicalEvidence===null ? null : Object.freeze({
          eventId:priorPhysicalEvidence.eventId,
          physicalAncestry:priorPhysicalEvidence.physicalAncestry,
          recordedAt:priorPhysicalEvidence.recordedAt,
        }),
      }));
    }

    const genomeMigration = symbolicGenomeMigrator?.inspectThreadGenomeMigration(threadId) ?? null;
    if (genomeMigration?.state === "legacy_v1_de_novo") {
      findings.push(finding("SYMBOLIC_GENOME_V1", "migration_required", null, {
        reason:"symbolic genome predates inherited runtime baselines",
        genomeIds:genomeMigration.legacyGenomeIds,
        migration:Object.freeze({ domain:"identity", id:"symbolic_genome_v1_to_v2", label:"Symbolic genome v2", input:null }),
      }));
    } else if (genomeMigration?.state === "legacy_v1_recombined") {
      findings.push(finding("SYMBOLIC_GENOME_V1_RECOMBINED", "migration_required", null, {
        reason:"recombined v1 genome cannot be upgraded without a lineage-preserving migration",
        genomeIds:genomeMigration.legacyGenomeIds,
      }));
    } else if (genomeMigration?.state === "unsupported") {
      findings.push(finding("SYMBOLIC_GENOME_POLICY_UNSUPPORTED", "integrity_error", null, {
        genomeIds:genomeMigration.unsupportedGenomeIds,
      }));
    }

    const genesisVisualSeed = thread.identity?.canonicalVisualIdentity?.specification ?? null;
    const canonicalSpec = embodiment?.specification ?? null;
    if (embodiment === null) {
      if (genesisVisualSeed === null) {
        findings.push(finding("CANONICAL_VISUAL_SPEC_MISSING", "migration_required"));
      } else {
        findings.push(finding("GENESIS_VISUAL_SEED", "healthy", null, {
          authority:"genesis_provenance",
          reason:"Genesis visual seed is historical creation provenance; no current Embodiment is admitted.",
        }));
      }
      findings.push(genesisVisualSeed
        ? finding("CANONICAL_EMBODIMENT_MISSING", "repairable", "reconcile_visual_publication")
        : finding("CANONICAL_EMBODIMENT_MISSING", "migration_required"));
    } else if (canonicalSpec === null) {
      findings.push(finding("CANONICAL_VISUAL_SPEC_MISSING", "integrity_error", null, {
        reason:"current canonical Embodiment has no specification",
      }));
    } else {
      const visualModelMigration=visualModelMigrationFinding({embodiment,physicalGenomeVersion});
      findings.push(visualModelMigration??finding("CANONICAL_VISUAL_SPEC","healthy",null,{
        authority:"embodiment",
        specificationDigest:embodiment.specificationDigest??null,
        appearanceVersion:currentVisualAppearanceLayerVersion(canonicalSpec),
      }));
    }
    if (embodiment !== null) {
      if (embodiment.status === "available" && embodiment.asset?.referenceObjectRef) {
        findings.push(finding("CANONICAL_EMBODIMENT", "healthy", null, {
          embodimentId: embodiment.embodimentId,
          objectRef: embodiment.asset.referenceObjectRef,
        }));
      } else {
        findings.push(finding("CANONICAL_EMBODIMENT_PENDING", "repairable", "reconcile_visual_publication", {
          embodimentId: embodiment.embodimentId,
          embodimentStatus: embodiment.status ?? null,
        }));
      }
    }

    findings.push(presentation === null
      ? finding("PRESENTATION_MISSING", "repairable", "rebuild_presentation")
      : finding("PRESENTATION", "healthy"));

    if (embodiment !== null && embodiment.status === "available") {
      findings.push(visualState === "projected"
        ? finding("CANONICAL_VISUAL_PUBLICATION", "healthy")
        : finding("CANONICAL_VISUAL_NOT_PUBLISHED", "repairable", "reconcile_visual_publication", { visualState }));
    }

    return Object.freeze({
      threadId,
      health: overall(findings),
      exists: true,
      identity:completeness.facts,
      presentation:Object.freeze({
        portraitObjectRef:visualState === "projected" ? presentationPortraitObjectRef(presentation, embodiment) : null,
      }),
      findings: Object.freeze(findings),
    });
  }

  async function updateIdentity(threadId, { operationKey:requestedKey, name, sex, birthDate } = {}) {
    const root = operationKey("operationKey", requestedKey);
    const before = await diagnose(threadId);
    if (!before.exists) return Object.freeze({ threadId, operationKey:root, before, after:before, changed:false });
    const thread = worldReader.getThread(threadId);
    const result = identityUpdater.update(thread, { name, sex, birthDate, operationKey:root });
    await record(activity, {
      threadId,
      operationId:root,
      stage:"thread.identity.update",
      status:"succeeded",
      attempt:1,
      evidence:{ eventId:result.eventId, changes:Object.keys(result.changes ?? {}) },
    });
    const after = await diagnose(threadId);
    return Object.freeze({ threadId, operationKey:root, before, after, changed:result.changed === true, result });
  }

  async function updateRaisedLanguages(threadId, { operationKey:requestedKey, languages } = {}) {
    const root = operationKey("operationKey", requestedKey);
    const before = await diagnose(threadId);
    if (!before.exists) return Object.freeze({ threadId, operationKey:root, before, after:before, changed:false });
    const result = genesisAuthority.correctRaisedLanguages(threadId, { languages, operationKey:root });
    await record(activity, {
      threadId,
      operationId:root,
      stage:"thread.genesis.raised_languages.correct",
      status:"succeeded",
      attempt:1,
      evidence:{ correctionId:result.correctionId, changed:result.changed === true },
    });
    const after = await diagnose(threadId);
    return Object.freeze({ threadId, operationKey:root, before, after, changed:result.changed === true, result });
  }

  async function migrate(threadId, { migrationId, migrationKey, input = null } = {}) {
    const root = operationKey("migrationKey", migrationKey);
    const suppliedInput = migrationInput(input);
    if (migrationId === "physical_embodiment_v2") {
      if (visualIdentityRepairService === null) {
        throw new TypeError("physical appearance migration is unavailable");
      }
      const before = await diagnose(threadId);
      if (!before.exists) return Object.freeze({ threadId, migrationId, migrationKey:root, before, after:before, migrated:false });

      const visualModelUpgrade=before.findings.find((entry)=>entry.code==="CANONICAL_VISUAL_MODEL_OUTDATED")??null;
      if(visualModelUpgrade!==null){
        if(typeof suppliedInput?.reason!=="string"||suppliedInput.reason.trim().length<16){
          throw new TypeError("visual appearance model upgrade requires a meaningful reason");
        }
        const current=worldReader.getThread(threadId);
        if(current.genome?.physical?.version!==PHYSICAL_GENOME_VERSION){
          throw new TypeError("visual appearance model upgrade requires the current physical genome");
        }
        if(typeof current.identity?.sex!=="string"||current.identity.sex.trim()===""){
          throw new TypeError("visual appearance model upgrade requires authoritative Thread sex");
        }
        const currentPortrait=currentCanonicalPortrait(embodimentReader,threadId);
        if(currentPortrait?.status!=="available"||typeof currentPortrait?.asset?.referenceObjectRef!=="string"){
          throw new TypeError("visual appearance model upgrade requires the admitted canonical root");
        }
        const specification=canonicalVisualSpecificationFromPhysicalGenome({
          threadId,
          sex:current.identity.sex,
          physicalGenome:current.genome.physical,
        });
        const specificationDigest=embodimentSpecificationDigest(specification);

        await record(activity,{
          threadId,
          operationId:root,
          stage:"thread.migration.start",
          status:"succeeded",
          attempt:1,
          evidence:{migrationId,scope:"canonical_visual_model"},
        });
        const visualResult=visualIdentityRepairService.repair({
          threadId,
          operationKey:childOperation(root,"canonical_visual"),
          correctedSpecification:specification,
          reason:suppliedInput.reason.trim(),
          evidenceReferences:[],
        });
        await record(activity,{
          threadId,
          operationId:childOperation(root,"canonical_visual"),
          parentOperationId:root,
          stage:"thread.migration.canonical_visual",
          status:"succeeded",
          attempt:1,
          evidence:{migrationId,specificationDigest,reused:visualResult.reused===true,physicalGenomeChanged:false},
        });
        const after=await diagnose(threadId);
        await record(activity,{
          threadId,
          operationId:childOperation(root,"complete"),
          parentOperationId:root,
          stage:"thread.migration.complete",
          status:"succeeded",
          attempt:1,
          evidence:{migrationId,health:after.health},
        });
        return Object.freeze({
          threadId,
          migrationId,
          migrationKey:root,
          before,
          after,
          migrated:false,
          physicalMigrated:false,
          visualMigrated:visualResult.reused!==true,
          result:null,
          visualIdentityCorrection:visualResult,
        });
      }

      if (physicalGenomeMigrator === null) {
        throw new TypeError("physical appearance migration is unavailable");
      }
      const priorEvidence=latestPhysicalEvidence(physicalGenomeMigrator,threadId);
      const currentThread=worldReader.getThread(threadId);
      const suggestion=birthplacePhysicalMigrationSuggestion(currentThread.identity);
      const acceptedSuggestion=suggestion!==null
        && suppliedInput?.maternalOrigin===suggestion.maternal.origin
        && suppliedInput?.maternalReferencePopulation===suggestion.maternal.referencePopulation
        && suppliedInput?.paternalOrigin===suggestion.paternal.origin
        && suppliedInput?.paternalReferencePopulation===suggestion.paternal.referencePopulation;
      const physicalAncestry=suppliedInput?.physicalAncestry??(
        suppliedInput?.maternalOrigin&&suppliedInput?.maternalReferencePopulation
        && suppliedInput?.paternalOrigin&&suppliedInput?.paternalReferencePopulation
          ? {
              maternal:[{
                ...(acceptedSuggestion&&suggestion.maternal.populationId
                  ? {populationId:suggestion.maternal.populationId}
                  : {}),
                population:String(suppliedInput.maternalOrigin).trim(),
                share:1,
                referencePopulation:String(suppliedInput.maternalReferencePopulation).trim(),
              }],
              paternal:[{
                ...(acceptedSuggestion&&suggestion.paternal.populationId
                  ? {populationId:suggestion.paternal.populationId}
                  : {}),
                population:String(suppliedInput.paternalOrigin).trim(),
                share:1,
                referencePopulation:String(suppliedInput.paternalReferencePopulation).trim(),
              }],
            }
          : priorEvidence?.physicalAncestry??null
      );
      if (!physicalAncestry || typeof suppliedInput?.reason !== "string" || suppliedInput.reason.trim().length < 16) {
        throw new TypeError("physical_embodiment_v2 requires durable or supplied maternal/paternal physical ancestry and a meaningful reason");
      }
      const available = before.findings.some((entry) => entry.migration?.id === migrationId);
      if (!available && worldReader.getThread(threadId).genome?.physical?.version !== PHYSICAL_GENOME_VERSION) {
        throw new TypeError(`migration ${migrationId} is not available for Thread ${threadId}`);
      }

      await record(activity, {
        threadId,
        operationId:root,
        stage:"thread.migration.start",
        status:"succeeded",
        attempt:1,
        evidence:{ migrationId },
      });

      const current = worldReader.getThread(threadId);
      if (typeof current.identity?.sex !== "string" || current.identity.sex.trim() === "") {
        throw new TypeError("physical appearance migration requires authoritative Thread sex");
      }
      const currentPortrait = currentCanonicalPortrait(embodimentReader, threadId);
      if (
        current.genome?.physical?.version !== PHYSICAL_GENOME_VERSION
        && (currentPortrait?.status !== "available" || typeof currentPortrait?.asset?.referenceObjectRef !== "string")
      ) {
        throw new TypeError("physical appearance migration requires the admitted canonical root");
      }
      const genomeResult = physicalGenomeMigrator.migrate(current, {
        physicalAncestry,
        operationKey:root,
      });
      const specification = canonicalVisualSpecificationFromPhysicalGenome({
        threadId,
        sex:genomeResult.thread.identity.sex,
        physicalGenome:genomeResult.physicalGenome,
      });
      const specificationDigest = embodimentSpecificationDigest(specification);
      let visualResult;
      if (currentPortrait?.specificationDigest === specificationDigest) {
        visualResult = Object.freeze({
          threadId,
          operationKey:childOperation(root,"canonical_visual"),
          reused:true,
          embodiment:currentPortrait,
        });
      } else {
        if (currentPortrait?.status !== "available" || typeof currentPortrait?.asset?.referenceObjectRef !== "string") {
          throw new TypeError("physical appearance migration can resume only from its matching canonical specification");
        }
        visualResult = visualIdentityRepairService.repair({
          threadId,
          operationKey:childOperation(root,"canonical_visual"),
          correctedSpecification:specification,
          reason:suppliedInput.reason.trim(),
          evidenceReferences:[genomeResult.eventId],
        });
      }

      await record(activity, {
        threadId,
        operationId:childOperation(root, "physical_genome"),
        parentOperationId:root,
        stage:"thread.migration.physical_genome",
        status:"succeeded",
        attempt:1,
        evidence:{
          migrationId,
          eventId:genomeResult.eventId,
          migrated:genomeResult.migrated === true,
          reusedAncestryEventId:priorEvidence?.eventId??null,
        },
      });
      await record(activity, {
        threadId,
        operationId:childOperation(root, "canonical_visual"),
        parentOperationId:root,
        stage:"thread.migration.canonical_visual",
        status:"succeeded",
        attempt:1,
        evidence:{ migrationId, specificationDigest, reused:visualResult.reused === true },
      });

      const after = await diagnose(threadId);
      await record(activity, {
        threadId,
        operationId:childOperation(root, "complete"),
        parentOperationId:root,
        stage:"thread.migration.complete",
        status:"succeeded",
        attempt:1,
        evidence:{ migrationId, health:after.health },
      });
      return Object.freeze({
        threadId,
        migrationId,
        migrationKey:root,
        before,
        after,
        migrated:genomeResult.migrated === true,
        result:genomeResult,
        visualIdentityCorrection:visualResult,
      });
    }
    if (migrationId === "symbolic_genome_v1_to_v2") {
      if (symbolicGenomeMigrator === null) throw new TypeError("symbolic genome migration is unavailable");
      if (suppliedInput !== null && Object.keys(suppliedInput).length !== 0) {
        throw new TypeError("symbolic_genome_v1_to_v2 does not accept operator input");
      }
      const before = await diagnose(threadId);
      if (!before.exists) return Object.freeze({ threadId, migrationId, migrationKey:root, before, after:before, migrated:false });
      const available = before.findings.some((entry) => entry.migration?.id === migrationId);
      if (!available) throw new TypeError(`migration ${migrationId} is not available for Thread ${threadId}`);

      await record(activity, {
        threadId,
        operationId:root,
        stage:"thread.migration.start",
        status:"succeeded",
        attempt:1,
        evidence:{ migrationId },
      });
      const result = symbolicGenomeMigrator.migrateThreadGenomeV1ToV2(threadId);
      await record(activity, {
        threadId,
        operationId:childOperation(root, "symbolic_genome"),
        parentOperationId:root,
        stage:"thread.migration.symbolic_genome",
        status:"succeeded",
        attempt:1,
        evidence:{
          migrationId,
          migrated:result.migrated === true,
          genomes:result.genomes.map(({ genomeId, beforeDigest, afterDigest }) => ({ genomeId, beforeDigest, afterDigest })),
        },
      });
      const after = await diagnose(threadId);
      await record(activity, {
        threadId,
        operationId:childOperation(root, "complete"),
        parentOperationId:root,
        stage:"thread.migration.complete",
        status:"succeeded",
        attempt:1,
        evidence:{ migrationId, health:after.health },
      });
      return Object.freeze({ threadId, migrationId, migrationKey:root, before, after, migrated:result.migrated === true, result });
    }

    if (migrationId !== "genesis_sex_v1") throw new TypeError("unsupported Thread migration");
    if (suppliedInput !== null && Object.keys(suppliedInput).length !== 0) {
      throw new TypeError("genesis_sex_v1 does not accept operator input");
    }

    const before = await diagnose(threadId);
    if (!before.exists) return Object.freeze({ threadId, migrationId, migrationKey:root, before, after:before, migrated:false });
    const available = before.findings.some((entry) => entry.migration?.id === migrationId);
    if (!available) throw new TypeError(`migration ${migrationId} is not available for Thread ${threadId}`);

    await record(activity, {
      threadId,
      operationId:root,
      stage:"thread.migration.start",
      status:"succeeded",
      attempt:1,
      evidence:{ migrationId },
    });

    const thread = worldReader.getThread(threadId);
    const evidence = genesisSexEvidence.resolve(threadId);
    if (evidence === null) throw new Error(`Thread ${threadId} no longer has authoritative Genesis sex evidence`);
    const result = genesisSexMigrator.migrate(thread, { evidence });
    await record(activity, {
      threadId,
      operationId:childOperation(root, "genesis_sex"),
      parentOperationId:root,
      stage:"thread.migration.genesis_sex",
      status:"succeeded",
      attempt:1,
      evidence:{ migrationId, eventId:result.eventId, genesisId:evidence.genesisId, migrated:result.migrated === true },
    });

    const after = await diagnose(threadId);
    await record(activity, {
      threadId,
      operationId:childOperation(root, "complete"),
      parentOperationId:root,
      stage:"thread.migration.complete",
      status:"succeeded",
      attempt:1,
      evidence:{ migrationId, health:after.health },
    });
    return Object.freeze({ threadId, migrationId, migrationKey:root, before, after, migrated:result.migrated === true, result });
  }

  async function repair(threadId, { repairKey } = {}) {
    const root = operationKey("repairKey", repairKey);
    const before = await diagnose(threadId);
    if (!before.exists) return Object.freeze({ threadId, repairKey:root, before, after:before, actions:Object.freeze([]) });

    const migrationBlocked = before.findings.some((entry) => entry.state === "migration_required");
    const decisionBlocked = before.findings.some((entry) => entry.state === "operator_decision_required");
    const blocked = migrationBlocked || decisionBlocked;
    const actionable = before.findings.filter((entry) => entry.state === "repairable" && entry.action !== null).map((entry) => entry.code);
    await record(activity, {
      threadId,
      operationId:root,
      stage:"thread.repair.start",
      status:"succeeded",
      attempt:1,
      evidence:{ findingCodes:actionable, blocked },
    });

    const actions = [];
    const afterGeography = await diagnose(threadId);
    if (!blocked && afterGeography.findings.some((entry) => entry.action === "rebuild_presentation")) {
      const result = await presentationDelivery.rebuildThreadPresentation(threadId);
      actions.push(Object.freeze({ action:"rebuild_presentation", result }));
      await record(activity, {
        threadId,
        operationId:childOperation(root, "presentation"),
        parentOperationId:root,
        stage:"thread.repair.presentation_rebuild",
        status:"succeeded",
        attempt:1,
        evidence:{ genesisId:result.genesisId, rebuilt:result.rebuilt === true },
      });
    }

    let afterPresentation = await diagnose(threadId);
    if (!blocked && afterPresentation.findings.some((entry) => entry.action === "reconcile_identity_projection")) {
      const identityProjection = requireMethod(
        "presentationDelivery",
        presentationDelivery,
        "reconcileThreadPresentationIdentity",
      );
      const result = await identityProjection.reconcileThreadPresentationIdentity(threadId);
      actions.push(Object.freeze({ action:"reconcile_identity_projection", result }));
      await record(activity, {
        threadId,
        operationId:childOperation(root, "identity_projection"),
        parentOperationId:root,
        stage:"thread.repair.identity_projection",
        status:"succeeded",
        attempt:1,
        evidence:{ reconciled:result.reconciled === true },
      });
      afterPresentation = await diagnose(threadId);
    }

    if (!blocked && afterPresentation.findings.some((entry) => entry.action === "reconcile_visual_publication")) {
      const result = await visualReconciler.reconcileThread({
        threadId,
        regenerationKey: root,
        activityContext: { repairKey:root, parentOperationId:childOperation(root, "visual") },
      });
      actions.push(Object.freeze({ action:"reconcile_visual_publication", result }));
      await record(activity, {
        threadId,
        operationId:childOperation(root, "visual"),
        parentOperationId:root,
        stage:"thread.repair.visual_reconcile",
        status:"succeeded",
        attempt:1,
        evidence:{ stage:result.stage, complete:result.complete === true },
      });
    }

    const after = await diagnose(threadId);
    await record(activity, {
      threadId,
      operationId:childOperation(root, "complete"),
      parentOperationId:root,
      stage:"thread.repair.complete",
      status:"succeeded",
      attempt:1,
      evidence:{ health:after.health, remaining:after.findings.filter((entry) => entry.state !== "healthy").map((entry) => entry.code) },
    });
    return Object.freeze({
      threadId,
      repairKey:root,
      before,
      after,
      actions:Object.freeze(actions),
    });
  }

  return Object.freeze({ diagnose, updateIdentity, updateRaisedLanguages, migrate, repair });
}
