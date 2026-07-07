import { useState } from "react"
import { Sidebar, type Page } from "./components/Sidebar"
import { Header } from "./components/Header"
import { Dashboard } from "./components/Dashboard"
import { ReturnsTable } from "./components/ReturnsTable"
import { QualityPage } from "./components/QualityPage"
import { DescriptionsPage } from "./components/DescriptionsPage"
import { AIRecommendations } from "./components/AIRecommendations"
import { SettingsPage } from "./components/SettingsPage"

const titles: Record<Page, string> = {
  dashboard: "Dashboard",
  returns: "Retourenanalyse",
  quality: "Qualitätsprüfung",
  descriptions: "Produktbeschreibungen",
  ai: "KI-Empfehlungen",
  settings: "Einstellungen",
}

export default function App() {
  const [page, setPage] = useState<Page>("dashboard")

  return (
    <div className="min-h-screen bg-[#F5F7FA] font-sans">
      <Sidebar active={page} onNavigate={setPage} />
      <div className="ml-60 min-h-screen flex flex-col">
        <Header title={titles[page]} />
        <main className="flex-1 p-6 max-w-[1400px] mx-auto w-full">
          {page === "dashboard" && <Dashboard />}
          {page === "returns" && <ReturnsTable />}
          {page === "quality" && <QualityPage />}
          {page === "descriptions" && <DescriptionsPage />}
          {page === "ai" && <AIRecommendations />}
          {page === "settings" && <SettingsPage />}
        </main>
      </div>
    </div>
  )
}
