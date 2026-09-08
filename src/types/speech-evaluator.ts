export type IssueType = 'phoneme' | 'word_stress' | 'omitted_sound' | 'added_sound';
export type AnnotationStatus = 'warning' | 'critical';
export type IntelligibilityRating = 'native' | 'proficient_workplace' | 'borderline' | 'unintelligible';

export interface AnnotationItem {
  word_or_phrase: string;
  status: AnnotationStatus;
  heard_as: string;
  ipa: string;
  issue_type: IssueType;
  feedback: string;
}

export interface EvaluationResponse {
  paragraph_score: number; // 0.0 - 10.0
  intelligibility_rating: IntelligibilityRating;
  summary: string;
  annotations: AnnotationItem[];
  praise_points: string[];
}

export interface TurnEvaluationState {
  turnId: string | number;
  audioBlobUrl: string | null;
  score: number | null;
  isEvaluated: boolean;
  isRecording: boolean;
  isLoading: boolean;
  annotations: AnnotationItem[];
  error?: string | null;
}

export interface TextSegment {
  text: string;
  isAnnotation: boolean;
  annotationData?: AnnotationItem;
}
