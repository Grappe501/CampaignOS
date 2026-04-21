import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/lib/cop/**/*.test.ts',
      'src/lib/volunteerThroughputDomain.test.ts',
      'src/lib/eventOutcomeDomain.test.ts',
      'src/lib/geographicCommandSelectors.test.ts',
      'src/lib/automationRulesEngine.test.ts',
      'src/lib/automationInterventionEngine.test.ts',
      'src/lib/gotvCountdownEngine.test.ts',
      'src/lib/gotvReadiness.test.ts',
      'src/lib/voterConversionDisposition.test.ts',
      'src/lib/messageDiscipline.test.ts',
      'src/lib/messageTargeting.test.ts',
      'src/lib/financeAnalytics.test.ts',
      'src/lib/resourceAllocationEngine.test.ts',
      'src/lib/simulationEngine.test.ts',
      'src/lib/strategyComparison.test.ts',
      'src/lib/simulationRisk.test.ts',
    ],
  },
})
