import type { AppViewModel } from "../view-model";

/** Only the values and actions consumed by this feature’s screens. */
export type GoalsScreenModel = Pick<AppViewModel,
  "floorBar" |
  "floorState" |
  "floorStateFg" |
  "floorWidth" |
  "goalAmount" |
  "goalAmountType" |
  "goalCancel" |
  "goalCards" |
  "goalCreate" |
  "goalDraftName" |
  "goalError" |
  "goalNameType" |
  "goalNeedLine" |
  "goalPosChips" |
  "goalReady" |
  "goalsBack" |
  "hasSurplus" |
  "noGoals" |
  "savingsDown" |
  "savingsFrom" |
  "savingsGoalLabel" |
  "savingsPotLabel" |
  "savingsUp" |
  "splitModes" |
  "surplusFreeLabel" |
  "surplusLabel" |
  "surplusSegments" |
  "t" |
  "toGoalNew"
>;
