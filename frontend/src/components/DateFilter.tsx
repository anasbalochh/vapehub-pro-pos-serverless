import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

type Props = { onChange: (range: { start?: string; end?: string }) => void };

export default function DateFilter({ onChange }: Props) {
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");

  const apply = () => {
    console.log('DateFilter: Apply button clicked');
    console.log('DateFilter: Start date:', start);
    console.log('DateFilter: End date:', end);

    const range = {
      start: start || undefined,
      end: end || undefined
    };

    console.log('DateFilter: Calling onChange with range:', range);
    onChange(range);

    // Show success feedback
    console.log('DateFilter: Date range applied successfully');
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={start}
          onChange={(e) => {
            console.log('DateFilter: Start date changed to:', e.target.value);
            setStart(e.target.value);
          }}
          className="bg-card border border-border rounded px-2 py-1 text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
        />
        <span className="text-muted-foreground text-xs">to</span>
        <input
          type="date"
          value={end}
          onChange={(e) => {
            console.log('DateFilter: End date changed to:', e.target.value);
            setEnd(e.target.value);
          }}
          className="bg-card border border-border rounded px-2 py-1 text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>
      <Button
        variant="outline"
        className="border-border hover:bg-primary hover:text-primary-foreground transition-all duration-200"
        onClick={apply}
      >
        <Calendar className="w-4 h-4 mr-2" />
        Apply
      </Button>
    </div>
  );
}


