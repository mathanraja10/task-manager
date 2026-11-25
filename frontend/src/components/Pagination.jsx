/** Page numbers to show: always first/last, a window around the current page, "…" gaps. */
function pageItems(page, totalPages) {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const items = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) items.push(`gap-${p}`);
    items.push(p);
  });
  return items;
}

export default function Pagination({ page, totalPages, onPageChange, disabled = false }) {
  if (totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={() => onPageChange(page - 1)}
        disabled={disabled || page <= 1}
      >
        Previous
      </button>
      {pageItems(page, totalPages).map((item) =>
        typeof item === 'string' ? (
          <span key={item} className="pagination__gap">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            className={
              item === page
                ? 'btn btn--sm pagination__page is-current'
                : 'btn btn--ghost btn--sm pagination__page'
            }
            onClick={() => onPageChange(item)}
            disabled={disabled}
            aria-current={item === page ? 'page' : undefined}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={() => onPageChange(page + 1)}
        disabled={disabled || page >= totalPages}
      >
        Next
      </button>
    </nav>
  );
}
