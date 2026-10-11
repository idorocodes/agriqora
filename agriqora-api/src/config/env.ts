const parsedPort = Number(process.env.PORT);
export const config = {
  port: Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3000,
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  blockchainNetwork: "AgriQora Verified Farm Produce Network",
  defaultState: "Agricultural Belt",
  firstBlockNumber: 482900,
};
