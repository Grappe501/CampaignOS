/**
 * Server boundary: OpenAI calls live only under `netlify/functions` (e.g. `agent-jones.ts`).
 * This module re-exports types so feature code does not import Netlify bundles from the client.
 */
export type { EventAiSimulationRequestV1, EventAiSimulationResultV1 } from './eventAiSimulationSchemas'
