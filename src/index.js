import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
  path: "./env",
});
connectDB()
  .then((res) => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running on port:${process.env.PORT}`);
    });
    app.on("error", (err) => {
      console.log("Error", err);
      throw err;
    });
  })
  .catch((err) => {
    console.log("Mongo db connection Failed !!!", err);
  });
