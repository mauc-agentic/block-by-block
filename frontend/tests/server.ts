import { setupServer } from "msw/node";

export const API = "http://api.test/api/v1";
export const server = setupServer();
