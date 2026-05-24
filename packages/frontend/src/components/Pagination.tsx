import {
  Pagination as MuiPagination,
  PaginationItem,
  styled,
} from "@mui/material";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const StyledPaginationItem = styled(PaginationItem)`
  font-variant-numeric: lining-nums tabular-nums;
`;

const customIconSlots = {
  first: ChevronFirst,
  previous: ChevronLeft,
  next: ChevronRight,
  last: ChevronLast,
} as const;

export default function Pagination(
  props: React.ComponentProps<typeof MuiPagination>,
) {
  return (
    <MuiPagination
      color="primary"
      renderItem={(item) => (
        <StyledPaginationItem slots={customIconSlots} {...item} />
      )}
      sx={{
        "& .MuiPagination-ul": {
          justifyContent: "center",
        },
      }}
      shape="rounded"
      showFirstButton
      showLastButton
      {...props}
    />
  );
}
