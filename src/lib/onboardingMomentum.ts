/**
 * Back-compat re-exports — logic lives in `onboardingEngine.ts`.
 */
export {
  DIRECTION_LANE_HINTS,
  ENGINE_DIRECTIONS,
  findMicroCommitment,
  getDirectionConfig,
  getMicroCommitmentsForDirection,
  getMomentumGuidancePhase,
  getOnboardingActivationCardModel,
  getOnboardingEngineAiExtras,
  getOnboardingEnginePhase,
  listAllMicroCommitments,
  normalizeDirectionKey,
  normalizeEngineState,
  ONBOARDING_DIRECTION_SLUGS,
  ONBOARDING_ENGINE_STATES,
  type EngineDirectionConfig,
  type EngineMomentumAction,
  type MicroCommitment,
  type MomentumAction,
  type OnboardingDirectionKey,
  type OnboardingEnginePhase,
  type OnboardingEngineState,
} from './onboardingEngine'

import {
  normalizeEngineState,
  ONBOARDING_ENGINE_STATES,
  type OnboardingEngineState,
} from './onboardingEngine'

/** @deprecated Use ONBOARDING_ENGINE_STATES */
export const MOMENTUM_STATES = ONBOARDING_ENGINE_STATES

/** @deprecated Use OnboardingEngineState */
export type OnboardingMomentumState = OnboardingEngineState

/** @deprecated Use normalizeEngineState */
export function normalizeMomentumState(raw: unknown): OnboardingMomentumState {
  return normalizeEngineState(raw)
}
