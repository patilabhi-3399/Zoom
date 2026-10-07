import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema({
  user_id: { type: String },
  meetingCode: { type: String, required: true },
  date: { type: Date, default: Date.now, required: true }
});

const Meeting = mongoose.connection.useDb("zoomAppDB").model("Meeting", meetingSchema);

export { Meeting };