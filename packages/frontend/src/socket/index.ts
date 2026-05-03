import { io } from "socket.io-client";
import config from "@/config/clientConfig";

export const socket = io(config.apiUrl, {
  autoConnect: false,
  auth: {
    pixelTimestamp: new Date().toISOString(),
  },
});
