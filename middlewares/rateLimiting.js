const AccessModel = require("../models/AccessModel");

const rateLimiting = async (req, res, next) => {
  const sessionId = req.session.id;
  console.log(sessionId);

  if (!sessionId) {
    return res.send({
      status: 400,
      message: "Invalid session, Please Login again",
    });
  }

  const sessionTimeDb = await AccessModel.findOne({ sessionId: sessionId });

  // if not present
  if (!sessionTimeDb) {
    // create
    const accessTime = new AccessModel({
      sessionId: sessionId,
      time: Date.now(),
    });
    await accessTime.save();
    next();
    return;
  }

  // if present
  const previousAccessTime = sessionTimeDb.time;
  const currentAccessTime = Date.now();

  if (currentAccessTime - previousAccessTime < 500) {
    return res.send({
      status: 400,
      message: "Too many request. Please try after some time",
    });
  }

  // update
  await AccessModel.findOneAndUpdate(
    { sessionId: sessionId },
    { time: Date.now() }
  );

  next();
  return;
};

module.exports = rateLimiting;
