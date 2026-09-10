import { assertId } from "./persistence-common.mjs";
import { StructuredObligationCausalWorldKernelService } from "./structured-causal-service.mjs";

export class LivedWorldKernelService extends StructuredObligationCausalWorldKernelService {
  #currentLifeReader;

  constructor(
    worldStore,
    runtimeStore,
    freezeStore,
    lifecycleStore,
    expressionStore,
    causalContextStore,
    options = {},
  ) {
    super(
      worldStore,
      runtimeStore,
      freezeStore,
      lifecycleStore,
      expressionStore,
      causalContextStore,
      options,
    );
    if (typeof options.currentLifeReader !== "function") {
      throw new TypeError("currentLifeReader is required for lived World service");
    }
    this.#currentLifeReader = options.currentLifeReader;
  }

  health() {
    return { ...super.health(), currentLifeProjection: true };
  }

  getCurrentLifeProjection(threadId) {
    assertId("threadId", threadId);
    return this.#currentLifeReader(threadId);
  }
}
