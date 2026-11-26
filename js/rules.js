export function isCorrectAccusation(culpritId, accompliceId, solution) {
  const accomplice = accompliceId === "none" ? null : accompliceId;
  return culpritId === solution.culprit && accomplice === solution.accomplice;
}
