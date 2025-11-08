import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Product list skeleton
export const ProductListSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {[...Array(6)].map((_, i) => (
      <Card key={i}>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    ))}
  </div>
);

// Table skeleton
export const TableSkeleton = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
  <div className="space-y-2">
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {[...Array(cols)].map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
    {[...Array(rows)].map((_, i) => (
      <div key={i} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {[...Array(cols)].map((_, j) => (
          <Skeleton key={j} className="h-12 w-full" />
        ))}
      </div>
    ))}
  </div>
);

// Dashboard stats skeleton
export const StatsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {[...Array(4)].map((_, i) => (
      <Card key={i}>
        <CardHeader>
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </CardContent>
      </Card>
    ))}
  </div>
);

// Form skeleton
export const FormSkeleton = ({ fields = 4 }: { fields?: number }) => (
  <div className="space-y-4">
    {[...Array(fields)].map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-10 w-full" />
      </div>
    ))}
  </div>
);

