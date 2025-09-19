export const formatStageEventNotes = (rawNotes?: string | null): string[] => {
  if (!rawNotes || typeof rawNotes !== 'string') {
    return [];
  }

  const trimmed = rawNotes.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      const result: string[] = [];
      const reasons = (parsed as { reasons?: unknown }).reasons;
      const details = (parsed as { details?: unknown }).details;

      if (Array.isArray(reasons)) {
        const cleanedReasons = reasons
          .filter((reason): reason is string => typeof reason === 'string' && reason.trim().length > 0)
          .map(reason => reason.trim());
        if (cleanedReasons.length > 0) {
          result.push(cleanedReasons.join(', '));
        }
      }

      if (typeof details === 'string' && details.trim().length > 0) {
        result.push(details.trim());
      }

      if (result.length > 0) {
        return result;
      }
    }
  } catch (_) {
    // fall back to returning the raw text below
  }

  return [trimmed];
};
