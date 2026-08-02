export const DEFAULT_TASK_PAIRWISE_RATING = 1000;
export const DEFAULT_TASK_PAIRWISE_K_FACTOR = 32;

export type PairwiseRatingSnapshot = Readonly<{
  ratingA: number;
  ratingB: number;
}>;

export type PairwiseExpectedScores = Readonly<{
  expectedA: number;
  expectedB: number;
}>;

export type PairwiseRatingUpdateInput = Readonly<{
  winnerRating: number;
  loserRating: number;
  kFactor?: number;
}>;

export type PairwiseRatingUpdateResult = Readonly<{
  winnerRating: number;
  loserRating: number;
}>;

export type PairwiseSelectableTask = Readonly<{
  id: string;
  status: string;
  pairwise_comparison_count: number;
  created_at: string;
}>;

export type PairwiseTaskPair<TTask extends PairwiseSelectableTask = PairwiseSelectableTask> = Readonly<{
  firstTask: TTask;
  secondTask: TTask;
  pairKey: string;
}>;

export function getExpectedPairwiseScores({
  ratingA,
  ratingB,
}: PairwiseRatingSnapshot): PairwiseExpectedScores {
  const expectedA = 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
  const expectedB = 1 / (1 + 10 ** ((ratingA - ratingB) / 400));

  return {
    expectedA,
    expectedB,
  };
}

export function getUpdatedPairwiseRatings({
  winnerRating,
  loserRating,
  kFactor = DEFAULT_TASK_PAIRWISE_K_FACTOR,
}: PairwiseRatingUpdateInput): PairwiseRatingUpdateResult {
  const { expectedA, expectedB } = getExpectedPairwiseScores({
    ratingA: winnerRating,
    ratingB: loserRating,
  });

  return {
    winnerRating: Math.round(winnerRating + kFactor * (1 - expectedA)),
    loserRating: Math.round(loserRating + kFactor * (0 - expectedB)),
  };
}

export function createTaskPairKey(taskIdA: string, taskIdB: string) {
  return [taskIdA, taskIdB].sort((left, right) => left.localeCompare(right)).join("::");
}

function comparePairScore(
  left: readonly [number, number, number, string, string, string, string],
  right: readonly [number, number, number, string, string, string, string]
) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] === right[index]) {
      continue;
    }

    if (typeof left[index] === "number" && typeof right[index] === "number") {
      return (left[index] as number) - (right[index] as number);
    }

    return String(left[index]).localeCompare(String(right[index]));
  }

  return 0;
}

export function selectNextTaskPair<TTask extends PairwiseSelectableTask>(
  tasks: readonly TTask[],
  shownPairKeys: ReadonlySet<string>
): PairwiseTaskPair<TTask> | null {
  const eligibleTasks = tasks
    .filter((task) => task.status === "todo")
    .sort((left, right) => {
      if (left.pairwise_comparison_count !== right.pairwise_comparison_count) {
        return left.pairwise_comparison_count - right.pairwise_comparison_count;
      }

      if (left.created_at !== right.created_at) {
        return left.created_at.localeCompare(right.created_at);
      }

      return left.id.localeCompare(right.id);
    });

  if (eligibleTasks.length < 2) {
    return null;
  }

  let bestPair: PairwiseTaskPair<TTask> | null = null;
  let bestScore:
    | readonly [number, number, number, string, string, string, string]
    | null = null;

  for (let firstIndex = 0; firstIndex < eligibleTasks.length - 1; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < eligibleTasks.length; secondIndex += 1) {
      const firstTask = eligibleTasks[firstIndex];
      const secondTask = eligibleTasks[secondIndex];

      if (firstTask.id === secondTask.id) {
        continue;
      }

      const pairKey = createTaskPairKey(firstTask.id, secondTask.id);

      if (shownPairKeys.has(pairKey)) {
        continue;
      }

      const score: readonly [number, number, number, string, string, string, string] = [
        Math.max(firstTask.pairwise_comparison_count, secondTask.pairwise_comparison_count),
        firstTask.pairwise_comparison_count + secondTask.pairwise_comparison_count,
        Math.abs(firstTask.pairwise_comparison_count - secondTask.pairwise_comparison_count),
        firstTask.created_at,
        secondTask.created_at,
        firstTask.id,
        secondTask.id,
      ];

      if (!bestScore || comparePairScore(score, bestScore) < 0) {
        bestPair = {
          firstTask,
          secondTask,
          pairKey,
        };
        bestScore = score;
      }
    }
  }

  return bestPair;
}
