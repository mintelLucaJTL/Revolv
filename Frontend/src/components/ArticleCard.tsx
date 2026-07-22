import React from "react";
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
  tags: string[];
  progress: number;
  openCount: number;
  imageUrl?: string;
  onOpen?: () => void;
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

export function ArticleCard({
  name,
  articleNo,
  category,
  size,
  returnRate,
  tags,
  progress,
  openCount,
  imageUrl,
  onOpen,
}: ArticleCardProps) {
  const rateConfig = getReturnRateConfig(returnRate);
  const clampedProgress = Math.min(100, Math.max(0, progress));

  function handleClick() {
    onOpen?.();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Enter or Space should activate the card
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen?.();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`Details zu ${name} öffnen`}
      className="w-full max-w-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
    >
      <Card className="w-full transform transition-shadow hover:shadow-md active:scale-[0.997]">
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
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                {tag}
              </span>
            ))}
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
    </div>
  );
}

export default ArticleCard;