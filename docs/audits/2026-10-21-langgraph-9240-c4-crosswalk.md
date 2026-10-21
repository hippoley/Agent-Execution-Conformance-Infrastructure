# LangGraph #9240 → AECI C4 independent-evidence crosswalk (2026-10-21)

**Provenance:** LangGraph issue https://github.com/langchain-ai/langgraph/issues/9240; external contributor MounirMeziani reported results for LangGraph 1.2.16, checkpoint 4.3.0, checkpoint-sqlite 3.1.2, SqliteSaver, Python 3.13.5. This is *reported third-party evidence*, not yet a locally rerun result, a citation of AECI, or third-party adoption.

| External case | sync/async/exit effects | C4 relevance | Required AECI falsification |
| --- | --- | --- | --- |
| raise_after_effect | 2/2/2 | Effect committed, completion absent | No blind retry when provider outcome unresolved |
| effect_before_interrupt | 2/2/2 | Cancellation/interruption != effect rollback | Record task vs effect status separately |
| replay_from_history | 2/2/n/a | Historical resume may replay effect | Scope idempotency to logical operation across checkpoint history |
| task_then_interrupt | 1/1/1 | Completed durable task can avoid replay in this fixture | Preserve positive-control successful progress |
| task_raises_after_effect | 2/2/2 | A task wrapper alone isn't an effect transaction | Inject ambiguous-effect failure and require reconciliation |

## Critical separation

- **Graph state durability** says *when graph/checkpoints persist*, not *how many physical external effects occurred*.
- **Provider transactional deduplication** can bound effects when the operation key and side effect commit atomically in the same trusted transaction. It is not the same as a pre-retry client lookup.
- **Queryable remote provider:** reconcile stable operation ID against authoritative remote status before any replay. A read timeout means UNKNOWN.
- **Unqueryable/non-idempotent provider:** UNKNOWN / RECONCILIATION_REQUIRED; never infer rollback from task failure or cancellation.
- **Effect identity** must be tied to the logical request, subject/resource, payload digest, and scope. A reused key with changed payload must fail closed.
- **Observer independence:** an executor's return value alone is not authoritative external effect evidence.

## Executable proof gates (not yet run)

1. Pin the upstream script and dependencies, run it unmodified locally, and retain log hashes.
2. Add an independent fake-effect provider with a durable operation journal; split caller/worker/provider OS processes.
3. Inject termination at pre-dispatch, post-effect/pre-response, post-response/pre-receipt, and post-receipt/pre-ACK.
4. Count *provider commits*, not just node attempts or spans; include a positive safe-completion case.
5. Rerun the same logical op and a conflicting payload with the same key; record CONFIRMED / UNKNOWN / NOT_DISPATCHED separately.
6. Compare LangGraph and AgentScope behind the same observer and fixture schema; mark unsupported cases explicitly, not as passed.

**Status:** evidence mapped, not C4 closed. No physical devices, paid Actions, independent adapter acceptance, or cross-framework comparisons performed.
