import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Text,
  Box,
} from "@jtl-software/platform-ui-react";
import QualityWarningCard from "./QualityWarningCard";

// DTO vom Backend mit den benötigten Feldern
interface QualityIssue {
  id: string | number;
  title?: string;
  description?: string;
}

export interface DescriptionProposal {
  id: string | number;
  currentText?: string;
  proposedText?: string;
  status?: string;
}

export interface AiRecommendation {
  id: string | number;
  returnRate?: number;
  aiSummaryText?: string;
  isFullyResolved?: boolean;
  qualityIssues?: QualityIssue[];
  descriptionProposals?: DescriptionProposal[];
}

export interface ArticleDetailDTO {
  id: string;
  articleNumber?: string;
  name?: string;
  category?: string;
  size?: string;
  color?: string;
  aiRecommendations?: AiRecommendation[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  articleDetail?: ArticleDetailDTO | null;
  isLoading?: boolean;
  error?: string | null;
  reviewedCount: number;
  totalCount: number;
}

export default function QualityReviewModal({
  isOpen,
  onClose,
  articleDetail,
  isLoading = false,
  error = null,
  reviewedCount,
  totalCount,
}: Props) {
  if (!isOpen) return null;

  const aiRec = articleDetail?.aiRecommendations?.[0];
  const issues = aiRec?.qualityIssues || [];
  const hasIssues = issues.length > 0;

  const currentText = aiRec?.descriptionProposals?.[0]?.currentText?.trim() ?? "";
  const proposedText = aiRec?.descriptionProposals?.[0]?.proposedText?.trim() ?? "";
  const summaryText = aiRec?.aiSummaryText ?? "";
  const mainContent = isLoading ? (
    <div className="p-6 text-center text-sm text-slate-600">Lade Artikeldetails…</div>
  ) : error ? (
    <div className="p-6 text-center text-sm text-red-600">{error}</div>
  ) : !articleDetail ? (
    <div className="p-6 text-center text-sm text-slate-600">Keine Artikeldaten vorhanden.</div>
  ) : (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Text weight="bold">Qualitätsprüfung</Text>

        {hasIssues ? (
          issues.map((iss) => (
            <QualityWarningCard
              key={iss.id}
              title={iss.title ?? "Warnung"}
              description={iss.description ?? "Keine Beschreibung verfügbar."}
              onChecked={() => {}}
              onCreateTicket={() => {}}
            />
          ))
        ) : (
          <Card className="border border-gray-100 bg-slate-50">
            <CardContent className="p-4">
              <Text>Keine Qualitätswarnungen</Text>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <Text weight="bold">Produktbeschreibung</Text>

        <Card className="border border-gray-100 bg-slate-50">
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
              {proposedText ? (
                <Text>{proposedText}</Text>
              ) : (
                <Text color="muted">Keine Vorschläge</Text>
              )}
            </Box>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Box className="text-xs uppercase text-slate-500">
            <Text>Aktuell</Text>
          </Box>
          <Box className="mt-2">
            {currentText ? <Text>{currentText}</Text> : <Text color="muted">—</Text>}
          </Box>

          <Box className="text-xs uppercase text-blue-500">
            <Text>KI-Vorschlag</Text>
          </Box>
          <Box className="mt-2">
            {proposedText ? <Text>{proposedText}</Text> : <Text color="muted">Keine Vorschläge</Text>}
          </Box>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center p-4">
      <div className="w-full max-w-6xl bg-white rounded-[28px] shadow-2xl overflow-hidden">
        <Card className="rounded-none border-none shadow-none">
          <CardHeader className="px-6 py-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Qualitätsprüfung</CardTitle>
                  <Text>Prüfe den Artikel und vergleiche aktuellen Text mit KI-Vorschlag.</Text>
                </div>
                <Button label="Schliessen" variant="ghost" onClick={onClose} />
              </div>

{summaryText ? (
                <Box className="mt-2 text-sm text-slate-600">
                  <Text weight="semibold">Zusammenfassung</Text>
                  <Box className="mt-1">
                    <Text>{summaryText}</Text>
                    </Box>
                </Box>
              ) : null}

              <Box className="flex items-center gap-2 text-sm text-slate-500">
                <span>
                  {reviewedCount} / {totalCount} bearbeitet
                </span>
              </Box>
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            {mainContent}

            {articleDetail && !isLoading && !error ? (
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button label="Ablehnen" variant="ghost" onClick={() => {}} />
                <Button label="Bearbeiten" variant="secondary" onClick={() => {}} />
                <Button label="Übernehmen" variant="highlight" onClick={() => {}} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
