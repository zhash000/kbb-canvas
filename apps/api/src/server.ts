import { buildApp } from "./app.js";

const app = buildApp();
const port = Number(process.env.PORT ?? 3000);

app
  .listen({ port, host: "0.0.0.0" })
  .then(() => {
    console.log(`API listening on ${port}`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
