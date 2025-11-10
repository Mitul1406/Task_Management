import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="card mt-3 mb-3 bg-light border-0">
      <nav className="d-flex align-items-center justify-content-between flex-wrap w-100">
        {/* Prev Button */}
        <button
          className="btn btn-outline-primary btn-sm px-3"
          disabled={currentPage === 1}
          onClick={() => {
            onPageChange(Math.max(currentPage - 1, 1));
            // window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          ‹ Prev
        </button>

        {/* Page Numbers */}
        <ul className="pagination pagination-sm mb-0 flex-wrap justify-content-center flex-grow-1 d-flex">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(
              (page) =>
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
            )
            .map((page, i, arr) => (
              <React.Fragment key={page}>
                {i > 0 && arr[i - 1] !== page - 1 && (
                  <li className="page-item disabled">
                    <span className="page-link">...</span>
                  </li>
                )}
                <li className={`page-item ${page === currentPage ? "active" : ""}`}>
                  <button
                    className="page-link"
                    onClick={() => {
                      onPageChange(page);
                      // window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    {page}
                  </button>
                </li>
              </React.Fragment>
            ))}
        </ul>

        {/* Next Button */}
        <button
          className="btn btn-outline-primary btn-sm px-3"
          disabled={currentPage === totalPages}
          onClick={() => {
            onPageChange(Math.min(currentPage + 1, totalPages));
            // window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          Next ›
        </button>
      </nav>
    </div>
  );
};

export default Pagination;
