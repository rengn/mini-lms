"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import { cn, formatScheduledAt } from "@/lib/utils";
import type { Consultation } from "@/lib/validation/consultation";

export function Dashboard({
  consultations,
}: {
  consultations: Consultation[];
}) {
  const useLocalTime = useIsHydrated();

  return (
    <section aria-label="All consultations" className={cn("space-y-8")}>
      <PageHeader
        title="Consultations"
        description="View consultations across all students."
      />

      <Card>
        <CardContent className={cn("p-0")}>
          <Table>
            <TableCaption className={cn("pb-4")}>
              {consultations.length === 0
                ? "No consultations have been booked yet."
                : `${consultations.length} consultations shown`}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Student ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consultations.map((consultation) => (
                <TableRow key={consultation.id}>
                  <TableCell className={cn("font-medium")}>
                    {consultation.firstName} {consultation.lastName}
                  </TableCell>
                  <TableCell className={cn("whitespace-nowrap")}>
                    <time dateTime={consultation.scheduledAt}>
                      {formatScheduledAt(
                        consultation.scheduledAt,
                        useLocalTime,
                      )}
                    </time>
                  </TableCell>
                  <TableCell>
                    {consultation.status !== "scheduled" ? (
                      <Badge
                        className={cn("capitalize")}
                        variant={
                          consultation.status === "cancelled"
                            ? "outline"
                            : "default"
                        }
                      >
                        {consultation.status}
                      </Badge>
                    ) : (
                      <Badge className={cn("capitalize")} variant="secondary">
                        Incomplete
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell
                    className={cn("min-w-64 whitespace-pre-wrap break-words")}
                  >
                    {consultation.reason}
                  </TableCell>
                  <TableCell
                    className={cn("font-mono text-xs text-muted-foreground")}
                  >
                    {consultation.studentId}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
