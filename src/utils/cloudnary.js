import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadOnCloudinary = async (localFilePath, folderName = "") => {
  try {
    if (!localFilePath) return null;
    //  Upload an image on cloudinary
    const uploadResult = await cloudinary.uploader
      .upload(localFilePath, {
        resource_type: "auto",
        folder: folderName,
      })
      .catch((error) => {
        console.log("uploadResult---", error);
      });

    // Remove the local file after successful upload (commite on post action || call api)
    // fs.unlinkSync(localFilePath);

    // console.log("File is uploaded on Cloudinary", uploadResult);
    // {
    //   asset_id: 'd5f81bf254a752d9dceb2895b2e591a8',
    //   public_id: 'l1niemrh55hngymcgchs',
    //   version: 1725014958,
    //   version_id: 'b29c1785e9966f5b48bafbdbda951058',
    //   signature: 'd2b8c09db0edaf26883716a895f980e33021263a',
    //   width: 1500,
    //   height: 1000,
    //   format: 'jpg',
    //   resource_type: 'image',
    //   created_at: '2024-08-30T10:49:18Z',
    //   tags: [],
    //   bytes: 87272,
    //   type: 'upload',
    //   etag: 'a5f3b96702530582f2e7d63ffda2845e',
    //   placeholder: false,
    //   url: 'http://res.cloudinary.com/dylakjmrp/image/upload/v1725014958/l1niemrh55hngymcgchs.jpg',
    //   secure_url: 'https://res.cloudinary.com/dylakjmrp/image/upload/v1725014958/l1niemrh55hngymcgchs.jpg',
    //   asset_folder: '',
    //   display_name: 'l1niemrh55hngymcgchs',
    //   original_filename: '1803e814-be43-4247-968f-1a748475782d',
    //   api_key: '581992257667977'
    // }
    return uploadResult;
  } catch (error) {
    // Remove the local file if upload fails
    fs.unlinkSync(localFilePath);
    console.log("uploadOnCloudinary", error);
    return null;
  }
};
