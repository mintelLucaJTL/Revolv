import { useEffect, useState } from "react";
import { Card, CardContent, Button, Text, Box } from "@jtl-software/platform-ui-react";
import { CheckCircle2, FileText, ListChecks, ShieldAlert, Sparkles } from "lucide-react";
import QualityWarningCard from "./QualityWarningCard";
import {
  PROPOSAL_STATUS_ACCEPTED,
  PROPOSAL_STATUS_PENDING,
  PROPOSAL_STATUS_REJECTED,
  type ArticleReview,
  type ReviewSectionTone,
} from "../hooks/useArticleReview";

function formatPushedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function getPriorityBadgeClasses(priority?: string): string {
  const normalized = priority?.toLowerCase() ?? "";
  if (normalized.includes("hoch") || normalized.includes("high")) {
    return "bg-red-50 text-red-600 border border-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800";
  }
  if (normalized.includes("mittel") || normalized.includes("medium")) {
    return "bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
  }
  return "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
}

const DOT_CLASSES: Record<ReviewSectionTone, string> = {
  good: "bg-green-500",
  warn: "bg-amber-500",
  neutral: "bg-slate-300 dark:bg-slate-600",
};

const ANALYSIS_STAGES = ["Scanne Retourengründe", "Vergleicht Beschreibung", "Erstellt Empfehlungen"];

// The moment that's supposed to feel like "our AI at work" — a sweeping bar + short,
// fast-changing status instead of a static spinner. No sentences, nothing to read.
function AiAnalysisLoading() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setStage((s) => (s + 1) % ANALYSIS_STAGES.length), 1300);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <span className="relative flex h-14 w-14 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-blue-400/40 dark:bg-blue-500/30" />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white">
          <Sparkles size={24} />
        </span>
      </span>
      <div className="h-1.5 w-48 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="animate-ai-scan h-full w-1/3 rounded-full bg-blue-600" />
      </div>
      <Text type="xs" color="muted">
        {ANALYSIS_STAGES[stage]}…
      </Text>
    </div>
  );
}

function EmptyAnalysisHero({ onStart }: { onStart?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
        <Sparkles size={24} />
      </span>
      <Text weight="bold">Noch keine KI-Analyse</Text>
      {onStart ? <Button label="Jetzt analysieren" variant="highlight" onClick={onStart} /> : null}
    </div>
  );
}

type TabKey = "quality" | "description" | "actions";

const TAB_ICON: Record<TabKey, typeof ShieldAlert> = {
  quality: ShieldAlert,
  description: FileText,
  actions: ListChecks,
};

const TAB_LABEL: Record<TabKey, string> = {
  quality: "Qualität",
  description: "Beschreibung",
  actions: "Empfehlungen",
};

interface Props {
  review: ArticleReview;
  isAnalyzing?: boolean;
  onStartAnalysis?: () => void;
}

/**
 * Qualitätsprüfung / Produktbeschreibung / Weitere Empfehlungen — the review body rendered
 * inside QualityReviewModal (Retouren-Analyse). The former standalone KI-Lösungs-Hub page was
 * retired; its Qualität/Beschreibung/Empfehlungen filters now live directly in Retouren-Analyse.
 * Tabbed: one section visible at a time, so a first-time user isn't faced with three dense
 * blocks at once. The tabs double as the status overview (colored dot = done/open/n.a.).
 */
export default function ArticleReviewSections({ review, isAnalyzing, onStartAnalysis }: Props) {
  const {
    aiRec,
    issues,
    actionRecommendations,
    descriptionProposal,
    descriptionProposalId,
    completedActionIds,
    completedQualityIssueIds,
    completedActionCount,
    actionSaveError,
    qualityIssueSaveError,
    proposalStatus,
    proposedTextValue,
    isEditingProposal,
    draftProposedText,
    setDraftProposedText,
    isSavingProposalText,
    savingProposalAction,
    proposalActionError,
    isProposalReviewed,
    pushedToWawiAt,
    isPushingToWawi,
    pushToWawiError,
    sectionStatus,
    toggleActionRecommendation,
    toggleQualityIssue,
    startEditingProposal,
    cancelEditingProposal,
    saveProposedText,
    updateProposalStatus,
    pushDescriptionToWawi,
  } = review;

  // Land on whichever tab still needs attention, so the first click isn't wasted on "all clear".
  const defaultTab: TabKey =
    sectionStatus.quality.tone === "warn"
      ? "quality"
      : sectionStatus.description.tone === "warn"
        ? "description"
        : sectionStatus.actions.tone === "warn"
          ? "actions"
          : "quality";

  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);

  // New/re-analyzed article → re-pick the tab that needs attention instead of staying stuck
  // on whatever was active for the previous article.
  useEffect(() => {
    setActiveTab(defaultTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiRec?.id]);

  if (isAnalyzing) return <AiAnalysisLoading />;
  if (!aiRec) return <EmptyAnalysisHero onStart={onStartAnalysis} />;

  const hasIssues = issues.length > 0;
  const currentText = descriptionProposal?.currentText?.trim() ?? "";

  const tabs: TabKey[] = ["quality", "description", "actions"];
  const statusByTab: Record<TabKey, ReviewSectionTone> = {
    quality: sectionStatus.quality.tone,
    description: sectionStatus.description.tone,
    actions: sectionStatus.actions.tone,
  };

  const tabBar = (
    <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
      {tabs.map((key) => {
        const Icon = TAB_ICON[key];
        const isActive = activeTab === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
              isActive
                ? "border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Icon size={16} />
            {TAB_LABEL[key]}
            <span className={`h-2 w-2 rounded-full ${DOT_CLASSES[statusByTab[key]]}`} />
          </button>
        );
      })}
    </div>
  );

  const proposalActionsFooter =
    descriptionProposalId === undefined ? null : (
      <div className="mt-4 flex flex-col items-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
        {proposalActionError ? (
          <p className="text-xs text-red-600 dark:text-red-400">{proposalActionError}</p>
        ) : null}

        {isProposalReviewed ? (
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  proposalStatus === PROPOSAL_STATUS_ACCEPTED
                    ? "bg-green-50 text-green-700 dark:bg-green-950/60 dark:text-green-300"
                    : "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300"
                }`}
              >
                {proposalStatus === PROPOSAL_STATUS_ACCEPTED
                  ? "Vorschlag übernommen"
                  : "Vorschlag abgelehnt"}
              </span>
              {/* Sobald live in WAWI übernommen, würde "Rückgängig" nur noch Revolvs eigenen
                  Status zurücksetzen, nicht die bereits geänderte WAWI-Beschreibung - das wäre
                  irreführend, also ausgeblendet statt falsche Erwartungen zu wecken. */}
              {!pushedToWawiAt && (
                <Button
                  label={savingProposalAction === "undo" ? "Setzt zurück…" : "Rückgängig"}
                  variant="ghost"
                  onClick={() => updateProposalStatus(PROPOSAL_STATUS_PENDING, "undo")}
                  disabled={savingProposalAction !== null}
                />
              )}
            </div>

            {proposalStatus === PROPOSAL_STATUS_ACCEPTED && (
              <div className="flex flex-col items-end gap-2">
                {pushedToWawiAt ? (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                    In WAWI übernommen am {formatPushedAt(pushedToWawiAt)}
                  </span>
                ) : (
                  <>
                    {pushToWawiError && (
                      <p className="text-xs text-red-600 dark:text-red-400">{pushToWawiError}</p>
                    )}
                    <Button
                      label={isPushingToWawi ? "Übernimmt…" : "In WAWI übernehmen"}
                      variant="highlight"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Diesen Beschreibungstext jetzt live in WAWI übernehmen? " +
                              "Das überschreibt die aktuelle Artikelbeschreibung sofort.",
                          )
                        ) {
                          void pushDescriptionToWawi();
                        }
                      }}
                      disabled={isPushingToWawi}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        ) : isEditingProposal ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              label="Abbrechen"
              variant="ghost"
              onClick={cancelEditingProposal}
              disabled={isSavingProposalText}
            />
            <Button
              label={isSavingProposalText ? "Speichert…" : "Speichern"}
              variant="highlight"
              onClick={saveProposedText}
              disabled={isSavingProposalText}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              label={savingProposalAction === "reject" ? "Speichert…" : "Ablehnen"}
              variant="ghost"
              onClick={() => updateProposalStatus(PROPOSAL_STATUS_REJECTED, "reject")}
              disabled={savingProposalAction !== null}
            />
            <Button
              label="Bearbeiten"
              variant="secondary"
              onClick={startEditingProposal}
              disabled={savingProposalAction !== null}
            />
            <Button
              label={savingProposalAction === "accept" ? "Speichert…" : "Übernehmen"}
              variant="highlight"
              onClick={() => updateProposalStatus(PROPOSAL_STATUS_ACCEPTED, "accept")}
              disabled={savingProposalAction !== null}
            />
          </div>
        )}
      </div>
    );

  return (
    <>
      {tabBar}

      <div className="pt-5">
        {activeTab === "quality" && (
          <div className="space-y-3">
            {hasIssues ? (
              issues.map((iss) => (
                <QualityWarningCard
                  key={iss.id}
                  title="Qualitätswarnung"
                  description={iss.issueText ?? "Keine Beschreibung verfügbar."}
                  isChecked={completedQualityIssueIds.has(iss.id)}
                  onToggleChecked={() => toggleQualityIssue(iss)}
                  onCreateTicket={() => {}}
                />
              ))
            ) : (
              <Card className="border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
                <CardContent className="flex items-center gap-2 p-4">
                  <CheckCircle2
                    size={18}
                    className="flex-shrink-0 text-green-600 dark:text-green-400"
                    aria-hidden="true"
                  />
                  <Text>Keine Qualitätswarnungen</Text>
                </CardContent>
              </Card>
            )}

            {qualityIssueSaveError ? (
              <p className="text-xs text-red-600 dark:text-red-400">{qualityIssueSaveError}</p>
            ) : null}
          </div>
        )}

        {activeTab === "description" && (
          <div>
            <Card className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <CardContent className="p-4">
                <Text weight="bold">Aktuell</Text>
                <Box className="mt-2 mb-4">
                  {currentText ? (
                    <Text>{currentText}</Text>
                  ) : (
                    <Text color="muted">Keine Beschreibung vorhanden</Text>
                  )}
                </Box>

                <Text weight="bold">KI-VORSCHLAG</Text>
                <Box className="mt-2">
                  {isEditingProposal ? (
                    <textarea
                      value={draftProposedText}
                      onChange={(e) => setDraftProposedText(e.target.value)}
                      rows={5}
                      className="w-full rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-950 p-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : proposedTextValue ? (
                    <Text>{proposedTextValue}</Text>
                  ) : (
                    <Text color="muted">Keine Vorschläge</Text>
                  )}
                </Box>

                {proposalActionsFooter}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "actions" && (
          <div>
            {actionRecommendations.length === 0 ? (
              <Card className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <CardContent className="p-4">
                  <Text color="muted">Keine weiteren Empfehlungen</Text>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="mb-3 flex justify-end">
                  <Text type="xs" color="muted">
                    {completedActionCount} / {actionRecommendations.length} erledigt
                  </Text>
                </div>

                <div className="space-y-2">
                  {actionRecommendations.map((rec) => {
                    const isChecked = completedActionIds.has(rec.id);
                    return (
                      <label
                        key={rec.id}
                        className="flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 shadow-sm cursor-pointer transition-colors hover:border-blue-400 dark:hover:border-blue-600"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleActionRecommendation(rec)}
                          className="h-4 w-4 flex-shrink-0 accent-blue-600"
                        />

                        <span
                          className={`flex-1 text-sm ${
                            isChecked
                              ? "text-slate-400 dark:text-slate-500 line-through"
                              : "text-slate-900 dark:text-slate-100"
                          }`}
                        >
                          {rec.actionText ?? "Empfehlung"}
                        </span>

                        <div className="flex flex-shrink-0 items-center gap-2">
                          {rec.impactBadge ? (
                            <span className="rounded-full border border-green-100 dark:border-green-800/50 bg-green-50 dark:bg-green-950/40 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-300">
                              {rec.impactBadge}
                            </span>
                          ) : null}
                          {rec.priority ? (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold transition-colors ${getPriorityBadgeClasses(
                                rec.priority,
                              )}`}
                            >
                              {rec.priority}
                            </span>
                          ) : null}
                        </div>
                      </label>
                    );
                  })}
                </div>

                {actionSaveError ? (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">{actionSaveError}</p>
                ) : null}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
