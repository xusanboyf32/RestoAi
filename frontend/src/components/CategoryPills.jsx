export default function CategoryPills({ categories, activeCategoryId, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
      <button
        onClick={() => onSelect(null)}
        className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all
          ${activeCategoryId === null
            ? 'bg-primary text-white'
            : 'bg-darkCard border border-darkBorder text-textSecond hover:border-primary'
          }`}
      >
        🍽️ Hammasi
      </button>

      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all
            ${activeCategoryId === cat.id
              ? 'bg-primary text-white'
              : 'bg-darkCard border border-darkBorder text-textSecond hover:border-primary'
            }`}
        >
          {cat.emoji && `${cat.emoji} `}{cat.name}
        </button>
      ))}
    </div>
  )
}