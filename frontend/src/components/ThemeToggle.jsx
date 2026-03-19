import useThemeStore from '../store/useThemeStore'

export default function ThemeToggle() {
  const { toggle } = useThemeStore()
  return (
    <button
      onClick={toggle}
      className="w-9 h-9 rounded-full flex items-center justify-center transition-all bg-darkCard border border-darkBorder hover:border-primary"
    >
      <svg className="w-4 h-4 text-textSecond" fill="currentColor" viewBox="0 0 20 20">
        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
      </svg>
    </button>
  )
}