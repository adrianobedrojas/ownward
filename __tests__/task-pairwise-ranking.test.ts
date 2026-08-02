import {
  createTaskPairKey,
  DEFAULT_TASK_PAIRWISE_K_FACTOR,
  getExpectedPairwiseScores,
  getUpdatedPairwiseRatings,
  selectNextTaskPair,
  type PairwiseSelectableTask,
} from "@/lib/task-pairwise-ranking";

const BASE_TASKS: PairwiseSelectableTask[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    status: "todo",
    pairwise_comparison_count: 0,
    created_at: "2026-08-01T10:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    status: "todo",
    pairwise_comparison_count: 0,
    created_at: "2026-08-01T11:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    status: "completed",
    pairwise_comparison_count: 0,
    created_at: "2026-08-01T12:00:00.000Z",
  },
];

describe("task pairwise ranking helpers", () => {
  it("gives equal expected outcomes for equal ratings", () => {
    const result = getExpectedPairwiseScores({ ratingA: 1000, ratingB: 1000 });

    expect(result.expectedA).toBeCloseTo(0.5, 5);
    expect(result.expectedB).toBeCloseTo(0.5, 5);
  });

  it("updates 1000 vs 1000 to 1016 and 984 with the default K-factor", () => {
    const result = getUpdatedPairwiseRatings({
      winnerRating: 1000,
      loserRating: 1000,
      kFactor: DEFAULT_TASK_PAIRWISE_K_FACTOR,
    });

    expect(result).toEqual({
      winnerRating: 1016,
      loserRating: 984,
    });
  });

  it("moves ratings more for an upset than an expected outcome", () => {
    const expectedWin = getUpdatedPairwiseRatings({
      winnerRating: 1200,
      loserRating: 1000,
    });
    const upsetWin = getUpdatedPairwiseRatings({
      winnerRating: 1000,
      loserRating: 1200,
    });

    expect(upsetWin.winnerRating - 1000).toBeGreaterThan(expectedWin.winnerRating - 1200);
    expect(1000 - upsetWin.loserRating).toBeGreaterThan(1200 - expectedWin.loserRating);
  });

  it("returns integer ratings", () => {
    const result = getUpdatedPairwiseRatings({
      winnerRating: 1033,
      loserRating: 987,
    });

    expect(Number.isInteger(result.winnerRating)).toBe(true);
    expect(Number.isInteger(result.loserRating)).toBe(true);
  });

  it("does not mutate input task arrays while selecting pairs", () => {
    const tasks = BASE_TASKS.map((task) => ({ ...task }));
    const snapshot = tasks.map((task) => ({ ...task }));

    selectNextTaskPair(tasks, new Set());

    expect(tasks).toEqual(snapshot);
  });

  it("does not mutate rating input objects", () => {
    const input = {
      winnerRating: 1000,
      loserRating: 1000,
    };
    const snapshot = { ...input };

    getUpdatedPairwiseRatings(input);

    expect(input).toEqual(snapshot);
  });
});

describe("selectNextTaskPair", () => {
  it("excludes completed tasks", () => {
    const pair = selectNextTaskPair(BASE_TASKS, new Set());

    expect(pair).not.toBeNull();
    expect(pair?.firstTask.status).toBe("todo");
    expect(pair?.secondTask.status).toBe("todo");
  });

  it("never pairs a task with itself", () => {
    const pair = selectNextTaskPair(BASE_TASKS, new Set());

    expect(pair?.firstTask.id).not.toBe(pair?.secondTask.id);
  });

  it("avoids pairs already shown in the current session", () => {
    const pairKey = createTaskPairKey(
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002"
    );

    const pair = selectNextTaskPair(BASE_TASKS, new Set([pairKey]));

    expect(pair).toBeNull();
  });

  it("prefers under-compared tasks", () => {
    const tasks: PairwiseSelectableTask[] = [
      {
        id: "00000000-0000-4000-8000-000000000001",
        status: "todo",
        pairwise_comparison_count: 4,
        created_at: "2026-08-01T10:00:00.000Z",
      },
      {
        id: "00000000-0000-4000-8000-000000000002",
        status: "todo",
        pairwise_comparison_count: 0,
        created_at: "2026-08-01T11:00:00.000Z",
      },
      {
        id: "00000000-0000-4000-8000-000000000004",
        status: "todo",
        pairwise_comparison_count: 1,
        created_at: "2026-08-01T09:00:00.000Z",
      },
    ];

    const pair = selectNextTaskPair(tasks, new Set());

    expect(pair).not.toBeNull();
    expect([pair?.firstTask.id, pair?.secondTask.id]).toEqual(
      expect.arrayContaining([
        "00000000-0000-4000-8000-000000000002",
        "00000000-0000-4000-8000-000000000004",
      ])
    );
  });

  it("returns no pair when fewer than two eligible tasks remain", () => {
    const pair = selectNextTaskPair(
      [
        {
          id: "00000000-0000-4000-8000-000000000001",
          status: "todo",
          pairwise_comparison_count: 0,
          created_at: "2026-08-01T10:00:00.000Z",
        },
      ],
      new Set()
    );

    expect(pair).toBeNull();
  });
});
