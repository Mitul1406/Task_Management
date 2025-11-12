import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalResults: number;
  pageSize: number;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalResults,
  pageSize,
}) => {
  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalResults);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5; // Adjust how many pages to show at once
    let startPage = Math.max(currentPage - 2, 1);
    let endPage = Math.min(startPage + maxPagesToShow - 1, totalPages);

    // Adjust startPage if we are near the end
    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(endPage - maxPagesToShow + 1, 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="card mt-3 mb-3 bg-light border-0 px-3 py-2">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="text-muted small">
          Showing <strong>{start}</strong>–<strong>{end}</strong> of{" "}
          <strong>{totalResults}</strong> results
        </div>

        <nav className="d-flex align-items-center">
          {/* Prev Button */}
          <button
            className="btn btn-outline-primary btn-sm me-2"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            {"<"}
          </button>

          <ul className="pagination pagination-sm mb-0 d-flex align-items-center">
            {pageNumbers.map((page) => (
              <li
                key={page}
                className={`page-item ${page === currentPage ? "active" : ""}`}
              >
                <button
                  className="page-link"
                  onClick={() => onPageChange(page)}
                >
                  {page}
                </button>
              </li>
            ))}
          </ul>

          {/* Next Button */}
          <button
            className="btn btn-outline-primary btn-sm ms-2"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            {">"}
          </button>
        </nav>
      </div>
    </div>
  );
};

export default Pagination;
