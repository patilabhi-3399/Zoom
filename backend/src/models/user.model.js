import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  token: { type: String }
});

// 👇 instead of mongoose.model(), bind to active connection
const User = mongoose.connection.useDb("zoomAppDB").model("User", userSchema);

export { User };