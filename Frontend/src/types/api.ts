export type AIStatus = "Keine Empfehlung" | "Ausstehend" | "Angenommen" | "Abgelehnt" | "Gelöst";

export interface ReturnItem {
  id?: number;
  articleNumber: string;
  articleNo?: string;
  name: string;
  category: string;
  size: string;
  color: string | null;
  returnRate: number;
  mostFrequentReason: string | null;
  reason?: string;
  aiStatus: AIStatus;
  hasQualityBadge?: boolean;
  hasDescriptionBadge?: boolean;
  hasRecommendationBadge?: boolean;
}

export interface SettingsApiDto {
  thresholdYellow: number;
  thresholdRed: number;
}

export interface QualityIssue {
  id: string | number;
  issueText?: string;
  status?: string;
}

export interface DescriptionProposal {
  id: string | number;
  currentText?: string;
  proposedText?: string;
  status?: string;
  pushedToWawiAt?: string | null;
}

export interface ActionRecommendation {
  id: string | number;
  actionText?: string;
  impactBadge?: string;
  priority?: string;
  isCompleted?: boolean;
}

export interface AiRecommendation {
  id: string | number;
  returnRate?: number;
  aiSummaryText?: string;
  isFullyResolved?: boolean;
  qualityIssues?: QualityIssue[];
  descriptionProposals?: DescriptionProposal[];
  actionRecommendations?: ActionRecommendation[];
}

/** Response body from POST /api/ai/analyze/{articleId}. */
export interface AnalyzeArticleResponse {
  recommendationId: number;
}

export interface ArticleDetailDTO {
  id: string;
  articleNumber?: string;
  name?: string;
  category?: string;
  size?: string;
  color?: string;
  aiRecommendations?: AiRecommendation[];
  /** Re-Analyse-Sperre: false, solange sich seit der letzten WAWI-Übernahme noch nicht genug
   *  an neuen Retouren/Gründen-Gewichtung getan hat. */
  canReanalyze?: boolean;
  reanalyzeBlockedReason?: string | null;
  descriptionLastRevisedAt?: string | null;
}
