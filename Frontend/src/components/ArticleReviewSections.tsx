import { Card, CardContent, Button, Text, Box } from "@jtl-software/platform-ui-react";
import QualityWarningCard from "./QualityWarningCard";
import {
  PROPOSAL_STATUS_ACCEPTED,
  PROPOSAL_STATUS_PENDING,
  PROPOSAL_STATUS_REJECTED,
  type ArticleReview,
} from "../hooks/useArticleReview";

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

interface Props {
  review: ArticleReview;
}

/**
 * Qualitätsprüfung / Produktbeschreibung / Weitere Empfehlungen — the review body
 * shared between QualityReviewModal (Retouren-Analyse) and ArticleDetailsPanel
 * (KI-Lösungs-Hub) so the persistence logic only exists once.
 */
export default function ArticleReviewSections({ review }: Props) {
  const {
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
    toggleActionRecommendation,
    toggleQualityIssue,
    startEditingProposal,
    cancelEditingProposal,
    saveProposedText,
    updateProposalStatus,
  } = review;

  const hasIssues = issues.length > 0;
  const currentText = descriptionProposal?.currentText?.trim() ?? "";

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Text weight="bold">Qualitätsprüfung</Text>

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
            <Card className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <CardContent className="p-4">
                <Text>Keine Qualitätswarnungen</Text>
              </CardContent>
            </Card>
          )}

          {qualityIssueSaveError ? (
            <p className="text-xs text-red-600 dark:text-red-400">{qualityIssueSaveError}</p>
          ) : null}
        </div>

        <div className="space-y-4">
          <Text weight="bold">Produktbeschreibung</Text>

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
            </CardContent>
          </Card>
        </div>
      </div>

      {actionRecommendations.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <Text weight="bold">Weitere Empfehlungen</Text>
            <Text type="xs" color="muted">
              {completedActionCount} / {actionRecommendations.length} erledigt
            </Text>
          </div>

          <div className="mt-3 space-y-2">
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
        </div>
      )}

      <div className="mt-6 flex flex-col items-end gap-2">
        {proposalActionError ? (
          <p className="text-xs text-red-600 dark:text-red-400">{proposalActionError}</p>
        ) : null}

        {descriptionProposalId === undefined ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Kein KI-Textvorschlag für diesen Artikel vorhanden – nichts zu prüfen.
          </p>
        ) : isProposalReviewed ? (
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
            <Button
              label={savingProposalAction === "undo" ? "Setzt zurück…" : "Rückgängig"}
              variant="ghost"
              onClick={() => updateProposalStatus(PROPOSAL_STATUS_PENDING, "undo")}
              disabled={savingProposalAction !== null}
            />
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
    </>
  );
}
