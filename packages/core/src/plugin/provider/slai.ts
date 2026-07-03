import { Effect } from "effect"
import { define } from "../internal"
import { Integration } from "../../integration"
import { ProviderV2 } from "../../provider"
import { ModelV2 } from "../../model"

const providerID = ProviderV2.ID.make("slai")
const integrationID = Integration.ID.make("slai")

// Limits and tool-calling support are not confirmed by the SLAI API docs (only
// `max_tokens` default of 32768 is documented); tools defaults to false until
// verified against the live API so the agent doesn't attempt unsupported
// function calls.
const models = [
  { id: "grape-2.1-flash_gguf", name: "GRaPE 2.1 Flash", tools: false },
  { id: "crepe-2@bf16", name: "CRePE 2", tools: false },
] as const

export const SlaiPlugin = define({
  id: "slai",
  effect: Effect.fn(function* (ctx) {
    yield* ctx.integration.transform(
      Effect.fn(function* (integrations) {
        integrations.update(integrationID, (integration) => {
          integration.name = "SLAI"
        })
        integrations.method.update({ integrationID, method: { type: "key" } })
        integrations.method.update({ integrationID, method: { type: "env", names: ["SLAI_API_KEY"] } })
      }),
    )
    yield* ctx.catalog.transform(
      Effect.fn(function* (catalog) {
        catalog.provider.update(providerID, (provider) => {
          provider.name = "SLAI"
          provider.integrationID = integrationID
          provider.api = {
            type: "aisdk",
            package: "@ai-sdk/openai-compatible",
            url: "https://grape.skinnertopia.com/api/openai/v1",
          }
        })
        for (const model of models) {
          catalog.model.update(providerID, ModelV2.ID.make(model.id), (draft) => {
            draft.name = model.name
            draft.capabilities = { tools: model.tools, input: ["text"], output: ["text"] }
            draft.limit = { context: 32768, output: 32768 }
          })
        }
      }),
    )
  }),
})
