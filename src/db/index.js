import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

let isConnected = false;
const connectDB = async () => {
  // console.log("Mongo URI:", process.env.MONGODB_URI);

  try {
    if (!isConnected) {
      const connectionInstance = await mongoose.connect(
        `${process.env.MONGODB_URI}/${DB_NAME}`
      );

      console.log(
        `\n MongoDB conneced !! DB HOST: ${connectionInstance.connection.host}`
      );
      isConnected = true;
    } else {
      console.log(
        `\n MongoDB conneced !! DB HOST: ${connectionInstance.connection.host}`
      );
    }
  } catch (error) {
    console.log("error", error);
    process.exit(1);
  }
};

export default connectDB;
