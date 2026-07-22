import {
  Box,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Text,
} from "@jtl-software/platform-ui-react";

type ReturnRateLevel = "high" | "medium" | "low";

interface ArticleCardProps {
  name: string;
  articleNo: string;
  category: string;
  size: string;
  returnRate: ReturnRateLevel;
  hasQualityBadge: boolean;
  hasDescriptionBadge: boolean;
  hasRecommendationBadge: boolean;
  openCount: number;
  resolvedCount: number;
  imageUrl?: string;
}

function getReturnRateConfig(level: ReturnRateLevel) {
  switch (level) {
    case "high":
      return { label: "Hoch", className: "bg-red-100 text-red-700 border border-red-300" };
    case "medium":
      return {
        label: "Mittel",
        className: "bg-yellow-100 text-yellow-700 border border-yellow-300",
      };
    case "low":
      return { label: "Niedrig", className: "bg-green-100 text-green-700 border border-green-300" };
  }
}

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

export function ArticleCard({
  name,
  articleNo,
  category,
  size,
  returnRate,
  hasQualityBadge,
  hasDescriptionBadge,
  hasRecommendationBadge,
  openCount,
  resolvedCount,
  imageUrl,
}: ArticleCardProps) {
  const rateConfig = getReturnRateConfig(returnRate);

  // Fortschritt wird ausschließlich aus den erhaltenen Zählern berechnet.
  const total = openCount + resolvedCount;
  const progress = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="pb-2">
        <Box className="flex items-start justify-between gap-4">
          <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
            {imageUrl ? (
              <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-gray-400 text-xs text-center px-1">Kein Bild</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold truncate">{name}</CardTitle>
            <Box className="mt-1 space-y-0.5">
              <Text type="xs" color="muted">
                Art.-Nr.: <span className="font-medium text-foreground">{articleNo}</span>
              </Text>
              <Text type="xs" color="muted">
                Kategorie: <span className="font-medium text-foreground">{category}</span>
              </Text>
              <Text type="xs" color="muted">
                Größe: <span className="font-medium text-foreground">{size}</span>
              </Text>
            </Box>
          </div>

          <div className="flex-shrink-0">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${rateConfig.className}`}
            >
              Retourenquote: {rateConfig.label}
            </span>
          </div>
        </Box>
      </CardHeader>

      <CardContent className="pt-2 pb-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {hasQualityBadge && (
            <Badge label="Qualität" className="bg-red-50 text-red-700 border border-red-200" />
          )}
          {hasDescriptionBadge && (
            <Badge
              label="Beschreibung"
              className="bg-amber-50 text-amber-700 border border-amber-200"
            />
          )}
          {hasRecommendationBadge && (
            <Badge
              label="Empfehlung"
              className="bg-blue-50 text-blue-700 border border-blue-200"
            />
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Text type="xs" color="muted">
              Fortschritt
            </Text>
            <Text type="xs" weight="semibold">
              {openCount} offen · {clampedProgress}%
            </Text>
          </div>
          <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
