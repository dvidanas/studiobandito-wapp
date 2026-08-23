"use client";

/**
 * Paginación portada del panel de Pasta Lovers.
 *
 * Única diferencia con el original: allá la lista se arma en el servidor y cada
 * página es un <Link> a "?page=N". Acá /clients es un componente cliente con la
 * búsqueda en estado local, así que navegar por URL obligaría a espejar esa
 * búsqueda en el query string y a envolver todo en <Suspense> por
 * useSearchParams(). Se cambia el buildHref por un onPageChange; el cálculo de
 * qué números mostrar y el markup son los mismos.
 */

export const PAGE_SIZE = 10;

function getPageNumbers(current: number, total: number): (number | "...")[] {
  const delta = 1;
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);

  const range: (number | "...")[] = [1];
  if (left > 2) range.push("...");
  for (let i = left; i <= right; i++) range.push(i);
  if (right < total - 1) range.push("...");
  if (total > 1) range.push(total);
  return range;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);
  const baseClass =
    "min-w-[32px] h-8 px-2.5 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors";
  const bordeClass = "border border-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)]";

  return (
    <nav className="flex items-center justify-center gap-1 pt-1" aria-label="Paginación">
      {currentPage > 1 ? (
        <button
          onClick={() => onPageChange(currentPage - 1)}
          className={`${baseClass} ${bordeClass} hover:bg-[var(--color-wa-hover)] cursor-pointer`}
        >
          Anterior
        </button>
      ) : (
        <span className={`${baseClass} ${bordeClass} opacity-40`}>Anterior</span>
      )}

      {pages.map((p, i) =>
        p === "..." ? (
          <span
            key={`ellipsis-${i}`}
            className="w-8 h-8 flex items-center justify-center text-xs text-[var(--color-wa-text-sec)]"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === currentPage ? "page" : undefined}
            className={`${baseClass} cursor-pointer ${
              p === currentPage
                ? "bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)]"
                : "border border-[var(--color-wa-sep)] text-[var(--color-wa-text-main)] hover:bg-[var(--color-wa-hover)]"
            }`}
          >
            {p}
          </button>
        )
      )}

      {currentPage < totalPages ? (
        <button
          onClick={() => onPageChange(currentPage + 1)}
          className={`${baseClass} ${bordeClass} hover:bg-[var(--color-wa-hover)] cursor-pointer`}
        >
          Siguiente
        </button>
      ) : (
        <span className={`${baseClass} ${bordeClass} opacity-40`}>Siguiente</span>
      )}
    </nav>
  );
}
