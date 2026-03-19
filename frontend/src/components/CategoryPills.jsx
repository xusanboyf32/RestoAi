export default function CategoryPills({ categories, activeCategoryId, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">

      <button onClick={() => onSelect(null)}
        className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
          activeCategoryId === null
            ? 'bg-primary text-white shadow-glow-sm'
            : 'bg-darkCard border border-darkBorder text-textSecond hover:border-primary/50 hover:text-white'
        }`}>
        Hammasi
      </button>

      {categories.map((cat) => (
        <button key={cat.id} onClick={() => onSelect(cat.id)}
          className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
            activeCategoryId === cat.id
              ? 'bg-primary text-white shadow-glow-sm'
              : 'bg-darkCard border border-darkBorder text-textSecond hover:border-primary/50 hover:text-white'
          }`}>
          {cat.emoji && <span className="mr-1.5">{cat.emoji}</span>}
          {cat.name}
        </button>
      ))}
    </div>
  )
}