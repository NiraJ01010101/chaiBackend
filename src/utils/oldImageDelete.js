import cloudinary from "cloudinary";

export const oldImageDelete = async (publicId, resource_type = "image") => {
  try {
    const result = await cloudinary.v2.uploader.destroy(publicId, {
      resource_type,
    });
    if (result.result === "ok") {
      console.log(`Successfully deleted image with public ID: ${publicId}`);
      return true;
    } else {
      console.log(`Failed to delete image with public ID: ${publicId}`);
      return false;
    }
  } catch (error) {
    console.error(`Error deleting image with public ID: ${publicId}`, error);
    throw new Error("Failed to delete image");
  }
};
