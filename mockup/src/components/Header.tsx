import { Search, Bell, ChevronDown } from "lucide-react"

export function Header({ title }: { title: string }) {
  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 gap-4 sticky top-0 z-30">
      <h1 className="font-semibold text-gray-900 text-sm flex-shrink-0">{title}</h1>

      <div className="flex-1 max-w-md mx-auto">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Artikel suchen…"
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <button className="relative p-2 rounded-lg hover:bg-gray-50 transition-colors text-gray-500">
          <Bell size={17} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full" />
        </button>

        <button className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors">
          <img
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&auto=format"
            alt="User"
            className="w-7 h-7 rounded-full object-cover bg-gray-100"
          />
          <div className="text-left">
            <p className="text-xs font-semibold text-gray-800 leading-none">Max Müller</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-none">E-Commerce Manager</p>
          </div>
          <ChevronDown size={13} className="text-gray-400 ml-0.5" />
        </button>
      </div>
    </header>
  )
}
