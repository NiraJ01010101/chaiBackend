// use Promise method
const asynchandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((error) =>
      next(
        res.status(error.statusCode || 500).json({
          statusCode: error.statusCode,
          success: false,
          message: error.message,
        })
      )
    );
  };
};

// use try/catch method
// const asynchandler = (fn) => async (req, res, next) => {
//   try {
//     await fn(req, res, next);
//   } catch (error) {
//     console.log("error", error);
//     res.status(error.statusCode || 500).json({
//       statusCode: error.statusCode,
//       success: false,
//       message: error.message,
//     });
//   }
// };
export default asynchandler;
