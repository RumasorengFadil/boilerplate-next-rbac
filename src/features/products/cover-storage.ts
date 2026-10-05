import "server-only";
import { createCoverStorage } from "../portfolio/cover-storage";
import { productCoverPath } from "./cover-schema";
export { normalizeCover, InvalidCoverError } from "../portfolio/cover-storage";

export const { storeCover, readCover, discardUncommittedCover } = createCoverStorage({
  environment: "PRODUCT_UPLOAD_DIR", directory: "storage/product-covers", coverPath: productCoverPath,
});
