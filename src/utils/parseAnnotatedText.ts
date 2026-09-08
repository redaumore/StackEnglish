import type { AnnotationItem, TextSegment } from '../types/speech-evaluator';

interface MatchOccurrence {
  start: number;
  end: number;
  annotation: AnnotationItem;
}

/**
 * Case-insensitive substring search while preserving original casing.
 * Splits expectedText into an ordered sequence of plain text spans and annotated spans.
 */
export function parseAnnotatedText(
  expectedText: string,
  annotations: AnnotationItem[]
): TextSegment[] {
  if (!expectedText) return [];
  if (!annotations || annotations.length === 0) {
    return [{ text: expectedText, isAnnotation: false }];
  }

  const lowerText = expectedText.toLowerCase();
  const matches: MatchOccurrence[] = [];

  // Find occurrences for each annotation
  for (const annotation of annotations) {
    const rawTarget = annotation.word_or_phrase?.trim();
    if (!rawTarget) continue;

    const lowerTarget = rawTarget.toLowerCase();
    let startIndex = 0;

    while (startIndex < lowerText.length) {
      const foundIdx = lowerText.indexOf(lowerTarget, startIndex);
      if (foundIdx === -1) break;

      const endIdx = foundIdx + lowerTarget.length;

      // Check if this occurrence overlaps with already matched intervals
      const overlaps = matches.some(
        (m) => !(endIdx <= m.start || foundIdx >= m.end)
      );

      if (!overlaps) {
        matches.push({
          start: foundIdx,
          end: endIdx,
          annotation,
        });
      }

      startIndex = foundIdx + 1;
    }
  }

  // Sort matches by start position ascending
  matches.sort((a, b) => a.start - b.start);

  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const m of matches) {
    if (m.start > cursor) {
      segments.push({
        text: expectedText.slice(cursor, m.start),
        isAnnotation: false,
      });
    }

    segments.push({
      text: expectedText.slice(m.start, m.end),
      isAnnotation: true,
      annotationData: m.annotation,
    });

    cursor = m.end;
  }

  if (cursor < expectedText.length) {
    segments.push({
      text: expectedText.slice(cursor),
      isAnnotation: false,
    });
  }

  return segments;
}
