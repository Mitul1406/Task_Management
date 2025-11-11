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
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          >
            {"<"}
          </button>

          <ul className="pagination pagination-sm mb-0 d-flex align-items-center">
    <li className="page-item active">
      <span className="page-link">{currentPage}</span>
    </li>
  </ul>

          {/* Next Button */}
          <button
            className="btn btn-outline-primary btn-sm ms-2"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          >
            {">"}
            
          </button>
        </nav>
      </div>
    </div>
  );
};

export default Pagination;
