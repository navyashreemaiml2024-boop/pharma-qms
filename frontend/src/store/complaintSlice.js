import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  complaint: null,
};

const complaintSlice = createSlice({
  name: "complaint",
  initialState,
  reducers: {
    setComplaint: (state, action) => {
      state.complaint = action.payload;
    },
    clearComplaint: (state) => {
      state.complaint = null;
    },
  },
});

export const { setComplaint, clearComplaint } =
  complaintSlice.actions;

export default complaintSlice.reducer;