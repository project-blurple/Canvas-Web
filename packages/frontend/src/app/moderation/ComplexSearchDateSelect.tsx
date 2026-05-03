import { styled } from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import type { DateTime } from "luxon";

const DateSelectWrapper = styled("div")`
  display: flex;
  flex-direction: row;
  width: 100%;
  gap: 0.5rem;
`;

const DateTimePickerStyled = styled(DateTimePicker)`
  width: 100%;
`;

interface ComplexSearchDateSelectProps {
  fromTime: DateTime | null;
  toTime: DateTime | null;
  setFromTime: (date: DateTime | null) => void;
  setToTime: (date: DateTime | null) => void;
}

export default function ComplexSearchDateSelect({
  fromTime,
  toTime,
  setFromTime,
  setToTime,
}: ComplexSearchDateSelectProps) {
  const timezone = new Date()
    .toLocaleString("en-US", { timeZoneName: "short" })
    .split(" ")
    .pop();

  return (
    <DateSelectWrapper>
      <DateTimePickerStyled
        label={`From (${timezone})`}
        value={fromTime}
        onChange={setFromTime}
        slotProps={{
          field: { clearable: true },
          textField: { size: "small" },
        }}
      />
      <DateTimePickerStyled
        label={`To (${timezone})`}
        value={toTime}
        onChange={setToTime}
        slotProps={{
          field: { clearable: true },
          textField: { size: "small" },
        }}
      />
    </DateSelectWrapper>
  );
}
