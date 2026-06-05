import Link from 'next/link'
import Image from 'next/image'

function InstagramIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  )
}

export default function StoreFooter() {
  return (
    <footer className="border-t border-border py-8 mt-16">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Image src="/LogoDDDARG.png" alt="DDD ARG" width={511} height={339} className="h-7 w-auto" />
          <span>â€” ImpresiÃ³n 3D en Argentina</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://instagram.com/DDD_ARG"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <InstagramIcon />
            @DDD_ARG
          </a>
          <Link href="/catalogo" className="hover:text-foreground transition-colors">
            CatÃ¡logo
          </Link>
        </div>
      </div>
    </footer>
  )
}
