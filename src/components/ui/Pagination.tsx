import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { cn } from './Button';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    onPageChange,
    className
}) => {
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    // Logic to show a window of pages if there are too many
    const renderPageNumbers = () => {
        if (totalPages <= 7) {
            return pages.map(page => (
                <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => onPageChange(page)}
                    className={cn("w-8 h-8 p-0", currentPage === page && "pointer-events-none")}
                >
                    {page}
                </Button>
            ));
        }

        // Simplified logic for large number of pages (show first, last, and current window)
        // For now, just showing all or a simple slice could suffice, but let's do a simple window
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);

        if (currentPage <= 3) {
            startPage = 1;
            endPage = Math.min(5, totalPages);
        }
        if (currentPage >= totalPages - 2) {
            startPage = Math.max(1, totalPages - 4);
            endPage = totalPages;
        }

        const visiblePages = [];
        for (let i = startPage; i <= endPage; i++) {
            visiblePages.push(i);
        }

        return (
            <>
                {startPage > 1 && (
                    <>
                        <Button variant="ghost" size="sm" onClick={() => onPageChange(1)} className="w-8 h-8 p-0">1</Button>
                        {startPage > 2 && <span className="text-muted-foreground">...</span>}
                    </>
                )}

                {visiblePages.map(page => (
                    <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => onPageChange(page)}
                        className={cn("w-8 h-8 p-0", currentPage === page && "pointer-events-none")}
                    >
                        {page}
                    </Button>
                ))}

                {endPage < totalPages && (
                    <>
                        {endPage < totalPages - 1 && <span className="text-muted-foreground">...</span>}
                        <Button variant="ghost" size="sm" onClick={() => onPageChange(totalPages)} className="w-8 h-8 p-0">{totalPages}</Button>
                    </>
                )}
            </>
        );
    };

    if (totalPages <= 1) return null;

    return (
        <div className={cn("flex items-center justify-center gap-2", className)}>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="w-8 h-8 p-0"
            >
                <ChevronLeft size={16} />
            </Button>

            <div className="flex items-center gap-1">
                {renderPageNumbers()}
            </div>

            <Button
                variant="ghost"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="w-8 h-8 p-0"
            >
                <ChevronRight size={16} />
            </Button>
        </div>
    );
};
