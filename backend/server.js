require("dotenv").config();

const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const tweetRoutes = require("./routes/tweets");
const { startBlockchainSync } = require("./services/blockchainSync");

const app = express();
const PORT = Number.parseInt(process.env.PORT || "5001", 10);

app.use(cors());
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({
    status: "ok"
  });
});

app.use("/tweets", tweetRoutes);

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({
    message: error.message || "Internal server error"
  });
});

async function bootstrap() {
  await connectDB();
  const stopBlockchainSync = await startBlockchainSync();

  const server = app.listen(PORT, () => {
    console.log(`Backend server listening on http://localhost:${PORT}`);
  });

  async function shutdown(signal) {
    console.log(`${signal} received. Shutting down backend...`);

    await stopBlockchainSync();

    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  }

  process.on("SIGINT", () => {
    shutdown("SIGINT").catch((error) => {
      console.error("Failed to shut down backend cleanly", error);
      process.exit(1);
    });
  });

  process.on("SIGTERM", () => {
    shutdown("SIGTERM").catch((error) => {
      console.error("Failed to shut down backend cleanly", error);
      process.exit(1);
    });
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start backend server", error);
  process.exit(1);
});
