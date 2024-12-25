import React from 'react'
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const pageNumbers = []
  
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i)
    }
  } else {
    if (currentPage <= 4) {
      for (let i = 1; i <= 5; i++) {
        pageNumbers.push(i)
      }
      pageNumbers.push('...')
      pageNumbers.push(totalPages)
    } else if (currentPage >= totalPages - 3) {
      pageNumbers.push(1)
      pageNumbers.push('...')
      for (let i = totalPages - 4; i <= totalPages; i++) {
        pageNumbers.push(i)
      }
    } else {
      pageNumbers.push(1)
      pageNumbers.push('...')
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        pageNumbers.push(i)
      }
      pageNumbers.push('...')
      pageNumbers.push(totalPages)
    }
  }

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex w-[100px] items-center justify-start">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous page</span>
        </Button>
      </div>
      <nav className="flex items-center space-x-1" aria-label="Pagination">
        {pageNumbers.map((number, index) => (
          <React.Fragment key={index}>
            {number === '...' ? (
              <Button variant="outline" size="sm" className="w-9" disabled>
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More pages</span>
              </Button>
            ) : (
              <Button
                variant={currentPage === number ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(number as number)}
                className="w-9"
              >
                {number}
              </Button>
            )}
          </React.Fragment>
        ))}
      </nav>
      <div className="flex w-[100px] items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next page</span>
        </Button>
      </div>
    </div>
  )
}