import { compareSpecKeys } from "../spec-key";
import { addProblem, type CheckProblem, type InvariantDeltaRecord } from "./shared";

export function checkInvariantDeltas(
  records: readonly InvariantDeltaRecord[],
  invariantStatuses: ReadonlyMap<string, string>,
  problems: CheckProblem[],
): void {
  const introducedBySpec = new Map<string, string>();
  const retiredBySpec = new Map<string, string>();

  for (const record of [...records].sort((a, b) => compareSpecKeys(a.specKey, b.specKey))) {
    const introducedSet = new Set(record.introduced);
    const updatedSet = new Set(record.updated);
    const retiredSet = new Set(record.retired);

    for (const invariantKey of introducedSet) {
      if (updatedSet.has(invariantKey) || retiredSet.has(invariantKey)) {
        addProblem(
          problems,
          record.specFile,
          `Invariant ${invariantKey} cannot appear in multiple delta categories in one spec`,
        );
      }
    }

    for (const invariantKey of updatedSet) {
      if (retiredSet.has(invariantKey)) {
        addProblem(
          problems,
          record.specFile,
          `Invariant ${invariantKey} cannot appear in multiple delta categories in one spec`,
        );
      }
    }

    for (const invariantKey of record.introduced) {
      const introducedAt = introducedBySpec.get(invariantKey);
      if (introducedAt) {
        addProblem(
          problems,
          record.specFile,
          `Invariant ${invariantKey} was already introduced by ${introducedAt}`,
        );
      }

      const retiredAt = retiredBySpec.get(invariantKey);
      if (retiredAt) {
        addProblem(
          problems,
          record.specFile,
          `Invariant ${invariantKey} was retired by ${retiredAt} and cannot be reintroduced`,
        );
      }

      if (invariantStatuses.get(invariantKey) === "retired") {
        addProblem(
          problems,
          record.specFile,
          `Invariant ${invariantKey} is retired and cannot be listed as introduced`,
        );
      }

      introducedBySpec.set(invariantKey, record.specKey);
    }

    for (const invariantKey of record.updated) {
      const retiredAt = retiredBySpec.get(invariantKey);
      if (retiredAt) {
        addProblem(
          problems,
          record.specFile,
          `Invariant ${invariantKey} was retired by ${retiredAt} and cannot be listed as updated`,
        );
      }

      if (invariantStatuses.get(invariantKey) === "retired") {
        addProblem(
          problems,
          record.specFile,
          `Invariant ${invariantKey} is retired and cannot be listed as updated`,
        );
      }
    }

    for (const invariantKey of record.retired) {
      const retiredAt = retiredBySpec.get(invariantKey);
      if (retiredAt) {
        addProblem(
          problems,
          record.specFile,
          `Invariant ${invariantKey} was already retired by ${retiredAt}`,
        );
      }

      retiredBySpec.set(invariantKey, record.specKey);

      if (invariantStatuses.get(invariantKey) !== "retired") {
        addProblem(
          problems,
          record.specFile,
          `Invariant ${invariantKey} is listed as retired but invariant file status is not retired`,
        );
      }
    }
  }
}
